import "dotenv/config";
import http from "http";
import { Server } from "socket.io";
import app from "./app";
import { verifyToken } from "./utils/jwt";
import { setIO } from "./config/socket";
import "./workers/ai.worker";
import "./workers/email.worker";
import "./workers/analytics.worker";

const server = http.createServer(app);

const FRONTEND_URL = process.env.FRONTEND_URL || "http://localhost:5173";

const io = new Server(server, {
  cors: {
    origin: [FRONTEND_URL, "http://localhost:5173", "http://localhost:5174"],
    methods: ["GET", "POST"],
    credentials: true,
  },
  transports: ["websocket", "polling"],
});

app.set("io", io);
setIO(io);

io.use((socket: any, next) => {
  try {
    const token = socket.handshake.auth.token;
    if (!token) {
      return next(new Error("Missing token"));
    }

    const decoded = verifyToken(token);
    socket.user = decoded;
    socket.userId = decoded.userId;
    socket.orgId = decoded.orgId;
    next();
  } catch {
    next(new Error("Unauthorized"));
  }
});

io.on("connection", (socket: any) => {
  const orgRoom = `org-${socket.orgId}`;
  socket.join(orgRoom);

  socket.on("join-ticket", (ticketId: string) => {
    socket.join(`ticket-${ticketId}`);
  });

  socket.on("joinTicket", (ticketId: string) => {
    socket.join(`ticket-${ticketId}`);
  });

  socket.on("typing_indicator", (payload: { ticketId?: string; isTyping?: boolean }) => {
    if (!payload?.ticketId) return;
    io.to(`ticket-${payload.ticketId}`).emit("typing_indicator", {
      ticketId: payload.ticketId,
      actor: socket.user?.role || "USER",
      userId: socket.userId,
      isTyping: Boolean(payload.isTyping),
    });
  });
});

export { io };

const PORT = process.env.PORT || 5000;

server.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
});
