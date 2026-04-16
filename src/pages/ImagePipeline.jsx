import { useState, useRef } from 'react';
import { UploadCloud, Image as ImageIcon, Zap, CheckCircle, AlertCircle, FileText, Type } from 'lucide-react';
import { api } from '../api';

export default function ImagePipeline() {
  const [file, setFile] = useState(null);
  const [phase, setPhase] = useState('idle'); // idle -> uploading -> processing -> extracting -> done
  const [error, setError] = useState(null);
  
  const [originalUrl, setOriginalUrl] = useState(null);
  const [processedUrl, setProcessedUrl] = useState(null);
  const [filePath, setFilePath] = useState(null);
  const [processedPath, setProcessedPath] = useState(null);
  
  const [extraction, setExtraction] = useState(null); // { text, type, confidence, engine }
  const fileInputRef = useRef(null);

  const startPipeline = async (selectedFile) => {
    try {
      setFile(selectedFile);
      setPhase('uploading');
      setError(null);

      // Step 1: Upload
      const fd = new FormData();
      fd.append('image', selectedFile);
      const uploadRes = await api.uploadImagePipeline(fd);
      setFilePath(uploadRes.filePath);
      
      // Ensure we hit the API properly to show the image preview
      const previewUrl = `/api/v1/pipeline/image?path=${encodeURIComponent(uploadRes.filePath)}`;
      setOriginalUrl(previewUrl);

      // Step 2: Process Image
      setPhase('processing');
      const processRes = await api.processImagePipeline(uploadRes.filePath);
      setProcessedPath(processRes.processedPath);
      
      const enhancedPreviewUrl = `/api/v1/pipeline/image?path=${encodeURIComponent(processRes.processedPath)}`;
      setProcessedUrl(enhancedPreviewUrl);

      // Step 3: Extract Text
      setPhase('extracting');
      const extractRes = await api.extractImagePipeline(processRes.processedPath);
      
      setExtraction({
        text: extractRes.text,
        type: processRes.textType,
        confidence: extractRes.confidence,
        engine: extractRes.engine,
      });

      setPhase('done');
    } catch (err) {
      console.error(err);
      setError(err.message || 'Pipeline process failed.');
      setPhase('error');
    }
  };

  const handleDrop = (e) => {
    e.preventDefault();
    if (e.dataTransfer.files?.length) {
      startPipeline(e.dataTransfer.files[0]);
    }
  };
  
  const badgeColors = {
    handwritten: 'var(--amber)',
    printed: 'var(--indigo)',
    mixed: 'var(--blue)',
  };

  return (
    <div style={{ maxWidth: '1000px', width: '100%' }}>
      <div style={{ marginBottom: '2rem' }}>
        <h1 style={{ marginBottom: '0.35rem' }}>Advanced Image OCR</h1>
        <p>Specialized pipeline for scanned images and handwritten documents with deep preprocessing.</p>
      </div>

      {phase === 'idle' || phase === 'error' ? (
        <div
          onDragOver={(e) => e.preventDefault()}
          onDrop={handleDrop}
          onClick={() => fileInputRef.current.click()}
          style={{
            border: '2px dashed var(--border)',
            borderRadius: 'var(--r-xl)', padding: '4rem 2rem',
            display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '1rem',
            cursor: 'pointer', background: 'var(--surface)', textAlign: 'center',
            transition: 'all 0.2s',
          }}
        >
          <div style={{ width: '64px', height: '64px', borderRadius: 'var(--r-lg)', background: 'var(--surface-3)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
            <ImageIcon size={28} color="var(--ink-3)" />
          </div>
          <div>
            <div style={{ fontSize: '1.1rem', fontWeight: 600, color: 'var(--ink)' }}>Upload Image or Scan</div>
            <div style={{ fontSize: '0.85rem', color: 'var(--ink-3)', marginTop: '0.25rem' }}>Drop a JPG, PNG, or PDF here</div>
          </div>
          <input type="file" accept=".pdf,.png,.jpg,.jpeg,.tiff" style={{ display: 'none' }} ref={fileInputRef} onChange={e => e.target.files?.length && startPipeline(e.target.files[0])} />
        </div>
      ) : (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '1.5rem' }}>
          
          {/* Progress Banner */}
          <div style={{ padding: '1.2rem', background: 'var(--surface)', borderRadius: 'var(--r-lg)', border: '1px solid var(--border)', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '1rem' }}>
              <div style={{ width: '40px', height: '40px', borderRadius: 'var(--r-md)', background: phase === 'done' ? 'var(--green-dim)' : 'var(--accent-dim)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                {phase === 'done' ? <CheckCircle size={20} color="var(--green)" /> : <Zap size={20} color="var(--accent)" className={phase !== 'error' ? "animate-pulse" : ""} />}
              </div>
              <div>
                <div style={{ fontWeight: 600, color: 'var(--ink)' }}>
                  {phase === 'uploading' && 'Uploading document...'}
                  {phase === 'processing' && 'Enhancing & Denoising image...'}
                  {phase === 'extracting' && 'Running OCR/ICR extraction...'}
                  {phase === 'done' && 'Processing Complete'}
                </div>
                <div style={{ fontSize: '0.8rem', color: 'var(--ink-3)' }}>{file?.name}</div>
              </div>
            </div>
            {phase !== 'done' && <div className="spinner" style={{ width: '20px', height: '20px', borderWidth: '2px', borderColor: 'var(--border)', borderTopColor: 'var(--accent)' }} />}
          </div>

          {/* Visuals */}
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(300px, 1fr))', gap: '1.5rem' }}>
            
            <div style={{ background: 'var(--surface)', padding: '1rem', borderRadius: 'var(--r-lg)', border: '1px solid var(--border)' }}>
              <div style={{ fontSize: '0.8rem', fontWeight: 600, color: 'var(--ink-2)', marginBottom: '0.75rem', textTransform: 'uppercase', letterSpacing: '0.05em' }}>Original Image</div>
              <div style={{ width: '100%', aspectRatio: '4/3', background: 'var(--surface-2)', borderRadius: 'var(--r-md)', overflow: 'hidden', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                {originalUrl ? (
                  <img src={originalUrl} alt="Original" style={{ width: '100%', height: '100%', objectFit: 'contain' }} />
                ) : (
                  <div className="spinner" style={{ width: '24px', height: '24px' }} />
                )}
              </div>
            </div>

            <div style={{ background: 'var(--surface)', padding: '1rem', borderRadius: 'var(--r-lg)', border: '1px solid var(--accent-light)' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '0.75rem' }}>
                <div style={{ fontSize: '0.8rem', fontWeight: 600, color: 'var(--accent)', textTransform: 'uppercase', letterSpacing: '0.05em' }}>Enhanced Output</div>
                {phase === 'processing' && <span style={{ fontSize: '0.7rem', color: 'var(--accent)', fontWeight: 500, background: 'var(--accent-dim)', padding: '2px 6px', borderRadius: '4px' }}>Binarizing...</span>}
              </div>
              <div style={{ width: '100%', aspectRatio: '4/3', background: 'var(--surface-2)', borderRadius: 'var(--r-md)', overflow: 'hidden', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                {processedUrl ? (
                  <img src={processedUrl} alt="Processed" style={{ width: '100%', height: '100%', objectFit: 'contain' }} />
                ) : (
                  <FileText size={24} color="var(--ink-4)" opacity={0.5} />
                )}
              </div>
            </div>

          </div>

          {/* Extraction Results */}
          {extraction && (
            <div className="animate-fade-up" style={{ background: 'var(--surface)', padding: '1.5rem', borderRadius: 'var(--r-lg)', border: '1px solid var(--border)' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '1.25rem', paddingBottom: '1rem', borderBottom: '1px solid var(--border-soft)' }}>
                <div>
                  <h3 style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', marginBottom: '0.35rem' }}>
                    <Type size={18} color="var(--accent)" /> Extracted Text
                  </h3>
                  <div style={{ fontSize: '0.825rem', color: 'var(--ink-3)' }}>Powered by {extraction.engine}</div>
                </div>
                <div style={{ display: 'flex', gap: '0.75rem', alignItems: 'center' }}>
                  <div style={{ padding: '0.35rem 0.75rem', background: 'var(--surface-2)', borderRadius: 'var(--r-full)', fontSize: '0.75rem', fontWeight: 600, color: 'var(--ink)', display: 'flex', alignItems: 'center', gap: '0.4rem', border: '1px solid var(--border-soft)' }}>
                    Accuracy {(extraction.confidence * 100).toFixed(1)}%
                  </div>
                  <div style={{ padding: '0.35rem 0.75rem', background: badgeColors[extraction.type] ? `color-mix(in srgb, ${badgeColors[extraction.type]} 15%, transparent)` : 'var(--surface-2)', color: badgeColors[extraction.type] || 'var(--ink)', borderRadius: 'var(--r-full)', fontSize: '0.75rem', fontWeight: 600, textTransform: 'capitalize', display: 'flex', alignItems: 'center', gap: '0.4rem', border: `1px solid ${badgeColors[extraction.type] ? `color-mix(in srgb, ${badgeColors[extraction.type]} 30%, transparent)` : 'var(--border)'}` }}>
                    {extraction.type} Document
                  </div>
                </div>
              </div>
              
              <div style={{ background: 'var(--surface-2)', padding: '1.25rem', borderRadius: 'var(--r-md)', fontFamily: 'monospace', fontSize: '0.9rem', lineHeight: 1.6, color: 'var(--ink)', whiteSpace: 'pre-wrap', maxHeight: '300px', overflowY: 'auto' }}>
                {extraction.text || <span style={{ color: 'var(--ink-4)' }}>No legible text detected.</span>}
              </div>

              <div style={{ marginTop: '1.5rem', display: 'flex', justifyContent: 'flex-end' }}>
                <button className="btn btn-ghost" onClick={() => { setPhase('idle'); setExtraction(null); setOriginalUrl(null); setProcessedUrl(null); }} style={{ padding: '0.5rem 1rem' }}>
                  Process another document
                </button>
              </div>
            </div>
          )}

        </div>
      )}

      {error && (
        <div style={{ marginTop: '1rem', display: 'flex', alignItems: 'center', gap: '0.6rem', padding: '0.75rem 1rem', background: 'var(--red-dim)', border: '1px solid rgba(220,38,38,0.2)', borderRadius: 'var(--r-md)', fontSize: '0.85rem', color: 'var(--red)' }}>
          <AlertCircle size={15} /> {error}
        </div>
      )}
    </div>
  );
}
