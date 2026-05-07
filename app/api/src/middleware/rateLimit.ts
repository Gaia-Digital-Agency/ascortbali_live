// This module provides middleware for rate limiting requests.
import type { Request, Response, NextFunction } from "express";
import { RateLimiterMemory } from "rate-limiter-flexible";

// General rate limiter: 100 requests per 60 seconds per IP.
const generalLimiter = new RateLimiterMemory({
  points: 100,
  duration: 60,
});

// Stricter rate limiter for auth endpoints: 10 requests per 60 seconds per IP.
const authLimiter = new RateLimiterMemory({
  points: 10,
  duration: 60,
});

// General rate limiting middleware.
export async function rateLimit(req: Request, res: Response, next: NextFunction) {
  const key = req.ip ?? "unknown";
  try {
    await generalLimiter.consume(key);
    next();
  } catch {
    res.status(429).json({ error: "rate_limited" });
  }
}

// Stricter rate limiting for auth-related routes (login, register, password reset).
export async function authRateLimit(req: Request, res: Response, next: NextFunction) {
  const key = req.ip ?? "unknown";
  try {
    await authLimiter.consume(key);
    next();
  } catch {
    res.status(429).json({ error: "rate_limited" });
  }
}
