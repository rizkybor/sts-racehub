// server.js
import 'dotenv/config';
import http from 'http';
import { Server } from 'socket.io';
import jwt from 'jsonwebtoken';

const {
  PORT,
  CORS_ORIGINS,
  JWT_SECRET,
  NODE_ENV = 'development',
} = process.env;

// === Default config per environment ===
const defaults = {
  development: {
    PORT: 4000,
    CORS_ORIGINS: 'http://localhost:3000,http://localhost:8080',
    JWT_SECRET: 'dev-secret',
  },
  production: {
    PORT: PORT,               
    CORS_ORIGINS: CORS_ORIGINS,
    JWT_SECRET: JWT_SECRET,    
  },
};

// === Pilih config sesuai NODE_ENV ===
const envConfig = defaults[NODE_ENV] || defaults.development;
console.log(envConfig,'<<<')

const APP_PORT = Number(envConfig.PORT) || 4000;

// Parse CORS origins
function parseCors(origins) {
  if (!origins) return [];
  if (origins === '*') return '*';
  if (origins.includes(',')) {
    return origins.split(',').map(s => s.trim()).filter(Boolean);
  }
  return [origins.trim()];
}

const allowedOrigins = parseCors(envConfig.CORS_ORIGINS);

// === HTTP server (healthcheck) ===
const httpServer = http.createServer((req, res) => {
  if (req.url === '/health') {
    res.writeHead(200, { 'content-type': 'application/json' });
    res.end(JSON.stringify({ ok: true, env: NODE_ENV }));
    return;
  }
  if (req.url === '/') {
    res.writeHead(200, { 'content-type': 'text/plain' });
    res.end('Socket broker is running.\n');
    return;
  }
  res.writeHead(404);
  res.end();
});

// === Socket.IO server ===
const io = new Server(httpServer, {
  cors: {
    origin: allowedOrigins,
    credentials: true,
    methods: ['GET', 'POST', 'OPTIONS'],
    allowedHeaders: ['Content-Type', 'Authorization', 'x-access-token'],
  },
});

// JWT middleware (opsional)
io.use((socket, next) => {
  try {
    const token =
      socket.handshake.auth?.token ||
      socket.handshake.headers['x-access-token'] ||
      socket.handshake.headers['authorization']?.replace(/^Bearer\s+/i, '');

    if (!token) return next();
    jwt.verify(token, envConfig.JWT_SECRET);
    return next();
  } catch (err) {
    return next(new Error('Unauthorized'));
  }
});

// Events
io.on('connection', (socket) => {
  console.log('[broker] connected:', socket.id);

  socket.on('custom:event', (msg) => {
    console.log('[broker] custom:event =>', msg);
    io.emit('custom:event', msg);
  });

  socket.on('join', (room) => socket.join(room));
  socket.on('leave', (room) => socket.leave(room));

  socket.on('disconnect', (reason) => {
    console.log('[broker] disconnected:', socket.id, reason);
  });
});

httpServer.listen(APP_PORT, () => {
  console.log(`[broker] env=${NODE_ENV}`);
  console.log(`[broker] listening on :${APP_PORT}`);
  console.log(`[broker] CORS origins: ${Array.isArray(allowedOrigins) ? allowedOrigins.join(', ') : allowedOrigins}`);
});