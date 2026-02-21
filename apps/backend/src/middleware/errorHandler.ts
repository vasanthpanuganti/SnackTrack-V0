import type { Request, Response, NextFunction } from "express";
import type { ApiResponse } from "@snacktrack/shared-types";
import { AppError } from "../utils/AppError.js";
import { logger } from "../utils/logger.js";

export function errorHandler(
  err: Error,
  req: Request,
  res: Response<ApiResponse>,
  _next: NextFunction,
): void {
  if (err instanceof AppError) {
    logger.warn({ err, requestId: req.requestId }, err.message);
    res.status(err.statusCode).json({
      status: "error",
      data: null,
      error: {
        code: err.code,
        message: err.message,
        details: err.details,
      },
    });
    return;
  }

  // Unexpected errors
  logger.error({ err, requestId: req.requestId }, "Unhandled error");
  res.status(500).json({
    status: "error",
    data: null,
    error: {
      code: "INTERNAL_ERROR",
      message: "An unexpected error occurred",
    },
  });
}
