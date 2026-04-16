import { useState, useEffect, useRef } from 'react';
import { Wand2, Check, X, Loader, Download } from 'lucide-react';
import { api } from '../api';

export default function AutoCorrection({ setActivePage }) {
  const [activeDoc, setActiveDoc] = useState(null);
  const [activeDocText, setActiveDocText] = useState('');
  const [suggestions, setSuggestions] = useState([]);
  const [loading, setLoading] = useState(true);
  const [textLoading, setTextLoading] = useState(false);
  const editedValues = useRef({});
  const [acting, setActing] = useState(null);

  useEffect(() => {
    api.getCorrections().then(r => setSuggestions(r.suggestions)).catch(console.error).finally(() => setLoading(false));
  }, []);

  useEffect(() => {
    if (suggestions.length > 0 && !activeDoc) {
      setActiveDoc(suggestions[0].docId);
    } else if (suggestions.length === 0) {
      setActiveDoc(null);
    }
  }, [suggestions, activeDoc]);

  const loadDocText = async (docId) => {
    if (!docId) return;
    setTextLoading(true);
    try {
      const res = await api.getResults(docId);
      setActiveDocText(res.raw_text || 'No text extracted');
    } catch (e) {
      setActiveDocText('Failed to load text');
    } finally {
      setTextLoading(false);
    }
  };

  useEffect(() => {
    loadDocText(activeDoc);
  }, [activeDoc]);

  const handleAction = async (id, action) => {
    setActing(id);
    try {
      const finalValue = editedValues.current[id] || undefined;
      await (action === 'accept' ? api.acceptCorrection(id) : api.rejectCorrection(id));
      setSuggestions(p => p.filter(s => s.id !== id));
      // Refetch the text so the preview updates dynamically with the new correction logic
      if (action === 'accept' && activeDoc) {
        loadDocText(activeDoc);
      }
    } catch (e) { console.error(e); }
    finally { setActing(null); }
  };

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '1.75rem', paddingBottom: '3rem' }}>
      {/* Header */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
        <div>
          <h1 style={{ marginBottom: '0.3rem' }}>Auto-Correction</h1>
          <p>Review AI-suggested field corrections. Hover or focus an item to see its source document.</p>
        </div>
        <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', padding: '0.5rem 0.9rem', background: 'var(--surface)', border: '1px solid var(--border)', borderRadius: 'var(--r-md)', fontSize: '0.82rem', fontWeight: 600, color: 'var(--ink-2)' }}>
          <Wand2 size={14} color="var(--accent)" />
          {loading ? '…' : suggestions.length} pending
        </div>
      </div>

      {loading ? (
        <div style={{ display: 'flex', justifyContent: 'center', padding: '4rem' }}>
          <Loader size={24} className="animate-spin" style={{ color: 'var(--accent)' }} />
        </div>
      ) : suggestions.length === 0 ? (
        <div className="card" style={{ padding: '4rem', textAlign: 'center' }}>
          <div style={{ width: '48px', height: '48px', borderRadius: '50%', background: 'var(--green-dim)', display: 'flex', alignItems: 'center', justifyContent: 'center', margin: '0 auto 1rem' }}>
            <Check size={22} color="var(--green)" />
          </div>
          <h3 style={{ marginBottom: '0.35rem' }}>All caught up</h3>
          <p style={{ fontSize: '0.85rem' }}>No pending corrections to review right now.</p>
        </div>
      ) : (
        <div style={{ display: 'flex', gap: '2rem', alignItems: 'flex-start', flexWrap: 'wrap' }}>
          
          {/* Left panel: Document Text Context */}
          <div style={{ width: '380px', flexShrink: 0, position: 'sticky', top: '80px', display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
            <div style={{ fontSize: '0.8rem', fontWeight: 600, color: 'var(--ink-2)' }}>Raw Extracted Text</div>
            <div style={{ background: 'var(--surface-3)', border: '1px solid var(--border)', borderRadius: 'var(--r-md)', padding: '1rem', boxShadow: 'inset 0 2px 4px rgba(0,0,0,0.02)', height: '420px', overflowY: 'auto' }}>
              {textLoading ? (
                <div style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', height: '100%', color: 'var(--ink-3)' }}>
                  <Loader size={18} className="animate-spin" />
                </div>
              ) : activeDocText ? (
                <pre style={{ margin: 0, fontSize: '0.75rem', fontFamily: "'SF Mono', monospace", color: 'var(--ink)', whiteSpace: 'pre-wrap', wordBreak: 'break-word', lineHeight: 1.55 }}>
                  {activeDocText}
                </pre>
              ) : (
                <div style={{ color: 'var(--ink-3)', fontSize: '0.85rem', textAlign: 'center', marginTop: '2rem' }}>Text unavailable</div>
              )}
            </div>
            {activeDoc && (
              <button className="btn btn-outline" style={{ marginTop: '0.5rem', width: '100%', display: 'flex', justifyContent: 'center', gap: '0.5rem' }} onClick={() => api.exportTextData(activeDoc)}>
                <Download size={14} /> Export Corrected Document (.txt)
              </button>
            )}
            <p style={{ fontSize: '0.75rem', color: 'var(--ink-3)', marginTop: '0.5rem', textAlign: 'center' }}>
              Tick an anomaly to accept it. The text above will dynamically update. Download the TXT at any point to get the clean output.
            </p>
          </div>

          {/* Right panel: Suggestions list */}
          <div style={{ flex: 1, minWidth: '350px', display: 'flex', flexDirection: 'column', gap: '0.6rem' }}>
            {/* Column headers */}
            <div style={{ display: 'grid', gridTemplateColumns: 'minmax(80px, 120px) 1fr 1fr 70px 70px', gap: '0.8rem', padding: '0 1rem', alignItems: 'center' }}>
              {['Doc ID', 'Original OCR', 'AI Suggestion', 'Conf.', ''].map((h, i) => (
                <span key={i} style={{ fontSize: '0.65rem', fontWeight: 600, letterSpacing: '0.04em', textTransform: 'uppercase', color: 'var(--ink-3)' }}>{h}</span>
              ))}
            </div>

            {suggestions.map(item => (
              <div
                key={item.id}
                className="card"
                onMouseEnter={() => setActiveDoc(item.docId)}
                style={{
                  display: 'grid', gridTemplateColumns: 'minmax(80px, 120px) 1fr 1fr 70px 70px',
                  gap: '0.8rem', padding: '0.85rem 1rem', alignItems: 'center',
                  opacity: acting === item.id ? 0.5 : 1, transition: 'all 0.2s ease',
                  border: activeDoc === item.docId ? '1.5px solid var(--accent)' : '1px solid var(--border)',
                  boxShadow: activeDoc === item.docId ? '0 0 0 2px rgba(37,99,235,0.1)' : 'var(--shadow-sm)',
                  cursor: 'pointer'
                }}
              >
                {/* Doc info */}
                <div style={{ overflow: 'hidden' }}>
                  <div style={{ fontSize: '0.78rem', fontWeight: 600, color: 'var(--ink)', fontFamily: 'var(--font-sans)', whiteSpace: 'nowrap', textOverflow: 'ellipsis' }}>{item.shortDocId}</div>
                  <div style={{ fontSize: '0.7rem', color: 'var(--accent)', marginTop: '0.1rem', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{item.field}</div>
                </div>

                {/* Original */}
                <div style={{ fontSize: '0.8rem', color: 'var(--red)', textDecoration: 'line-through', fontFamily: "'SF Mono', monospace", wordBreak: 'break-all' }}>
                  {item.original}
                </div>

                {/* Suggestion (editable) */}
                <input
                  type="text"
                  defaultValue={item.suggested}
                  onChange={e => { editedValues.current[item.id] = e.target.value; }}
                  className="input"
                  style={{ fontSize: '0.8rem', fontWeight: 600, color: 'var(--green)', fontFamily: "'SF Mono', monospace", padding: '0.35rem 0.5rem' }}
                />

                {/* Confidence */}
                <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'flex-end', gap: '0.2rem' }}>
                  <span style={{ fontSize: '0.72rem', fontWeight: 600, color: item.confidence > 0.9 ? 'var(--green)' : 'var(--amber)' }}>
                    {(item.confidence * 100).toFixed(0)}%
                  </span>
                  <div style={{ width: '100%', height: '3px', background: 'var(--border)', borderRadius: 'var(--r-full)', overflow: 'hidden' }}>
                    <div style={{ height: '100%', width: `${item.confidence * 100}%`, background: item.confidence > 0.9 ? 'var(--green)' : 'var(--amber)', borderRadius: 'var(--r-full)' }} />
                  </div>
                </div>

                {/* Actions */}
                <div style={{ display: 'flex', gap: '0.3rem', justifyContent: 'flex-end' }}>
                  <button className="btn-icon" onClick={(e) => { e.stopPropagation(); handleAction(item.id, 'accept'); }} disabled={!!acting} style={{ width: '30px', height: '30px', background: 'var(--green-dim)', color: 'var(--green)', borderRadius: 'var(--r-sm)' }} title="Accept">
                    <Check size={14} />
                  </button>
                  <button className="btn-icon" onClick={(e) => { e.stopPropagation(); handleAction(item.id, 'reject'); }} disabled={!!acting} style={{ width: '30px', height: '30px', background: 'var(--red-dim)', color: 'var(--red)', borderRadius: 'var(--r-sm)' }} title="Reject">
                    <X size={14} />
                  </button>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Stepper Wizard Navigation */}
      {!loading && (
        <div style={{ display: 'flex', justifyContent: 'flex-end', marginTop: '2rem', paddingTop: '1.5rem', borderTop: '1px solid var(--border-soft)' }}>
          <button 
            className="btn btn-primary" 
            style={{ padding: '0.75rem 2rem', fontSize: '0.95rem' }} 
            onClick={() => setActivePage && setActivePage('reports')}
          >
            Complete: View Final Reports →
          </button>
        </div>
      )}

      <style>{`@keyframes spin { to { transform: rotate(360deg); } }`}</style>
    </div>
  );
}
