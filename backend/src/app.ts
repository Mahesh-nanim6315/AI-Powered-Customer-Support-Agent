import express from "express";
import cors from "cors";
import authRoutes from "./modules/auth/auth.routes";
import { CustomersController } from "./modules/customers/customers.controller";
import ticketRoutes from "./modules/tickets/tickets.routes";
import agentRoutes from "./modules/agents/agents.routes";
import knowledgeRoutes from "./routes/knowledge.routes";
import customersRoutes from "./modules/customers/customers.routes";
import aiSuggestionsRoutes from "./modules/ai-suggestions/aiSuggestions.routes";
import analyticsRoutes from "./modules/analytics/analytics.routes";
import notificationRoutes from "./routes/notification.routes";
import { authMiddleware } from "./middlewares/auth.middleware";
import { orgMiddleware } from "./middlewares/org.middleware";
import { rateLimitDefault, rateLimitAuth, rateLimitMessages } from "./middlewares/rateLimit.middleware";
import { securityValidation, sanitizeInputs, securityHeaders } from "./middlewares/security.middleware";

const app = express();

// Apply security headers globally
app.use(securityHeaders);

app.use(cors());
app.use(express.json());

// Apply rate limiting
// app.use("/auth", rateLimitAuth);
app.use("/tickets", rateLimitMessages);
app.use(rateLimitDefault);

// Apply security validation and sanitization
app.use(securityValidation);
app.use(sanitizeInputs);

app.use("/auth", authRoutes);
app.post("/customers/accept-invite", CustomersController.acceptInvite);
app.use(authMiddleware, orgMiddleware);
app.use("/tickets", ticketRoutes);
app.use("/agents", agentRoutes);
app.use("/customers", customersRoutes);
app.use("/knowledge", knowledgeRoutes);
app.use("/ai/suggestions", aiSuggestionsRoutes);
app.use("/analytics", analyticsRoutes);
app.use("/notifications", notificationRoutes);

export default app;
