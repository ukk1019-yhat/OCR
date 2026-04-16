import { LayoutDashboard, UploadCloud, ScanLine, AlertTriangle, Wand2, BarChart3, Settings, Lock } from 'lucide-react';

const NAV_ITEMS = [
  { name: 'Overview',     icon: LayoutDashboard, id: 'dashboard',   requiresUpload: false },
  { name: 'Upload',       icon: UploadCloud,     id: 'upload',      requiresUpload: false },
  { name: 'Processing',   icon: ScanLine,        id: 'processing',  requiresUpload: true  },
  { name: 'Anomalies',    icon: AlertTriangle,   id: 'insights',    requiresUpload: true  },
  { name: 'Auto-Correct', icon: Wand2,           id: 'autocorrect', requiresUpload: true  },
  { name: 'Reports',      icon: BarChart3,       id: 'reports',     requiresUpload: false },
];

export default function Sidebar({ activePage, setActivePage, hasUploaded }) {
  return (
    <aside style={{
      width: '220px', minWidth: '220px', height: '100vh',
      display: 'flex', flexDirection: 'column',
      background: 'var(--surface)', borderRight: '1px solid var(--border)',
      position: 'relative', zIndex: 20,
    }}>
      {/* Logo */}
      <div style={{ padding: '1.5rem 1.4rem 1.2rem', borderBottom: '1px solid var(--border-soft)' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '0.6rem' }}>
          <div style={{ width: '30px', height: '30px', borderRadius: '8px', background: 'var(--accent)', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
            <svg width="16" height="16" viewBox="0 0 16 16" fill="none">
              <circle cx="8" cy="6" r="3" fill="white" opacity="0.9"/>
              <path d="M2 13c0-3.3 2.7-6 6-6s6 2.7 6 6" stroke="white" strokeWidth="1.5" strokeLinecap="round" opacity="0.6"/>
            </svg>
          </div>
          <div>
            <div style={{ fontFamily: 'var(--font-display)', fontWeight: 700, fontSize: '0.95rem', color: 'var(--ink)', letterSpacing: '-0.02em', lineHeight: 1.1 }}>Owl Dawn</div>
            <div style={{ fontSize: '0.65rem', color: 'var(--ink-3)', letterSpacing: '0.05em', textTransform: 'uppercase', fontWeight: 500 }}>AI Platform</div>
          </div>
        </div>
      </div>

      {/* Nav */}
      <nav style={{ flex: 1, padding: '0.75rem', display: 'flex', flexDirection: 'column', gap: '2px' }}>
        <div style={{ fontSize: '0.65rem', fontWeight: 600, letterSpacing: '0.08em', textTransform: 'uppercase', color: 'var(--ink-3)', padding: '0.5rem 0.65rem 0.4rem', marginBottom: '2px' }}>
          Workspace
        </div>

        {NAV_ITEMS.map((item) => {
          const Icon = item.icon;
          const isActive  = activePage === item.id;
          const isLocked  = item.requiresUpload && !hasUploaded;

          return (
            <div key={item.id} style={{ position: 'relative' }}>
              <button
                onClick={() => !isLocked && setActivePage(item.id)}
                title={isLocked ? 'Upload a document first' : item.name}
                style={{
                  display: 'flex', alignItems: 'center', gap: '0.65rem',
                  padding: '0.55rem 0.65rem', width: '100%',
                  borderRadius: 'var(--r-md)', border: 'none',
                  background: isActive ? 'var(--accent-dim)' : 'transparent',
                  color: isLocked ? 'var(--ink-3)' : isActive ? 'var(--accent)' : 'var(--ink-2)',
                  cursor: isLocked ? 'not-allowed' : 'pointer',
                  textAlign: 'left',
                  transition: 'all var(--speed) ease',
                  fontWeight: isActive ? 600 : 450,
                  fontSize: '0.875rem',
                  fontFamily: 'var(--font-sans)',
                  opacity: isLocked ? 0.5 : 1,
                  position: 'relative',
                }}
                onMouseEnter={e => { if (!isActive && !isLocked) { e.currentTarget.style.background = 'var(--surface-3)'; e.currentTarget.style.color = 'var(--ink)'; } }}
                onMouseLeave={e => { if (!isActive && !isLocked) { e.currentTarget.style.background = 'transparent'; e.currentTarget.style.color = 'var(--ink-2)'; } }}
              >
                {isActive && !isLocked && (
                  <span style={{ position: 'absolute', left: 0, top: '20%', bottom: '20%', width: '3px', background: 'var(--accent)', borderRadius: '0 3px 3px 0' }} />
                )}
                <Icon size={16} strokeWidth={isActive ? 2.2 : 1.8} />
                <span style={{ flex: 1 }}>{item.name}</span>
                {isLocked && <Lock size={11} style={{ flexShrink: 0, opacity: 0.6 }} />}
              </button>

              {/* Tooltip on hover for locked items */}
              {isLocked && (
                <div style={{
                  position: 'absolute', left: '105%', top: '50%', transform: 'translateY(-50%)',
                  background: 'var(--ink)', color: 'white', fontSize: '0.7rem', fontWeight: 500,
                  padding: '0.3rem 0.6rem', borderRadius: '6px', whiteSpace: 'nowrap',
                  pointerEvents: 'none', opacity: 0, transition: 'opacity 0.15s',
                  zIndex: 50,
                }} className="sidebar-tooltip">
                  Upload a document first
                </div>
              )}
            </div>
          );
        })}

        {/* Upload prompt banner when no doc uploaded */}
        {!hasUploaded && (
          <div style={{
            marginTop: '0.75rem', padding: '0.75rem', borderRadius: 'var(--r-md)',
            background: 'var(--accent-dim)', border: '1px solid rgba(37,99,235,0.15)',
          }}>
            <div style={{ fontSize: '0.72rem', fontWeight: 600, color: 'var(--accent)', marginBottom: '0.2rem' }}>
              Get started
            </div>
            <div style={{ fontSize: '0.68rem', color: 'var(--ink-3)', lineHeight: 1.4 }}>
              Upload a document to unlock all features
            </div>
          </div>
        )}
      </nav>

      {/* Footer */}
      <div style={{ padding: '1rem 1.4rem', borderTop: '1px solid var(--border-soft)' }}>
        <button
          style={{ display: 'flex', alignItems: 'center', gap: '0.65rem', padding: '0.55rem 0.65rem', width: '100%', borderRadius: 'var(--r-md)', border: 'none', background: 'transparent', color: 'var(--ink-2)', cursor: 'pointer', fontSize: '0.875rem', fontFamily: 'var(--font-sans)', fontWeight: 450, transition: 'all var(--speed) ease' }}
          onMouseEnter={e => { e.currentTarget.style.background = 'var(--surface-3)'; e.currentTarget.style.color = 'var(--ink)'; }}
          onMouseLeave={e => { e.currentTarget.style.background = 'transparent'; e.currentTarget.style.color = 'var(--ink-2)'; }}
        >
          <Settings size={16} strokeWidth={1.8} />
          <span>Settings</span>
        </button>
        <div style={{ marginTop: '0.75rem', display: 'flex', alignItems: 'center', gap: '0.6rem', padding: '0 0.65rem' }}>
          <div style={{ width: '26px', height: '26px', borderRadius: '50%', background: 'var(--accent)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '0.7rem', fontWeight: 700, color: 'white', flexShrink: 0 }}>A</div>
          <div style={{ overflow: 'hidden' }}>
            <div style={{ fontSize: '0.8rem', fontWeight: 600, color: 'var(--ink)', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>Admin User</div>
            <div style={{ fontSize: '0.68rem', color: 'var(--ink-3)' }}>Enterprise</div>
          </div>
        </div>
      </div>

      <style>{`
        .sidebar-tooltip { opacity: 0 !important; }
        button:hover + .sidebar-tooltip { opacity: 1 !important; }
      `}</style>
    </aside>
  );
}
