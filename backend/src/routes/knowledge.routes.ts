import { Router } from "express";
import {
  createKnowledgeArticle,
  listKnowledgeArticles,
  uploadMiddleware,
  uploadKnowledge,
} from "../controllers/knowledge.controller";
import { authMiddleware } from "../middlewares/auth.middleware";
import { allowRoles } from "../middlewares/role.middleware";

const router = Router();

router.get("/", authMiddleware, allowRoles("ADMIN", "AGENT"), listKnowledgeArticles);

router.post("/", authMiddleware, allowRoles("ADMIN", "AGENT"), createKnowledgeArticle);

router.post(
  "/upload",
  authMiddleware,
  allowRoles("ADMIN", "AGENT"),
  uploadMiddleware,
  uploadKnowledge
);

export default router;
