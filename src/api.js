const BASE = '/api/v1';

async function request(path, options = {}) {
  const res = await fetch(`${BASE}${path}`, options);
  if (!res.ok) {
    const err = await res.json().catch(() => ({ detail: res.statusText }));
    throw new Error(err.detail || 'Request failed');
  }
  return res.json();
}

export const api = {
  // Dashboard
  getDashboardStats:  () => request('/analytics/dashboard/stats'),

  // Documents
  uploadDocuments: (formData, clientId) => request('/documents/upload', {
    method: 'POST', body: formData,
    headers: clientId ? { 'x-client-id': clientId } : {},
  }),
  getAllDocuments:    () => request('/documents'),
  getDocumentStatus:  (id) => request(`/documents/${id}/status`),
  getDocumentImageUrl:(id) => `${BASE}/documents/${id}/image`,

  // Pipeline
  getPipelineSteps:   () => request('/pipeline/steps'),
  uploadImagePipeline: (formData) => request('/pipeline/upload-image', { method: 'POST', body: formData }),
  processImagePipeline: (filePath) => request('/pipeline/process-image', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ filePath })
  }),
  extractImagePipeline: (filePath) => request('/pipeline/extract-handwritten-text', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ filePath })
  }),

  // Results
  getResults:         (documentId) => request(`/analytics/results/${documentId}`),
  getDeepAnomaly:     (documentId) => request(`/analytics/anomaly-deep/${documentId}`),

  // Corrections
  getCorrections:     () => request('/analytics/corrections'),
  acceptCorrection:   (id) => request(`/analytics/corrections/${id}/action`, {
    method: 'POST', headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ action: 'accept' }),
  }),
  rejectCorrection:   (id) => request(`/analytics/corrections/${id}/action`, {
    method: 'POST', headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ action: 'reject' }),
  }),

  // Insights & Reports
  getAnomalyInsights: () => request('/analytics/anomaly-insights'),
  getReports:         () => request('/reports'),
  
  // Chat
  sendChatMessage:    (payload) => request('/analytics/chat', {
    method: 'POST', headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(payload)
  }),

  exportTextData: async (documentId) => {
    const res = await fetch(`${BASE}/analytics/results/${documentId}/export-text`, { method: 'POST' });
    const blob = await res.blob();
    const a = document.createElement('a');
    a.href = URL.createObjectURL(blob);
    a.download = `Document_${documentId.slice(0, 8)}_Text.txt`;
    a.click();
    URL.revokeObjectURL(a.href);
  },
};
