import { useState, useEffect } from 'react';
import { AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from 'recharts';
import { FileText, AlertTriangle, CheckCircle, Clock, Info, ChevronRight, Check, X, Loader, ArrowUpRight, ArrowDownRight } from 'lucide-react';
import { api } from '../api';

export default function Dashboard({ setActivePage, focusedDocId }) {
  const [stats, setStats] = useState(null);
  const [loading, setLoading] = useState(true);
  const [docResult, setDocResult] = useState(null);
  const [docLoading, setDocLoading] = useState(false);
  const [fields, setFields] = useState([]);
  // Poll dashboard stats
  useEffect(() => {
    const fetchStats = () => {
      api.getDashboardStats().then(setStats).catch(console.error).finally(() => setLoading(false));
    };
    fetchStats();
    const interval = setInterval(fetchStats, 5000);
    return () => clearInterval(interval);
  }, []);

  function timeAgo(date) {
    const diff = Date.now() - new Date(date).getTime();
    const mins = Math.floor(diff / 60000);
    if (mins < 1)  return 'Just now';
    if (mins < 60) return `${mins}m ago`;
    const hrs = Math.floor(mins / 60);
    if (hrs < 24)  return `${hrs}h ago`;
    return `${Math.floor(hrs / 24)}d ago`;
  }

  useEffect(() => {
    if (!focusedDocId) return;
    setDocLoading(true);
    let attempts = 0;
    const poll = async () => {
      try {
        const res = await api.getResults(focusedDocId);
        if (res.processing_status === 'completed' && res.extracted_fields?.length > 0) {
          setDocResult(res); setFields(res.extracted_fields); setDocLoading(false); return;
        }
        if (res.processing_status === 'failed') { setDocLoading(false); return; }
      } catch (_) {}
      if (++attempts < 20) setTimeout(poll, 1500);
      else setDocLoading(false);
    };
    const t = setTimeout(poll, 1500);
    return () => clearTimeout(t);
  }, [focusedDocId]);

  // Removed inline accept/reject functions from Dashboard to enforce processing strictly on AutoCorrection page.
  // Removed CSV handleExport logic since we export directly to TXT now via api.js
  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '2rem' }}>

      {/* ── Uploaded doc analysis panel ── */}
      {focusedDocId && (
        <div style={{ background: 'var(--surface)', border: '1px solid var(--border)', borderRadius: 'var(--r-xl)', boxShadow: 'var(--shadow-md)', overflow: 'hidden' }}>
          {/* Panel header */}
          <div style={{ padding: '1.25rem 1.5rem', borderBottom: '1px solid var(--border-soft)', display: 'flex', justifyContent: 'space-between', alignItems: 'center', background: 'var(--surface-2)' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
              <div style={{ width: '8px', height: '8px', borderRadius: '50%', background: docLoading ? 'var(--amber)' : 'var(--green)', boxShadow: docLoading ? '0 0 0 3px rgba(217,119,6,0.2)' : '0 0 0 3px rgba(22,163,74,0.2)' }} />
              <div>
                <h3 style={{ margin: 0, fontSize: '0.95rem' }}>Document Analysis</h3>
                <p style={{ margin: 0, fontSize: '0.75rem', color: 'var(--ink-3)', fontFamily: 'var(--font-sans)' }}>
                  {focusedDocId.slice(0, 20).toUpperCase()}
                </p>
              </div>
            </div>
            <div style={{ display: 'flex', gap: '0.5rem', alignItems: 'center' }}>
              {docResult && (
                <span className="badge badge-green" style={{ fontSize: '0.78rem', padding: '0.3rem 0.7rem' }}>
                  {(docResult.overall_confidence * 100).toFixed(1)}% accuracy
                </span>
              )}
              <button className="btn btn-ghost btn-sm" onClick={() => api.exportTextData(focusedDocId)} disabled={!docResult?.raw_text}>Export TXT</button>
              <button className="btn btn-primary btn-sm" onClick={() => setActivePage('results')}>Full Results →</button>
            </div>
          </div>

          {/* Panel body */}
          <div style={{ padding: '1.25rem 1.5rem', display: 'flex', gap: '2rem', flexWrap: 'wrap' }}>
            {/* Document Text Preview */}
            <div style={{ width: '350px', flexShrink: 0, display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
              <div style={{ fontSize: '0.8rem', fontWeight: 600, color: 'var(--ink-2)' }}>Extracted Raw Text</div>
              <div style={{ background: 'var(--surface)', border: '1px solid var(--border)', borderRadius: 'var(--r-md)', padding: '1rem', boxShadow: 'inset 0 2px 4px rgba(0,0,0,0.02)', maxHeight: '420px', overflowY: 'auto' }}>
                <pre style={{ margin: 0, fontSize: '0.78rem', fontFamily: "'SF Mono', monospace", color: 'var(--ink)', whiteSpace: 'pre-wrap', wordBreak: 'break-word', lineHeight: 1.55 }}>
                  {docResult?.raw_text || 'Reading text stream...'}
                </pre>
              </div>
            </div>

            {/* Extraction Results */}
            <div style={{ flex: 1, minWidth: '300px' }}>
              <div style={{ fontSize: '0.8rem', fontWeight: 600, color: 'var(--ink-2)', marginBottom: '0.5rem' }}>Extracted Fields</div>
              {docLoading ? (
                <div style={{ display: 'flex', alignItems: 'center', gap: '1rem', padding: '0.75rem 1rem', background: 'var(--surface-2)', borderRadius: 'var(--r-md)', border: '1px solid var(--border-soft)' }}>
                  <Loader size={16} className="animate-spin" style={{ color: 'var(--accent)', flexShrink: 0 }} />
                  <div>
                    <div style={{ fontSize: '0.875rem', fontWeight: 600, color: 'var(--ink)' }}>Running OCR & field extraction…</div>
                    <div style={{ fontSize: '0.78rem', color: 'var(--ink-3)' }}>Tesseract is reading your document — usually takes 5–15 seconds</div>
                  </div>
                </div>
              ) : fields.length > 0 ? (
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(260px, 1fr))', gap: '0.6rem' }}>
                  {fields.map(item => (
                    <FieldCard key={item.id} item={item} onFix={() => setActivePage('autocorrect')} />
                  ))}
                </div>
              ) : (
                <div className="text-muted" style={{ padding: '2rem', textAlign: 'center', background: 'var(--surface-2)', borderRadius: 'var(--r-md)', fontSize: '0.85rem' }}>No fields extracted.</div>
              )}
            </div>
          </div>
        </div>
      )}

      {/* ── Page header ── */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
        <div>
          <h1 style={{ marginBottom: '0.3rem' }}>Platform Overview</h1>
          <p style={{ fontSize: '0.875rem' }}>OCR/ICR extraction performance and anomaly detection — live.</p>
        </div>
        <button className="btn btn-primary" onClick={() => setActivePage('upload')} style={{ marginTop: '0.2rem' }}>
          + Upload Document
        </button>
      </div>

      {loading ? <SkeletonCards /> : (
        <>
          {/* ── Stat cards ── */}
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: '1rem' }}>
            <StatCard label="Total Processed"     value={stats.total_processed.toLocaleString()}                 trend={stats.stat_trends?.total_processed?.value    || '+0'} up={stats.stat_trends?.total_processed?.up    ?? true}  icon={FileText}      color="var(--accent)" />
            <StatCard label="Anomalies Detected"  value={stats.anomalies_detected.toLocaleString()}              trend={stats.stat_trends?.anomalies_detected?.value  || '0'}  up={stats.stat_trends?.anomalies_detected?.up  ?? false} icon={AlertTriangle} color="var(--red)" />
            <StatCard label="Extraction Accuracy" value={stats.extraction_accuracy > 0 ? `${stats.extraction_accuracy}%` : '—'} trend={stats.stat_trends?.extraction_accuracy?.value || '+0%'} up={stats.stat_trends?.extraction_accuracy?.up ?? true} icon={CheckCircle} color="var(--green)" />
            <StatCard label="Avg Processing"      value={stats.avg_processing_time_ms > 0 ? `${(stats.avg_processing_time_ms/1000).toFixed(1)}s` : '—'} trend={stats.stat_trends?.avg_processing_time?.value || '0s'} up={stats.stat_trends?.avg_processing_time?.up ?? true} icon={Clock} color="var(--teal)" />
          </div>

          {/* ── Chart + recent uploads ── */}
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 340px', gap: '1.25rem', alignItems: 'start' }}>
            {/* Chart */}
            <div className="card" style={{ padding: '1.5rem' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.5rem' }}>
                <div>
                  <h3 style={{ marginBottom: '0.15rem' }}>Processing Volume</h3>
                  <p style={{ fontSize: '0.8rem' }}>Documents processed vs anomalies detected</p>
                </div>
                <span className="badge badge-neutral">Last 7 days</span>
              </div>
              <div style={{ height: '240px' }}>
                <ResponsiveContainer width="100%" height="100%">
                  <AreaChart data={stats.trends} margin={{ top: 4, right: 4, left: -24, bottom: 0 }}>
                    <defs>
                      <linearGradient id="gDocs" x1="0" y1="0" x2="0" y2="1">
                        <stop offset="0%" stopColor="var(--accent)" stopOpacity={0.18} />
                        <stop offset="100%" stopColor="var(--accent)" stopOpacity={0} />
                      </linearGradient>
                      <linearGradient id="gAnom" x1="0" y1="0" x2="0" y2="1">
                        <stop offset="0%" stopColor="var(--red)" stopOpacity={0.15} />
                        <stop offset="100%" stopColor="var(--red)" stopOpacity={0} />
                      </linearGradient>
                    </defs>
                    <CartesianGrid strokeDasharray="3 3" stroke="var(--border-soft)" vertical={false} />
                    <XAxis dataKey="name" tick={{ fontSize: 11, fill: 'var(--ink-3)' }} axisLine={false} tickLine={false} />
                    <YAxis tick={{ fontSize: 11, fill: 'var(--ink-3)' }} axisLine={false} tickLine={false} />
                    <Tooltip
                      contentStyle={{ background: 'var(--surface)', border: '1px solid var(--border)', borderRadius: 'var(--r-md)', fontSize: '0.8rem', boxShadow: 'var(--shadow-md)' }}
                      labelStyle={{ color: 'var(--ink)', fontWeight: 600 }}
                    />
                    <Area type="monotone" dataKey="documents" name="Documents" stroke="var(--accent)" strokeWidth={2} fill="url(#gDocs)" dot={false} />
                    <Area type="monotone" dataKey="anomalies" name="Anomalies" stroke="var(--red)" strokeWidth={2} fill="url(#gAnom)" dot={false} />
                  </AreaChart>
                </ResponsiveContainer>
              </div>
              <div style={{ display: 'flex', gap: '1.25rem', marginTop: '1rem', paddingTop: '1rem', borderTop: '1px solid var(--border-soft)' }}>
                <LegendDot color="var(--accent)" label="Documents" />
                <LegendDot color="var(--red)" label="Anomalies" />
              </div>
            </div>

            {/* Recent uploads */}
            <div className="card" style={{ padding: '1.25rem' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.1rem' }}>
                <h3>Recent Uploads</h3>
                <button className="btn btn-ghost btn-sm" onClick={() => setActivePage('upload')}>View all</button>
              </div>
              <div style={{ display: 'flex', flexDirection: 'column', gap: '0' }}>
                {stats.recent_uploads.map((item, i) => (
                  <div key={item.id} style={{
                    display: 'flex', justifyContent: 'space-between', alignItems: 'center',
                    padding: '0.75rem 0',
                    borderBottom: i < stats.recent_uploads.length - 1 ? '1px solid var(--border-soft)' : 'none',
                  }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '0.65rem', minWidth: 0 }}>
                      <div style={{ width: '32px', height: '32px', borderRadius: 'var(--r-sm)', background: 'var(--surface-3)', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
                        <FileText size={14} color="var(--ink-3)" />
                      </div>
                      <div style={{ minWidth: 0 }}>
                        <div style={{ fontSize: '0.825rem', fontWeight: 500, color: 'var(--ink)', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis', maxWidth: '140px' }}>{item.name}</div>
                        <div style={{ fontSize: '0.72rem', color: 'var(--ink-3)' }}>{item.date}</div>
                      </div>
                    </div>
                    <StatusBadge status={item.status} />
                  </div>
                ))}
              </div>
            </div>
          </div>

          {/* Stepper Wizard Navigation */}
          {fields.length > 0 && !docLoading && (
            <div style={{ display: 'flex', justifyContent: 'flex-end', marginTop: '1rem', paddingTop: '1.5rem', borderTop: '1px solid var(--border-soft)' }}>
              <button 
                className="btn btn-primary" 
                style={{ padding: '0.75rem 2rem', fontSize: '0.95rem' }} 
                onClick={() => setActivePage('insights')}
              >
                Next Step: Anomaly Statistics &amp; Classification →
              </button>
            </div>
          )}
        </>
      )}
      <style>{`@keyframes spin { to { transform: rotate(360deg); } }`}</style>
    </div>
  );
}

function FieldCard({ item, onFix }) {
  return (
    <div style={{
      padding: '0.875rem', borderRadius: 'var(--r-md)',
      background: item.status === 'error' ? 'var(--red-dim)' : 'var(--surface-2)',
      border: `1px solid ${item.status === 'error' ? 'rgba(220,38,38,0.2)' : 'var(--border-soft)'}`,
    }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '0.5rem' }}>
        <span style={{ fontSize: '0.75rem', fontWeight: 600, color: 'var(--ink-2)', textTransform: 'uppercase', letterSpacing: '0.04em' }}>{item.field}</span>
        <div style={{ display: 'flex', gap: '0.3rem', alignItems: 'center' }}>
          {item.type && <span className="badge badge-red" style={{ fontSize: '0.65rem' }}>{item.type}</span>}
          <span style={{ fontSize: '0.7rem', color: item.confidence > 0.9 ? 'var(--green)' : 'var(--amber)', fontWeight: 600 }}>
            {(item.confidence * 100).toFixed(0)}%
          </span>
        </div>
      </div>
      {item.status === 'error' ? (
        <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
          <span style={{ fontSize: '0.82rem', color: 'var(--red)', textDecoration: 'line-through', flex: 1 }}>{item.original || '(empty)'}</span>
          <ChevronRight size={12} color="var(--ink-3)" />
          <span style={{ fontSize: '0.82rem', color: 'var(--green)', fontWeight: 600, flex: 1 }}>{item.corrected}</span>
          <button className="btn btn-ghost btn-sm" onClick={() => onFix()} style={{ fontSize: '0.7rem', padding: '0.2rem 0.5rem' }}>Fix →</button>
        </div>
      ) : (
        <div style={{ fontSize: '0.875rem', fontWeight: 500, color: 'var(--ink)' }}>{item.original}</div>
      )}
    </div>
  );
}

function StatCard({ label, value, trend, up, icon: Icon, color }) {
  return (
    <div className="card" style={{ padding: '1.25rem 1.4rem' }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '0.9rem' }}>
        <span style={{ fontSize: '0.78rem', fontWeight: 500, color: 'var(--ink-3)', letterSpacing: '0.01em' }}>{label}</span>
        <div style={{ width: '30px', height: '30px', borderRadius: 'var(--r-sm)', background: `color-mix(in srgb, ${color} 12%, transparent)`, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
          <Icon size={15} color={color} />
        </div>
      </div>
      <div className="stat-num" style={{ marginBottom: '0.6rem' }}>{value}</div>
      <div style={{ display: 'flex', alignItems: 'center', gap: '0.3rem', fontSize: '0.75rem' }}>
        {up ? <ArrowUpRight size={13} color="var(--green)" /> : <ArrowDownRight size={13} color="var(--red)" />}
        <span style={{ color: up ? 'var(--green)' : 'var(--red)', fontWeight: 600 }}>{trend}</span>
        <span style={{ color: 'var(--ink-3)' }}>vs last week</span>
      </div>
    </div>
  );
}

function StatusBadge({ status }) {
  const map = {
    Clean:      'badge-green',
    Corrected:  'badge-blue',
    Anomalies:  'badge-red',
    Processing: 'badge-amber',
    Failed:     'badge-red',
  };
  return <span className={`badge ${map[status] || 'badge-neutral'}`}>{status}</span>;
}

function LegendDot({ color, label }) {
  return (
    <div style={{ display: 'flex', alignItems: 'center', gap: '0.4rem', fontSize: '0.78rem', color: 'var(--ink-3)' }}>
      <span style={{ width: '8px', height: '8px', borderRadius: '50%', background: color, display: 'inline-block' }} />
      {label}
    </div>
  );
}

function SkeletonCards() {
  return (
    <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: '1rem' }}>
      {[1,2,3,4].map(i => (
        <div key={i} className="card" style={{ padding: '1.25rem', height: '110px' }}>
          <div style={{ height: '10px', background: 'var(--border)', borderRadius: '4px', width: '55%', marginBottom: '1rem', opacity: 0.5 }} />
          <div style={{ height: '28px', background: 'var(--border)', borderRadius: '4px', width: '40%', opacity: 0.4 }} />
        </div>
      ))}
    </div>
  );
}
