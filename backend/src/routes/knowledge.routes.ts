import { Router } from "express";
import { uploadMiddleware, uploadKnowledge } from "../controllers/knowledge.controller";
import { authMiddleware } from "../middlewares/auth.middleware";
import { allowRoles } from "../middlewares/role.middleware";

const router = Router();

router.post(
  "/upload",
  authMiddleware,
  allowRoles("ADMIN", "AGENT"),
  uploadMiddleware,
  uploadKnowledge
);

export default router;
