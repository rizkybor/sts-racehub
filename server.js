// server.js
import 'dotenv/config';
import { createServer } from 'http';
import { Server } from 'socket.io';
import jwt from 'jsonwebtoken';

const {
  PORT = 4000,
  CORS_ORIGINS = 'http://localhost:3000,http://localhost:8080',
  JWT_SECRET = 'dev-secret'
} = process.env;

const httpServer = createServer();
const io = new Server(httpServer, {
  cors: { origin: CORS_ORIGINS.split(',').map(s => s.trim()) }
});

// (Opsional) Auth JWT – amanakan nanti kalau perlu
io.use((socket, next) => {
  try {
    const token = socket.handshake.auth?.token || socket.handshake.headers['x-access-token'];
    if (!token) return next();
    jwt.verify(token, JWT_SECRET);
    next();
  } catch (e) {
    next(new Error('Unauthorized'));
  }
});

io.on('connection', (socket) => {
  console.log('[broker] connected:', socket.id);

  // Button test: ke semua klien
  socket.on('custom:event', (msg) => {
    console.log('[broker] custom:event =>', msg);
    io.emit('custom:event', msg);
  });

  // (Opsional) Room by eventId
  socket.on('join', (room) => socket.join(room));
  socket.on('leave', (room) => socket.leave(room));
});

httpServer.listen(Number(PORT), () => {
  console.log(`[broker] listening on :${PORT}`);
  console.log(`[broker] CORS origins: ${CORS_ORIGINS}`);
});