import { Server, Socket } from 'socket.io';
import jwt from 'jsonwebtoken';

/**
 * JWT payload shape - deve casar com o servido pelo backend REST (Vercel).
 */
interface AuthPayload {
  userId: string;
  minecraftUuid: string;
  username: string;
}

const JWT_SECRET = process.env.JWT_SECRET!;

const userIdToSockets = new Map<string, Set<string>>();
let ioRef: Server | null = null;

export function setupNotifications(io: Server) {
  ioRef = io;

  io.on('connection', (socket) => {
    let userId: string | null = null;

    socket.on('auth', (data: { token: string }) => {
      try {
        const payload = jwt.verify(data.token, JWT_SECRET!) as unknown as AuthPayload;
        userId = payload.userId;
        const set = userIdToSockets.get(userId) || new Set();
        set.add(socket.id);
        userIdToSockets.set(userId, set);
        console.log(`[nexus-ws] user ${payload.username} (${userId}) on socket ${socket.id}`);
      } catch (err) {
        console.warn(`[nexus-ws] auth error: ${(err as Error).message}`);
        socket.emit('auth_error', { error: 'Invalid token' });
      }
    });

    socket.on('disconnect', () => {
      if (userId) {
        const set = userIdToSockets.get(userId);
        if (set) {
          set.delete(socket.id);
          if (set.size === 0) userIdToSockets.delete(userId);
        }
        console.log(`[nexus-ws] user ${userId} disconnected from ${socket.id}`);
      }
    });
  });
}

export function emitToUser(userId: string, event: string, data: any): boolean {
  if (!ioRef) return false;
  const sockets = userIdToSockets.get(userId);
  if (!sockets || sockets.size === 0) return false;
  for (const socketId of sockets) {
    ioRef.to(socketId).emit(event, data);
  }
  return true;
}

/**
 * Mantido para compatibilidade com o codigo REST compartilhado.
 */
(global as any).__io_register = (io: Server) => setupNotifications(io);
