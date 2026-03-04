import { Router } from "express";
import { uploadMiddleware, uploadKnowledge } from "../controllers/knowledge.controller";
import { authMiddleware } from "../middlewares/auth.middleware";
import { allowRoles } from "../middlewares/role.middleware";
import { orgMiddleware } from "../middleware/org.middleware";


const router = Router();

router.post("/upload", authMiddleware, allowRoles("ADMIN", "AGENT"), uploadMiddleware, uploadKnowledge);
router.get(
    "/tickets",
    authMiddleware,
    orgMiddleware,
    getTicketsController
);

export default router;
