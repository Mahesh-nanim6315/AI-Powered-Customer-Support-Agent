import { Request, Response } from "express";
import { AiSuggestionsService } from "./aiSuggestions.service";
import { approveSuggestionSchema, listSuggestionsQuerySchema } from "./aiSuggestions.validators";

function getOrgId(req: Request): string | null {
  return req.user?.orgId ?? null;
}

function canApprove(req: Request, actionType: string): boolean {
  // ADMIN and AGENT can approve/reject suggestions.
  if (!req.user?.role) return false;
  return ["ADMIN", "AGENT"].includes(req.user.role) && Boolean(actionType);
}

export class AiSuggestionsController {
  static async list(req: Request, res: Response) {
    const orgId = getOrgId(req);
    if (!orgId) return res.status(401).json({ message: "Unauthorized" });

    const query = listSuggestionsQuerySchema.parse(req.query);
    const suggestions = await AiSuggestionsService.list(orgId, query);
    return res.json(suggestions);
  }

  static async approve(req: Request, res: Response) {
    const orgId = getOrgId(req);
    if (!orgId) return res.status(401).json({ message: "Unauthorized" });

    const rawId = (req.params as any).id as string | string[];
    const id = Array.isArray(rawId) ? rawId[0] : rawId;
    const suggestion = await AiSuggestionsService.getById(orgId, id);
    if (!suggestion) return res.status(404).json({ message: "Suggestion not found" });

    if (!canApprove(req, suggestion.actionType)) {
      return res.status(403).json({ message: "Forbidden" });
    }

    const { execute } = approveSuggestionSchema.parse(req.body ?? {});
    const approved = await AiSuggestionsService.approve(orgId, suggestion.id);
    if (!approved) return res.status(409).json({ message: "Suggestion not pending" });

    const finalSuggestion = execute
      ? await AiSuggestionsService.execute(orgId, suggestion.id)
      : approved;

    req.app.get("io")?.to(`org-${orgId}`).emit("suggestion-updated", finalSuggestion);

    return res.json(finalSuggestion);
  }

  static async reject(req: Request, res: Response) {
    const orgId = getOrgId(req);
    if (!orgId) return res.status(401).json({ message: "Unauthorized" });

    const rawId = (req.params as any).id as string | string[];
    const id = Array.isArray(rawId) ? rawId[0] : rawId;
    const suggestion = await AiSuggestionsService.getById(orgId, id);
    if (!suggestion) return res.status(404).json({ message: "Suggestion not found" });

    if (!canApprove(req, suggestion.actionType)) {
      return res.status(403).json({ message: "Forbidden" });
    }

    const rejected = await AiSuggestionsService.reject(orgId, suggestion.id);
    if (!rejected) return res.status(409).json({ message: "Suggestion not pending" });

    req.app.get("io")?.to(`org-${orgId}`).emit("suggestion-updated", rejected);

    return res.json(rejected);
  }
}
