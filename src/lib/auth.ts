import jwt from "jsonwebtoken";
import bcrypt from "bcryptjs";
import type { NextRequest } from "next/server";
import env from './env';

export type JwtPayload = {
  userId: string;
  role: "ADMIN" | "SUPERVISOR" | "OPERATOR";
  departmentId?: string | null;
};

const SECRET = env.JWT_SECRET;

export function signToken(payload: JwtPayload): string {
  return jwt.sign(payload, SECRET, { expiresIn: "7d" });
}

export function signJWT(payload: JwtPayload): string {
  return signToken(payload);
}

export function verifyToken(token: string): JwtPayload {
  return jwt.verify(token, SECRET) as JwtPayload;
}

export function getUserFromRequest(request: NextRequest): JwtPayload | null {
  try {
    const token = request.cookies.get('token')?.value;
    if (!token) return null;
    
    return verifyToken(token);
  } catch (error) {
    return null;
  }
}

export async function verifyPassword(password: string, hash: string): Promise<boolean> {
  return bcrypt.compare(password, hash);
}

export async function hashPassword(password: string): Promise<string> {
  return bcrypt.hash(password, 12);
}