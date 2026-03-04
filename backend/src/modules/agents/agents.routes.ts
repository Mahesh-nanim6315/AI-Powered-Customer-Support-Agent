import { Router } from "express";
import { authMiddleware } from "../../middlewares/auth.middleware";
import { allowRoles } from "../../middlewares/role.middleware";
import { AgentsController } from "./agents.controller";

const router = Router();

router.use(authMiddleware);

router.get("/", allowRoles("ADMIN", "AGENT"), AgentsController.list);
router.post("/", allowRoles("ADMIN"), AgentsController.create);

export default router;