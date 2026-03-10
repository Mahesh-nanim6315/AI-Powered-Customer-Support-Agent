import { Router } from "express";
import { AuthController } from "./auth.controller";
import { authMiddleware } from "../../middlewares/auth.middleware";
import { allowRoles } from "../../middlewares/role.middleware";

const router = Router();

router.post("/register", AuthController.register);
router.post("/login", AuthController.login);
router.get("/me", authMiddleware, AuthController.me);
router.post("/switch-org", authMiddleware, AuthController.switchOrg);
router.post("/invite", authMiddleware, allowRoles("ADMIN"), AuthController.invite);
router.post("/accept-invite", AuthController.acceptInvite);
router.post("/register-customer", AuthController.registerCustomer);

export default router;
