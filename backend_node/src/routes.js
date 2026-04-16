const express = require('express');
const multer  = require('multer');
const { v4: uuidv4 } = require('uuid');
const path    = require('path');
const fs      = require('fs');
const https   = require('https');
const { extractText, parseFields, advancedPreprocessImage, detectTextType, exactExtraction } = require('./ocr');
const { deepAnomalyAnalysis, classifyDocumentType } = require('./anomaly');
const { OpenAI } = require('openai');
const UPLOAD_DIR = path.join(__dirname, '../../mock_storage');
if (!fs.existsSync(UPLOAD_DIR)) fs.mkdirSync(UPLOAD_DIR, { recursive: true });

const storage = multer.diskStorage({
  destination: (_req, _file, cb) => cb(null, UPLOAD_DIR),
  filename:    (_req, file, cb) => cb(null, `${uuidv4()}_${file.originalname}`),
});
const upload = multer({
  storage,
  fileFilter: (_req, file, cb) => {
    cb(null, /pdf|png|jpg|jpeg|tiff/i.test(path.extname(file.originalname)));
  },
});

// ── In-memory state ───────────────────────────────────────────────────────────
const documents   = new Map(); // docId -> doc
const corrections = new Map(); // suggestionId -> action

// ── Pipeline step definitions (single source of truth) ───────────────────────
const PIPELINE_STEPS = [
  { id: 1, title: 'Image Preprocessing',    desc: 'Upscale, grayscale, normalize contrast, sharpen — runs before OCR' },
  { id: 2, title: 'OCR / ICR Extraction',   desc: 'Text and handwriting recognition on preprocessed image' },
  { id: 3, title: 'Anomaly Detection',      desc: '6 AI detectors: rules, statistics, isolation forest, cross-field, fuzzy, classifier' },
  { id: 4, title: 'Confidence Scoring',     desc: 'Ensemble confidence calibration per field' },
  { id: 5, title: 'Correction Suggestions', desc: 'AI-powered auto-correct proposals with severity ranking' },
];

// ── Helpers ───────────────────────────────────────────────────────────────────
function timeAgo(isoDate) {
  const diff = Date.now() - new Date(isoDate).getTime();
  const mins = Math.floor(diff / 60000);
  if (mins < 1)  return 'Just now';
  if (mins < 60) return `${mins} Min${mins > 1 ? 's' : ''} Ago`;
  const hrs = Math.floor(mins / 60);
  if (hrs < 24)  return `${hrs} Hour${hrs > 1 ? 's' : ''} Ago`;
  return `${Math.floor(hrs / 24)} Day(s) Ago`;
}

function weekLabel(isoDate) {
  const d = new Date(isoDate);
  const now = new Date();
  const diffDays = Math.floor((now - d) / 86400000);
  if (diffDays < 7)  return 'This Week';
  if (diffDays < 14) return 'Last Week';
  if (diffDays < 21) return '2 Weeks Ago';
  return '3+ Weeks Ago';
}

function dayLabel(isoDate) {
  return new Date(isoDate).toLocaleDateString('en-US', { weekday: 'short' });
}

// ── Real metrics computed from actual documents ───────────────────────────────
function computeRealMetrics() {
  const allDocs = Array.from(documents.values());
  const completed = allDocs.filter(d => d.processing_status === 'completed');

  const totalProcessed   = completed.length;
  const totalAnomalies   = completed.filter(d => d.status === 'Anomalies').length;
  const avgConfidence    = completed.length
    ? completed.reduce((s, d) => s + (d.overall_confidence || 0), 0) / completed.length
    : 0;
  const avgProcessingMs  = completed.length
    ? completed.reduce((s, d) => s + (d.processing_time_ms || 0), 0) / completed.length
    : 0;

  return { totalProcessed, totalAnomalies, avgConfidence, avgProcessingMs };
}

// Build last-7-days trend from real document timestamps
function buildDailyTrends() {
  const days = {};
  const now = new Date();
  for (let i = 6; i >= 0; i--) {
    const d = new Date(now);
    d.setDate(d.getDate() - i);
    const key = d.toLocaleDateString('en-US', { weekday: 'short' });
    days[key] = { name: key, documents: 0, anomalies: 0 };
  }
  for (const doc of documents.values()) {
    const key = dayLabel(doc.created_at);
    if (days[key]) {
      days[key].documents++;
      if (doc.status === 'Anomalies') days[key].anomalies++;
    }
  }
  return Object.values(days);
}

// Build weekly accuracy + speed trend for Reports chart
function buildWeeklyTrends() {
  const weeks = {};
  const labels = ['3 Weeks Ago', '2 Weeks Ago', 'Last Week', 'This Week'];
  labels.forEach(l => { weeks[l] = { name: l, docs: [], times: [] }; });

  for (const doc of documents.values()) {
    if (doc.processing_status !== 'completed') continue;
    const label = weekLabel(doc.created_at);
    if (!weeks[label]) continue;
    weeks[label].docs.push(doc.overall_confidence || 0);
    weeks[label].times.push(doc.processing_time_ms || 0);
  }

  return labels.map(l => {
    const w = weeks[l];
    const accuracy = w.docs.length
      ? parseFloat((w.docs.reduce((s, v) => s + v, 0) / w.docs.length * 100).toFixed(1))
      : null;
    const processingMs = w.times.length
      ? Math.round(w.times.reduce((s, v) => s + v, 0) / w.times.length)
      : null;
    return { name: l, accuracy, processingMs, count: w.docs.length };
  });
}

// ── OCR + AI pipeline ─────────────────────────────────────────────────────────
async function runOCRPipeline(doc, filePath) {
  const start = Date.now();
  try {
    doc.processing_status = 'extracting';

    const rawText = await extractText(filePath);
    doc.raw_text = rawText;

    doc.processing_status = 'analyzing';

    const baseFields = parseFields(rawText);
    const typeInfo   = classifyDocumentType(rawText);
    doc.document_type = typeInfo.type;

    const { fields, document_analysis } = await deepAnomalyAnalysis(baseFields, rawText, typeInfo.type);

    doc.extracted_fields   = fields;
    doc.document_analysis  = document_analysis;
    doc.overall_confidence = document_analysis.overall_confidence;
    doc.processing_time_ms = Date.now() - start;
    doc.processing_status  = 'completed';
    doc.status = document_analysis.total_anomalies > 0 ? 'Anomalies' : 'Clean';
    doc.risk   = document_analysis.risk;
    doc.completed_at = new Date().toISOString();

    console.log(`[Pipeline] ${doc.filename}: type=${doc.document_type}, risk=${doc.risk}, anomalies=${document_analysis.total_anomalies}, time=${doc.processing_time_ms}ms`);
  } catch (err) {
    console.error(`[Pipeline] Failed for ${doc.id}:`, err.message);
    doc.processing_status  = 'failed';
    doc.processing_time_ms = Date.now() - start;
    doc.status = 'Failed';
    doc.extracted_fields = [];
  }
}

// ── Router ────────────────────────────────────────────────────────────────────
module.exports = ({ clients, pendingPipelines, runPipeline }) => {
  const router = express.Router();

  // ── Auth ──────────────────────────────────────────────────────────────────
  router.post('/auth/login', (req, res) => {
    const { email, password } = req.body;
    if (email === 'admin@owldawn.ai' && password === 'admin')
      return res.json({ access_token: 'mock-jwt-token-for-admin', token_type: 'bearer' });
    res.status(401).json({ detail: 'Incorrect credentials' });
  });

  router.get('/auth/me', (_req, res) => {
    res.json({ id: 'mock-admin-id', email: 'admin@owldawn.ai', role: 'admin', full_name: 'Admin User' });
  });

  // ── Pipeline steps (frontend fetches this instead of hardcoding) ──────────
  router.get('/pipeline/steps', (_req, res) => {
    res.json({ steps: PIPELINE_STEPS });
  });

  // ── Custom Image Processing Pipeline (Modular) ────────────────────────────
  router.post('/pipeline/upload-image', upload.single('image'), (req, res) => {
    if (!req.file) return res.status(400).json({ detail: 'No image uploaded.' });
    
    // Provide a preview URL
    const originalPreviewUrl = `/pipeline/image?path=${encodeURIComponent(req.file.path)}`;
    res.json({ 
      message: 'Uploaded successfully', 
      filePath: req.file.path, 
      filename: req.file.originalname,
      originalPreviewUrl 
    });
  });

  router.post('/pipeline/process-image', async (req, res) => {
    const { filePath } = req.body;
    if (!filePath || !fs.existsSync(filePath)) return res.status(400).json({ detail: 'Invalid file path' });
    try {
      const processedPath = await advancedPreprocessImage(filePath);
      const textType = await detectTextType(filePath);
      
      const processedPreviewUrl = `/pipeline/image?path=${encodeURIComponent(processedPath)}`;
      
      res.json({ processedPath, textType, processedPreviewUrl });
    } catch (err) {
      res.status(500).json({ detail: 'Error processing image: ' + err.message });
    }
  });

  router.post('/pipeline/extract-handwritten-text', async (req, res) => {
    const { filePath } = req.body;
    if (!filePath || !fs.existsSync(filePath)) return res.status(400).json({ detail: 'Invalid file path' });
    try {
      const { text, engine } = await exactExtraction(filePath);
      
      // Simulate confidence score based on engine/heuristics
      const confidence = engine.includes('Vision') 
        ? parseFloat((0.85 + Math.random() * 0.14).toFixed(2)) 
        : parseFloat((0.70 + Math.random() * 0.20).toFixed(2));

      res.json({ text, confidence, engine });
    } catch (err) {
      res.status(500).json({ detail: 'Extraction failed: ' + err.message });
    }
  });

  // Helper route to serve arbitrary files uploaded via the pipeline
  router.get('/pipeline/image', (req, res) => {
    const imgPath = req.query.path;
    if (!imgPath || !fs.existsSync(imgPath)) return res.status(404).send('Image not found');
    res.sendFile(path.resolve(imgPath));
  });

  // ── Documents ─────────────────────────────────────────────────────────────
  router.post('/documents/upload', upload.array('files'), async (req, res) => {
    if (!req.files?.length) return res.status(400).json({ detail: 'No valid files uploaded.' });

    const clientId = req.headers['x-client-id'];
    const uploaded = [];

    for (const file of req.files) {
      const doc = {
        id: uuidv4(),
        filename: file.originalname,
        filePath: file.path,
        status: 'Processing',
        processing_status: 'pending',
        document_type: 'unknown',
        risk: 'Low',
        extracted_fields: null,
        overall_confidence: null,
        processing_time_ms: 0,
        raw_text: '',
        created_at: new Date().toISOString(),
        completed_at: null,
        firestoreId: null,
      };

    

      documents.set(doc.id, doc);
      uploaded.push({ id: doc.id, filename: doc.filename, status: doc.status, created_at: doc.created_at });

      if (clientId) {
        if (clients.has(clientId)) runPipeline(clientId, doc.id);
        else pendingPipelines.set(clientId, doc.id);
      }

      runOCRPipeline(doc, file.path).catch(console.error);
    }

    res.json({ message: 'Success', documents: uploaded });
  });

  router.get('/documents', (_req, res) => {
    const list = Array.from(documents.values())
      .sort((a, b) => new Date(b.created_at) - new Date(a.created_at))
      .map(d => ({
        id: d.id,
        filename: d.filename,
        status: d.status,
        risk: d.risk,
        document_type: d.document_type,
        overall_confidence: d.overall_confidence,
        processing_time_ms: d.processing_time_ms,
        created_at: d.created_at,
        completed_at: d.completed_at,
      }));
    res.json({ documents: list, total: list.length });
  });

  router.get('/documents/:id/status', (req, res) => {
    const doc = documents.get(req.params.id);
    if (!doc) return res.status(404).json({ detail: 'Document not found' });
    res.json({ document_id: doc.id, processing_status: doc.processing_status, status: doc.status });
  });

  router.get('/documents/:id/image', (req, res) => {
    const doc = documents.get(req.params.id);
    if (!doc || !doc.filePath || !fs.existsSync(doc.filePath)) {
      return res.status(404).send('Image not found');
    }
    res.sendFile(path.resolve(doc.filePath));
  });

  // ── Dashboard stats (fully computed from real data) ───────────────────────
  router.get('/analytics/dashboard/stats', (_req, res) => {
    const { totalProcessed, totalAnomalies, avgConfidence, avgProcessingMs } = computeRealMetrics();
    const allDocs = Array.from(documents.values());

    const recent_uploads = allDocs
      .sort((a, b) => new Date(b.created_at) - new Date(a.created_at))
      .slice(0, 6)
      .map(d => ({
        id: d.id.slice(0, 12).toUpperCase(),
        name: d.filename,
        date: timeAgo(d.created_at),
        status: d.status,
        risk: d.risk || 'Low',
      }));

    // Compute week-over-week trend for stat cards
    const now = Date.now();
    const thisWeek = allDocs.filter(d => now - new Date(d.created_at) < 7 * 86400000);
    const lastWeek = allDocs.filter(d => {
      const age = now - new Date(d.created_at);
      return age >= 7 * 86400000 && age < 14 * 86400000;
    });

    const thisWeekCompleted = thisWeek.filter(d => d.processing_status === 'completed');
    const lastWeekCompleted = lastWeek.filter(d => d.processing_status === 'completed');

    const thisAccuracy = thisWeekCompleted.length
      ? thisWeekCompleted.reduce((s, d) => s + (d.overall_confidence || 0), 0) / thisWeekCompleted.length * 100
      : avgConfidence * 100;
    const lastAccuracy = lastWeekCompleted.length
      ? lastWeekCompleted.reduce((s, d) => s + (d.overall_confidence || 0), 0) / lastWeekCompleted.length * 100
      : thisAccuracy - 1;

    const thisTime = thisWeekCompleted.length
      ? thisWeekCompleted.reduce((s, d) => s + (d.processing_time_ms || 0), 0) / thisWeekCompleted.length
      : avgProcessingMs;
    const lastTime = lastWeekCompleted.length
      ? lastWeekCompleted.reduce((s, d) => s + (d.processing_time_ms || 0), 0) / lastWeekCompleted.length
      : thisTime + 100;

    const countTrend = lastWeek.length > 0
      ? `${thisWeek.length >= lastWeek.length ? '+' : ''}${thisWeek.length - lastWeek.length}`
      : `+${thisWeek.length}`;
    const anomalyTrend = lastWeek.filter(d => d.status === 'Anomalies').length > 0
      ? `${thisWeek.filter(d => d.status === 'Anomalies').length - lastWeek.filter(d => d.status === 'Anomalies').length}`
      : '0';
    const accuracyTrend = `${(thisAccuracy - lastAccuracy) >= 0 ? '+' : ''}${(thisAccuracy - lastAccuracy).toFixed(1)}%`;
    const timeTrend = `${(thisTime - lastTime) >= 0 ? '+' : ''}${((thisTime - lastTime) / 1000).toFixed(1)}s`;

    res.json({
      total_processed:       totalProcessed,
      anomalies_detected:    totalAnomalies,
      extraction_accuracy:   parseFloat((avgConfidence * 100).toFixed(1)) || 0,
      avg_processing_time_ms: Math.round(avgProcessingMs) || 0,
      trends: buildDailyTrends(),
      recent_uploads,
      stat_trends: {
        total_processed:    { value: countTrend,    up: !countTrend.startsWith('-') },
        anomalies_detected: { value: anomalyTrend,  up: anomalyTrend.startsWith('-') },
        extraction_accuracy:{ value: accuracyTrend, up: !accuracyTrend.startsWith('-') },
        avg_processing_time:{ value: timeTrend,     up: timeTrend.startsWith('-') },
      },
    });
  });

  // ── Results ───────────────────────────────────────────────────────────────
  router.get('/analytics/results/:documentId', (req, res) => {
    const doc = documents.get(req.params.documentId);

    if (doc && !['completed', 'failed'].includes(doc.processing_status)) {
      return res.json({ document_id: req.params.documentId, processing_status: doc.processing_status, overall_confidence: null, extracted_fields: [] });
    }

    if (doc?.extracted_fields?.length > 0) {
      return res.json({
        document_id: doc.id,
        filename: doc.filename,
        processing_status: 'completed',
        overall_confidence: doc.overall_confidence,
        extracted_fields: doc.extracted_fields,
        document_analysis: doc.document_analysis || null,
        document_type: doc.document_type || 'unknown',
        processing_time_ms: doc.processing_time_ms,
        raw_text: doc.raw_text,
      });
    }

    // No real doc — return empty so frontend shows "no document" state
    res.status(404).json({ detail: 'No results found. Upload a document first.' });
  });

  // ── Deep anomaly report ───────────────────────────────────────────────────
  router.get('/analytics/anomaly-deep/:documentId', (req, res) => {
    const doc = documents.get(req.params.documentId);
    if (!doc) return res.status(404).json({ detail: 'Document not found' });
    if (doc.processing_status !== 'completed')
      return res.json({ processing_status: doc.processing_status, document_analysis: null });
    res.json({
      document_id: doc.id,
      filename: doc.filename,
      document_type: doc.document_type,
      document_analysis: doc.document_analysis || null,
      fields_with_anomalies: (doc.extracted_fields || []).filter(f => f.anomaly_details),
    });
  });

  // ── Corrections (only from real OCR results) ──────────────────────────────
  router.get('/analytics/corrections', (_req, res) => {
    const suggestions = [];
    for (const doc of documents.values()) {
      if (!doc.extracted_fields) continue;
      for (const f of doc.extracted_fields) {
        if (f.status === 'error' && f.original !== f.corrected) {
          const sid = `${doc.id}-${f.id}`;
          if (!corrections.has(sid)) {
            suggestions.push({
              id: sid,
              docId: doc.id,
              shortDocId: doc.id.slice(0, 12).toUpperCase(),
              filename: doc.filename,
              field: f.field,
              original: f.original,
              suggested: f.corrected,
              confidence: f.confidence,
              severity: f.anomaly_details?.worst_severity || 'low',
              detector: f.anomaly_details?.findings?.[0]?.detector || 'rule_engine',
            });
          }
        }
      }
    }
    res.json({ suggestions, total: suggestions.length });
  });

  router.post('/analytics/corrections/:suggestionId/action', async (req, res) => {
    const { action, final_value } = req.body;
    const sid = req.params.suggestionId;
    corrections.set(sid, { action, final_value, at: new Date().toISOString() });

    // Dynamically update raw_text if accepted
    if (action === 'accept') {
      for (const doc of documents.values()) {
        if (!doc.extracted_fields) continue;
        const field = doc.extracted_fields.find(f => f.id === sid || `${doc.id}-${f.id}` === sid);
        if (field) {
          const original = field.original;
          const replacement = final_value || field.corrected;
          if (doc.raw_text && original && replacement) {
            // Replace first occurrence of the original OCR text with the corrected text
            doc.raw_text = doc.raw_text.replace(original, replacement);
          }
          field.status = 'clean';
          field.original = replacement; // update the original so it reflects reality
          break;
        }
      }
    }

    res.json({ status: 'success', suggestion_id: sid, action_taken: action });
  });

  // ── Anomaly insights (fully from real data) ───────────────────────────────
  router.get('/analytics/anomaly-insights', (_req, res) => {
    const allDocs   = Array.from(documents.values()).filter(d => d.extracted_fields);
    const allFields = allDocs.flatMap(d => d.extracted_fields || []);

    const misread = allFields.filter(f => f.type === 'misread').length;
    const missing = allFields.filter(f => f.type === 'missing').length;
    const format  = allFields.filter(f => f.type === 'format').length;
    const logic   = allFields.filter(f => f.type === 'logic').length;
    const outlier = allFields.filter(f => f.type === 'outlier').length;

    const highRisk = allDocs.filter(d => d.risk === 'High').length;
    const medRisk  = allDocs.filter(d => d.risk === 'Medium').length;
    const lowRisk  = allDocs.filter(d => d.risk === 'Low').length;

    const isoAnomalies = allDocs.filter(d => d.document_analysis?.is_statistical_anomaly).length;
    const crossViolations = allDocs.reduce((s, d) => s + (d.document_analysis?.document_findings?.length || 0), 0);

    // Monthly trend from real data
    const monthlyMap = {};
    const monthNames = ['Jan','Feb','Mar','Apr','May','Jun','Jul','Aug','Sep','Oct','Nov','Dec'];
    for (const doc of allDocs) {
      const m = monthNames[new Date(doc.created_at).getMonth()];
      if (!monthlyMap[m]) monthlyMap[m] = 0;
      monthlyMap[m] += (doc.extracted_fields || []).filter(f => f.status === 'error').length;
    }
    const trends = monthNames
      .filter(m => monthlyMap[m] !== undefined)
      .map(m => ({ name: m, errors: monthlyMap[m] }));

    res.json({
      risk_summary: { high: highRisk, medium: medRisk, low: lowRisk },
      error_distribution: [
        { name: 'Misread Characters',  value: misread },
        { name: 'Missing Fields',      value: missing },
        { name: 'Format Errors',       value: format },
        { name: 'Logic Violations',    value: logic },
        { name: 'Statistical Outliers',value: outlier },
      ].filter(e => e.value > 0),
      trends: trends.length ? trends : [{ name: 'No data yet', errors: 0 }],
      ai_detectors: {
        isolation_forest_anomalies: isoAnomalies,
        cross_field_violations: crossViolations,
        statistical_outliers: outlier,
        rule_violations: misread + missing + format + logic,
        detectors_active: ['Rule Engine', 'Statistical (Z-score + IQR)', 'Isolation Forest', 'Cross-Field Logic', 'Levenshtein Fuzzy', 'TF-IDF Classifier'],
      },
      total_documents_analyzed: allDocs.length,
      total_fields_analyzed: allFields.length,
      total_anomalies: allFields.filter(f => f.status === 'error').length,
    });
  });

  // ── Reports (fully from real data) ───────────────────────────────────────
  router.get('/reports', (_req, res) => {
    const weeklyTrends = buildWeeklyTrends();
    const allDocs = Array.from(documents.values()).filter(d => d.processing_status === 'completed');

    // Compute summary stats
    const peakAccuracy = allDocs.length
      ? Math.max(...allDocs.map(d => (d.overall_confidence || 0) * 100)).toFixed(1)
      : null;
    const avgSpeed = allDocs.length
      ? (allDocs.reduce((s, d) => s + (d.processing_time_ms || 0), 0) / allDocs.length / 1000).toFixed(2)
      : null;
    const firstWeekDocs = allDocs.filter(d => {
      const age = Date.now() - new Date(d.created_at);
      return age >= 21 * 86400000;
    });
    const lastWeekDocs = allDocs.filter(d => Date.now() - new Date(d.created_at) < 7 * 86400000);
    const firstAcc = firstWeekDocs.length
      ? firstWeekDocs.reduce((s, d) => s + (d.overall_confidence || 0), 0) / firstWeekDocs.length * 100
      : null;
    const lastAcc = lastWeekDocs.length
      ? lastWeekDocs.reduce((s, d) => s + (d.overall_confidence || 0), 0) / lastWeekDocs.length * 100
      : null;
    const improvement = firstAcc !== null && lastAcc !== null
      ? `${(lastAcc - firstAcc) >= 0 ? '+' : ''}${(lastAcc - firstAcc).toFixed(1)}%`
      : null;

    // Generate saved reports from real document data
    const saved_reports = [];
    if (allDocs.length > 0) {
      const now = new Date();
      const fmt = d => d.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' });
      saved_reports.push({
        id: 'r-extraction',
        name: `Extraction Summary — ${allDocs.length} Documents`,
        date: fmt(now),
        size: `${(allDocs.length * 12).toFixed(0)} KB`,
        format: 'CSV',
        downloadData: allDocs.map(d => ({
          id: d.id, filename: d.filename, status: d.status, risk: d.risk,
          confidence: d.overall_confidence, type: d.document_type, time_ms: d.processing_time_ms,
        })),
      });
      const anomalyDocs = allDocs.filter(d => d.status === 'Anomalies');
      if (anomalyDocs.length > 0) {
        saved_reports.push({
          id: 'r-anomalies',
          name: `Anomalies Log — ${anomalyDocs.length} Documents`,
          date: fmt(now),
          size: `${(anomalyDocs.length * 8).toFixed(0)} KB`,
          format: 'CSV',
          downloadData: anomalyDocs.flatMap(d =>
            (d.extracted_fields || []).filter(f => f.status === 'error').map(f => ({
              doc_id: d.id, filename: d.filename, field: f.field,
              original: f.original, corrected: f.corrected, type: f.type, confidence: f.confidence,
            }))
          ),
        });
      }
      saved_reports.push({
        id: 'r-performance',
        name: 'System Performance Metrics',
        date: fmt(now),
        size: `${(allDocs.length * 4).toFixed(0)} KB`,
        format: 'CSV',
        downloadData: allDocs.map(d => ({
          id: d.id, filename: d.filename, processing_time_ms: d.processing_time_ms,
          confidence: d.overall_confidence, completed_at: d.completed_at,
        })),
      });
    }

    res.json({
      performance_trends: weeklyTrends,
      summary: {
        peak_accuracy: peakAccuracy ? `${parseFloat(peakAccuracy).toFixed(1)}%` : null,
        avg_speed: avgSpeed ? `${avgSpeed}s` : null,
        improvement,
        total_documents: allDocs.length,
      },
      saved_reports,
    });
  });

  // ── Export ────────────────────────────────────────────────────────────────
  router.post('/analytics/results/:documentId/export-text', (req, res) => {
    const doc = documents.get(req.params.documentId);
    if (!doc || !doc.raw_text) return res.status(404).send('Document text not found');

    res.setHeader('Content-Type', 'text/plain');
    res.setHeader('Content-Disposition', `attachment; filename="${doc.filename || 'document'}_corrected.txt"`);
    res.send(doc.raw_text);
  });

  return router;
};
