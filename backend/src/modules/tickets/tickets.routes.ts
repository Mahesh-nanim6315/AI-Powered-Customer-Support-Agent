import { Router } from "express";
import { TicketController } from "./tickets.controller";
import { authMiddleware } from "../../middlewares/auth.middleware";
import { allowRoles } from "../../middlewares/role.middleware";
import { TicketService } from "./tickets.service";

const router = Router();

router.use(authMiddleware);

router.post("/", allowRoles("ADMIN", "AGENT"), TicketController.create);
router.get("/", allowRoles("ADMIN", "AGENT"), TicketController.getAll);
router.get("/:id", allowRoles("ADMIN", "AGENT"), TicketController.getById);
router.patch("/:id/status", allowRoles("ADMIN"), TicketController.updateStatus);

router.post("/:id/messages", allowRoles("ADMIN", "AGENT"), async (req: any, res) => {
  const { content } = req.body;

  const message = await TicketService.addMessage(
    req.params.id,
    req.user.orgId,
    "AGENT",
    content
  );

  res.status(201).json(message);
});

export default router;