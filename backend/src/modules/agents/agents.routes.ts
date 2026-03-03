import { Router } from "express";
import { authMiddleware } from "../../middlewares/auth.middleware";
import { allowRoles } from "../../middlewares/role.middleware";
import { AgentService } from "./agents.service";

const router = Router();

router.use(authMiddleware);

router.post("/", allowRoles("ADMIN"), async (req: any, res) => {
  const { userId, specialization } = req.body;

  const agent = await AgentService.createAgent(userId, specialization);

  res.status(201).json(agent);
});

export default router;