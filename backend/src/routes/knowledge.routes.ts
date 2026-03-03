import { Router } from "express";
import { uploadMiddleware, uploadKnowledge } from "../controllers/knowledge.controller";

const router = Router();

router.post("/upload", uploadMiddleware, uploadKnowledge);

export default router;