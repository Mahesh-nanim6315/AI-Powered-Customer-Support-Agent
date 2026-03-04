import { Router } from "express";
import { TicketController } from "./tickets.controller";
import { authMiddleware } from "../../middlewares/auth.middleware";
import { allowRoles } from "../../middlewares/role.middleware";
import { sendMessage } from "../../controllers/message.controller";

const router = Router();

router.use(authMiddleware);

router.post("/", allowRoles("ADMIN", "AGENT"), TicketController.create);
router.get("/", allowRoles("ADMIN", "AGENT"), TicketController.getAll);
router.get("/:id", allowRoles("ADMIN", "AGENT"), TicketController.getById);
router.patch("/:id/status", allowRoles("ADMIN"), TicketController.updateStatus);
router.post("/:id/messages", allowRoles("ADMIN", "AGENT"), sendMessage);

export default router;
