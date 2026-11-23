import crypto from 'crypto';
import type { NextFunction, Request, Response } from 'express';
import type { UserRole } from '../types.ts';

const SECRET_KEY =
  process.env.SESSION_SECRET && process.env.SESSION_SECRET.trim().length >= 16
    ? process.env.SESSION_SECRET.trim()
    : crypto.randomBytes(32).toString('hex');

export interface TokenPayload {
  userId: number;
  role: UserRole;
  email: string;
  fullName: string;
  exp: number;
}

export interface AuthenticatedRequest extends Request {
  user?: TokenPayload;
}

export function hashPassword(password: string): string {
  const salt = crypto.randomBytes(16).toString('hex');
  const derived = crypto.scryptSync(password, salt, 64).toString('hex');
  return `${salt}:${derived}`;
}

export function verifyPassword(password: string, storedHash: string): boolean {
  const parts = storedHash.split(':');
  if (parts.length !== 2) return false;
  const [salt, keyHex] = parts;
  const keyBuf = Buffer.from(keyHex, 'hex');
  const derived = crypto.scryptSync(password, salt, 64);
  if (keyBuf.length !== derived.length) return false;
  return crypto.timingSafeEqual(keyBuf, derived);
}

export function signToken(payload: Omit<TokenPayload, 'exp'>, ttlSeconds = 60 * 60 * 12): string {
  const fullPayload: TokenPayload = {
    ...payload,
    exp: Math.floor(Date.now() / 1000) + ttlSeconds,
  };
  const encoded = Buffer.from(JSON.stringify(fullPayload)).toString('base64url');
  const sig = crypto.createHmac('sha256', SECRET_KEY).update(encoded).digest('base64url');
  return `${encoded}.${sig}`;
}

export function verifyToken(token: string): TokenPayload | null {
  try {
    const [encoded, sig] = token.split('.');
    if (!encoded || !sig) return null;
    const expectedSig = crypto.createHmac('sha256', SECRET_KEY).update(encoded).digest('base64url');
    const a = Buffer.from(sig);
    const b = Buffer.from(expectedSig);
    if (a.length !== b.length || !crypto.timingSafeEqual(a, b)) return null;
    const parsed = JSON.parse(Buffer.from(encoded, 'base64url').toString('utf8')) as TokenPayload;
    if (!parsed.exp || parsed.exp < Math.floor(Date.now() / 1000)) return null;
    return parsed;
  } catch {
    return null;
  }
}

export function extractBearer(req: Request): string | null {
  const header = req.headers.authorization;
  if (!header || !header.startsWith('Bearer ')) return null;
  return header.slice(7).trim();
}

export function optionalAuth(req: AuthenticatedRequest, _res: Response, next: NextFunction): void {
  const token = extractBearer(req);
  if (token) {
    const decoded = verifyToken(token);
    if (decoded) req.user = decoded;
  }
  next();
}

export function requireAuth(req: AuthenticatedRequest, res: Response, next: NextFunction): void {
  const token = extractBearer(req);
  if (!token) {
    res.status(401).json({ error: 'Authentification requise.' });
    return;
  }
  const decoded = verifyToken(token);
  if (!decoded) {
    res.status(401).json({ error: 'Session expirée ou invalide.' });
    return;
  }
  req.user = decoded;
  next();
}

export function requireAdmin(req: AuthenticatedRequest, res: Response, next: NextFunction): void {
  requireAuth(req, res, () => {
    if (!req.user || req.user.role !== 'admin') {
      res.status(403).json({ error: 'Accès réservé à la direction STRONG EVENT PRO.' });
      return;
    }
    next();
  });
}
