import { Router } from "express";
import { authMiddleware } from "../../middlewares/auth.middleware";
import { allowRoles } from "../../middlewares/role.middleware";
import { AiSuggestionsController } from "./aiSuggestions.controller";

const router = Router();

router.use(authMiddleware);

router.get("/", allowRoles("ADMIN", "AGENT"), AiSuggestionsController.list);
router.post("/:id/approve", allowRoles("ADMIN", "AGENT"), AiSuggestionsController.approve);
router.post("/:id/reject", allowRoles("ADMIN", "AGENT"), AiSuggestionsController.reject);

export default router;

