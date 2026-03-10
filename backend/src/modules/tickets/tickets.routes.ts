import { Router } from "express";
import { TicketController } from "./tickets.controller";
import { authMiddleware } from "../../middlewares/auth.middleware";
import { allowRoles } from "../../middlewares/role.middleware";
import { sendMessage } from "../../controllers/message.controller";

const router = Router();

router.use(authMiddleware);

router.post("/", allowRoles("ADMIN", "AGENT", "CUSTOMER"), TicketController.create);
router.get("/", allowRoles("ADMIN", "AGENT", "CUSTOMER"), TicketController.getAll);
router.get("/unassigned", allowRoles("ADMIN", "AGENT"), TicketController.getUnassigned);
router.get("/:id", allowRoles("ADMIN", "AGENT", "CUSTOMER"), TicketController.getById);
router.patch("/:id", allowRoles("ADMIN", "AGENT", "CUSTOMER"), TicketController.update);
router.patch("/:id/status", allowRoles("ADMIN", "AGENT"), TicketController.updateStatus);
router.delete("/:id", allowRoles("ADMIN", "AGENT", "CUSTOMER"), TicketController.delete);
router.post("/:id/messages", allowRoles("ADMIN", "AGENT", "CUSTOMER"), sendMessage);

export default router;
