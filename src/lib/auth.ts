import jwt from "jsonwebtoken";
import bcrypt from "bcryptjs";

export type JwtPayload = {
  userId: string;
  role: "ADMIN" | "SUPERVISOR" | "OPERATOR";
  departmentId?: string | null;
};

const SECRET = process.env.JWT_SECRET!;
if (!SECRET) console.warn("JWT_SECRET is not set");

export function signToken(payload: JwtPayload): string {
  return jwt.sign(payload, SECRET, { expiresIn: "7d" });
}

export function signJWT(payload: JwtPayload): string {
  return signToken(payload);
}

export function verifyToken(token: string): JwtPayload {
  return jwt.verify(token, SECRET) as JwtPayload;
}

export async function verifyPassword(password: string, hash: string): Promise<boolean> {
  return bcrypt.compare(password, hash);
}