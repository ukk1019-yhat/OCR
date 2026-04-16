import { useState, useEffect, useRef } from 'react';
import { Image, FileText, Activity, AlertTriangle, CheckCircle } from 'lucide-react';
import { api } from '../api';

// Icon map — backend sends step titles, we map to icons client-side
const ICON_MAP = {
  'Image Preprocessing':    Image,
  'OCR / ICR Extraction':   FileText,
  'Anomaly Detection':      Activity,
  'Confidence Scoring':     AlertTriangle,
  'Correction Suggestions': CheckCircle,
};

export default function Processing({ setActivePage, documentId, clientId }) {
  const [steps, setSteps]         = useState([]);
  const [currentStep, setCurrentStep] = useState(0);
  const [completed, setCompleted] = useState(false);
  const wsRef      = useRef(null);
  const fallbackRef = useRef(null);

  // Fetch step definitions from backend
  useEffect(() => {
    api.getPipelineSteps()
      .then(res => setSteps(res.steps))
      .catch(() => {
        // Fallback if backend unreachable
        setSteps([
          { id: 1, title: 'Image Preprocessing',    desc: 'Deskew, denoise, normalize contrast' },
          { id: 2, title: 'OCR / ICR Extraction',   desc: 'Text and handwriting recognition' },
          { id: 3, title: 'Anomaly Detection',       desc: 'Rule-based and AI field validation' },
          { id: 4, title: 'Confidence Scoring',      desc: 'Per-field accuracy measurement' },
          { id: 5, title: 'Correction Suggestions',  desc: 'AI-powered auto-correct proposals' },
        ]);
      });
  }, []);

  function finish() {
    setCompleted(true);
    setTimeout(() => setActivePage('results'), 1200);
  }

  function runLocalFallback() {
    if (fallbackRef.current || steps.length === 0) return;
    let step = 1;
    fallbackRef.current = setInterval(() => {
      setCurrentStep(step);
      if (step >= steps.length) {
        clearInterval(fallbackRef.current);
        fallbackRef.current = null;
        finish();
      }
      step++;
    }, 1500);
  }

  useEffect(() => {
    if (steps.length === 0) return; // wait for steps to load

    const ws = new WebSocket(`ws://localhost:8000/api/v1/ws/processing?clientId=${clientId}`);
    wsRef.current = ws;
    const timeout = setTimeout(() => {
      if (ws.readyState !== 1) { ws.close(); runLocalFallback(); }
    }, 2000);

    ws.onopen = () => {
      clearTimeout(timeout);
      ws.send(JSON.stringify({ type: 'start', documentId }));
    };
    ws.onmessage = (e) => {
      try {
        const msg = JSON.parse(e.data);
        if (msg.type === 'pipeline_update') setCurrentStep(msg.data.step);
        else if (msg.type === 'pipeline_complete') { setCurrentStep(steps.length); finish(); }
      } catch (_) {}
    };
    ws.onerror  = () => { clearTimeout(timeout); runLocalFallback(); };
    ws.onclose  = () => clearTimeout(timeout);

    return () => {
      clearTimeout(timeout);
      if (fallbackRef.current) clearInterval(fallbackRef.current);
      ws.close();
    };
  }, [steps]); // re-run once steps are loaded

  return (
    <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', minHeight: '70vh' }}>
      <div style={{ width: '100%', maxWidth: '560px' }}>
        <div style={{ textAlign: 'center', marginBottom: '2.5rem' }}>
          <h1 style={{ marginBottom: '0.4rem' }}>{completed ? 'Processing Complete' : 'Analyzing Document'}</h1>
          <p>Our AI pipeline is working through your file.</p>
        </div>

        <div className="card" style={{ padding: '2rem', position: 'relative', overflow: 'hidden' }}>
          {!completed && <div className="scanline-effect" style={{ position: 'absolute', inset: 0, pointerEvents: 'none' }} />}

          <div style={{ display: 'flex', flexDirection: 'column', position: 'relative', zIndex: 1 }}>
            {steps.map((step, idx) => {
              const Icon = ICON_MAP[step.title] || Activity;
              const isActive  = currentStep === step.id && !completed;
              const isDone    = currentStep > step.id || completed;
              const isPending = !isDone && !isActive;

              return (
                <div key={step.id} style={{ display: 'flex', gap: '1rem', opacity: isPending ? 0.35 : 1, transition: 'opacity 0.3s ease' }}>
                  <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', width: '36px', flexShrink: 0 }}>
                    <div style={{
                      width: '36px', height: '36px', borderRadius: '50%', flexShrink: 0,
                      display: 'flex', alignItems: 'center', justifyContent: 'center',
                      background: isDone ? 'var(--green)' : isActive ? 'var(--accent)' : 'var(--surface-3)',
                      color: isDone || isActive ? 'white' : 'var(--ink-3)',
                      boxShadow: isActive ? '0 0 0 4px rgba(37,99,235,0.15)' : 'none',
                      transition: 'all 0.3s ease', zIndex: 2,
                    }}>
                      {isDone ? <CheckCircle size={16} /> : <Icon size={16} />}
                    </div>
                    {idx < steps.length - 1 && (
                      <div style={{ width: '2px', flex: 1, minHeight: '28px', background: isDone ? 'var(--green)' : 'var(--border)', margin: '4px 0', transition: 'background 0.3s ease' }} />
                    )}
                  </div>
                  <div style={{ flex: 1, paddingTop: '0.5rem', paddingBottom: idx < steps.length - 1 ? '0' : '0' }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', marginBottom: '0.15rem' }}>
                      <span style={{ fontSize: '0.9rem', fontWeight: 600, color: isActive ? 'var(--accent)' : 'var(--ink)' }}>{step.title}</span>
                      {isActive && (
                        <div style={{ width: '14px', height: '14px', border: '2px solid var(--border)', borderTopColor: 'var(--accent)', borderRadius: '50%', animation: 'spin 0.8s linear infinite' }} />
                      )}
                    </div>
                    <p style={{ fontSize: '0.8rem', marginBottom: idx < steps.length - 1 ? '1.25rem' : 0 }}>{step.desc}</p>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      </div>
      <style>{`@keyframes spin { to { transform: rotate(360deg); } }`}</style>
    </div>
  );
}
