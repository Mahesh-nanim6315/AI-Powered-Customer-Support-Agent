import { Request, Response } from "express";
import { z } from "zod";
import { AiSettingsService } from "../services/aiSettings.service";
import { AuditService } from "../services/audit.service";

const aiSettingsSchema = z.object({
  aiEnabled: z.boolean(),
  model: z.string().trim().min(1),
  temperature: z.number().min(0).max(2),
  confidenceThreshold: z.number().min(0).max(1),
  autoExecuteSuggestions: z.boolean(),
  kbFallbackEnabled: z.boolean(),
  safeFallbackEnabled: z.boolean(),
  escalationEnabled: z.boolean(),
  replyTone: z.string().trim().min(1),
  systemPrompt: z.string().trim().max(5000).nullable(),
});

function summarizeChangedFields(
  previous: Partial<Record<keyof typeof aiSettingsSchema._output, unknown>>,
  next: Partial<Record<keyof typeof aiSettingsSchema._output, unknown>>
) {
  return Object.keys(next).filter((key) => previous[key as keyof typeof previous] !== next[key as keyof typeof next]);
}

export class AiSettingsController {
  static async get(req: Request, res: Response) {
    try {
      const orgId = req.user?.orgId;

      if (!orgId) {
        return res.status(401).json({ message: "Unauthorized" });
      }

      const settings = await AiSettingsService.getByOrgId(orgId);
      return res.json(settings);
    } catch (error) {
      console.error("Failed to fetch AI settings:", error);
      return res.status(500).json({ message: "Failed to fetch AI settings" });
    }
  }

  static async update(req: Request, res: Response) {
    try {
      const orgId = req.user?.orgId;
      const userId = req.user?.userId;

      if (!orgId) {
        return res.status(401).json({ message: "Unauthorized" });
      }

      const previousSettings = await AiSettingsService.getByOrgId(orgId);
      const payload = aiSettingsSchema.parse({
        ...req.body,
        systemPrompt: req.body?.systemPrompt?.trim() ? req.body.systemPrompt.trim() : null,
      });

      const settings = await AiSettingsService.update(orgId, payload);

      const changedFields = summarizeChangedFields(previousSettings, payload);

      await AuditService.logUserActivity({
        userId,
        orgId,
        action: "SETTINGS_UPDATED",
        resourceType: "AI_SETTINGS",
        resourceId: settings.id ?? undefined,
        ipAddress: req.ip,
        userAgent: req.get("User-Agent"),
        details: {
          changedFields,
          aiEnabled: settings.aiEnabled,
          model: settings.model,
          confidenceThreshold: settings.confidenceThreshold,
          autoExecuteSuggestions: settings.autoExecuteSuggestions,
        },
      });

      await AuditService.logSystemEvent({
        eventType: "INFO",
        severity: "LOW",
        message: "AI settings updated",
        source: "AI_SETTINGS",
        orgId,
        userId,
        ipAddress: req.ip,
        userAgent: req.get("User-Agent"),
        details: {
          changedFields,
          resourceId: settings.id,
        },
      });

      return res.json(settings);
    } catch (error) {
      if (error instanceof z.ZodError) {
        return res.status(400).json({
          message: "Invalid AI settings payload",
          issues: error.flatten(),
        });
      }

      console.error("Failed to update AI settings:", error);
      return res.status(500).json({ message: "Failed to update AI settings" });
    }
  }
}
