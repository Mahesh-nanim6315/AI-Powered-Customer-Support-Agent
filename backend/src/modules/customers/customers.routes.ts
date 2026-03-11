import { Router } from "express";
import { authMiddleware } from "../../middlewares/auth.middleware";
import { allowRoles } from "../../middlewares/role.middleware";
import { CustomersController } from "./customers.controller";

const router = Router();

router.post("/accept-invite", CustomersController.acceptInvite);

router.use(authMiddleware);

router.get("/", allowRoles("ADMIN", "AGENT"), CustomersController.list);
router.get("/:id", allowRoles("ADMIN", "AGENT"), CustomersController.getById);
router.post("/", allowRoles("ADMIN", "AGENT"), CustomersController.create);

export default router;

