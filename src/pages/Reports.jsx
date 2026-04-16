import { useState, useEffect } from 'react';
import { Download, FileText, Loader, Database } from 'lucide-react';
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from 'recharts';
import { api } from '../api';

export default function Reports() {
  const [data, setData]           = useState(null);
  const [loading, setLoading]     = useState(true);
  const [downloading, setDownloading] = useState(null);

  useEffect(() => {
    api.getReports().then(setData).catch(console.error).finally(() => setLoading(false));
  }, []);

  const handleDownload = (report) => {
    setDownloading(report.id);
    let content;
    if (report.downloadData && report.downloadData.length > 0) {
      const keys = Object.keys(report.downloadData[0]);
      const rows = [keys, ...report.downloadData.map(r => keys.map(k => r[k] ?? ''))];
      content = rows.map(r => r.join(',')).join('\n');
    } else {
      content = `Report: ${report.name}\nDate: ${report.date}\nNo data available.`;
    }
    const blob = new Blob([content], { type: 'text/csv' });
    const a = Object.assign(document.createElement('a'), {
      href: URL.createObjectURL(blob),
      download: `${report.name.replace(/\s+/g, '_')}.csv`,
    });
    a.click(); URL.revokeObjectURL(a.href); setDownloading(null);
  };

  const handleExportAll = () => {
    if (!data?.saved_reports?.length) return;
    const rows = [['Report Name', 'Date', 'Size', 'Documents']];
    data.saved_reports.forEach(r => rows.push([r.name, r.date, r.size, r.downloadData?.length || 0]));
    const blob = new Blob([rows.map(r => r.join(',')).join('\n')], { type: 'text/csv' });
    const a = Object.assign(document.createElement('a'), { href: URL.createObjectURL(blob), download: 'full-report-dump.csv' });
    a.click(); URL.revokeObjectURL(a.href);
  };

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '1.75rem' }}>
      {/* Header */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
        <div>
          <h1 style={{ marginBottom: '0.3rem' }}>Reports & Analytics</h1>
          <p>Performance trends, accuracy metrics, and downloadable report archives.</p>
        </div>
        <div style={{ display: 'flex', gap: '0.75rem', alignItems: 'center', marginTop: '0.2rem' }}>
          <button className="btn btn-primary" onClick={handleExportAll} style={{ display: 'flex', alignItems: 'center', gap: '0.4rem' }}>
            <Download size={15} /> Export All
          </button>
        </div>
      </div>

      {loading ? (
        <div style={{ display: 'flex', justifyContent: 'center', padding: '4rem' }}>
          <Loader size={24} className="animate-spin" style={{ color: 'var(--accent)' }} />
        </div>
      ) : (
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 360px', gap: '1.25rem', alignItems: 'start' }}>
          {/* Chart */}
          <div className="card" style={{ padding: '1.5rem' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.5rem' }}>
              <div>
                <h3 style={{ marginBottom: '0.15rem' }}>AI Accuracy & Speed</h3>
                <p style={{ fontSize: '0.8rem' }}>Weekly extraction accuracy vs average processing time</p>
              </div>
              <div style={{ display: 'flex', gap: '1rem' }}>
                <LegendDot color="var(--green)" label="Accuracy %" />
                <LegendDot color="var(--accent)" label="Avg Time (ms)" />
              </div>
            </div>
            <div style={{ height: '260px' }}>
              {data.performance_trends.every(t => t.accuracy === null) ? (
                <div style={{ height: '100%', display: 'flex', alignItems: 'center', justifyContent: 'center', flexDirection: 'column', gap: '0.5rem' }}>
                  <div style={{ fontSize: '0.85rem', color: 'var(--ink-3)' }}>No completed documents yet</div>
                  <div style={{ fontSize: '0.78rem', color: 'var(--ink-3)' }}>Upload and process documents to see trends</div>
                </div>
              ) : (
              <ResponsiveContainer width="100%" height="100%">
                <LineChart data={data.performance_trends.filter(t => t.accuracy !== null)} margin={{ top: 4, right: 4, left: -24, bottom: 0 }}>
                  <CartesianGrid strokeDasharray="3 3" stroke="var(--border-soft)" vertical={false} />
                  <XAxis dataKey="name" tick={{ fontSize: 11, fill: 'var(--ink-3)' }} axisLine={false} tickLine={false} />
                  <YAxis yAxisId="l" tick={{ fontSize: 11, fill: 'var(--ink-3)' }} axisLine={false} tickLine={false} domain={[0, 100]} />
                  <YAxis yAxisId="r" orientation="right" tick={{ fontSize: 11, fill: 'var(--ink-3)' }} axisLine={false} tickLine={false} />
                  <Tooltip contentStyle={{ background: 'var(--surface)', border: '1px solid var(--border)', borderRadius: 'var(--r-md)', fontSize: '0.8rem', boxShadow: 'var(--shadow-md)' }} />
                  <Line yAxisId="l" type="monotone" dataKey="accuracy" name="Accuracy (%)" stroke="var(--green)" strokeWidth={2.5} dot={{ r: 4, fill: 'var(--green)', strokeWidth: 0 }} connectNulls />
                  <Line yAxisId="r" type="monotone" dataKey="processingMs" name="Avg Time (ms)" stroke="var(--accent)" strokeWidth={2.5} dot={{ r: 4, fill: 'var(--accent)', strokeWidth: 0 }} strokeDasharray="5 3" connectNulls />
                </LineChart>
              </ResponsiveContainer>
              )}
            </div>

            {/* Summary row */}
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '1rem', marginTop: '1.25rem', paddingTop: '1.25rem', borderTop: '1px solid var(--border-soft)' }}>
              {[
                { label: 'Peak Accuracy', value: data.summary?.peak_accuracy || '—',  color: 'var(--green)' },
                { label: 'Avg Speed',     value: data.summary?.avg_speed     || '—',  color: 'var(--accent)' },
                { label: 'Improvement',   value: data.summary?.improvement   || '—',  color: 'var(--teal)' },
              ].map(s => (
                <div key={s.label} style={{ textAlign: 'center' }}>
                  <div style={{ fontSize: '1.2rem', fontWeight: 700, color: s.color, fontFamily: 'var(--font-display)', letterSpacing: '-0.03em' }}>{s.value}</div>
                  <div style={{ fontSize: '0.72rem', color: 'var(--ink-3)', marginTop: '0.15rem' }}>{s.label}</div>
                </div>
              ))}
            </div>
          </div>

          {/* Saved reports */}
          <div className="card" style={{ padding: '1.25rem' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1rem' }}>
              <h3>Saved Reports</h3>
              <span className="badge badge-neutral">{data.saved_reports.length} files</span>
            </div>
            {data.saved_reports.length === 0 ? (
              <div style={{ padding: '2rem', textAlign: 'center', color: 'var(--ink-3)', fontSize: '0.85rem' }}>
                No reports yet. Process documents to generate reports.
              </div>
            ) : (
              <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
                {data.saved_reports.map(rep => (
                  <div key={rep.id} style={{
                    display: 'flex', alignItems: 'center', gap: '0.75rem',
                    padding: '0.75rem', background: 'var(--surface-2)',
                    borderRadius: 'var(--r-md)', border: '1px solid var(--border-soft)',
                    transition: 'background var(--speed) ease',
                  }}
                    onMouseEnter={e => e.currentTarget.style.background = 'var(--surface-3)'}
                    onMouseLeave={e => e.currentTarget.style.background = 'var(--surface-2)'}
                  >
                    <div style={{ width: '32px', height: '32px', borderRadius: 'var(--r-sm)', background: 'var(--green-dim)', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
                      <FileText size={14} color="var(--green)" />
                    </div>
                    <div style={{ flex: 1, minWidth: 0 }}>
                      <div style={{ fontSize: '0.825rem', fontWeight: 500, color: 'var(--ink)', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{rep.name}</div>
                      <div style={{ fontSize: '0.72rem', color: 'var(--ink-3)' }}>{rep.date} · {rep.size}</div>
                    </div>
                    <button className="btn-icon" onClick={() => handleDownload(rep)} disabled={downloading === rep.id} style={{ flexShrink: 0 }} title="Download">
                      {downloading === rep.id ? <Loader size={14} className="animate-spin" /> : <Download size={14} />}
                    </button>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      )}
      <style>{`@keyframes spin { to { transform: rotate(360deg); } }`}</style>
    </div>
  );
}

function LegendDot({ color, label }) {
  return (
    <div style={{ display: 'flex', alignItems: 'center', gap: '0.4rem', fontSize: '0.75rem', color: 'var(--ink-3)' }}>
      <span style={{ width: '8px', height: '8px', borderRadius: '50%', background: color, display: 'inline-block' }} />
      {label}
    </div>
  );
}
