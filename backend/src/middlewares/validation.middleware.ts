import { Request, Response, NextFunction } from "express";
import { ZodSchema, ZodError } from "zod";

/**
 * Validation middleware factory
 * Validates request body, params, or query against a Zod schema
 */
export const validate = (schema: {
  body?: ZodSchema;
  params?: ZodSchema;
  query?: ZodSchema;
}) => {
  return (req: Request, res: Response, next: NextFunction) => {
    try {
      // Validate request body
      if (schema.body) {
        req.body = schema.body.parse(req.body);
      }

      // Validate request params
      if (schema.params) {
        req.params = schema.params.parse(req.params) as any;
      }

      // Validate query params
      if (schema.query) {
        req.query = schema.query.parse(req.query) as any;
      }

      next();
    } catch (error) {
      if (error instanceof ZodError) {
        const validationErrors = error.issues.map(err => ({
          field: err.path.join('.'),
          message: err.message,
          code: err.code
        }));

        return res.status(400).json({
          error: "Validation failed",
          message: "Invalid input data",
          details: validationErrors
        });
      }

      console.error("Validation middleware error:", error);
      return res.status(500).json({
        error: "Internal server error",
        message: "Failed to validate request"
      });
    }
  };
};

/**
 * Helper to validate specific fields
 */
export const validateField = (fieldName: string, schema: ZodSchema, value: any) => {
  try {
    return schema.parse(value);
  } catch (error: any) {
    if (error instanceof ZodError) {
      throw new Error(`Invalid ${fieldName}: ${error.issues[0]?.message || 'Validation failed'}`);
    }
    throw error;
  }
};
