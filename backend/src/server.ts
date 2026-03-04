import "dotenv/config";
import http from "http";
import { Server } from "socket.io";
import app from "./app";
import { verifyToken } from "./utils/jwt";

const server = http.createServer(app);

const io = new Server(server, {
  cors: {
    origin: "*"
  }
});

app.set("io", io);

// Socket authentication middleware
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

const PORT = 5000;

server.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
});
