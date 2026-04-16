import React, { useState } from 'react';
import { Search, Bell, Sun, Moon } from 'lucide-react';

export default function Header({ theme, toggleTheme, title = '', subtitle = '' }) {
  const [focused, setFocused] = useState(false);

  return (
    <header style={{
      display: 'flex', alignItems: 'center', justifyContent: 'space-between',
      padding: '0 2.5rem',
      height: '60px',
      background: 'var(--surface)',
      borderBottom: '1px solid var(--border)',
      position: 'sticky', top: 0, zIndex: 10,
      flexShrink: 0,
    }}>
      {/* Left: page context */}
      <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
        {title && (
          <span style={{ fontSize: '0.875rem', fontWeight: 600, color: 'var(--ink)' }}>{title}</span>
        )}
      </div>

      {/* Center: search */}
      <div style={{ position: 'relative', width: '280px' }}>
        <Search size={14} style={{ position: 'absolute', left: '10px', top: '50%', transform: 'translateY(-50%)', color: 'var(--ink-3)', pointerEvents: 'none' }} />
        <input
          type="text"
          placeholder="Search documents…"
          onFocus={() => setFocused(true)}
          onBlur={() => setFocused(false)}
          style={{
            width: '100%',
            padding: '0.45rem 0.9rem 0.45rem 2rem',
            borderRadius: 'var(--r-full)',
            border: `1.5px solid ${focused ? 'var(--accent)' : 'var(--border)'}`,
            background: focused ? 'var(--surface)' : 'var(--surface-2)',
            color: 'var(--ink)',
            fontFamily: 'var(--font-sans)',
            fontSize: '0.825rem',
            outline: 'none',
            transition: 'all var(--speed) ease',
            boxShadow: focused ? '0 0 0 3px rgba(37,99,235,0.1)' : 'none',
          }}
        />
      </div>

      {/* Right: actions */}
      <div style={{ display: 'flex', alignItems: 'center', gap: '0.25rem' }}>
        <button className="btn-icon" onClick={toggleTheme} title={theme === 'dark' ? 'Light mode' : 'Dark mode'}>
          {theme === 'dark' ? <Sun size={16} /> : <Moon size={16} />}
        </button>

        <button className="btn-icon" style={{ position: 'relative' }} title="Notifications">
          <Bell size={16} />
          <span style={{
            position: 'absolute', top: '7px', right: '7px',
            width: '6px', height: '6px',
            background: 'var(--red)', borderRadius: '50%',
            border: '1.5px solid var(--surface)',
          }} />
        </button>
      </div>
    </header>
  );
}
