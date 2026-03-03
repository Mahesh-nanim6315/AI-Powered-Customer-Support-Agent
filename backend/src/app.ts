import express from "express";
import cors from "cors";
import authRoutes from "./modules/auth/auth.routes";
import ticketRoutes from "./modules/tickets/tickets.routes";
import agentRoutes from "./modules/agents/agents.routes";


const app = express();

app.use(cors());
app.use(express.json());

app.use("/auth", authRoutes);
app.use("/tickets", ticketRoutes);
app.use("/agents", agentRoutes);

export default app;