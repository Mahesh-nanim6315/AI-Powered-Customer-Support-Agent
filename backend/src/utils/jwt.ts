import jwt from "jsonwebtoken";

// CRITICAL SECURITY: JWT secret must be set in production
const isProduction = process.env.NODE_ENV === "production";
const rawJwtSecret =
  process.env.JWT_SECRET ||
  process.env.JWT_SECRET_KEY ||
  (isProduction ? undefined : "dev-only-jwt-secret-change-me");

if (!rawJwtSecret) {
  throw new Error(
    "CRITICAL: JWT_SECRET environment variable is required for production. " +
      "Set a strong, random secret key (at least 32 characters)."
  );
}

if (rawJwtSecret === "supersecret" || rawJwtSecret.length < 32) {
  console.warn(
    "SECURITY WARNING: Using weak or default JWT secret. " +
      "Please set a strong JWT_SECRET environment variable."
  );
}

const JWT_SECRET: jwt.Secret = rawJwtSecret;
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
