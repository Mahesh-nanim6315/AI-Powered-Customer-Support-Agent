import { Request, Response } from "express";
import { z } from "zod";
import { LogsService } from "../services/logs.service";

const logsQuerySchema = z.object({
  limit: z.coerce.number().int().min(1).max(100).optional(),
  level: z.enum(["info", "warn", "error"]).optional(),
  source: z.string().trim().min(1).optional(),
  startDate: z.string().trim().min(1).optional(),
  endDate: z.string().trim().min(1).optional(),
});

export class LogsController {
  static async list(req: Request, res: Response) {
    try {
      const orgId = req.user?.orgId;

      if (!orgId) {
        return res.status(401).json({ message: "Unauthorized" });
      }

      const filters = logsQuerySchema.parse(req.query);
      const logs = await LogsService.list(orgId, filters);
      return res.json(logs);
    } catch (error) {
      if (error instanceof z.ZodError) {
        return res.status(400).json({ message: "Invalid logs query", issues: error.flatten() });
      }

      console.error("Failed to fetch logs:", error);
      return res.status(500).json({ message: "Failed to fetch logs" });
    }
  }

  static async exportCsv(req: Request, res: Response) {
    try {
      const orgId = req.user?.orgId;

      if (!orgId) {
        return res.status(401).json({ message: "Unauthorized" });
      }

      const filters = logsQuerySchema.parse(req.query);
      const csv = await LogsService.exportCsv(orgId, filters);
      const timestamp = new Date().toISOString().replace(/[:.]/g, "-");

      res.setHeader("Content-Type", "text/csv; charset=utf-8");
      res.setHeader("Content-Disposition", `attachment; filename="system-logs-${timestamp}.csv"`);
      return res.send(csv);
    } catch (error) {
      if (error instanceof z.ZodError) {
        return res.status(400).json({ message: "Invalid logs export query", issues: error.flatten() });
      }

      console.error("Failed to export logs:", error);
      return res.status(500).json({ message: "Failed to export logs" });
    }
  }
}
