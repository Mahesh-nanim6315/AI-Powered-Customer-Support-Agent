import { Server as HTTPServer } from "http";
import { Server } from "socket.io";

/*
  Socket Configuration
  Handles real-time communication for tickets
*/

let io: Server;

export function initSocket(server: HTTPServer) {
    io = new Server(server, {
        cors: {
            origin: process.env.FRONTEND_URL,
            methods: ["GET", "POST"],
            credentials: true,
        },
    });

    io.on("connection", (socket) => {
        console.log("🟢 User connected:", socket.id);

        // Join specific ticket room
        socket.on("joinTicket", (ticketId: string) => {
            socket.join(ticketId);
            console.log(`Socket ${socket.id} joined ticket ${ticketId}`);
        });

        // Leave ticket room
        socket.on("leaveTicket", (ticketId: string) => {
            socket.leave(ticketId);
            console.log(`Socket ${socket.id} left ticket ${ticketId}`);
        });

        socket.on("disconnect", () => {
            console.log("🔴 User disconnected:", socket.id);
        });
    });

    return io;
}

export function getIO() {
    if (!io) {
        throw new Error("Socket.io not initialized!");
    }
    return io;
}