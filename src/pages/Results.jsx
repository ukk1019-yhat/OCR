import React, { useState, useEffect } from 'react';
import { Info, ChevronRight, Check, X, Loader } from 'lucide-react';
import { api } from '../api';

export default function Results({ documentId }) {
  const [data, setData] = useState([]);
  const [confidence, setConfidence] = useState(null);
  const [docMeta, setDocMeta] = useState(null);
  const [loading, setLoading] = useState(true);
  const [exporting, setExporting] = useState(false);
  const [previewMode, setPreviewMode] = useState('text'); // 'image' | 'text'
  const docId = documentId;

  useEffect(() => {
    if (!docId || docId === 'latest') { setLoading(false); return; }
    api.getResults(docId)
      .then(res => { setData(res.extracted_fields || []); setConfidence(res.overall_confidence); setDocMeta(res); })
      .catch(() => { setData([]); })
      .finally(() => setLoading(false));
  }, [docId]);

  const acceptCorrection = async (id) => {
    await api.acceptCorrection(id).catch(console.error);
    setData(p => p.map(f => f.id === id ? { ...f, original: f.corrected, status: 'clean', type: null } : f));
    if (docId) api.getResults(docId).then(setDocMeta).catch(() => {});
  };
  const rejectCorrection = async (id) => {
    await api.rejectCorrection(id).catch(console.error);
    setData(p => p.map(f => f.id === id ? { ...f, corrected: f.original, status: 'clean', type: null } : f));
    if (docId) api.getResults(docId).then(setDocMeta).catch(() => {});
  };
  const handleExport = () => {
    setExporting(true);
    const rows = [['Field','Value','Confidence','Status'], ...data.map(f => [f.field, f.original, `${(f.confidence*100).toFixed(0)}%`, f.status])];
    const blob = new Blob([rows.map(r => r.join(',')).join('\n')], { type: 'text/csv' });
    const a = Object.assign(document.createElement('a'), { href: URL.createObjectURL(blob), download: `results-${docId}.csv` });
    a.click(); URL.revokeObjectURL(a.href); setExporting(false);
  };

  const invoiceNum = data.find(d => d.field === 'Invoice Number');
  const totalAmt   = data.find(d => d.field === 'Total Amount');
  const taxId      = data.find(d => d.field === 'Tax ID' || d.field === 'Tax ID / GSTIN');
  const errors     = data.filter(d => d.status === 'error').length;

  if (!loading && !docId) {
    return (
      <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', minHeight: '60vh', gap: '1rem', textAlign: 'center' }}>
        <div style={{ width: '56px', height: '56px', borderRadius: 'var(--r-lg)', background: 'var(--surface-3)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
          <Info size={24} color="var(--ink-3)" />
        </div>
        <h2 style={{ marginBottom: '0.25rem' }}>No document selected</h2>
        <p style={{ maxWidth: '360px' }}>Upload a document first, then come back here to review the extraction results.</p>
      </div>
    );
  }

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '1.75rem' }}>
      {/* Header */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
        <div>
          <h1 style={{ marginBottom: '0.3rem' }}>Extraction Results</h1>
          <p>{docMeta?.filename ? `${docMeta.filename} · ${docMeta.document_type || 'document'} · ${docMeta.processing_time_ms ? `${(docMeta.processing_time_ms/1000).toFixed(1)}s` : ''}` : 'Review OCR output, detected anomalies, and AI-suggested corrections.'}</p>
        </div>
        <div style={{ display: 'flex', gap: '0.6rem', alignItems: 'center', marginTop: '0.2rem' }}>
          {confidence !== null && (
            <div style={{ padding: '0.4rem 0.9rem', background: 'var(--green-dim)', borderRadius: 'var(--r-md)', fontSize: '0.82rem', fontWeight: 600, color: 'var(--green)' }}>
              {(confidence * 100).toFixed(1)}% accuracy
            </div>
          )}
          {errors > 0 && (
            <div style={{ padding: '0.4rem 0.9rem', background: 'var(--red-dim)', borderRadius: 'var(--r-md)', fontSize: '0.82rem', fontWeight: 600, color: 'var(--red)' }}>
              {errors} anomal{errors === 1 ? 'y' : 'ies'}
            </div>
          )}
          <button className="btn btn-primary" onClick={handleExport} disabled={exporting || !data.length}>
            {exporting ? 'Exporting…' : 'Export CSV'}
          </button>
        </div>
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1.25rem', alignItems: 'start' }}>
        {/* Document preview */}
        <div className="card" style={{ padding: '1.5rem', display: 'flex', flexDirection: 'column' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1rem' }}>
            <h3 style={{ margin: 0 }}>Document Preview</h3>
            <div style={{ display: 'flex', background: 'var(--surface-3)', borderRadius: 'var(--r-md)', padding: '3px', gap: '2px' }}>
              <button 
                onClick={() => setPreviewMode('text')}
                style={{ padding: '0.35rem 0.8rem', fontSize: '0.75rem', borderRadius: 'var(--r-sm)', border: 'none', background: previewMode === 'text' ? 'var(--surface)' : 'transparent', color: previewMode === 'text' ? 'var(--ink)' : 'var(--ink-3)', cursor: 'pointer', fontWeight: previewMode === 'text' ? 600 : 500, transition: 'all 0.2s', boxShadow: previewMode === 'text' ? '0 1px 2px rgba(0,0,0,0.05)' : 'none' }}
              >Annotated Text</button>
              <button 
                onClick={() => setPreviewMode('image')}
                style={{ padding: '0.35rem 0.8rem', fontSize: '0.75rem', borderRadius: 'var(--r-sm)', border: 'none', background: previewMode === 'image' ? 'var(--surface)' : 'transparent', color: previewMode === 'image' ? 'var(--ink)' : 'var(--ink-3)', cursor: 'pointer', fontWeight: previewMode === 'image' ? 600 : 500, transition: 'all 0.2s', boxShadow: previewMode === 'image' ? '0 1px 2px rgba(0,0,0,0.05)' : 'none' }}
              >Original Image</button>
            </div>
          </div>
          <div style={{ background: 'var(--surface-2)', borderRadius: 'var(--r-md)', border: '1px solid var(--border-soft)', overflow: 'hidden', minHeight: '520px', flex: 1, display: 'flex', position: 'relative' }}>
            {previewMode === 'image' ? (
              docId ? (
                <iframe 
                  src={api.getDocumentImageUrl(docId)}
                  title="Document Preview"
                  style={{ border: 'none', width: '100%', height: '100%', flex: 1, background: 'white' }}
                />
              ) : (
                <div style={{ margin: 'auto', color: 'var(--ink-3)' }}>No document available</div>
              )
            ) : (
              <AnnotatedText rawText={docMeta?.raw_text} fields={data} />
            )}
          </div>
        </div>


        {/* Extracted fields */}
        <div className="card" style={{ padding: '1.5rem', maxHeight: '520px', overflowY: 'auto' }}>
          <h3 style={{ marginBottom: '1rem' }}>Extracted Fields</h3>
          {loading ? (
            <div style={{ display: 'flex', justifyContent: 'center', padding: '3rem' }}>
              <Loader size={24} className="animate-spin" style={{ color: 'var(--accent)' }} />
            </div>
          ) : data.length === 0 ? (
            <div style={{ textAlign: 'center', padding: '3rem 1rem', color: 'var(--ink-3)', fontSize: '0.9rem' }}>
              No structured fields were detected in this document.
            </div>
          ) : (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '0.6rem' }}>
              {data.map(item => (
                <div key={item.id} style={{
                  padding: '0.875rem 1rem', borderRadius: 'var(--r-md)',
                  background: item.status === 'error' ? 'var(--red-dim)' : 'var(--surface-2)',
                  border: `1px solid ${item.status === 'error' ? 'rgba(220,38,38,0.2)' : 'var(--border-soft)'}`,
                  borderLeft: `3px solid ${item.status === 'error' ? 'var(--red)' : 'var(--green)'}`,
                }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '0.5rem' }}>
                    <span style={{ fontSize: '0.75rem', fontWeight: 600, color: 'var(--ink-2)', textTransform: 'uppercase', letterSpacing: '0.05em' }}>{item.field}</span>
                    <div style={{ display: 'flex', gap: '0.35rem', alignItems: 'center' }}>
                      {item.type && <span className="badge badge-red" style={{ fontSize: '0.65rem' }}>{item.type}</span>}
                      <span style={{ fontSize: '0.72rem', fontWeight: 600, color: item.confidence > 0.9 ? 'var(--green)' : 'var(--amber)', display: 'flex', alignItems: 'center', gap: '0.2rem' }}>
                        <Info size={11} />{(item.confidence * 100).toFixed(0)}%
                      </span>
                    </div>
                  </div>
                  {item.status === 'error' ? (
                    <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
                        <div style={{ flex: 1 }}>
                          <div style={{ fontSize: '0.7rem', color: 'var(--ink-3)', marginBottom: '0.15rem' }}>Extracted</div>
                          <div style={{ fontSize: '0.85rem', color: 'var(--red)', textDecoration: 'line-through' }}>{item.original || '(empty)'}</div>
                        </div>
                        <ChevronRight size={14} color="var(--ink-3)" />
                        <div style={{ flex: 1 }}>
                          <div style={{ fontSize: '0.7rem', color: 'var(--ink-3)', marginBottom: '0.15rem' }}>AI Suggested</div>
                          <div style={{ fontSize: '0.85rem', color: 'var(--green)', fontWeight: 600 }}>{item.corrected}</div>
                        </div>
                        <div style={{ display: 'flex', gap: '0.25rem' }}>
                          <button className="btn-icon" onClick={() => acceptCorrection(item.id)} style={{ width: '28px', height: '28px', background: 'var(--green-dim)', color: 'var(--green)', borderRadius: 'var(--r-sm)' }} title="Accept"><Check size={13} /></button>
                          <button className="btn-icon" onClick={() => rejectCorrection(item.id)} style={{ width: '28px', height: '28px', background: 'var(--red-dim)', color: 'var(--red)', borderRadius: 'var(--r-sm)' }} title="Reject"><X size={13} /></button>
                        </div>
                      </div>
                      {/* Deep anomaly findings */}
                      {item.anomaly_details?.findings?.length > 0 && (
                        <div style={{ display: 'flex', flexDirection: 'column', gap: '0.25rem', paddingTop: '0.4rem', borderTop: '1px solid rgba(220,38,38,0.15)' }}>
                          {item.anomaly_details.findings.map((f, i) => (
                            <div key={i} style={{ display: 'flex', alignItems: 'center', gap: '0.4rem', fontSize: '0.7rem' }}>
                              <span style={{ width: '6px', height: '6px', borderRadius: '50%', background: f.severity === 'high' ? 'var(--red)' : f.severity === 'medium' ? 'var(--amber)' : 'var(--ink-3)', flexShrink: 0 }} />
                              <span style={{ color: 'var(--ink-3)', fontFamily: 'var(--font-sans)' }}>
                                <span style={{ fontWeight: 600, color: 'var(--ink-2)' }}>{f.detector?.replace(/_/g, ' ')}</span>
                                {' — '}{f.message}
                              </span>
                            </div>
                          ))}
                        </div>
                      )}
                    </div>
                  ) : (
                    <div style={{ fontSize: '0.9rem', fontWeight: 500, color: 'var(--ink)' }}>{item.original}</div>
                  )}
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
      <style>{`@keyframes spin { to { transform: rotate(360deg); } }`}</style>
    </div>
  );
}

function AnnotatedText({ rawText, fields }) {
  if (!rawText) return <div style={{ margin: 'auto', color: 'var(--ink-3)' }}>No text available to extract.</div>;

  const errorStrings = fields
    .filter(f => f.status === 'error' && f.original)
    .map(f => f.original)
    .sort((a, b) => b.length - a.length); // Sort descending to match longer strings first

  if (errorStrings.length === 0) {
    return <div style={{ padding: '1.5rem', whiteSpace: 'pre-wrap', fontFamily: "'SF Mono', 'Fira Code', monospace", fontSize: '0.85rem', color: 'var(--ink)', width: '100%', overflowY: 'auto' }}>{rawText}</div>;
  }

  // Create regex pattern to split text safely, capturing the matched error strings
  const regexPattern = new RegExp(`(${errorStrings.map(s => escapeRegExp(s)).join('|')})`, 'g');
  const parts = rawText.split(regexPattern);

  return (
    <div style={{ padding: '1.5rem', whiteSpace: 'pre-wrap', fontFamily: "'SF Mono', 'Fira Code', monospace", fontSize: '0.85rem', color: 'var(--ink)', width: '100%', overflowY: 'auto', lineHeight: 1.6 }}>
      {parts.map((part, i) => {
        if (errorStrings.includes(part)) {
          return (
            <mark key={i} style={{ 
              background: 'rgba(220,38,38,0.15)', 
              color: 'var(--red)', 
              borderRadius: '4px', 
              padding: '0.1rem 0.25rem',
              fontWeight: 600,
              boxShadow: '0 0 0 1px rgba(220,38,38,0.3)',
              margin: '0 0.1rem'
            }} title="Detected Anomaly">
              {part}
            </mark>
          );
        }
        return <span key={i}>{part}</span>;
      })}
    </div>
  );
}

function escapeRegExp(string) {
  return string.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}

function Highlight({ value, hasError }) {
  if (!value) return <span style={{ color: 'var(--ink-3)' }}>—</span>;
  return (
    <span style={{ background: hasError ? 'rgba(220,38,38,0.15)' : 'transparent', padding: hasError ? '0 3px' : 0, borderRadius: '3px', color: hasError ? 'var(--red)' : 'inherit', border: hasError ? '1px solid rgba(220,38,38,0.3)' : 'none' }}>
      {value}
    </span>
  );
}
