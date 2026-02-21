import type { Request, Response, NextFunction } from "express";
import { type AnyZodObject, type ZodError } from "zod";
import { AppError } from "../utils/AppError.js";

interface ValidationSchemas {
  body?: AnyZodObject;
  query?: AnyZodObject;
  params?: AnyZodObject;
}

export function validate(schemas: ValidationSchemas) {
  return async (req: Request, _res: Response, next: NextFunction) => {
    try {
      if (schemas.body) {
        req.body = await schemas.body.parseAsync(req.body);
      }
      if (schemas.query) {
        const parsed = await schemas.query.parseAsync(req.query);
        // Express 5 makes req.query a getter-only property on the prototype,
        // so we override it on the instance via defineProperty.
        Object.defineProperty(req, "query", {
          value: parsed,
          writable: true,
          configurable: true,
        });
      }
      if (schemas.params) {
        req.params = (await schemas.params.parseAsync(req.params)) as Record<string, string>;
      }
      next();
    } catch (error) {
      const zodError = error as ZodError;
      next(
        new AppError(422, "VALIDATION_ERROR", "Request validation failed", {
          issues: zodError.issues,
        }),
      );
    }
  };
}
