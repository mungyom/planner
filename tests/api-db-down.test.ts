import { NextRequest } from "next/server";
import { afterEach, describe, expect, it, vi } from "vitest";
import * as goals from "@/app/api/goals/route";
import * as todos from "@/app/api/todos/route";

describe("DB 연결 실패", () => {
  afterEach(() => vi.restoreAllMocks());

  it("MONGODB_URI 가 없으면 500", async () => {
    vi.spyOn(console, "error").mockImplementation(() => {});
    delete process.env.MONGODB_URI;

    const res = await goals.GET(new NextRequest("http://test/api/goals"));
    expect(res.status).toBe(500);
    expect(await res.json()).toEqual({ error: "서버 오류가 발생했습니다." });
  });

  it("서버에 연결할 수 없으면 500 (내부 오류 메시지는 노출하지 않음)", async () => {
    vi.spyOn(console, "error").mockImplementation(() => {});
    // 아무도 듣지 않는 포트
    process.env.MONGODB_URI = "mongodb://127.0.0.1:1/unreachable";

    const res = await todos.GET(new NextRequest("http://test/api/todos"));
    expect(res.status).toBe(500);
    expect(await res.json()).toEqual({ error: "서버 오류가 발생했습니다." });
  }, 20_000);
});
