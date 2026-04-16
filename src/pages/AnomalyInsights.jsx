import React, { useState, useEffect } from 'react';
import { api } from '../api';
import { Activity, ShieldAlert, BarChart3, AlertTriangle, TrendingUp, Cpu } from 'lucide-react';
import {
  PieChart, Pie, Cell, AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip as RechartsTooltip, ResponsiveContainer
} from 'recharts';

const COLORS = ['var(--red)', 'var(--amber)', 'var(--accent)', 'var(--green)', 'var(--teal)'];
const RISK_COLORS = { high: 'var(--red)', medium: 'var(--amber)', low: 'var(--green)' };

export default function AnomalyInsights({ setActivePage }) {
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    api.getAnomalyInsights()
      .then(res => setData(res))
      .catch(console.error)
      .finally(() => setLoading(false));
  }, []);

  if (loading) {
    return (
      <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', padding: '4rem', color: 'var(--ink-3)' }}>
        <Activity className="animate-spin" size={32} style={{ marginBottom: '1rem', color: 'var(--accent)' }} />
        <p>Loading AI anomaly insights...</p>
      </div>
    );
  }

  if (!data) return <div style={{ padding: '2rem', textAlign: 'center', color: 'var(--red)' }}>Failed to load insights.</div>;

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '1.75rem', paddingBottom: '3rem' }}>
      {/* Header */}
      <div>
        <h1 style={{ marginBottom: '0.3rem', display: 'flex', alignItems: 'center', gap: '0.6rem' }}>
          <BrainCircuitIcon /> Anomaly Intelligence
        </h1>
        <p style={{ fontSize: '0.875rem' }}>Deep dive into AI-detected patterns, statistical outliers, and cross-field logic violations.</p>
      </div>

      {/* Top Stats */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))', gap: '1rem' }}>
        <StatCard title="Total Documents" value={data.total_documents_analyzed} icon={Activity} color="zinc" />
        <StatCard title="Fields Analyzed" value={data.total_fields_analyzed} icon={BarChart3} color="zinc" />
        <StatCard title="Anomalies Found" value={data.total_anomalies} icon={AlertTriangle} color="red" />
        <StatCard title="Anomaly Rate" value={`${((data.total_anomalies / Math.max(1, data.total_fields_analyzed)) * 100).toFixed(1)}%`} icon={TrendingUp} color="orange" />
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(400px, 1fr))', gap: '1.25rem' }}>
        
        {/* Error Distribution Pie */}
        <div className="card" style={{ padding: '1.5rem', display: 'flex', flexDirection: 'column', height: '360px' }}>
          <h3 style={{ marginBottom: '1.5rem', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
            <ShieldAlert size={16} color="var(--ink-2)" /> Error Distribution
          </h3>
          {data.error_distribution.length > 0 ? (
            <div style={{ flex: 1, minHeight: 0, display: 'flex', flexDirection: 'column' }}>
              <div style={{ flex: 1 }}>
                <ResponsiveContainer width="100%" height="100%">
                  <PieChart>
                    <Pie
                      data={data.error_distribution}
                      cx="50%" cy="50%"
                      innerRadius={65} outerRadius={90}
                      paddingAngle={4}
                      dataKey="value"
                      stroke="none"
                    >
                      {data.error_distribution.map((entry, index) => (
                        <Cell key={entry.name} fill={COLORS[index % COLORS.length]} />
                      ))}
                    </Pie>
                    <RechartsTooltip content={<CustomTooltip />} />
                  </PieChart>
                </ResponsiveContainer>
              </div>
              <div style={{ marginTop: '1rem', display: 'flex', flexWrap: 'wrap', justifyContent: 'center', gap: '1rem' }}>
                {data.error_distribution.map((d, i) => (
                  <div key={d.name} style={{ display: 'flex', alignItems: 'center', gap: '0.4rem', fontSize: '0.75rem', color: 'var(--ink-2)' }}>
                    <span style={{ width: '10px', height: '10px', borderRadius: '50%', background: COLORS[i % COLORS.length] }} />
                    {d.name} <span style={{ fontWeight: 600, color: 'var(--ink)' }}>({d.value})</span>
                  </div>
                ))}
              </div>
            </div>
          ) : (
            <div style={{ flex: 1, display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'var(--ink-3)' }}>No anomalies detected yet.</div>
          )}
        </div>

        {/* Monthly Trend Area Chart */}
        <div className="card" style={{ padding: '1.5rem', display: 'flex', flexDirection: 'column', height: '360px', gridColumn: 'auto / span 2' }}>
          <h3 style={{ marginBottom: '1.5rem', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
            <TrendingUp size={16} color="var(--ink-2)" /> Anomaly Trend History
          </h3>
          <div style={{ flex: 1, minHeight: 0 }}>
            <ResponsiveContainer width="100%" height="100%">
              <AreaChart data={data.trends} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
                <defs>
                  <linearGradient id="colorErrors" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="var(--red)" stopOpacity={0.25} />
                    <stop offset="95%" stopColor="var(--red)" stopOpacity={0} />
                  </linearGradient>
                </defs>
                <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="var(--border-soft)" />
                <XAxis dataKey="name" axisLine={false} tickLine={false} tick={{ fill: 'var(--ink-3)', fontSize: 11 }} dy={10} />
                <YAxis axisLine={false} tickLine={false} tick={{ fill: 'var(--ink-3)', fontSize: 11 }} />
                <RechartsTooltip content={<CustomTooltip />} />
                <Area type="monotone" dataKey="errors" stroke="var(--red)" strokeWidth={3} fillOpacity={1} fill="url(#colorErrors)" />
              </AreaChart>
            </ResponsiveContainer>
          </div>
        </div>

      </div>

      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(400px, 1fr))', gap: '1.25rem' }}>
        
        {/* Document Risk Levels */}
        <div className="card" style={{ padding: '1.5rem' }}>
          <h3 style={{ marginBottom: '1.5rem', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
            <AlertTriangle size={16} color="var(--ink-2)" /> Overall Document Risk
          </h3>
          <div style={{ display: 'flex', flexDirection: 'column', gap: '1.25rem' }}>
            {[
              { label: 'High Risk', value: data.risk_summary.high, color: RISK_COLORS.high },
              { label: 'Medium Risk', value: data.risk_summary.medium, color: RISK_COLORS.medium },
              { label: 'Low Risk', value: data.risk_summary.low, color: RISK_COLORS.low },
            ].map((risk, i) => {
              const total = data.total_documents_analyzed || 1;
              const pct = ((risk.value / total) * 100).toFixed(1);
              return (
                <div key={risk.label}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.8rem', fontWeight: 600, color: 'var(--ink-2)', marginBottom: '0.5rem' }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                      <span style={{ width: '8px', height: '8px', borderRadius: '50%', background: risk.color }} />
                      {risk.label}
                    </div>
                    <span>{risk.value} <span style={{ color: 'var(--ink-3)', fontWeight: 400 }}>({pct}%)</span></span>
                  </div>
                  <div style={{ height: '6px', width: '100%', background: 'var(--surface-3)', borderRadius: 'var(--r-full)', overflow: 'hidden' }}>
                    <div style={{ height: '100%', borderRadius: 'var(--r-full)', transition: 'all 1s ease', width: `${pct}%`, background: risk.color }} />
                  </div>
                </div>
              );
            })}
          </div>
        </div>

        {/* AI Detectors Triggered */}
        <div className="card" style={{ padding: '1.5rem', position: 'relative', overflow: 'hidden' }}>
          {/* subtle background pattern */}
          <div style={{ position: 'absolute', right: '-40px', top: '-40px', color: 'var(--surface-3)', opacity: 0.5, pointerEvents: 'none' }}>
            <Cpu size={250} />
          </div>
          
          <h3 style={{ marginBottom: '1.5rem', display: 'flex', alignItems: 'center', gap: '0.5rem', position: 'relative', zIndex: 10 }}>
            <Cpu size={16} color="var(--ink-2)" /> Deep AI Detectors Triggered
          </h3>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0.8rem', position: 'relative', zIndex: 10 }}>
            <DetectorStat label="Isolation Forest" value={data.ai_detectors.isolation_forest_anomalies} color="var(--accent)" bg="var(--accent-dim)" />
            <DetectorStat label="Cross-Field Multi-Variable" value={data.ai_detectors.cross_field_violations} color="var(--amber)" bg="var(--amber-dim)" />
            <DetectorStat label="Statistical Outliers" value={data.ai_detectors.statistical_outliers} color="var(--teal)" bg="var(--teal-dim)" />
            <DetectorStat label="Format & Logic Violations" value={data.ai_detectors.rule_violations} color="var(--red)" bg="var(--red-dim)" />
          </div>
        </div>

      </div>

      <div style={{ display: 'flex', justifyContent: 'flex-end', marginTop: '1rem', paddingTop: '1.5rem', borderTop: '1px solid var(--border-soft)' }}>
        <button 
          className="btn btn-primary"
          style={{ padding: '0.75rem 2rem', fontSize: '0.95rem' }}
          onClick={() => setActivePage && setActivePage('autocorrect')}
        >
          Next Step: Resolve Anomalies →
        </button>
      </div>

    </div>
  );
}

function BrainCircuitIcon() {
  return (
    <div style={{ width: '38px', height: '38px', borderRadius: 'var(--r-md)', background: 'var(--accent)', color: '#fff', display: 'flex', alignItems: 'center', justifyContent: 'center', boxShadow: '0 4px 12px rgba(37,99,235,0.3)' }}>
      <Cpu size={20} />
    </div>
  );
}

function StatCard({ title, value, icon: Icon, color }) {
  const isRed = color === 'red';
  const colorVar = isRed ? 'var(--red)' : color === 'orange' ? 'var(--amber)' : 'var(--ink-2)';
  const dimVar = isRed ? 'var(--red-dim)' : color === 'orange' ? 'var(--amber-dim)' : 'var(--surface-3)';
  
  return (
    <div className="card" style={{ padding: '1.25rem 1.4rem' }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '0.9rem' }}>
        <span style={{ fontSize: '0.75rem', fontWeight: 600, color: 'var(--ink-3)', letterSpacing: '0.02em', textTransform: 'uppercase' }}>{title}</span>
        <div style={{ width: '30px', height: '30px', borderRadius: 'var(--r-sm)', background: dimVar, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
          <Icon size={15} color={colorVar} />
        </div>
      </div>
      <div className="stat-num" style={{ color: isRed ? 'var(--red)' : 'var(--ink)' }}>{value}</div>
    </div>
  );
}

function DetectorStat({ label, value, color, bg }) {
  return (
    <div style={{ padding: '1rem', borderRadius: 'var(--r-md)', border: '1px solid var(--border-soft)', background: bg }}>
      <div style={{ fontSize: '1.6rem', fontWeight: 800, color: 'var(--ink)', marginBottom: '0.2rem', lineHeight: 1 }}>{value}</div>
      <div style={{ fontSize: '0.75rem', fontWeight: 600, color: color, lineHeight: 1.2 }}>{label}</div>
    </div>
  );
}

const CustomTooltip = ({ active, payload, label }) => {
  if (active && payload && payload.length) {
    return (
      <div style={{ background: 'var(--surface)', color: 'var(--ink)', fontSize: '0.75rem', padding: '0.5rem 0.8rem', borderRadius: 'var(--r-md)', boxShadow: 'var(--shadow-lg)', border: '1px solid var(--border)' }}>
        <div style={{ fontWeight: 600, marginBottom: '0.2rem', color: 'var(--ink-2)' }}>{label || payload[0].name}</div>
        <div style={{ fontWeight: 700, display: 'flex', alignItems: 'center', gap: '0.4rem' }}>
          {payload[0].name}: <span style={{ color: 'var(--accent)' }}>{payload[0].value}</span>
        </div>
      </div>
    );
  }
  return null;
};
