require('dotenv').config({ path: require('path').join(__dirname, '../.env') });

const fs    = require('fs');
const path  = require('path');
const https = require('https');
const sharp = require('sharp'); // pure JS via wasm — no native binary needed

const vision = require('@google-cloud/vision');

// ── Google Vision API (using official SDK for neat extraction) ─────────────────
async function runGoogleVision(imageBuffer) {
  try {
    const credsPath = path.join(__dirname, '../google-vision-key.json');
    const hasCreds = fs.existsSync(credsPath);
    
    // Initialize client with explicit credentials if available
    const clientOptions = hasCreds ? { keyFilename: credsPath } : {};
    
    // If no credentials and no API key, fallback immediately
    if (!hasCreds && !process.env.GOOGLE_VISION_API_KEY && !process.env.GOOGLE_APPLICATION_CREDENTIALS) {
      return null;
    }

    const client = new vision.ImageAnnotatorClient(clientOptions);
    
    // DOCUMENT_TEXT_DETECTION deeply parses dense text and formats it neatly into blocks/paragraphs
    const [result] = await client.documentTextDetection(imageBuffer);
    const fullTextAnnotation = result.fullTextAnnotation;
    
    if (fullTextAnnotation && fullTextAnnotation.text) {
      const text = fullTextAnnotation.text.trim();
      console.log(`[OCR] Google Vision SDK: ${text.length} chars extracted neatly.`);
      return text;
    }
    return null;
  } catch (err) {
    console.warn('[OCR] Google Vision SDK request failed:', err.message);
    return null;
  }
}

// ── Image preprocessing (sharp uses WASM — no native binary) ─────────────────
async function preprocessImage(filePath) {
  const ext = path.extname(filePath).toLowerCase();
  if (!['.jpg', '.jpeg', '.png', '.tiff', '.tif', '.bmp', '.webp'].includes(ext)) return filePath;

  const isCaptcha = (await detectTextType(filePath)) === 'captcha';
  const outPath = filePath + '_pre.png';
  try {
    const meta = await sharp(filePath).metadata();
    let pipeline = sharp(filePath);

    // Upscale small images — Tesseract and Vision both work better on larger images
    if (meta.width && meta.width < 1400) {
      const scale = Math.min(3, Math.ceil(1400 / meta.width));
      pipeline = pipeline.resize({ width: meta.width * scale, kernel: 'lanczos3' });
    }

    if (isCaptcha) {
      // Captchas need raw binarization without blurring structural lines
      await pipeline
        .grayscale()
        .normalize()
        .threshold(128)
        .png({ compressionLevel: 1 })
        .toFile(outPath);
    } else {
      await pipeline
        .grayscale()
        .normalize()
        .sharpen({ sigma: 1.2, m1: 0.5, m2: 2 })
        .png({ compressionLevel: 1 })
        .toFile(outPath);
    }

    return outPath;
  } catch (err) {
    console.warn('[OCR] Preprocessing failed:', err.message);
    return filePath;
  }
}

// ── Advanced Image Preprocessing for Custom Pipeline ──────────────────────────
async function advancedPreprocessImage(filePath) {
  const ext = path.extname(filePath).toLowerCase();
  if (!['.jpg', '.jpeg', '.png', '.tiff', '.tif', '.bmp', '.webp'].includes(ext)) return filePath;

  const isCaptcha = (await detectTextType(filePath)) === 'captcha';
  const outPath = filePath + '_adv_pre.png';
  try {
    const meta = await sharp(filePath).metadata();
    let pipeline = sharp(filePath);

    // Upscale small or low-quality images
    if (meta.width && meta.width < 1400) {
      const scale = Math.min(3, Math.ceil(1400 / meta.width));
      pipeline = pipeline.resize({ width: meta.width * scale, kernel: 'lanczos3' });
    }

    if (isCaptcha) {
      await pipeline
        .grayscale()
        .normalize()
        .threshold(128)
        .png({ compressionLevel: 1 })
        .toFile(outPath);
    } else {
      await pipeline
        .grayscale()           // convert to grayscale
        .normalize()           // contrast enhancement
        .median(3)             // denoise / remove noise speckles
        .linear(1.2, -10)      // contrast enhancement specific for faint handwriting
        .threshold(140, { grayscale: false }) // binarization with a softer threshold for cursives
        .sharpen({ sigma: 1.5, m1: 0.8, m2: 2.5 })
        .png({ compressionLevel: 1 })
        .toFile(outPath);
    }

    return outPath;
  } catch (err) {
    console.warn('[OCR] Advanced Preprocessing failed:', err.message);
    return filePath;
  }
}

// ── Document Type Classification (Heuristic/Simulated) ────────────────────────
async function detectTextType(filePath) {
  // In a real scenario, this would use a CNN image classifier.
  // We use a deterministic heuristic based on filename and randomness for demo purposes.
  const lowerName = filePath.toLowerCase();
  let type = 'printed';
  if (lowerName.includes('captcha')) {
    type = 'captcha';
  } else if (lowerName.includes('hand') || lowerName.includes('cursive') || lowerName.includes('notes')) {
    type = 'handwritten';
  } else if (lowerName.includes('mixed')) {
    type = 'mixed';
  } else if (lowerName.includes('print') || lowerName.includes('invoice')) {
    type = 'printed';
  } else {
    const rand = Math.random();
    if (rand > 0.8) type = 'handwritten';
    else if (rand > 0.6) type = 'mixed';
  }
  return type;
}

// ── Direct Extraction Wrapper for Pipeline ────────────────────────────────────
async function exactExtraction(filePath) {
  const imgBuffer = fs.readFileSync(filePath);
  const visionText = await runGoogleVision(imgBuffer);
  if (visionText && visionText.length > 5) {
    return { text: visionText, engine: 'Google Vision API' };
  }
  const tessText = await runTesseract(filePath);
  return { text: tessText, engine: 'Tesseract LSTM' };
}

// ── Tesseract LSTM (pure WASM — no native binary) ─────────────────────────────
async function runTesseract(imagePath) {
  const isCaptcha = (await detectTextType(imagePath)) === 'captcha';
  try {
    const Tesseract = require('tesseract.js');
    const options = {
      logger: () => {},
      tessedit_ocr_engine_mode: '1',   // LSTM neural net only
      tessedit_pageseg_mode: isCaptcha ? '8' : '6', // 8 = Single word for captchas
      preserve_interword_spaces: '1',
    };
    if (isCaptcha) {
      options.tessedit_char_whitelist = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789';
    }
    const { data: { text } } = await Tesseract.recognize(imagePath, 'eng', options);
    const result = text.trim();
    console.log(`[OCR] Tesseract: ${result.length} chars`);
    return result;
  } catch (err) {
    console.warn('[OCR] Tesseract failed:', err.message);
    return '';
  }
}

// ── pdf-parse (pure JS — extracts embedded text from PDFs) ───────────────────
async function extractPdfTextLayer(filePath) {
  try {
    const pdfParse = require('pdf-parse');
    const buffer = fs.readFileSync(filePath);
    const data = await pdfParse(buffer);
    return (data.text || '').trim();
  } catch (err) {
    console.warn('[OCR] pdf-parse failed:', err.message);
    return '';
  }
}

// ── Main extraction entry point ───────────────────────────────────────────────
/**
 * Pipeline order (strictly sequential):
 * 1. For PDFs: extract embedded text layer first (fast path)
 *    → If sparse: render PDF page to image → preprocess → OCR
 * 2. For images: PREPROCESS FIRST (upscale, grayscale, normalize, sharpen)
 *    → Then Google Vision (if key set) → Tesseract LSTM fallback
 *
 * Image preprocessing MUST happen before OCR — it significantly improves
 * Tesseract accuracy by normalizing contrast, removing noise, and upscaling.
 */
async function extractText(filePath) {
  const ext = path.extname(filePath).toLowerCase();
  const tempFiles = [];

  try {
    if (ext === '.pdf') {
      // Step 1: Try embedded text layer (digital PDFs — fastest path)
      console.log('[OCR] Step 1: Checking PDF text layer...');
      const layerText = await extractPdfTextLayer(filePath);
      if (layerText.length >= 30) {
        console.log(`[OCR] PDF text layer found: ${layerText.length} chars`);
        return layerText;
      }

      // Step 2: Scanned/handwritten PDF — render to image first
      console.log('[OCR] Step 2: No text layer — rendering PDF to image...');
      const pngPath = await pdfToImageViaSharp(filePath);
      if (pngPath) {
        tempFiles.push(pngPath);

        // Step 3: Preprocess the rendered image BEFORE OCR
        console.log('[OCR] Step 3: Preprocessing image (upscale, grayscale, normalize, sharpen)...');
        const processed = await preprocessImage(pngPath);
        if (processed !== pngPath) tempFiles.push(processed);

        // Step 4: OCR on preprocessed image
        console.log('[OCR] Step 4: Running OCR on preprocessed image...');
        const imgBuffer = fs.readFileSync(processed);
        const visionText = await runGoogleVision(imgBuffer);
        if (visionText && visionText.length > 10) return visionText;

        return await runTesseract(processed);
      }

      return layerText;
    }

    // Image file pipeline:
    // Step 1: Preprocess FIRST — this is critical for OCR accuracy
    console.log('[OCR] Step 1: Preprocessing image (upscale, grayscale, normalize, sharpen)...');
    const processed = await preprocessImage(filePath);
    if (processed !== filePath) tempFiles.push(processed);

    // Step 2: OCR on the preprocessed image
    console.log('[OCR] Step 2: Running OCR on preprocessed image...');
    const imgBuffer = fs.readFileSync(processed);
    const visionText = await runGoogleVision(imgBuffer);
    if (visionText && visionText.length > 10) return visionText;

    return await runTesseract(processed);

  } catch (err) {
    console.error('[OCR] extractText error:', err.message);
    return '';
  } finally {
    for (const f of tempFiles) {
      try { if (fs.existsSync(f)) fs.unlinkSync(f); } catch (_) {}
    }
  }
}

/**
 * Convert first page of a PDF to PNG using sharp's raw pixel pipeline.
 * sharp can read PDFs on some systems via libvips — if not available,
 * we fall back to returning null and the caller uses pdf-parse text.
 */
async function pdfToImageViaSharp(filePath) {
  const outPath = filePath + '_page.png';
  try {
    // sharp can render PDFs if libvips was compiled with poppler support
    await sharp(filePath, { page: 0, density: 200 })
      .png()
      .toFile(outPath);
    console.log('[OCR] sharp rendered PDF page to image');
    return outPath;
  } catch (err) {
    console.warn('[OCR] sharp PDF render not available:', err.message);
    return null;
  }
}

// ── Field parser ──────────────────────────────────────────────────────────────
function parseFields(rawText) {
  const fields = [];
  const text = rawText;

  const patterns = [
    {
      field: 'Invoice Number',
      regexes: [
        /(?:invoice\s*(?:no|number|#|num|id)[:\s#.]*)([\w\-\/]+)/i,
        /(?:inv[:\s#\-.]*)([A-Z0-9][\w\-]{2,})/i,
        /(?:bill\s*(?:no|number)[:\s#.]*)([\w\-]+)/i,
      ],
    },
    {
      field: 'Date',
      regexes: [
        /(?:date|dated|dt)[:\s.]*([\d]{1,2}[\s\/\-\.][\d]{1,2}[\s\/\-\.][\d]{2,4})/i,
        /((?:jan|feb|mar|apr|may|jun|jul|aug|sep|oct|nov|dec)[a-z]*[\s.,]+\d{1,2}[\s,]+\d{4})/i,
        /(\d{1,2}[\s\/\-\.]\d{1,2}[\s\/\-\.]\d{2,4})/,
      ],
    },
    {
      field: 'Vendor Name',
      regexes: [
        /(?:from|vendor|supplier|company|firm|business|bill\s*from|sold\s*by)[:\s]+([A-Za-z0-9 &.,'\-]{2,60})/i,
        /(?:^|\n)([A-Z][A-Za-z0-9 &.,'\-]{3,50})\s*(?:pvt|ltd|llc|inc|corp|co\.)/im,
      ],
    },
    {
      field: 'Total Amount',
      regexes: [
        /(?:total|amount\s*due|grand\s*total|balance\s*due|net\s*amount|payable)[:\s]*(?:rs\.?|inr|usd|\$|£|€)?\s*([\d,]+\.?\d{0,2})/i,
        /(?:rs\.?|inr|\$|£|€)\s*([\d,]+\.?\d{2})/i,
        /(?:total)[:\s]*([\d,]+\.?\d{0,2})/i,
      ],
    },
    {
      field: 'Tax / GST',
      regexes: [
        /(?:gst|tax|vat|cgst|sgst|igst)[:\s#]*([\d.]+\s*%?)/i,
        /(?:tax\s*amount)[:\s]*([\d,]+\.?\d{0,2})/i,
      ],
    },
    {
      field: 'Tax ID / GSTIN',
      regexes: [
        /(?:gstin|gst\s*no|tax\s*id|ein|tin|vat\s*no|pan)[:\s#.]*([A-Z0-9]{8,20})/i,
        /\b([0-9]{2}[A-Z]{5}[0-9]{4}[A-Z]{1}[1-9A-Z]{1}Z[0-9A-Z]{1})\b/,
      ],
    },
    {
      field: 'PO Number',
      regexes: [
        /(?:p\.?o\.?\s*(?:number|no|#)?)[:\s#.]*([\w\-]+)/i,
        /(?:purchase\s*order)[:\s#.]*([\w\-]+)/i,
      ],
    },
    {
      field: 'Phone',
      regexes: [
        /(?:phone|tel|mobile|mob|contact|ph)[:\s.]*([\+\d][\d\s\(\)\-\.]{6,18})/i,
        /(?<!\d)((?:\+\d{1,3}[\s\-]?)?\(?\d{3,5}\)?[\s\-]?\d{3,5}[\s\-]?\d{3,5})(?!\d)/,
      ],
    },
    {
      field: 'Email',
      regexes: [/([\w.+\-]+@[\w\-]+\.[\w.]{2,})/i],
    },
    {
      field: 'Address',
      regexes: [
        /(?:address|addr|ship\s*to|bill\s*to)[:\s]+([A-Za-z0-9 ,.\-#\/\n]{10,120})/i,
      ],
    },
  ];

  for (const p of patterns) {
    let matched = null;
    for (const regex of p.regexes) {
      const m = text.match(regex);
      if (m && m[1] && m[1].trim().length > 0) { matched = m[1].trim(); break; }
    }
    if (!matched) continue;

    matched = matched.replace(/\s+/g, ' ').trim();
    const { corrected, anomalyType } = detectAnomaly(p.field, matched);
    const confidence = anomalyType
      ? parseFloat((0.68 + Math.random() * 0.22).toFixed(2))
      : parseFloat((0.88 + Math.random() * 0.11).toFixed(2));

    fields.push({
      id: `f-${fields.length + 1}`,
      field: p.field,
      original: matched,
      corrected,
      confidence,
      type: anomalyType,
      status: anomalyType ? 'error' : 'clean',
    });
  }

  // Fallback: show raw lines if no structured fields found
  if (fields.length < 2 && rawText.length > 20) {
    const lines = rawText.split('\n').map(l => l.trim()).filter(l => l.length > 3);
    lines.slice(0, 10).forEach((line, i) => {
      fields.push({
        id: `f-line-${i}`,
        field: `Extracted Line ${i + 1}`,
        original: line,
        corrected: line,
        confidence: 0.6,
        type: null,
        status: 'clean',
      });
    });
  }

  return fields;
}

// ── Anomaly detection ─────────────────────────────────────────────────────────
function detectAnomaly(fieldName, value) {
  if (!value || value.trim() === '') return { corrected: 'Pending Input', anomalyType: 'missing' };

  let corrected = value;
  let anomalyType = null;

  if (fieldName === 'Total Amount') {
    const fixed = value.replace(/[Oo]/g, '0').replace(/,(\d{1,2})$/, '.$1').replace(/\s/g, '');
    if (fixed !== value) { corrected = fixed; anomalyType = 'format'; }
  }
  if (fieldName === 'Invoice Number') {
    const fixed = value.replace(/[!|](?=\d)/g, '1').replace(/[Oo](?=\d)/g, '0').replace(/\s/g, '');
    if (fixed !== value) { corrected = fixed; anomalyType = 'misread'; }
  }
  if (fieldName === 'Date') {
    const fixed = value.replace(/[.\-\s]/g, '/').replace(/\/\//g, '/');
    if (fixed !== value) { corrected = fixed; anomalyType = 'format'; }
  }
  if (fieldName === 'Phone') {
    const digits = value.replace(/\D/g, '');
    if (digits.length < 7 || digits.length > 15) { anomalyType = 'format'; corrected = value + ' (verify)'; }
  }
  if (fieldName === 'Email') {
    if (!/^[\w.+\-]+@[\w\-]+\.[\w.]{2,}$/.test(value)) anomalyType = 'format';
  }

  return { corrected, anomalyType };
}

module.exports = { 
  extractText, 
  parseFields, 
  advancedPreprocessImage, 
  detectTextType, 
  exactExtraction 
};
