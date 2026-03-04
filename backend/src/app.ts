import express from "express";
import cors from "cors";
import authRoutes from "./modules/auth/auth.routes";
import ticketRoutes from "./modules/tickets/tickets.routes";
import agentRoutes from "./modules/agents/agents.routes";
import knowledgeRoutes from "./routes/knowledge.routes";
import customersRoutes from "./modules/customers/customers.routes";
import aiSuggestionsRoutes from "./modules/ai-suggestions/aiSuggestions.routes";


const app = express();

app.use(cors());
app.use(express.json());

app.use("/auth", authRoutes);
app.use("/tickets", ticketRoutes);
app.use("/agents", agentRoutes);
app.use("/customers", customersRoutes);
app.use("/knowledge", knowledgeRoutes);
app.use("/ai/suggestions", aiSuggestionsRoutes);

export default app;