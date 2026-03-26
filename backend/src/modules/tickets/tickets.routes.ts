import { Router } from "express";
import { TicketController } from "./tickets.controller";
import { authMiddleware } from "../../middlewares/auth.middleware";
import { allowRoles } from "../../middlewares/role.middleware";
import { sendMessage } from "../../controllers/message.controller";
import { rateLimitMessages } from "../../middlewares/rateLimit.middleware";

const router = Router();

router.use(authMiddleware);

router.post("/", allowRoles("ADMIN", "AGENT", "CUSTOMER"), TicketController.create);
router.get("/", allowRoles("ADMIN", "AGENT", "CUSTOMER"), TicketController.getAll);
router.get("/unassigned", allowRoles("ADMIN", "AGENT"), TicketController.getUnassigned);
router.get("/:id", allowRoles("ADMIN", "AGENT", "CUSTOMER"), TicketController.getById);
router.get("/:id/assignments", allowRoles("ADMIN", "AGENT", "CUSTOMER"), TicketController.getAssignmentHistory);
router.get("/:id/activity", allowRoles("ADMIN", "AGENT", "CUSTOMER"), TicketController.getActivity);
router.post("/:id/reopen", allowRoles("ADMIN", "AGENT", "CUSTOMER"), TicketController.reopen);
router.patch("/:id", allowRoles("ADMIN", "AGENT"), TicketController.update);
router.patch("/:id/status", allowRoles("ADMIN", "AGENT"), TicketController.updateStatus);
router.delete("/:id", allowRoles("ADMIN", "AGENT"), TicketController.delete);
router.post("/:id/messages", rateLimitMessages, allowRoles("AGENT", "CUSTOMER"), sendMessage);

export default router;
