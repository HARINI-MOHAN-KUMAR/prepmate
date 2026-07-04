import crypto from "crypto";
import { Request, Response, NextFunction } from "express";
import { db } from "./db";

const JWT_SECRET = process.env.JWT_SECRET || "prepmate-ai-super-secret-key-2026";

// Warn in logs when using an insecure default secret
if (!process.env.JWT_SECRET) {
  console.warn("⚠️  Using default JWT_SECRET. Set JWT_SECRET in production environments.");
}

// Simple, secure, zero-dependency cryptographic token generator
export function generateToken(payload: { id: string; email: string }): string {
  const header = Buffer.from(JSON.stringify({ alg: "HS256", typ: "JWT" })).toString("base64url");
  const body = Buffer.from(JSON.stringify({ ...payload, exp: Date.now() + 24 * 60 * 60 * 1000 })).toString("base64url");
  
  const hmac = crypto.createHmac("sha256", JWT_SECRET);
  hmac.update(`${header}.${body}`);
  const signature = hmac.digest("base64url");
  
  return `${header}.${body}.${signature}`;
}

export function verifyToken(token: string): { id: string; email: string } | null {
  try {
    const parts = token.split(".");
    if (parts.length !== 3) return null;
    
    const [header, body, signature] = parts;
    const hmac = crypto.createHmac("sha256", JWT_SECRET);
    hmac.update(`${header}.${body}`);
    const expectedSignature = hmac.digest("base64url");
    
    if (signature !== expectedSignature) return null;
    
    const payload = JSON.parse(Buffer.from(body, "base64url").toString("utf-8"));
    if (payload.exp < Date.now()) return null; // Expired
    
    return { id: payload.id, email: payload.email };
  } catch {
    return null;
  }
}

/**
 * Hash a password using PBKDF2 (secure, no bcrypt native deps needed).
 * Returns a salted hash string: "salt:hash"
 */
export function hashPassword(password: string): string {
  const salt = crypto.randomBytes(16).toString("hex");
  const hash = crypto.pbkdf2Sync(password, salt, 100000, 64, "sha512").toString("hex");
  return `${salt}:${hash}`;
}

/**
 * Verify a plain-text password against a stored salted hash.
 */
export function verifyPassword(password: string, stored: string): boolean {
  try {
    const [salt, hash] = stored.split(":");
    if (!salt || !hash) return false;
    const inputHash = crypto.pbkdf2Sync(password, salt, 100000, 64, "sha512").toString("hex");
    return crypto.timingSafeEqual(Buffer.from(hash, "hex"), Buffer.from(inputHash, "hex"));
  } catch {
    return false;
  }
}

// Extend Express Request interface to store user info
export interface AuthenticatedRequest extends Request {
  user?: {
    id: string;
    email: string;
    name: string;
  };
}

export function requireAuth(req: AuthenticatedRequest, res: Response, next: NextFunction) {
  const authHeader = req.headers.authorization;
  if (!authHeader || !authHeader.startsWith("Bearer ")) {
    return res.status(401).json({ error: "Unauthorized: Missing Bearer token" });
  }

  const token = authHeader.split(" ")[1];
  const payload = verifyToken(token);
  if (!payload) {
    return res.status(401).json({ error: "Unauthorized: Invalid or expired token" });
  }

  const user = db.findUserById(payload.id);
  if (!user) {
    return res.status(401).json({ error: "Unauthorized: User not found" });
  }

  req.user = { id: user.id, email: user.email, name: user.name };
  next();
}
