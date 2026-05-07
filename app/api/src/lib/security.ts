// This module provides security-related utility functions.
import crypto from "crypto";
import { env } from "./env.js";

// Hashes an IP address using HMAC-SHA256 for anonymized tracking.
export function hmacIp(ip: string) {
  return crypto.createHmac("sha256", env.ANALYTICS_HMAC_SECRET).update(ip).digest("hex");
}

// Computes the SHA256 hash of a string.
export function sha256(value: string) {
  return crypto.createHash("sha256").update(value).digest("hex");
}
