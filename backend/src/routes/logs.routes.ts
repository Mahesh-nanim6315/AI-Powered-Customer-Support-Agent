import { Router } from "express";
import { allowRoles } from "../middlewares/role.middleware";
import { LogsController } from "../controllers/logs.controller";

const router = Router();

router.get("/export", allowRoles("ADMIN"), LogsController.exportCsv);
router.get("/", allowRoles("ADMIN"), LogsController.list);

export default router;
