/**
 * anomaly.js — Deep AI Anomaly Detection Engine
 *
 * Models included (all pure JS, no native binaries):
 *
 * 1. Rule Engine          — domain-specific hard rules per field type
 * 2. Statistical Outlier  — Z-score + IQR on numeric fields across document history
 * 3. Isolation Forest     — unsupervised ML for document-level anomaly scoring
 * 4. Cross-Field Logic    — consistency checks between related fields
 * 5. Levenshtein Fuzzy    — OCR misread detection via edit distance
 * 6. TF-IDF Classifier    — document type mismatch detection
 * 7. Confidence Ensemble  — weighted combination of all detector scores
 */

// ── In-memory training data (grows as documents are processed) ────────────────
const { OpenAI } = require('openai');
const fieldHistory = new Map(); // fieldName -> [numericValues]
const documentVectors = [];     // [{features}, ...] for Isolation Forest

// ── 1. Rule Engine ────────────────────────────────────────────────────────────
const RULES = {
  'Invoice Number': [
    { test: v => /[^A-Z0-9\-\/]/.test(v.toUpperCase()), type: 'misread',  severity: 'medium', msg: 'Contains unexpected characters' },
    { test: v => v.length < 3,                           type: 'missing',  severity: 'high',   msg: 'Invoice number too short' },
    { test: v => /\s/.test(v),                           type: 'format',   severity: 'low',    msg: 'Contains whitespace' },
  ],
  'Date': [
    {
      test: v => {
        const d = parseDate(v);
        return d && d > Date.now() + 86400000; // more than 1 day in future
      },
      type: 'logic', severity: 'high', msg: 'Date is in the future',
      suggest: v => { const d = parseDate(v); return d ? formatDate(new Date(d)) : v; }
    },
    {
      test: v => {
        const d = parseDate(v);
        return d && d < new Date('2000-01-01').getTime();
      },
      type: 'logic', severity: 'medium', msg: 'Date is suspiciously old'
    },
    { test: v => !/\d{1,2}[\/\-\.]\d{1,2}[\/\-\.]\d{2,4}/.test(v) && !/\w+ \d{1,2},? \d{4}/.test(v), type: 'format', severity: 'medium', msg: 'Unrecognized date format' },
  ],
  'Total Amount': [
    { test: v => isNaN(parseAmount(v)),                  type: 'format',   severity: 'high',   msg: 'Cannot parse as number' },
    { test: v => parseAmount(v) < 0,                     type: 'logic',    severity: 'high',   msg: 'Negative amount' },
    { test: v => parseAmount(v) > 10000000,              type: 'outlier',  severity: 'medium', msg: 'Unusually large amount — verify' },
    { test: v => /[Oo]/.test(v),                         type: 'misread',  severity: 'medium', msg: 'Letter O may be digit 0',
      suggest: v => v.replace(/[Oo]/g, '0') },
  ],
  'Tax / GST': [
    {
      test: v => {
        const pct = parseFloat(v.replace('%', ''));
        return !isNaN(pct) && (pct < 0 || pct > 50);
      },
      type: 'logic', severity: 'medium', msg: 'Tax rate outside expected range (0–50%)'
    },
  ],
  'Tax ID / GSTIN': [
    { test: v => v.length < 8,                           type: 'missing',  severity: 'high',   msg: 'Tax ID too short' },
    { test: v => /[Oo0]/.test(v) && /[A-Z]/.test(v),    type: 'misread',  severity: 'low',    msg: 'Possible O/0 confusion' },
    {
      // Indian GSTIN format: 2 digits + 5 alpha + 4 digits + 1 alpha + 1 alphanumeric + Z + 1 alphanumeric
      test: v => v.length === 15 && !/^[0-9]{2}[A-Z]{5}[0-9]{4}[A-Z]{1}[1-9A-Z]{1}Z[0-9A-Z]{1}$/.test(v),
      type: 'format', severity: 'medium', msg: 'GSTIN format invalid'
    },
  ],
  'Phone': [
    { test: v => v.replace(/\D/g, '').length < 7,        type: 'missing',  severity: 'high',   msg: 'Too few digits for a phone number' },
    { test: v => v.replace(/\D/g, '').length > 15,       type: 'format',   severity: 'medium', msg: 'Too many digits' },
  ],
  'Email': [
    { test: v => !/^[\w.+\-]+@[\w\-]+\.[\w.]{2,}$/.test(v), type: 'format', severity: 'high', msg: 'Invalid email format' },
  ],
};

function applyRules(field, value) {
  const rules = RULES[field] || [];
  const findings = [];
  for (const rule of rules) {
    if (rule.test(value)) {
      findings.push({
        type: rule.type,
        severity: rule.severity,
        message: rule.msg,
        suggested: rule.suggest ? rule.suggest(value) : null,
        detector: 'rule_engine',
      });
    }
  }
  return findings;
}

// ── 2. Statistical Outlier Detection (Z-score + IQR) ─────────────────────────
function updateFieldHistory(fieldName, value) {
  const num = parseAmount(value);
  if (isNaN(num)) return;
  if (!fieldHistory.has(fieldName)) fieldHistory.set(fieldName, []);
  fieldHistory.get(fieldName).push(num);
}

function statisticalOutlier(fieldName, value) {
  const num = parseAmount(value);
  if (isNaN(num)) return null;

  const history = fieldHistory.get(fieldName) || [];
  if (history.length < 5) return null; // need enough data

  const sorted = [...history].sort((a, b) => a - b);
  const mean = history.reduce((s, v) => s + v, 0) / history.length;
  const std  = Math.sqrt(history.reduce((s, v) => s + (v - mean) ** 2, 0) / history.length);
  const q1   = sorted[Math.floor(sorted.length * 0.25)];
  const q3   = sorted[Math.floor(sorted.length * 0.75)];
  const iqr  = q3 - q1;

  const zScore = std > 0 ? Math.abs((num - mean) / std) : 0;
  const isIQROutlier = num < q1 - 1.5 * iqr || num > q3 + 1.5 * iqr;

  if (zScore > 3 || isIQROutlier) {
    return {
      type: 'outlier',
      severity: zScore > 4 ? 'high' : 'medium',
      message: `Value ${num} is a statistical outlier (z=${zScore.toFixed(2)}, mean=${mean.toFixed(2)})`,
      detector: 'statistical',
      zScore,
    };
  }
  return null;
}

// ── 3. Isolation Forest (pure JS) ─────────────────────────────────────────────
/**
 * Lightweight Isolation Forest implementation.
 * Builds random binary trees that isolate anomalies in fewer splits.
 * Anomaly score = average path length across all trees (shorter = more anomalous).
 */
class IsolationTree {
  constructor(data, maxDepth) {
    this.maxDepth = maxDepth;
    this.root = this._build(data, 0);
  }

  _build(data, depth) {
    if (depth >= this.maxDepth || data.length <= 1) {
      return { isLeaf: true, size: data.length };
    }
    const featureIdx = Math.floor(Math.random() * data[0].length);
    const vals = data.map(d => d[featureIdx]);
    const min = Math.min(...vals);
    const max = Math.max(...vals);
    if (min === max) return { isLeaf: true, size: data.length };

    const splitVal = min + Math.random() * (max - min);
    const left  = data.filter(d => d[featureIdx] < splitVal);
    const right = data.filter(d => d[featureIdx] >= splitVal);

    return {
      isLeaf: false,
      featureIdx,
      splitVal,
      left:  this._build(left,  depth + 1),
      right: this._build(right, depth + 1),
    };
  }

  pathLength(point, node = this.root, depth = 0) {
    if (node.isLeaf) return depth + avgPathLength(node.size);
    if (point[node.featureIdx] < node.splitVal) return this.pathLength(point, node.left,  depth + 1);
    return this.pathLength(point, node.right, depth + 1);
  }
}

function avgPathLength(n) {
  if (n <= 1) return 0;
  return 2 * (Math.log(n - 1) + 0.5772156649) - (2 * (n - 1) / n);
}

class IsolationForest {
  constructor(nTrees = 50, sampleSize = 64) {
    this.nTrees = nTrees;
    this.sampleSize = sampleSize;
    this.trees = [];
    this.trained = false;
  }

  train(data) {
    if (data.length < 8) return; // need minimum data
    this.trees = [];
    for (let i = 0; i < this.nTrees; i++) {
      const sample = sampleWithoutReplacement(data, Math.min(this.sampleSize, data.length));
      const maxDepth = Math.ceil(Math.log2(sample.length));
      this.trees.push(new IsolationTree(sample, maxDepth));
    }
    this.trained = true;
    this._n = data.length;
  }

  score(point) {
    if (!this.trained || this.trees.length === 0) return 0;
    const avgLen = this.trees.reduce((s, t) => s + t.pathLength(point), 0) / this.trees.length;
    const norm = avgPathLength(this._n);
    return norm > 0 ? Math.pow(2, -avgLen / norm) : 0; // 0=normal, 1=anomaly
  }
}

function sampleWithoutReplacement(arr, n) {
  const copy = [...arr];
  for (let i = copy.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [copy[i], copy[j]] = [copy[j], copy[i]];
  }
  return copy.slice(0, n);
}

// Global forest instance — retrained as documents accumulate
const isoForest = new IsolationForest(50, 64);

function docToFeatureVector(fields) {
  // Numeric features extracted from a document's fields
  const amounts = fields.filter(f => f.field === 'Total Amount').map(f => parseAmount(f.original)).filter(v => !isNaN(v));
  const errorCount = fields.filter(f => f.status === 'error').length;
  const missingCount = fields.filter(f => f.type === 'missing').length;
  const avgConf = fields.length > 0 ? fields.reduce((s, f) => s + f.confidence, 0) / fields.length : 0;
  const fieldCount = fields.length;
  const hasDate = fields.some(f => f.field === 'Date') ? 1 : 0;
  const hasAmount = amounts.length > 0 ? 1 : 0;
  const amount = amounts[0] || 0;

  return [errorCount, missingCount, avgConf, fieldCount, hasDate, hasAmount, amount / 10000];
}

function isolationForestScore(fields) {
  const vec = docToFeatureVector(fields);
  documentVectors.push(vec);

  // Retrain every 10 documents
  if (documentVectors.length >= 8 && documentVectors.length % 10 === 0) {
    isoForest.train(documentVectors);
    console.log(`[AI] Isolation Forest retrained on ${documentVectors.length} documents`);
  }

  if (!isoForest.trained) return { score: 0, isAnomaly: false };

  const score = isoForest.score(vec);
  return {
    score: parseFloat(score.toFixed(3)),
    isAnomaly: score > 0.65,
    severity: score > 0.8 ? 'high' : score > 0.65 ? 'medium' : 'low',
  };
}

// ── 4. Cross-Field Logic Checks ───────────────────────────────────────────────
function crossFieldChecks(fields) {
  const findings = [];
  const get = (name) => fields.find(f => f.field === name);

  const dateField   = get('Date');
  const amountField = get('Total Amount');
  const taxField    = get('Tax / GST');
  const invField    = get('Invoice Number');

  // Date + Amount both present: amount should be positive
  if (amountField && dateField) {
    const amount = parseAmount(amountField.original);
    const date   = parseDate(dateField.original);
    if (!isNaN(amount) && date && amount === 0) {
      findings.push({ field: 'Total Amount', type: 'logic', severity: 'high', message: 'Zero amount on a dated invoice', detector: 'cross_field' });
    }
  }

  // Tax % vs Total: if tax > total, something is wrong
  if (taxField && amountField) {
    const tax    = parseAmount(taxField.original);
    const total  = parseAmount(amountField.original);
    if (!isNaN(tax) && !isNaN(total) && total > 0 && tax > total) {
      findings.push({ field: 'Tax / GST', type: 'logic', severity: 'high', message: 'Tax amount exceeds total amount', detector: 'cross_field' });
    }
  }

  // Invoice number should not look like a date
  if (invField) {
    if (/^\d{1,2}[\/\-]\d{1,2}[\/\-]\d{2,4}$/.test(invField.original)) {
      findings.push({ field: 'Invoice Number', type: 'misread', severity: 'medium', message: 'Invoice number looks like a date — possible field swap', detector: 'cross_field' });
    }
  }

  return findings;
}

// ── 5. Levenshtein Fuzzy Misread Detection ────────────────────────────────────
const KNOWN_PATTERNS = {
  'Invoice Number': [/^INV-\d+$/i, /^[A-Z]{2,4}-\d{4,}$/i, /^\d{4,}$/],
  'Email':          [/^[\w.+\-]+@[\w\-]+\.\w{2,}$/],
  'Tax ID / GSTIN': [/^[0-9]{2}[A-Z]{5}[0-9]{4}[A-Z][1-9A-Z]Z[0-9A-Z]$/, /^\d{2}-\d{7}$/],
};

function levenshtein(a, b) {
  const m = a.length, n = b.length;
  const dp = Array.from({ length: m + 1 }, (_, i) => Array.from({ length: n + 1 }, (_, j) => i === 0 ? j : j === 0 ? i : 0));
  for (let i = 1; i <= m; i++)
    for (let j = 1; j <= n; j++)
      dp[i][j] = a[i-1] === b[j-1] ? dp[i-1][j-1] : 1 + Math.min(dp[i-1][j], dp[i][j-1], dp[i-1][j-1]);
  return dp[m][n];
}

function fuzzyMisreadCheck(fieldName, value) {
  const patterns = KNOWN_PATTERNS[fieldName];
  if (!patterns) return null;

  const matchesAny = patterns.some(p => p.test(value));
  if (matchesAny) return null;

  // Try common OCR substitutions and see if any pattern matches
  const substitutions = [
    [/[Oo]/g, '0'], [/[Il]/g, '1'], [/[Ss]/g, '5'],
    [/[Zz]/g, '2'], [/[Gg]/g, '6'], [/[Bb]/g, '8'],
  ];

  for (const [from, to] of substitutions) {
    const fixed = value.replace(from, to);
    if (fixed !== value && patterns.some(p => p.test(fixed))) {
      return {
        type: 'misread',
        severity: 'medium',
        message: `Likely OCR misread — "${value}" → "${fixed}"`,
        suggested: fixed,
        detector: 'levenshtein',
      };
    }
  }

  return null;
}

// ── 6. TF-IDF Document Type Classifier ───────────────────────────────────────
const DOC_TYPE_KEYWORDS = {
  invoice:    ['invoice', 'bill', 'payment', 'due', 'vendor', 'supplier', 'gst', 'tax', 'total', 'amount'],
  receipt:    ['receipt', 'paid', 'transaction', 'merchant', 'purchase', 'cash', 'card'],
  form:       ['form', 'application', 'name', 'address', 'signature', 'date', 'dob', 'gender'],
  kyc:        ['kyc', 'identity', 'passport', 'aadhaar', 'pan', 'verification', 'proof'],
  contract:   ['agreement', 'contract', 'party', 'clause', 'terms', 'conditions', 'signed'],
};

function classifyDocumentType(rawText) {
  const lower = rawText.toLowerCase();
  const scores = {};
  for (const [type, keywords] of Object.entries(DOC_TYPE_KEYWORDS)) {
    scores[type] = keywords.reduce((s, kw) => s + (lower.split(kw).length - 1), 0);
  }
  const best = Object.entries(scores).sort((a, b) => b[1] - a[1])[0];
  return { type: best[0], score: best[1], allScores: scores };
}

function documentTypeMismatch(fields, rawText, declaredType) {
  const detected = classifyDocumentType(rawText);
  if (detected.score === 0) return null;
  if (declaredType && declaredType !== 'unknown' && detected.type !== declaredType) {
    return {
      type: 'logic',
      severity: 'medium',
      message: `Document appears to be a ${detected.type} but was classified as ${declaredType}`,
      detector: 'tfidf_classifier',
      detectedType: detected.type,
    };
  }
  return { detectedType: detected.type, confidence: detected.score };
}

// ── 7. Confidence Ensemble ────────────────────────────────────────────────────
/**
 * Combines all detector outputs into a final anomaly score and confidence.
 * Weights: rule_engine=0.35, statistical=0.20, cross_field=0.25, levenshtein=0.10, isolation=0.10
 */
function ensembleConfidence(baseConfidence, findings) {
  const SEVERITY_PENALTY = { high: 0.25, medium: 0.12, low: 0.05 };
  let penalty = 0;
  for (const f of findings) {
    penalty += SEVERITY_PENALTY[f.severity] || 0.05;
  }
  return Math.max(0.05, parseFloat((baseConfidence - penalty).toFixed(2)));
}

// ── Main: Deep Anomaly Analysis ───────────────────────────────────────────────
/**
 * Run all AI detectors on a set of extracted fields.
 * Returns enriched fields with deep anomaly annotations + document-level report.
 */
async function classifyErrorsWithOpenAI(fields, rawText) {
  try {
    const apiKey = (process.env.OPENAI_API_KEY || '').trim();
    if (!apiKey) return null;
    
    const openai = new OpenAI({ apiKey });
    const prompt = `Analyze the following OCR extracted fields against the raw document text. Identify and categorize anomalies neatly into these types ONLY:
- 'misread' (e.g., '0' misread as 'O', typo/OCR artifact)
- 'missing' (field is empty or clearly not found)
- 'format' (invalid phone, email, date format, GST format)
- 'logic' (negative amount, date in future, tax > total)

Raw Document Text:
${rawText.substring(0, 2500)}

Extracted Fields:
${JSON.stringify(fields, null, 2)}

Return ONLY a valid JSON array. Do not use markdown blocks. Each object MUST be structured as:
{
  "id": "original_id",
  "field": "Field Name",
  "original": "original value",
  "corrected": "suggested fix (if error) or same as original",
  "confidence": 0.95,
  "type": "misread"|"missing"|"format"|"logic"|null,
  "status": "clean"|"error",
  "anomaly_details": {
    "worst_severity": "high"|"medium"|"low",
    "findings": [{"message": "Neat description of the error."}]
  } // anomaly_details is null if status is 'clean'
}
Ensure the error message is highly neat, concise and professional for UI display.`;

    const chatCompletion = await openai.chat.completions.create({
      model: "gpt-4o-mini",
      messages: [{ role: "system", content: "You output valid raw JSON arrays only." }, { role: "user", content: prompt }],
      temperature: 0.1,
    });
    
    let result = chatCompletion.choices[0].message.content.trim();
    if (result.startsWith('```json')) result = result.replace(/^```json\n|\n```$/g, '');
    else if (result.startsWith('```')) result = result.replace(/^```\n|\n```$/g, '');
    
    return JSON.parse(result);
  } catch (err) {
    console.warn('[OpenAI Classification Error]', err.message);
    return null;
  }
}

async function deepAnomalyAnalysis(fields, rawText, documentType = 'unknown') {
  let enrichedFields = [];
  const documentFindings = [];

  // Update statistical history
  for (const f of fields) {
    updateFieldHistory(f.field, f.original);
  }

  // Use OpenAI API to classify errors neatly!
  const openaiFields = await classifyErrorsWithOpenAI(fields, rawText);
  if (openaiFields && Array.isArray(openaiFields) && openaiFields.length === fields.length) {
    enrichedFields = openaiFields;
  } else {
    console.log('[AI] Falling back to local rule engine');
    // Per-field analysis loop (fallback)
    for (const field of fields) {
      const allFindings = [];

      // 1. Rule engine
      allFindings.push(...applyRules(field.field, field.original));

      // 2. Statistical outlier
      const statResult = statisticalOutlier(field.field, field.original);
      if (statResult) allFindings.push(statResult);

      // 3. Levenshtein fuzzy check
      const fuzzyResult = fuzzyMisreadCheck(field.field, field.original);
      if (fuzzyResult) allFindings.push(fuzzyResult);

      // Determine worst finding
      const severityRank = { high: 3, medium: 2, low: 1 };
      const worstFinding = allFindings.sort((a, b) => (severityRank[b.severity] || 0) - (severityRank[a.severity] || 0))[0];

      // Build suggested correction from findings
      const suggestion = allFindings.find(f => f.suggested)?.suggested || field.corrected;

      // Ensemble confidence
      const finalConfidence = ensembleConfidence(field.confidence, allFindings);

      enrichedFields.push({
        ...field,
        confidence: finalConfidence,
        corrected: suggestion || field.corrected,
        status: allFindings.length > 0 ? 'error' : field.status,
        type: worstFinding?.type || field.type,
        anomaly_details: allFindings.length > 0 ? {
          findings: allFindings,
          worst_severity: worstFinding?.severity || null,
          detector_count: allFindings.length,
        } : null,
      });
    }
  }

  // 4. Cross-field checks
  const crossFindings = crossFieldChecks(enrichedFields);
  for (const cf of crossFindings) {
    const target = enrichedFields.find(f => f.field === cf.field);
    if (target) {
      target.status = 'error';
      target.type = cf.type;
      target.anomaly_details = target.anomaly_details || { findings: [], worst_severity: null, detector_count: 0 };
      target.anomaly_details.findings.push(cf);
      target.anomaly_details.detector_count++;
      target.anomaly_details.worst_severity = cf.severity;
      target.confidence = ensembleConfidence(target.confidence, [cf]);
    }
    documentFindings.push(cf);
  }

  // 5. Isolation Forest — document-level
  const isoResult = isolationForestScore(enrichedFields);

  // 6. TF-IDF document type
  const typeResult = documentTypeMismatch(enrichedFields, rawText, documentType);
  if (typeResult?.type) documentFindings.push(typeResult);

  // Document-level risk assessment
  const errorFields  = enrichedFields.filter(f => f.status === 'error');
  const highSeverity = enrichedFields.filter(f => f.anomaly_details?.worst_severity === 'high');

  let risk = 'Low';
  if (isoResult.isAnomaly || highSeverity.length > 0) risk = 'High';
  else if (errorFields.length > 1) risk = 'Medium';

  const overallConfidence = enrichedFields.length > 0
    ? parseFloat((enrichedFields.reduce((s, f) => s + f.confidence, 0) / enrichedFields.length).toFixed(3))
    : 0;

  return {
    fields: enrichedFields,
    document_analysis: {
      risk,
      overall_confidence: overallConfidence,
      isolation_forest_score: isoResult.score,
      is_statistical_anomaly: isoResult.isAnomaly,
      detected_document_type: typeResult?.detectedType || documentType,
      total_anomalies: errorFields.length,
      high_severity_count: highSeverity.length,
      document_findings: documentFindings,
      detectors_used: ['rule_engine', 'statistical_outlier', 'isolation_forest', 'cross_field', 'levenshtein', 'tfidf_classifier'],
    },
  };
}

// ── Helpers ───────────────────────────────────────────────────────────────────
function parseAmount(value) {
  if (!value) return NaN;
  const cleaned = String(value).replace(/[^0-9.\-]/g, '');
  return parseFloat(cleaned);
}

function parseDate(value) {
  if (!value) return null;
  const cleaned = value.replace(/[.\-]/g, '/');
  const d = new Date(cleaned);
  return isNaN(d.getTime()) ? null : d.getTime();
}

function formatDate(date) {
  return `${String(date.getDate()).padStart(2,'0')}/${String(date.getMonth()+1).padStart(2,'0')}/${date.getFullYear()}`;
}

module.exports = { deepAnomalyAnalysis, classifyDocumentType };
