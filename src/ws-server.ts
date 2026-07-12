/**
 * Servidor dedicado para WebSocket (Socket.IO).
 * Hospedado separadamente (Render) porque Vercel Serverless nao suporta WebSocket.
 *
 * Apenas emite notificacoes em tempo real. Nao expone APIs REST.
 */
if (!process.env.VERCEL) {
  require('dotenv').config();
}

import express from 'express';
import cors from 'cors';
import helmet from 'helmet';
import { createServer } from 'http';
import { Server } from 'socket.io';
import { setupNotifications } from './notifications';

const PORT = parseInt(process.env.PORT || '3001', 10);

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

// Healthcheck (Render pinga para manter o servico acordado)
app.get('/health', (_req, res) => {
  res.json({ status: 'ok', timestamp: new Date().toISOString() });
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
