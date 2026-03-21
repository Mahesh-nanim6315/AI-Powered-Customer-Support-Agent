import { Request, Response, NextFunction } from "express";

function normalizeRoles(roles: Array<string | string[]>): string[] {
  return roles.flatMap((role) => (Array.isArray(role) ? role : [role]));
}

export function allowRoles(...roles: Array<string | string[]>) {
  const allowedRoles = normalizeRoles(roles);

  return (req: Request, res: Response, next: NextFunction) => {
    if (!req.user?.role || !allowedRoles.includes(req.user.role)) {
      return res.status(403).json({ message: "Forbidden" });
    }

    next();
  };
}
