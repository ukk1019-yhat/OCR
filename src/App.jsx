import { useState, useRef } from 'react';
import MainLayout from './components/layout/MainLayout';
import Intro from './pages/Intro';
import Dashboard from './pages/Dashboard';
import Upload from './pages/Upload';
import Processing from './pages/Processing';
import Results from './pages/Results';
import AnomalyInsights from './pages/AnomalyInsights';
import AutoCorrection from './pages/AutoCorrection';
import Reports from './pages/Reports';
import './App.css';

// Pages that require at least one document to have been uploaded
const REQUIRES_UPLOAD = new Set(['processing', 'insights', 'autocorrect', 'results']);

function App() {
  const [showIntro, setShowIntro]       = useState(true);
  const [activePage, setActivePage]     = useState('dashboard');
  const [uploadedDocId, setUploadedDocId] = useState(null);
  const [dashboardKey, setDashboardKey] = useState(0);
  const clientId = useRef(`client-${Date.now()}-${Math.random().toString(36).slice(2)}`);

  const hasUploaded = uploadedDocId !== null;

  const handleSetActivePage = (page) => {
    // Block navigation to upload-dependent pages if no doc uploaded yet
    if (REQUIRES_UPLOAD.has(page) && !hasUploaded) return;
    if (page === 'dashboard') setDashboardKey(k => k + 1);
    setActivePage(page);
  };

  const handleUploadComplete = (docId) => {
    setUploadedDocId(docId);
    setDashboardKey(k => k + 1);
    setActivePage('processing');
  };

  const renderPage = () => {
    switch (activePage) {
      case 'dashboard':
        return <Dashboard key={dashboardKey} setActivePage={handleSetActivePage} focusedDocId={uploadedDocId} />;
      case 'upload':
        return <Upload setActivePage={handleSetActivePage} setUploadedDocId={handleUploadComplete} clientId={clientId.current} />;
      case 'processing':
        return <Processing setActivePage={handleSetActivePage} documentId={uploadedDocId} clientId={clientId.current} />;
      case 'insights':
        return <AnomalyInsights setActivePage={handleSetActivePage} />;
      case 'autocorrect':
        return <AutoCorrection setActivePage={handleSetActivePage} />;
      case 'reports':
        return <Reports setActivePage={handleSetActivePage} />;
      default:
        return <Results documentId={uploadedDocId} />;
    }
  };

  return (
    <>
      {showIntro ? (
        <Intro onEnterApp={() => setShowIntro(false)} />
      ) : (
        <MainLayout activePage={activePage} setActivePage={handleSetActivePage} hasUploaded={hasUploaded}>
          {renderPage()}
        </MainLayout>
      )}
    </>
  );
}

export default App;
