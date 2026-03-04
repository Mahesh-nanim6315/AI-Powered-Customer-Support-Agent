import { Request, Response, NextFunction } from "express";
import { verifyToken } from "../utils/jwt";

export function authMiddleware(req: Request, res: Response, next: NextFunction) {
  const authHeader = req.headers.authorization;

  if (!authHeader) {
    return res.status(401).json({ message: "Unauthorized" });
  }

  const token = authHeader.split(" ")[1];

  try {
    const decoded = verifyToken(token);

    if (typeof decoded === "string") {
      return res.status(401).json({ message: "Invalid token" });
    }

    req.user = decoded as Express.UserPayload;
    next();
  } catch {
    return res.status(401).json({ message: "Invalid token" });
  }
}
