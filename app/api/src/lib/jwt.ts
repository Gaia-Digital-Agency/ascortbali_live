// This module provides functions for signing and verifying JSON Web Tokens (JWTs).
import { SignJWT, jwtVerify, importPKCS8, importSPKI } from "jose";
import { env } from "./env.js";

const alg = "EdDSA"; // supports Ed25519 keys; you can swap to ES256 with proper keys.

// Import private and public keys for JWT signing and verification.
async function getPrivateKey() {
  return importPKCS8(env.JWT_PRIVATE_KEY_PEM, alg);
}
async function getPublicKey() {
  return importSPKI(env.JWT_PUBLIC_KEY_PEM, alg);
}

// Signs a new access token.
export async function signAccessToken(payload: { sub: string; role: string; username: string }) {
  const key = await getPrivateKey();
  const now = Math.floor(Date.now() / 1000);
  return new SignJWT(payload)
    .setProtectedHeader({ alg })
    .setIssuedAt(now)
    .setIssuer(env.JWT_ISSUER)
    .setAudience(env.JWT_AUDIENCE)
    .setExpirationTime(now + env.JWT_ACCESS_TTL_SECONDS)
    .sign(key);
}

// Signs a new refresh token.
export async function signRefreshToken(payload: { sub: string; role: string; username: string }) {
  const key = await getPrivateKey();
  const now = Math.floor(Date.now() / 1000);
  return new SignJWT(payload)
    .setProtectedHeader({ alg })
    .setIssuedAt(now)
    .setIssuer(env.JWT_ISSUER)
    .setAudience(env.JWT_AUDIENCE)
    .setExpirationTime(now + env.JWT_REFRESH_TTL_SECONDS)
    .sign(key);
}

// Signs a short-lived token for password reset.
export async function signPasswordResetToken(payload: { sub: string; role: string; username: string }) {
  const key = await getPrivateKey();
  const now = Math.floor(Date.now() / 1000);
  return new SignJWT({ ...payload, purpose: "password_reset" })
    .setProtectedHeader({ alg })
    .setIssuedAt(now)
    .setIssuer(env.JWT_ISSUER)
    .setAudience(env.JWT_AUDIENCE)
    .setExpirationTime(now + 900)
    .sign(key);
}

// Verifies a JWT and returns its payload.
export async function verifyJwt(token: string) {
  const key = await getPublicKey();
  const res = await jwtVerify(token, key, {
    issuer: env.JWT_ISSUER,
    audience: env.JWT_AUDIENCE,
  });
  return res.payload as { sub: string; role: string; username: string; exp: number };
}

// Verifies a password-reset JWT and validates its purpose claim.
export async function verifyPasswordResetToken(token: string) {
  const key = await getPublicKey();
  const res = await jwtVerify(token, key, {
    issuer: env.JWT_ISSUER,
    audience: env.JWT_AUDIENCE,
  });
  const payload = res.payload as {
    sub: string;
    role: string;
    username: string;
    purpose?: string;
    exp: number;
  };
  if (payload.purpose !== "password_reset") {
    throw new Error("invalid_reset_token");
  }
  return payload;
}
