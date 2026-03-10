import express from "express";
import cors from "cors";
import authRoutes from "./modules/auth/auth.routes";
import ticketRoutes from "./modules/tickets/tickets.routes";
import agentRoutes from "./modules/agents/agents.routes";
import knowledgeRoutes from "./routes/knowledge.routes";
import customersRoutes from "./modules/customers/customers.routes";
import aiSuggestionsRoutes from "./modules/ai-suggestions/aiSuggestions.routes";
import analyticsRoutes from "./modules/analytics/analytics.routes";
import { authMiddleware } from "./middlewares/auth.middleware";
import { orgMiddleware } from "./middlewares/org.middleware";


const app = express();

app.use(cors());
app.use(express.json());

app.use("/auth", authRoutes);
app.use(authMiddleware, orgMiddleware);
app.use("/tickets", ticketRoutes);
app.use("/agents", agentRoutes);
app.use("/customers", customersRoutes);
app.use("/knowledge", knowledgeRoutes);
app.use("/ai/suggestions", aiSuggestionsRoutes);
app.use("/analytics", analyticsRoutes);

export default app;
