import jwt from "jsonwebtoken";

const JWT_SECRET: jwt.Secret =
  process.env.JWT_SECRET ?? process.env.JWT_SECRET_KEY ?? "supersecret";
const JWT_EXPIRES = (process.env.JWT_EXPIRES ?? "7d") as jwt.SignOptions["expiresIn"];

export interface JwtPayload {
  userId: string;
  role: string;
  orgId: string;
}

export const signToken = (payload: JwtPayload): string => {
  return jwt.sign(payload, JWT_SECRET, {
    expiresIn: JWT_EXPIRES,
  });
};

// Backwards-compatible alias used across the codebase
export const generateToken = signToken;

export const verifyToken = (token: string): JwtPayload => {
  return jwt.verify(token, JWT_SECRET) as JwtPayload;
};