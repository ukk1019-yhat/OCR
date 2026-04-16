import { useState } from 'react';
import {
  ArrowRight, ScanLine, Brain, ShieldCheck, Zap, GitBranch,
  FileSearch, BarChart3, CheckCircle, ChevronRight, Layers,
  TrendingUp, Fingerprint, Braces, Cpu, Image, FileText, Activity
} from 'lucide-react';

const PIPELINE = [
  { step: '01', label: 'Upload',            desc: 'PDF, PNG, JPEG, TIFF — any format, any size', icon: FileText },
  { step: '02', label: 'Preprocess Image',  desc: 'Upscale · Grayscale · Normalize · Sharpen — before OCR', icon: Image },
  { step: '03', label: 'OCR / ICR',         desc: 'Printed text + handwriting on preprocessed image', icon: ScanLine },
  { step: '04', label: 'AI Analysis',       desc: '6 detectors run in parallel ensemble', icon: Brain },
  { step: '05', label: 'Anomaly Report',    desc: 'Per-field findings with severity scores', icon: Activity },
  { step: '06', label: 'Auto-Correction',   desc: 'Accept, reject, or edit AI suggestions', icon: CheckCircle },
];

const DETECTORS = [
  { icon: Braces,      name: 'Rule Engine',          tag: 'Domain Rules',       color: '#2563eb', bg: '#dbeafe', desc: '30+ hard rules covering invoice numbers, dates, amounts, GSTIN, phone, email — catches format violations instantly without any ML overhead.' },
  { icon: TrendingUp,  name: 'Statistical Outlier',  tag: 'Z-score + IQR',      color: '#0d9488', bg: '#ccfbf1', desc: 'Tracks numeric field values across all processed documents. Flags values that deviate more than 3σ from the historical mean or fall outside 1.5×IQR.' },
  { icon: GitBranch,   name: 'Isolation Forest',     tag: 'Unsupervised ML',    color: '#7c3aed', bg: '#ede9fe', desc: 'Builds 50 random binary trees on document feature vectors. Documents isolated in fewer splits score higher anomaly probability — no labels needed.' },
  { icon: Fingerprint, name: 'Cross-Field Logic',    tag: 'Consistency Checks', color: '#d97706', bg: '#fef3c7', desc: 'Validates relationships between fields — zero amount on a dated invoice, tax exceeding total, invoice number that looks like a date (field swap).' },
  { icon: FileSearch,  name: 'Levenshtein Fuzzy',    tag: 'Edit Distance',      color: '#dc2626', bg: '#fee2e2', desc: 'Tries common OCR substitutions (O→0, I→1, S→5, Z→2) and checks if the result matches known field patterns. Catches misreads rule-based checks miss.' },
  { icon: Cpu,         name: 'TF-IDF Classifier',    tag: 'Document Type',      color: '#059669', bg: '#d1fae5', desc: 'Scores document text against keyword dictionaries for invoice / receipt / form / KYC / contract. Flags type mismatches and field-context violations.' },
];

const COMPARISON = [
  { feature: 'Image preprocessing before OCR',  us: true,  others: false },
  { feature: 'Handwriting recognition (ICR)',    us: true,  others: false },
  { feature: 'Ensemble AI (6 detectors)',        us: true,  others: false },
  { feature: 'Statistical outlier detection',    us: true,  others: false },
  { feature: 'Cross-field logic validation',     us: true,  others: false },
  { feature: 'Isolation Forest anomaly scoring', us: true,  others: false },
  { feature: 'Per-field confidence score',       us: true,  others: true  },
  { feature: 'Auto-correction workflow',         us: true,  others: true  },
  { feature: 'Works offline / on-premise',       us: true,  others: false },
];

const STATS = [
  { value: '6',    label: 'AI Detectors',    sub: 'running in ensemble per document' },
  { value: '95%+', label: 'Field Accuracy',  sub: 'after preprocessing + ensemble' },
  { value: '<2s',  label: 'Pipeline Time',   sub: 'preprocess → OCR → analysis' },
  { value: '100%', label: 'Audit Trail',     sub: 'every decision logged per field' },
];

const USE_CASES = [
  { icon: Layers,      title: 'Invoices & Bills',      desc: 'Catch misread amounts, wrong dates, missing tax IDs, and format errors before they hit your ERP. Cross-field checks ensure tax never exceeds total.' },
  { icon: ShieldCheck, title: 'KYC & Compliance',      desc: 'Validate identity documents, detect field swaps, flag suspicious patterns, and classify document type automatically with TF-IDF.' },
  { icon: BarChart3,   title: 'Forms & Applications',  desc: 'Extract handwritten fields with ICR on preprocessed images, validate against business rules, and score confidence per field with ensemble AI.' },
];

export default function Intro({ onEnterApp }) {
  const [activeDetector, setActiveDetector] = useState(0);

  return (
    <div style={{ width: '100%', minHeight: '100vh', fontFamily: "'Inter', -apple-system, sans-serif", background: '#fafaf9', color: '#1a1916', overflowX: 'hidden' }}>

      {/* ── Nav ── */}
      <nav style={{ position: 'sticky', top: 0, zIndex: 100, background: 'rgba(250,250,249,0.95)', backdropFilter: 'blur(16px)', borderBottom: '1px solid #e4e2db', padding: '0 8%', height: '64px', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '0.6rem' }}>
          <div style={{ width: '32px', height: '32px', borderRadius: '9px', background: '#2563eb', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
            <ScanLine size={16} color="white" strokeWidth={2.5} />
          </div>
          <span style={{ fontWeight: 800, fontSize: '1.05rem', letterSpacing: '-0.025em' }}>Owl Dawn AI</span>
          <span style={{ fontSize: '0.68rem', background: '#dbeafe', color: '#2563eb', padding: '0.2rem 0.55rem', borderRadius: '5px', fontWeight: 700, marginLeft: '0.25rem', letterSpacing: '0.02em' }}>IDP</span>
        </div>
        <div style={{ display: 'flex', gap: '0.6rem', alignItems: 'center' }}>
          <button onClick={onEnterApp} style={{ padding: '0.5rem 1.1rem', borderRadius: '8px', border: '1.5px solid #e4e2db', background: 'transparent', color: '#4a4845', fontSize: '0.875rem', fontWeight: 500, cursor: 'pointer', fontFamily: 'inherit' }}>Sign in</button>
          <button onClick={onEnterApp} style={{ padding: '0.5rem 1.25rem', borderRadius: '8px', border: 'none', background: '#2563eb', color: 'white', fontSize: '0.875rem', fontWeight: 600, cursor: 'pointer', fontFamily: 'inherit', display: 'flex', alignItems: 'center', gap: '0.4rem', boxShadow: '0 2px 8px rgba(37,99,235,0.3)' }}>
            Open App <ArrowRight size={14} />
          </button>
        </div>
      </nav>

      {/* ── Hero ── */}
      <section style={{ padding: '7rem 8% 6rem', maxWidth: '1400px', margin: '0 auto' }}>
        <div style={{ display: 'grid', gridTemplateColumns: '1.1fr 0.9fr', gap: '5rem', alignItems: 'center' }}>
          <div>
            <div style={{ display: 'inline-flex', alignItems: 'center', gap: '0.5rem', padding: '0.3rem 0.85rem', background: '#dbeafe', borderRadius: '20px', fontSize: '0.75rem', fontWeight: 700, color: '#2563eb', marginBottom: '1.75rem', letterSpacing: '0.04em', textTransform: 'uppercase' }}>
              <Brain size={12} /> Intelligent Document Processing
            </div>
            <h1 style={{ fontSize: 'clamp(2.4rem, 4.5vw, 3.6rem)', fontWeight: 900, letterSpacing: '-0.04em', lineHeight: 1.05, marginBottom: '1.5rem', color: '#1a1916' }}>
              OCR that actually<br />
              <span style={{ color: '#2563eb' }}>understands errors</span>
            </h1>
            <p style={{ fontSize: '1.1rem', color: '#4a4845', lineHeight: 1.8, marginBottom: '2.25rem', maxWidth: '520px' }}>
              Most OCR tools extract text and stop. Owl Dawn AI preprocesses every image first, then runs 6 independent AI models on every extracted field — catching misreads, format violations, statistical outliers, and cross-field logic errors that standard OCR completely misses.
            </p>
            <div style={{ display: 'flex', gap: '0.875rem', flexWrap: 'wrap', marginBottom: '2rem' }}>
              <button onClick={onEnterApp} style={{ padding: '0.875rem 2rem', borderRadius: '11px', border: 'none', background: '#2563eb', color: 'white', fontSize: '0.95rem', fontWeight: 700, cursor: 'pointer', fontFamily: 'inherit', display: 'flex', alignItems: 'center', gap: '0.5rem', boxShadow: '0 4px 18px rgba(37,99,235,0.32)' }}>
                Try it now <ArrowRight size={16} />
              </button>
              <button onClick={onEnterApp} style={{ padding: '0.875rem 1.75rem', borderRadius: '11px', border: '1.5px solid #e4e2db', background: 'white', color: '#1a1916', fontSize: '0.95rem', fontWeight: 600, cursor: 'pointer', fontFamily: 'inherit' }}>
                See how it works
              </button>
            </div>
            <div style={{ display: 'flex', gap: '2rem', flexWrap: 'wrap' }}>
              {['Image preprocessing before OCR', 'Handwriting support (ICR)', 'No GPU required', 'Works offline'].map(t => (
                <div key={t} style={{ display: 'flex', alignItems: 'center', gap: '0.4rem', fontSize: '0.82rem', color: '#8a8784' }}>
                  <CheckCircle size={13} color="#16a34a" /> {t}
                </div>
              ))}
            </div>
          </div>

          {/* Pipeline preview card */}
          <div style={{ background: 'white', border: '1px solid #e4e2db', borderRadius: '20px', padding: '2rem', boxShadow: '0 12px 48px rgba(26,25,22,0.09)' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.5rem' }}>
              <span style={{ fontSize: '0.72rem', fontWeight: 700, letterSpacing: '0.07em', textTransform: 'uppercase', color: '#8a8784' }}>AI Pipeline</span>
              <span style={{ fontSize: '0.7rem', background: '#dcfce7', color: '#16a34a', padding: '0.2rem 0.6rem', borderRadius: '4px', fontWeight: 600 }}>Live</span>
            </div>
            {PIPELINE.map((p, i) => {
              const Icon = p.icon;
              return (
                <div key={p.step} style={{ display: 'flex', gap: '0.875rem', alignItems: 'flex-start' }}>
                  <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', width: '34px', flexShrink: 0 }}>
                    <div style={{ width: '34px', height: '34px', borderRadius: '50%', flexShrink: 0, display: 'flex', alignItems: 'center', justifyContent: 'center', background: i < 4 ? '#2563eb' : '#f4f3f0', color: i < 4 ? 'white' : '#8a8784' }}>
                      {i < 4 ? <CheckCircle size={14} /> : <Icon size={14} />}
                    </div>
                    {i < PIPELINE.length - 1 && <div style={{ width: '2px', height: '24px', background: i < 3 ? '#2563eb' : '#e4e2db', margin: '3px 0' }} />}
                  </div>
                  <div style={{ paddingTop: '0.4rem', paddingBottom: i < PIPELINE.length - 1 ? '0' : '0' }}>
                    <div style={{ fontSize: '0.875rem', fontWeight: 600, color: i < 4 ? '#1a1916' : '#8a8784', marginBottom: '0.1rem' }}>{p.label}</div>
                    <p style={{ fontSize: '0.75rem', color: '#8a8784', marginBottom: i < PIPELINE.length - 1 ? '0.6rem' : 0, lineHeight: 1.4 }}>{p.desc}</p>
                  </div>
                </div>
              );
            })}
            <div style={{ marginTop: '1.25rem', padding: '1rem', background: '#f4f3f0', borderRadius: '12px', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <div style={{ fontSize: '0.82rem', color: '#4a4845' }}>
                <span style={{ fontWeight: 700 }}>3 anomalies</span> detected · <span style={{ fontWeight: 700 }}>93.7%</span> confidence
              </div>
              <span style={{ fontSize: '0.72rem', background: '#fee2e2', color: '#dc2626', padding: '0.25rem 0.6rem', borderRadius: '5px', fontWeight: 700 }}>High Risk</span>
            </div>
          </div>
        </div>
      </section>

      {/* ── Stats strip ── */}
      <div style={{ background: '#1a1916', padding: '3.5rem 8%' }}>
        <div style={{ maxWidth: '1400px', margin: '0 auto', display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: '1px', background: '#2e2d2a' }}>
          {STATS.map(s => (
            <div key={s.value} style={{ background: '#1c1b19', padding: '2.25rem 2rem', textAlign: 'center' }}>
              <div style={{ fontSize: '2.8rem', fontWeight: 900, color: '#3b82f6', letterSpacing: '-0.05em', lineHeight: 1, marginBottom: '0.5rem' }}>{s.value}</div>
              <div style={{ fontSize: '0.95rem', fontWeight: 600, color: '#f5f4f0', marginBottom: '0.25rem' }}>{s.label}</div>
              <div style={{ fontSize: '0.78rem', color: '#5c5a56' }}>{s.sub}</div>
            </div>
          ))}
        </div>
      </div>

      {/* ── Why different ── */}
      <section style={{ padding: '7rem 8%', maxWidth: '1400px', margin: '0 auto' }}>
        <div style={{ textAlign: 'center', marginBottom: '4rem' }}>
          <div style={{ fontSize: '0.75rem', fontWeight: 700, letterSpacing: '0.08em', textTransform: 'uppercase', color: '#2563eb', marginBottom: '1rem' }}>Why it's different</div>
          <h2 style={{ fontSize: 'clamp(1.8rem, 3.5vw, 2.8rem)', fontWeight: 900, letterSpacing: '-0.035em', marginBottom: '1rem', lineHeight: 1.1 }}>
            Standard OCR extracts.<br />We <span style={{ color: '#2563eb' }}>understand</span>.
          </h2>
          <p style={{ color: '#4a4845', fontSize: '1.05rem', maxWidth: '620px', margin: '0 auto', lineHeight: 1.75 }}>
            Every extracted field passes through 6 independent AI detectors running in ensemble. Each catches a different class of error — together they cover what no single model can.
          </p>
        </div>

        {/* Detector grid — interactive */}
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '1rem', marginBottom: '1rem' }}>
          {DETECTORS.map((d, i) => {
            const Icon = d.icon;
            const isActive = activeDetector === i;
            return (
              <div key={d.name} onClick={() => setActiveDetector(i)} style={{ padding: '1.5rem', borderRadius: '16px', cursor: 'pointer', border: `2px solid ${isActive ? d.color : '#e4e2db'}`, background: isActive ? d.bg : 'white', transition: 'all 0.18s ease', boxShadow: isActive ? `0 6px 24px ${d.color}28` : '0 1px 4px rgba(26,25,22,0.05)', minHeight: isActive ? 'auto' : '120px' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', marginBottom: isActive ? '0.875rem' : 0 }}>
                  <div style={{ width: '38px', height: '38px', borderRadius: '10px', background: isActive ? d.color : d.bg, display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0, transition: 'background 0.18s' }}>
                    <Icon size={17} color={isActive ? 'white' : d.color} />
                  </div>
                  <div>
                    <div style={{ fontSize: '0.9rem', fontWeight: 700, color: '#1a1916' }}>{d.name}</div>
                    <div style={{ fontSize: '0.68rem', fontWeight: 700, color: d.color, letterSpacing: '0.05em', textTransform: 'uppercase' }}>{d.tag}</div>
                  </div>
                </div>
                {isActive && <p style={{ fontSize: '0.85rem', color: '#4a4845', lineHeight: 1.65, margin: 0 }}>{d.desc}</p>}
              </div>
            );
          })}
        </div>
        <p style={{ textAlign: 'center', fontSize: '0.8rem', color: '#8a8784' }}>Click any detector to expand</p>
      </section>

      {/* ── Comparison ── */}
      <section style={{ padding: '5rem 8%', background: '#f4f3f0' }}>
        <div style={{ maxWidth: '960px', margin: '0 auto' }}>
          <div style={{ textAlign: 'center', marginBottom: '3rem' }}>
            <h2 style={{ fontSize: 'clamp(1.6rem, 3vw, 2.2rem)', fontWeight: 900, letterSpacing: '-0.03em', marginBottom: '0.6rem' }}>How we compare</h2>
            <p style={{ color: '#4a4845', fontSize: '0.95rem' }}>Against standard OCR tools and basic IDP platforms</p>
          </div>
          <div style={{ background: 'white', border: '1px solid #e4e2db', borderRadius: '18px', overflow: 'hidden', boxShadow: '0 6px 24px rgba(26,25,22,0.07)' }}>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 160px 160px', background: '#f9f8f6', padding: '1rem 2rem', borderBottom: '1px solid #e4e2db' }}>
              <span style={{ fontSize: '0.75rem', fontWeight: 700, letterSpacing: '0.06em', textTransform: 'uppercase', color: '#8a8784' }}>Capability</span>
              <span style={{ fontSize: '0.75rem', fontWeight: 700, letterSpacing: '0.06em', textTransform: 'uppercase', color: '#8a8784', textAlign: 'center' }}>Others</span>
              <span style={{ fontSize: '0.75rem', fontWeight: 700, letterSpacing: '0.06em', textTransform: 'uppercase', color: '#2563eb', textAlign: 'center' }}>Owl Dawn AI</span>
            </div>
            {COMPARISON.map((row, i) => (
              <div key={row.feature} style={{ display: 'grid', gridTemplateColumns: '1fr 160px 160px', padding: '1rem 2rem', borderBottom: i < COMPARISON.length - 1 ? '1px solid #f0efe9' : 'none', alignItems: 'center' }}>
                <span style={{ fontSize: '0.9rem', color: '#1a1916', fontWeight: 450 }}>{row.feature}</span>
                <div style={{ textAlign: 'center' }}>
                  {row.others ? <span style={{ fontSize: '0.78rem', background: '#f0efe9', color: '#8a8784', padding: '0.25rem 0.65rem', borderRadius: '5px', fontWeight: 500 }}>Partial</span> : <span style={{ fontSize: '1.1rem', color: '#dc2626' }}>✕</span>}
                </div>
                <div style={{ textAlign: 'center' }}><span style={{ fontSize: '1.1rem', color: '#16a34a' }}>✓</span></div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ── How it works ── */}
      <section style={{ padding: '7rem 8%', maxWidth: '1400px', margin: '0 auto' }}>
        <div style={{ textAlign: 'center', marginBottom: '4rem' }}>
          <h2 style={{ fontSize: 'clamp(1.6rem, 3vw, 2.2rem)', fontWeight: 900, letterSpacing: '-0.03em', marginBottom: '0.6rem' }}>From upload to insight in seconds</h2>
          <p style={{ color: '#4a4845', fontSize: '0.95rem' }}>Image preprocessing runs first — this is what makes our OCR more accurate than the rest</p>
        </div>
        <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'center', flexWrap: 'wrap', gap: '0' }}>
          {PIPELINE.map((p, i) => {
            const Icon = p.icon;
            return (
              <div key={p.step} style={{ display: 'flex', alignItems: 'flex-start' }}>
                <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', width: '180px', textAlign: 'center', padding: '0 0.75rem' }}>
                  <div style={{ width: '56px', height: '56px', borderRadius: '14px', background: i === 1 ? '#2563eb' : '#dbeafe', display: 'flex', alignItems: 'center', justifyContent: 'center', marginBottom: '0.875rem', boxShadow: i === 1 ? '0 4px 14px rgba(37,99,235,0.3)' : 'none' }}>
                    <Icon size={22} color={i === 1 ? 'white' : '#2563eb'} />
                  </div>
                  <div style={{ fontSize: '0.9rem', fontWeight: 700, color: '#1a1916', marginBottom: '0.35rem' }}>{p.label}</div>
                  <div style={{ fontSize: '0.78rem', color: '#8a8784', lineHeight: 1.5 }}>{p.desc}</div>
                  {i === 1 && <div style={{ marginTop: '0.5rem', fontSize: '0.68rem', background: '#dbeafe', color: '#2563eb', padding: '0.2rem 0.5rem', borderRadius: '4px', fontWeight: 700 }}>Key step</div>}
                </div>
                {i < PIPELINE.length - 1 && <ChevronRight size={20} color="#c4c2bb" style={{ marginTop: '18px', flexShrink: 0 }} />}
              </div>
            );
          })}
        </div>
      </section>

      {/* ── Use cases ── */}
      <section style={{ padding: '5rem 8%', background: '#f4f3f0' }}>
        <div style={{ maxWidth: '1400px', margin: '0 auto' }}>
          <div style={{ textAlign: 'center', marginBottom: '3rem' }}>
            <h2 style={{ fontSize: 'clamp(1.6rem, 3vw, 2.2rem)', fontWeight: 900, letterSpacing: '-0.03em', marginBottom: '0.5rem' }}>Built for document-heavy workflows</h2>
            <p style={{ color: '#4a4845', fontSize: '0.95rem' }}>Any document type, any format, any language</p>
          </div>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '1.25rem' }}>
            {USE_CASES.map(u => {
              const Icon = u.icon;
              return (
                <div key={u.title} style={{ background: 'white', border: '1px solid #e4e2db', borderRadius: '16px', padding: '2rem', boxShadow: '0 2px 8px rgba(26,25,22,0.04)' }}>
                  <div style={{ width: '48px', height: '48px', borderRadius: '12px', background: '#dbeafe', display: 'flex', alignItems: 'center', justifyContent: 'center', marginBottom: '1.25rem' }}>
                    <Icon size={22} color="#2563eb" />
                  </div>
                  <h3 style={{ fontSize: '1.05rem', fontWeight: 700, marginBottom: '0.6rem' }}>{u.title}</h3>
                  <p style={{ fontSize: '0.875rem', color: '#4a4845', lineHeight: 1.7, margin: 0 }}>{u.desc}</p>
                </div>
              );
            })}
          </div>
        </div>
      </section>

      {/* ── CTA ── */}
      <section style={{ padding: '7rem 8%', background: '#1a1916', textAlign: 'center' }}>
        <div style={{ maxWidth: '680px', margin: '0 auto' }}>
          <div style={{ width: '56px', height: '56px', borderRadius: '14px', background: '#2563eb', display: 'flex', alignItems: 'center', justifyContent: 'center', margin: '0 auto 2rem' }}>
            <Zap size={26} color="white" />
          </div>
          <h2 style={{ fontSize: 'clamp(1.8rem, 3.5vw, 2.8rem)', fontWeight: 900, letterSpacing: '-0.04em', color: '#f5f4f0', marginBottom: '1.25rem', lineHeight: 1.1 }}>
            Ready to process your first document?
          </h2>
          <p style={{ color: '#5c5a56', fontSize: '1.05rem', lineHeight: 1.75, marginBottom: '2.5rem' }}>
            Upload any PDF, image, or scanned form. Image preprocessing runs automatically before OCR — no setup, no configuration needed.
          </p>
          <button onClick={onEnterApp} style={{ padding: '1rem 2.75rem', borderRadius: '12px', border: 'none', background: '#2563eb', color: 'white', fontSize: '1rem', fontWeight: 700, cursor: 'pointer', fontFamily: 'inherit', display: 'inline-flex', alignItems: 'center', gap: '0.6rem', boxShadow: '0 6px 20px rgba(37,99,235,0.45)' }}>
            Open Owl Dawn AI <ArrowRight size={18} />
          </button>
          <div style={{ display: 'flex', gap: '2.5rem', justifyContent: 'center', marginTop: '2.5rem', flexWrap: 'wrap' }}>
            {['No account needed', 'Works in your browser', 'Free to try'].map(t => (
              <div key={t} style={{ display: 'flex', alignItems: 'center', gap: '0.4rem', fontSize: '0.82rem', color: '#5c5a56' }}>
                <CheckCircle size={13} color="#3b82f6" /> {t}
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ── Footer ── */}
      <footer style={{ padding: '1.5rem 8%', background: '#111110', borderTop: '1px solid #1c1b19', display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '0.5rem' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
          <div style={{ width: '24px', height: '24px', borderRadius: '6px', background: '#2563eb', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
            <ScanLine size={12} color="white" strokeWidth={2.5} />
          </div>
          <span style={{ fontSize: '0.875rem', fontWeight: 700, color: '#f5f4f0' }}>Owl Dawn AI</span>
        </div>
        <span style={{ fontSize: '0.75rem', color: '#5c5a56' }}>Intelligent Document Processing · 6-model AI ensemble · Image preprocessing → OCR → Analysis · © 2026</span>
      </footer>
    </div>
  );
}
