import { Server as SocketIOServer } from "socket.io";

declare global {
  namespace Express {
    interface UserPayload {
      userId: string;
      orgId: string;
      role: string;
    }

    interface Request {
      user?: UserPayload;
      io?: SocketIOServer;
    }
  }
}

export {};