import { Router } from "express";
import { authMiddleware } from "../../middlewares/auth.middleware";
import { allowRoles } from "../../middlewares/role.middleware";
import { AgentsController } from "./agents.controller";

const router = Router();

router.use(authMiddleware);

router.get("/", allowRoles("ADMIN", "AGENT"), AgentsController.list);
router.post("/", allowRoles("ADMIN"), AgentsController.create);
router.patch("/:id", allowRoles("ADMIN"), AgentsController.update);
router.delete("/:id", allowRoles("ADMIN"), AgentsController.delete);

export default router;