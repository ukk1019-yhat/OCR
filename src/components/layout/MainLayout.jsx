import React, { useState, useEffect } from 'react';
import Sidebar from './Sidebar';
import Header from './Header';

const PAGE_TITLES = {
  dashboard:   'Overview',
  upload:      'Upload Document',
  processing:  'Processing',
  insights:    'Anomaly Insights',
  autocorrect: 'Auto-Correction',
  reports:     'Reports',
  results:     'Extraction Results',
};

export default function MainLayout({ children, activePage, setActivePage, hasUploaded }) {
  const [theme, setTheme] = useState('light');

  useEffect(() => {
    document.documentElement.setAttribute('data-theme', theme);
  }, [theme]);

  return (
    <div className="app-container">
      <Sidebar activePage={activePage} setActivePage={setActivePage} hasUploaded={hasUploaded} />
      <div className="main-content">
        <Header theme={theme} toggleTheme={() => setTheme(t => t === 'light' ? 'dark' : 'light')} title={PAGE_TITLES[activePage] || ''} />
        <main className="content-area animate-fade-up">
          {children}
        </main>
      </div>
    </div>
  );
}
