import { Router } from "express";
import { AiSettingsController } from "../controllers/aiSettings.controller";
import { allowRoles } from "../middlewares/role.middleware";

const router = Router();

router.get("/", allowRoles("ADMIN"), AiSettingsController.get);
router.patch("/", allowRoles("ADMIN"), AiSettingsController.update);

export default router;
