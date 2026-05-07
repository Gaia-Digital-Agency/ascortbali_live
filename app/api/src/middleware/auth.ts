// This module provides middleware for authenticating and authorizing requests.
import type { Request, Response, NextFunction } from "express";
import { verifyJwt } from "../lib/jwt.js";

// Extends the Express Request type to include an optional user object.
export type AuthedRequest = Request & { user?: { id: string; role: string; username: string } };

// Middleware to require a valid JWT for a route.
export async function requireAuth(req: AuthedRequest, res: Response, next: NextFunction) {
  const header = req.header("authorization");
  const token = header?.startsWith("Bearer ") ? header.slice(7) : undefined;
  if (!token) return res.status(401).json({ error: "missing_token" });

  try {
    const payload = await verifyJwt(token);
    req.user = { id: payload.sub, role: payload.role, username: payload.username };
    return next();
  } catch {
    return res.status(401).json({ error: "invalid_token" });
  }
}

// Middleware factory to require a specific role for a route.
export function requireRole(roles: string[]) {
  return (req: AuthedRequest, res: Response, next: NextFunction) => {
    if (!req.user) return res.status(401).json({ error: "missing_token" });
    if (!roles.includes(req.user.role)) return res.status(403).json({ error: "forbidden" });
    return next();
  };
}
