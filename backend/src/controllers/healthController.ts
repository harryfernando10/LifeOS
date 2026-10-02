import type { Request, Response } from "express";
import { getHealthStatus, getReadinessStatus } from "../services/healthService.js";

export function getHealth(_req: Request, res: Response): void {
  res.status(200).json(getHealthStatus());
}

export async function getReady(_req: Request, res: Response): Promise<void> {
  const body = await getReadinessStatus();
  const statusCode = body.status === "ready" ? 200 : 503;
  res.status(statusCode).json(body);
}
