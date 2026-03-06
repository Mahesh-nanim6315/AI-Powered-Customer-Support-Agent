import "dotenv/config";
import http from "http";
import { Server } from "socket.io";
import app from "./app";
import { verifyToken } from "./utils/jwt";
import { setIO } from "./config/socket";
// Import workers to start them
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

// Socket authentication middleware
io.use((socket: any, next) => {
  try {
    const token = socket.handshake.auth.token;
    if (!token) {
      console.warn("🟡 Connection attempt without token");
      return next(new Error("Missing token"));
    }

    const decoded = verifyToken(token);
    socket.user = decoded;
    socket.userId = decoded.userId;
    socket.orgId = decoded.orgId;
    console.log("🟢 Socket authenticated for user:", decoded.userId, "org:", decoded.orgId);
    next();
  } catch (error) {
    console.error("🔴 Socket auth failed:", error);
    next(new Error("Unauthorized"));
  }
});

io.on("connection", (socket: any) => {
  console.log("🟢 User connected:", socket.userId, "socket id:", socket.id);

  // Join org room for broadcasts
  const orgRoom = `org-${socket.orgId}`;
  socket.join(orgRoom);
  console.log(`📍 Socket ${socket.id} joined room: ${orgRoom}`);

  // Support both event names
  socket.on("join-ticket", (ticketId: string) => {
    const ticketRoom = `ticket-${ticketId}`;
    socket.join(ticketRoom);
    console.log(`📍 Socket ${socket.id} joined room: ${ticketRoom}`);
  });

  socket.on("joinTicket", (ticketId: string) => {
    const ticketRoom = `ticket-${ticketId}`;
    socket.join(ticketRoom);
    console.log(`📍 Socket ${socket.id} joined room: ${ticketRoom}`);
  });

  socket.on("disconnect", () => {
    console.log("🔴 User disconnected:", socket.userId, "socket id:", socket.id);
  });
});

export { io };

const PORT = process.env.PORT || 5000;

server.listen(PORT, () => {
  console.log(`🚀 Server running on port ${PORT}`);
  console.log(`📡 Socket.io CORS origins:`, [FRONTEND_URL, "http://localhost:5173", "http://localhost:5174"]);
});
