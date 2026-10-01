import mongoose from "mongoose";
import { NextResponse } from "next/server";
import { dbConnect } from "./mongodb";

export class HttpError extends Error {
  constructor(
    public status: number,
    message: string
  ) {
    super(message);
  }
}

export function assertObjectId(id: string): void {
  if (!/^[0-9a-fA-F]{24}$/.test(id)) {
    throw new HttpError(400, "잘못된 ID 형식입니다.");
  }
}

export function notFound(what: string): HttpError {
  return new HttpError(404, `${what}을(를) 찾을 수 없습니다.`);
}

export async function readBody(req: Request): Promise<Record<string, unknown>> {
  const body = await req.json().catch(() => null);
  if (!body || typeof body !== "object" || Array.isArray(body)) {
    throw new HttpError(400, "요청 본문이 올바른 JSON 객체가 아닙니다.");
  }
  return body;
}

export function pick(
  body: Record<string, unknown>,
  keys: string[]
): Record<string, unknown> {
  return Object.fromEntries(keys.filter((k) => k in body).map((k) => [k, body[k]]));
}

const fail = (status: number, error: string) =>
  NextResponse.json({ error }, { status });

/** DB 연결 + 공통 에러 매핑 (400 검증/ID, 409 중복, 500 그 외) */
export async function handle(
  fn: () => Promise<NextResponse>
): Promise<NextResponse> {
  try {
    await dbConnect();
    return await fn();
  } catch (error) {
    if (error instanceof HttpError) return fail(error.status, error.message);
    if (
      error instanceof mongoose.Error.ValidationError ||
      error instanceof mongoose.Error.CastError
    ) {
      return fail(400, error.message);
    }
    if ((error as { code?: number }).code === 11000) {
      return fail(409, "이미 존재하는 데이터입니다.");
    }
    console.error(error);
    return fail(500, "서버 오류가 발생했습니다.");
  }
}
