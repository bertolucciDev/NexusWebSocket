/**
 * Servidor dedicado para WebSocket (Socket.IO).
 * Hospedado separadamente (Render) porque Vercel Serverless nao suporta WebSocket.
 *
 * Expõe:
 * - Socket.IO para clientes launchers (mesma origem permitidas)
 * - HTTP POST /emit para a REST API (Vercel) emitir eventos server-side
 */
if (!process.env.VERCEL) {
  require('dotenv').config();
}

import express from 'express';
import cors from 'cors';
import helmet from 'helmet';
import { createServer } from 'http';
import { Server } from 'socket.io';
import { setupNotifications, emitToUser } from './notifications';

const PORT = parseInt(process.env.PORT || '3001', 10);
const EMIT_API_KEY = process.env.EMIT_API_KEY || '';

if (!EMIT_API_KEY) {
  console.warn('[nexus-ws] EMIT_API_KEY not set! /emit endpoint will reject all requests.');
}

const allowedOriginPatterns: RegExp[] = [
  /^https:\/\/backend-.*\.vercel\.app$/,
  /^https:\/\/backend-.*-luisotaviobertolucci1-2477-s-projects\.vercel\.app$/,
  /^https:\/\/backend-.*-luisotaviobertolucci1-2477s-projects\.vercel\.app$/,
  /^http:\/\/localhost(:\d+)?$/,
];

function matchesOrigin(origin: string): boolean {
  return allowedOriginPatterns.some(p => p.test(origin));
}

const app = express();

app.use(helmet());

app.use(cors({
  origin: (origin, callback) => {
    if (!origin || matchesOrigin(origin)) {
      callback(null, true);
    } else {
      callback(new Error('Origin not allowed by CORS'));
    }
  },
  credentials: true,
}));

// JSON body parser for /emit
app.use(express.json({ limit: '16kb' }));

// Healthcheck (Render pinga para manter o servico acordado)
app.get('/health', (_req, res) => {
  res.json({ status: 'ok', timestamp: new Date().toISOString() });
});

// Endpoint para a REST API (Vercel) emitir eventos para usuarios conectados
// POST /emit
// Headers: X-Emit-Key: <EMIT_API_KEY>
// Body: { userId, event, data }
app.post('/emit', (req, res) => {
  const key = req.headers['x-emit-key'];
  if (!EMIT_API_KEY || key !== EMIT_API_KEY) {
    res.status(401).json({ success: false, error: 'Unauthorized' });
    return;
  }
  const { userId, event, data } = req.body || {};
  if (!userId || !event || typeof data === 'undefined') {
    res.status(400).json({ success: false, error: 'userId, event, data are required' });
    return;
  }
  const delivered = emitToUser(userId, event, data);
  res.json({ success: true, delivered });
});

const httpServer = createServer(app);

const io = new Server(httpServer, {
  cors: {
    origin: (origin, callback) => {
      if (!origin || matchesOrigin(origin)) {
        callback(null, true);
      } else {
        callback(new Error('Origin not allowed by CORS'));
      }
    },
    methods: ['GET', 'POST'],
  },
});

setupNotifications(io);

httpServer.listen(PORT, () => {
  console.log(`[nexus-ws] listening on port ${PORT}`);
});
