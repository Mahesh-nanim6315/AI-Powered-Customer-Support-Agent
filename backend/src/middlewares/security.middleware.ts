import { Request, Response, NextFunction } from "express";

/**
 * Security middleware for preventing common attacks
 */

// SQL Injection prevention patterns
const sqlInjectionPatterns = [
  /(\b(SELECT|INSERT|UPDATE|DELETE|DROP|CREATE|ALTER|EXEC|UNION|SCRIPT)\b)/i,
  /(--|#|\/\*|\*\/|;|'|"|`)/i,
  /(\bOR\b|\bAND\b).*(\b=|\bLIKE\b)/i,
  /\bWAITFOR\b.*\bDELAY\b/i,
  /\bBENCHMARK\b/i,
  /\bSLEEP\b/i,
  /\bPG_SLEEP\b/i,
  /\bDBMS_PIPE\b/i
];

// XSS prevention patterns
const xssPatterns = [
  /<script\b[^<]*(?:(?!<\/script>)<[^<]*)*<\/script>/gi,
  /<iframe\b[^<]*(?:(?!<\/iframe>)<[^<]*)*<\/iframe>/gi,
  /javascript:/gi,
  /on\w+\s*=/gi,
  /<img[^>]*src[^>]*javascript:/gi,
  /<\s*script/gi,
  /data:\s*text\/html/gi
];

// NoSQL injection patterns
const noSqlPatterns = [
  /\$where/gi,
  /\$ne/gi,
  /\$in/gi,
  /\$nin/gi,
  /\$gt/gi,
  /\$gte/gi,
  /\$lt/gi,
  /\$lte/gi,
  /\$regex/gi
];

/**
 * Check for SQL injection patterns
 */
function containsSqlInjection(input: string): boolean {
  return sqlInjectionPatterns.some(pattern => pattern.test(input));
}

/**
 * Check for XSS patterns
 */
function containsXss(input: string): boolean {
  return xssPatterns.some(pattern => pattern.test(input));
}

/**
 * Check for NoSQL injection patterns
 */
function containsNoSqlInjection(input: string): boolean {
  return noSqlPatterns.some(pattern => pattern.test(input));
}

function firstString(value: string | string[] | undefined): string | undefined {
  if (Array.isArray(value)) {
    return value[0];
  }
  return value;
}

function collectStringValues(input: unknown): string[] {
  if (typeof input === "string") {
    return [input];
  }

  if (Array.isArray(input)) {
    return input.flatMap((value) => collectStringValues(value));
  }

  if (input && typeof input === "object") {
    return Object.values(input).flatMap((value) => collectStringValues(value));
  }

  return [];
}

/**
 * Sanitize input by removing dangerous characters
 */
function sanitizeInputString(input: string): string {
  if (typeof input !== 'string') return input;
  
  return input
    .replace(/['"\\;]/g, '') // Remove dangerous quotes and semicolons
    .replace(/--/g, '') // Remove SQL comments
    .replace(/\/\*/g, '') // Remove SQL block comments
    .replace(/\*\//g, '') // Remove SQL block comments
    .replace(/[<>]/g, '') // Remove HTML tags
    .trim();
}

/**
 * Security validation middleware
 */
export const securityValidation = (req: Request, res: Response, next: NextFunction) => {
  try {
    // Check query parameters
    for (const [key, value] of Object.entries(req.query)) {
      if (typeof value === 'string') {
        if (containsSqlInjection(value as string)) {
          console.warn(`Potential SQL injection detected in query parameter: ${key}`, {
            ip: req.ip,
            userAgent: req.get('User-Agent'),
            value: (value as string).substring(0, 100) // Log first 100 chars
          });
          return res.status(400).json({
            error: "Invalid input detected",
            message: "Request contains potentially malicious content"
          });
        }

        if (containsXss(value as string)) {
          console.warn(`Potential XSS detected in query parameter: ${key}`, {
            ip: req.ip,
            userAgent: req.get('User-Agent'),
            value: (value as string).substring(0, 100)
          });
          return res.status(400).json({
            error: "Invalid input detected",
            message: "Request contains potentially malicious content"
          });
        }
      }
    }

    // Check request body
    if (req.body && typeof req.body === 'object') {
      const bodyStrings = collectStringValues(req.body);

      for (const value of bodyStrings) {
        if (containsSqlInjection(value)) {
          console.warn(`Potential SQL injection detected in request body`, {
            ip: req.ip,
            userAgent: req.get('User-Agent'),
            body: value.substring(0, 200)
          });
          return res.status(400).json({
            error: "Invalid input detected",
            message: "Request contains potentially malicious content"
          });
        }

        if (containsXss(value)) {
          console.warn(`Potential XSS detected in request body`, {
            ip: req.ip,
            userAgent: req.get('User-Agent'),
            body: value.substring(0, 200)
          });
          return res.status(400).json({
            error: "Invalid input detected",
            message: "Request contains potentially malicious content"
          });
        }
      }
    }

    // Check path parameters
    for (const [key, value] of Object.entries(req.params)) {
      const paramValue = firstString(value);
      if (!paramValue) {
        continue;
      }

      if (containsSqlInjection(paramValue) || containsXss(paramValue)) {
        console.warn(`Potential injection detected in path parameter: ${key}`, {
          ip: req.ip,
          userAgent: req.get('User-Agent'),
          value: paramValue.substring(0, 100)
        });
        return res.status(400).json({
          error: "Invalid input detected",
          message: "Request contains potentially malicious content"
        });
      }
    }

    next();
  } catch (error) {
    console.error("Security middleware error:", error);
    // Fail open - allow request if security validation fails
    next();
  }
};

/**
 * Input sanitization middleware
 */
export const sanitizeInputs = (req: Request, res: Response, next: NextFunction) => {
  try {
    // Sanitize query parameters
    for (const [key, value] of Object.entries(req.query)) {
      if (typeof value === 'string') {
        req.query[key] = sanitizeInputString(value);
      }
    }

    // Sanitize path parameters
    for (const [key, value] of Object.entries(req.params)) {
      const paramValue = firstString(value);
      if (paramValue !== undefined) {
        req.params[key] = sanitizeInputString(paramValue);
      }
    }

    // Sanitize string values in request body
    if (req.body && typeof req.body === 'object') {
      const sanitizeObject = (obj: any): any => {
        if (typeof obj !== 'object' || obj === null) return obj;
        
        const sanitized: any = Array.isArray(obj) ? [] : {};
        for (const [key, value] of Object.entries(obj)) {
          if (typeof value === 'string') {
            sanitized[key] = sanitizeInputString(value);
          } else if (typeof value === 'object' && value !== null) {
            sanitized[key] = sanitizeObject(value);
          } else {
            sanitized[key] = value;
          }
        }
        return sanitized;
      };

      req.body = sanitizeObject(req.body);
    }

    next();
  } catch (error) {
    console.error("Input sanitization error:", error);
    // Fail open - allow request if sanitization fails
    next();
  }
};

/**
 * Set security headers
 */
export const securityHeaders = (req: Request, res: Response, next: NextFunction) => {
  // Prevent clickjacking
  res.setHeader('X-Frame-Options', 'DENY');
  
  // Prevent MIME type sniffing
  res.setHeader('X-Content-Type-Options', 'nosniff');
  
  // Prevent XSS attacks
  res.setHeader('X-XSS-Protection', '1; mode=block');
  
  // Enforce HTTPS
  res.setHeader('Strict-Transport-Security', 'max-age=31536000; includeSubDomains');
  
  // Content Security Policy
  res.setHeader('Content-Security-Policy', "default-src 'self'");
  
  // Referrer policy
  res.setHeader('Referrer-Policy', 'strict-origin-when-cross-origin');
  
  // Permissions policy
  res.setHeader('Permissions-Policy', 'geolocation=(), microphone=(), camera=()');
  
  next();
};
