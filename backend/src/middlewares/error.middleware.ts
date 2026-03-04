import { Request, Response, NextFunction } from "express";
import { Prisma } from "@prisma/client";

/*
  Global Error Handling Middleware
*/

export function errorMiddleware(
    err: any,
    req: Request,
    res: Response,
    next: NextFunction
) {
    console.error("🔥 Error:", err);

    // Default error
    let statusCode = err.statusCode || 500;
    let message = err.message || "Internal Server Error";

    /*
      Prisma Known Errors
    */
    if (err instanceof Prisma.PrismaClientKnownRequestError) {
        switch (err.code) {
            case "P2002":
                statusCode = 400;
                message = "Duplicate field value entered.";
                break;

            case "P2025":
                statusCode = 404;
                message = "Record not found.";
                break;

            default:
                statusCode = 400;
                message = "Database operation failed.";
        }
    }

    /*
      Prisma Validation Error
    */
    if (err instanceof Prisma.PrismaClientValidationError) {
        statusCode = 400;
        message = "Invalid data provided to database.";
    }

    /*
      JSON Parse Error
    */
    if (err instanceof SyntaxError && "body" in err) {
        statusCode = 400;
        message = "Invalid JSON format.";
    }

    /*
      Production vs Development
    */
    const response: any = {
        success: false,
        message,
    };

    if (process.env.NODE_ENV === "development") {
        response.stack = err.stack;
    }

    return res.status(statusCode).json(response);
}