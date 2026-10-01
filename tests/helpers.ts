import mongoose from "mongoose";
import { MongoMemoryServer } from "mongodb-memory-server";
import { NextRequest } from "next/server";
import { afterAll, beforeAll } from "vitest";
import { hashToken, newToken } from "@/lib/auth";
import { SESSION_COOKIE } from "@/lib/authConstants";
import { dbConnect } from "@/lib/mongodb";
import { Session } from "@/models/Session";
import { User } from "@/models/User";

/** 이 테스트 파일 동안 인메모리 MongoDB 를 띄운다 */
export function useMemoryDb() {
  let mongod: MongoMemoryServer;
  beforeAll(async () => {
    mongod = await MongoMemoryServer.create();
    process.env.MONGODB_URI = mongod.getUri("planner-test");
  });
  afterAll(async () => {
    await mongoose.disconnect();
    await mongod.stop();
  });
}

export async function resetDb() {
  await dbConnect();
  await Promise.all(
    Object.values(mongoose.connection.collections).map((c) => c.deleteMany({}))
  );
}

let githubId = 1000;

/** 로그인한 사용자 하나를 만들고 그 세션 쿠키 헤더 값을 돌려준다 */
export async function signIn(username = `user${githubId}`, expiresAt?: Date) {
  const user = await User.create({
    githubId: githubId++,
    username,
    avatarUrl: `https://avatars.example/${username}`,
  });
  const token = newToken();
  await Session.create({
    tokenHash: hashToken(token),
    userId: user._id,
    expiresAt: expiresAt ?? new Date(Date.now() + 60_000),
  });
  return { user, token, cookie: `${SESSION_COOKIE}=${token}` };
}

export function request(
  cookie: string | undefined,
  path: string,
  method = "GET",
  body?: unknown
) {
  return new NextRequest(`http://test${path}`, {
    method,
    headers: cookie ? { cookie } : undefined,
    body: body === undefined ? undefined : JSON.stringify(body),
  });
}
