// This module centralizes and exports the main API router.
import { Router } from "express";
import { authRouter } from "./routes/auth.js";
import { servicesRouter } from "./routes/services.js";
import { meRouter } from "./routes/me.js";
import { ordersRouter } from "./routes/orders.js";
import { analyticsRouter } from "./routes/analytics.js";
import { adsRouter } from "./routes/ads.js";
import { adminRouter } from "./routes/admin.js";
import { creatorsRouter } from "./routes/creators.js";

// Creates and configures the main API router.
export function createRouter() {
  // Initialize a new Express router.
  const r = Router();
  // Mount individual routers for different API sections.
  // Each `r.use` call associates a base path with a specific router module.
  // For example, all routes defined in `authRouter` will be prefixed with `/auth`.
  r.use("/auth", authRouter);
  r.use("/services", servicesRouter);
  r.use("/me", meRouter);
  r.use("/orders", ordersRouter);
  r.use("/analytics", analyticsRouter);
  r.use("/ads", adsRouter);
  r.use("/creators", creatorsRouter);
  r.use("/admin", adminRouter);
  // Return the configured main router.
  return r;
}
