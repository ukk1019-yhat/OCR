import { useState, useRef } from 'react';
import { UploadCloud, FileText, X, CheckCircle, AlertCircle, Cloud } from 'lucide-react';
import { api } from '../api';

export default function Upload({ setActivePage, setUploadedDocId, clientId }) {
  const [isDragActive, setIsDragActive] = useState(false);
  const [files, setFiles]               = useState([]);
  const [isUploading, setIsUploading]   = useState(false);
  const [progress, setProgress]         = useState(0);
  const [phase, setPhase]               = useState(''); // 'backend' | 'done'
  const [error, setError]               = useState(null);
  const fileInputRef = useRef(null);

  const handleDragEnter = (e) => { e.preventDefault(); e.stopPropagation(); setIsDragActive(true); };
  const handleDragLeave = (e) => { e.preventDefault(); e.stopPropagation(); setIsDragActive(false); };
  const handleDrop = (e) => {
    e.preventDefault(); e.stopPropagation(); setIsDragActive(false);
    if (e.dataTransfer.files?.length) addFiles(Array.from(e.dataTransfer.files));
  };
  const addFiles = (newFiles) => {
    const valid = newFiles.filter(f => /pdf|image/i.test(f.type));
    setFiles(p => [...p, ...valid]); setError(null);
  };
  const removeFile = (i) => setFiles(f => f.filter((_, idx) => idx !== i));
  const formatSize = (b) => b < 1024 * 1024 ? `${(b/1024).toFixed(0)} KB` : `${(b/1024/1024).toFixed(1)} MB`;

  const handleUpload = async () => {
    if (!files.length) return;
    setIsUploading(true); setError(null); setProgress(0);

    try {
      // Send to backend for OCR + AI processing
      setPhase('backend');
      setProgress(50);
      const fd = new FormData();
      files.forEach(f => fd.append('files', f));

      setProgress(65);
      const data = await api.uploadDocuments(fd, clientId);
      const docId = data.documents?.[0]?.id || null;

      setProgress(100);
      setPhase('done');
      setTimeout(() => setUploadedDocId(docId), 600);
    } catch (err) {
      setError(err.message || 'Upload failed. Check your connection and try again.');
      setIsUploading(false); setProgress(0); setPhase('');
    }
  };

  const phaseLabel = () => {
    if (phase === 'backend') return 'Sending to AI pipeline…';
    if (phase === 'done')    return 'Complete!';
    return `Processing ${files.length} document${files.length > 1 ? 's' : ''}`;
  };

  return (
    <div style={{ maxWidth: '680px' }}>
      <div style={{ marginBottom: '2rem' }}>
        <h1 style={{ marginBottom: '0.35rem' }}>Upload Documents</h1>
        <p>Supported: PDF, JPEG, PNG, TIFF · Max 50 MB · Processed securely</p>
      </div>

      {/* Drop zone */}
      <div
        onDragEnter={handleDragEnter} onDragOver={handleDragEnter}
        onDragLeave={handleDragLeave} onDrop={handleDrop}
        onClick={() => !isUploading && fileInputRef.current.click()}
        style={{
          border: `2px dashed ${isDragActive ? 'var(--accent)' : 'var(--border)'}`,
          borderRadius: 'var(--r-xl)', padding: '3.5rem 2rem',
          display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '0.75rem',
          cursor: isUploading ? 'default' : 'pointer',
          background: isDragActive ? 'var(--accent-dim)' : 'var(--surface)',
          transition: 'all var(--speed) ease', textAlign: 'center',
        }}
      >
        <div style={{ width: '56px', height: '56px', borderRadius: 'var(--r-lg)', background: isDragActive ? 'var(--accent)' : 'var(--surface-3)', display: 'flex', alignItems: 'center', justifyContent: 'center', transition: 'all var(--speed) ease', marginBottom: '0.25rem' }}>
          <UploadCloud size={24} color={isDragActive ? 'white' : 'var(--ink-3)'} />
        </div>
        <div>
          <div style={{ fontSize: '0.95rem', fontWeight: 600, color: 'var(--ink)', marginBottom: '0.25rem' }}>
            {isDragActive ? 'Drop files here' : 'Drag & drop files here'}
          </div>
          <div style={{ fontSize: '0.825rem', color: 'var(--ink-3)' }}>
            or <span style={{ color: 'var(--accent)', fontWeight: 500 }}>browse from your computer</span>
          </div>
        </div>
        <div style={{ display: 'flex', alignItems: 'center', gap: '0.35rem', fontSize: '0.72rem', color: 'var(--ink-3)', marginTop: '0.25rem' }}>
          <Cloud size={11} /> Files processed securely on Node backend
        </div>
        <input type="file" multiple accept=".pdf,.png,.jpg,.jpeg,.tiff" style={{ display: 'none' }} ref={fileInputRef} onChange={e => addFiles(Array.from(e.target.files))} />
      </div>

      {error && (
        <div style={{ marginTop: '1rem', display: 'flex', alignItems: 'center', gap: '0.6rem', padding: '0.75rem 1rem', background: 'var(--red-dim)', border: '1px solid rgba(220,38,38,0.2)', borderRadius: 'var(--r-md)', fontSize: '0.85rem', color: 'var(--red)' }}>
          <AlertCircle size={15} /> {error}
        </div>
      )}

      {files.length > 0 && (
        <div style={{ marginTop: '1.25rem', display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '0.25rem' }}>
            <span style={{ fontSize: '0.8rem', fontWeight: 600, color: 'var(--ink-2)' }}>{files.length} file{files.length > 1 ? 's' : ''} selected</span>
            {!isUploading && <button className="btn btn-ghost btn-sm" onClick={() => setFiles([])}>Clear all</button>}
          </div>

          {files.map((file, i) => (
            <div key={i} style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', padding: '0.75rem 1rem', background: 'var(--surface)', border: '1px solid var(--border)', borderRadius: 'var(--r-md)' }}>
              <div style={{ width: '34px', height: '34px', borderRadius: 'var(--r-sm)', background: 'var(--accent-dim)', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
                <FileText size={15} color="var(--accent)" />
              </div>
              <div style={{ flex: 1, minWidth: 0 }}>
                <div style={{ fontSize: '0.85rem', fontWeight: 500, color: 'var(--ink)', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{file.name}</div>
                <div style={{ fontSize: '0.75rem', color: 'var(--ink-3)' }}>{formatSize(file.size)}</div>
              </div>
              {phase === 'done'
                ? <CheckCircle size={16} color="var(--green)" />
                : !isUploading && <button className="btn-icon" onClick={() => removeFile(i)} style={{ width: '28px', height: '28px' }}><X size={14} /></button>
              }
            </div>
          ))}

          {isUploading && (
            <div style={{ marginTop: '0.5rem' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.78rem', color: 'var(--ink-3)', marginBottom: '0.4rem' }}>
                <span>{phaseLabel()}</span>
                <span>{progress}%</span>
              </div>
              <div style={{ height: '4px', background: 'var(--border)', borderRadius: 'var(--r-full)', overflow: 'hidden' }}>
                <div style={{ height: '100%', width: `${progress}%`, background: 'var(--accent)', borderRadius: 'var(--r-full)', transition: 'width 0.3s ease' }} />
              </div>

              {phase === 'backend' && (
                <div style={{ fontSize: '0.72rem', color: 'var(--accent)', marginTop: '0.35rem' }}>
                  Image preprocessing → OCR → AI anomaly detection running…
                </div>
              )}
            </div>
          )}

          <button
            className="btn btn-primary btn-lg"
            disabled={isUploading || !files.length}
            onClick={handleUpload}
            style={{ marginTop: '0.75rem', width: '100%' }}
          >
            {isUploading ? phaseLabel() : `Process ${files.length} Document${files.length > 1 ? 's' : ''}`}
          </button>
        </div>
      )}
    </div>
  );
}
