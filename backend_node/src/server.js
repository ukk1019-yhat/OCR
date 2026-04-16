require('dotenv').config({ path: require('path').join(__dirname, '../.env') });

const express = require('express');
const cors = require('cors');
const http = require('http');
const { WebSocketServer } = require('ws');

const app = express();
const server = http.createServer(app);

// Shared state accessible by both WS and routes
const clients = new Map();   // clientId -> ws
const pendingPipelines = new Map(); // clientId -> documentId (queued before WS connects)

const wss = new WebSocketServer({ server, path: '/api/v1/ws/processing' });

wss.on('connection', (ws, req) => {
  const url = new URL(req.url, 'http://localhost');
  const clientId = url.searchParams.get('clientId');
  if (!clientId) return ws.close();

  clients.set(clientId, ws);

  // If upload already happened before WS connected, start pipeline now
  if (pendingPipelines.has(clientId)) {
    const docId = pendingPipelines.get(clientId);
    pendingPipelines.delete(clientId);
    runPipeline(clientId, docId);
  }

  ws.on('message', (raw) => {
    try {
      const msg = JSON.parse(raw);
      // Client sends { type: 'start', documentId } once WS is open
      if (msg.type === 'start') {
        runPipeline(clientId, msg.documentId);
      }
    } catch (_) {}
  });

  ws.on('close', () => clients.delete(clientId));
  ws.on('error', () => clients.delete(clientId));
});

function sendToClient(clientId, payload) {
  const ws = clients.get(clientId);
  if (ws && ws.readyState === 1) {
    ws.send(JSON.stringify(payload));
  }
}

function runPipeline(clientId, documentId) {
  const steps = [
    { step: 1, title: 'Image Preprocessing' },
    { step: 2, title: 'OCR/ICR Extraction' },
    { step: 3, title: 'Anomaly Detection' },
    { step: 4, title: 'Confidence Scoring' },
    { step: 5, title: 'Correction Suggestions' },
  ];

  let i = 0;
  const interval = setInterval(() => {
    if (i >= steps.length) {
      clearInterval(interval);
      sendToClient(clientId, { type: 'pipeline_complete', documentId });
      return;
    }
    sendToClient(clientId, { type: 'pipeline_update', data: steps[i] });
    i++;
  }, 1500);
}

app.use(cors({ origin: ['http://localhost:5173', 'http://127.0.0.1:5173'], credentials: true }));
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

app.use('/api/v1', require('./routes')({ clients, pendingPipelines, runPipeline }));

app.get('/health', (_req, res) => res.json({ status: 'ok', message: 'Owl Dawn Node Backend is running.' }));

const PORT = process.env.PORT || 8000;
server.listen(PORT, () => console.log(`Backend running on http://localhost:${PORT}`));
