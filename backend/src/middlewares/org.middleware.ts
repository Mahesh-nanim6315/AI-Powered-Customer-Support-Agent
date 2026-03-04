import { Request, Response, NextFunction } from "express";

/*
  Organization Middleware
  Ensures every request is scoped to an organization
*/

export function orgMiddleware(
    req: Request,
    res: Response,
    next: NextFunction
) {
    try {
        /*
          Option 1:
          Org ID from JWT (recommended)
        */
        const user = (req as any).user;

        if (!user || !user.orgId) {
            return res.status(403).json({
                success: false,
                message: "Organization access denied.",
            });
        }

        // Attach orgId to request for controllers
        (req as any).orgId = user.orgId;

        next();
    } catch (error) {
        console.error("Org Middleware Error:", error);

        return res.status(500).json({
            success: false,
            message: "Organization validation failed.",
        });
    }
}