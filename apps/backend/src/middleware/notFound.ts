import type { Request, Response } from "express";
import type { ApiResponse } from "@snacktrack/shared-types";

export function notFoundHandler(_req: Request, res: Response<ApiResponse>): void {
  res.status(404).json({
    status: "error",
    data: null,
    error: {
      code: "NOT_FOUND",
      message: "The requested resource was not found",
    },
  });
}
