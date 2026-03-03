import "dotenv/config";
import http from "http";
import { Server } from "socket.io";
import app from "./app";
import { verifyToken } from "./utils/jwt";
import { uploadMiddleware, uploadKnowledge } from "../controllers/knowledge.controller";


const server = http.createServer(app);

app.set("io", io);

const io = new Server(server, {
  cors: {
    origin: "*"
  }
});

// 🔐 Socket Authentication Middleware
io.use((socket: any, next) => {
  try {
    const token = socket.handshake.auth.token;
    const decoded = verifyToken(token);
    socket.user = decoded;
    next();
  } catch {
    next(new Error("Unauthorized"));
  }
});

io.on("connection", (socket: any) => {
  console.log("User connected:", socket.user.userId);

  const orgRoom = `org-${socket.user.orgId}`;
  socket.join(orgRoom);

  socket.on("join-ticket", (ticketId: string) => {
    socket.join(`ticket-${ticketId}`);
  });

  socket.on("disconnect", () => {
    console.log("User disconnected");
  });
});

export { io };

app.use("/knowledge", knowledgeRoutes);

const PORT = 5000;

server.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
});