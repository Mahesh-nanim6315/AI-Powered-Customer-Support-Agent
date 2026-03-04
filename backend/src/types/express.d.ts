export {};

declare global {
  namespace Express {
    interface UserPayload {
      id?: string;
      userId?: string;
      orgId?: string;
      role?: string;
      email?: string;
    }

    interface Request {
      user?: UserPayload;
    }
  }
}
