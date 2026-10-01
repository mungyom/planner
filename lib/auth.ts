import { createHash, randomBytes } from "node:crypto";
import type { Types } from "mongoose";
import type { NextRequest, NextResponse } from "next/server";
import { Session } from "@/models/Session";
import { User } from "@/models/User";
import { HttpError } from "./api";
import { SESSION_COOKIE } from "./authConstants";

export const SESSION_TTL_MS = 30 * 24 * 60 * 60 * 1000;

export function newToken(): string {
  return randomBytes(32).toString("base64url");
}

export function hashToken(token: string): string {
  return createHash("sha256").update(token).digest("hex");
}

const cookieBase = {
  httpOnly: true,
  sameSite: "lax" as const,
  secure: process.env.NODE_ENV === "production",
  path: "/",
};

export async function startSession(
  res: NextResponse,
  userId: Types.ObjectId
): Promise<void> {
  const token = newToken();
  const expiresAt = new Date(Date.now() + SESSION_TTL_MS);
  await Session.create({ tokenHash: hashToken(token), userId, expiresAt });
  res.cookies.set(SESSION_COOKIE, token, { ...cookieBase, expires: expiresAt });
}

/** DB 의 세션 문서를 지우고 쿠키도 만료시킨다 */
export async function endSession(req: NextRequest, res: NextResponse): Promise<void> {
  const token = req.cookies.get(SESSION_COOKIE)?.value;
  if (token) await Session.deleteOne({ tokenHash: hashToken(token) });
  res.cookies.set(SESSION_COOKIE, "", { ...cookieBase, maxAge: 0 });
}

export async function getSessionUser(req: NextRequest) {
  const token = req.cookies.get(SESSION_COOKIE)?.value;
  if (!token) return null;
  const session = await Session.findOne({
    tokenHash: hashToken(token),
    expiresAt: { $gt: new Date() },
  }).lean();
  if (!session) return null;
  return User.findById(session.userId).lean();
}

/** 로그인한 사용자의 id. 없으면 401 */
export async function requireUserId(req: NextRequest): Promise<Types.ObjectId> {
  const user = await getSessionUser(req);
  if (!user) throw new HttpError(401, "로그인이 필요합니다.");
  return user._id;
}

export const OAUTH_STATE_COOKIE_OPTIONS = { ...cookieBase, maxAge: 10 * 60 };
