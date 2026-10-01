import { NextRequest } from "next/server";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import * as me from "@/app/api/me/route";
import * as goalItem from "@/app/api/goals/[id]/route";
import * as goals from "@/app/api/goals/route";
import * as todoItem from "@/app/api/todos/[id]/route";
import * as todos from "@/app/api/todos/route";
import * as weeklyItem from "@/app/api/weekly/[id]/route";
import * as weekly from "@/app/api/weekly/route";
import * as github from "@/app/auth/github/route";
import * as callback from "@/app/auth/github/callback/route";
import * as logout from "@/app/auth/logout/route";
import { hashToken } from "@/lib/auth";
import { OAUTH_STATE_COOKIE, SESSION_COOKIE } from "@/lib/authConstants";
import { config, middleware } from "@/middleware";
import { Session } from "@/models/Session";
import { Todo } from "@/models/Todo";
import { User } from "@/models/User";
import { WeeklyPlan } from "@/models/WeeklyPlan";
import { request, resetDb, signIn, useMemoryDb } from "./helpers";

useMemoryDb();

const ctx = (id: string) => ({ params: { id } });

beforeEach(async () => {
  await resetDb();
  process.env.GITHUB_CLIENT_ID = "test-client-id";
  process.env.GITHUB_CLIENT_SECRET = "test-client-secret";
  delete process.env.APP_URL;
});

afterEach(() => {
  vi.unstubAllGlobals();
  vi.restoreAllMocks();
});

describe("middleware", () => {
  const run = (path: string, cookie?: string) =>
    middleware(new NextRequest(`http://test${path}`, { headers: cookie ? { cookie } : {} }));

  it("쿠키가 없으면 API 는 401, 페이지는 /login 으로 리다이렉트", async () => {
    const api = run("/api/todos");
    expect(api.status).toBe(401);
    expect(await api.json()).toEqual({ error: "로그인이 필요합니다." });

    for (const path of ["/", "/todos", "/weekly/abc", "/goals"]) {
      const page = run(path);
      expect(page.status).toBe(307);
      expect(page.headers.get("location")).toBe("http://test/login");
    }
  });

  it("쿠키가 있으면 통과시키고 실제 검증은 API 가 한다", () => {
    const res = run("/api/todos", `${SESSION_COOKIE}=whatever`);
    expect(res.headers.get("x-middleware-next")).toBe("1");
  });

  it("matcher 가 로그인/OAuth/정적 경로를 제외한다", async () => {
    const pattern = new RegExp(`^${config.matcher[0]}$`);
    for (const path of ["/login", "/auth/github", "/auth/github/callback", "/auth/logout", "/_next/static/x.js", "/favicon.ico"]) {
      expect(pattern.test(path), path).toBe(false);
    }
    for (const path of ["/", "/todos", "/api/todos", "/loginx", "/weekly/1"]) {
      expect(pattern.test(path), path).toBe(true);
    }
  });
});

describe("세션 검증", () => {
  it("쿠키가 없거나 위조/만료된 세션이면 모든 데이터 API 가 401", async () => {
    const { token: expired } = await signIn("old", new Date(Date.now() - 1000));
    const cookies = [undefined, `${SESSION_COOKIE}=forged-token`, `${SESSION_COOKIE}=${expired}`];
    const id = "0123456789abcdef01234567";

    for (const cookie of cookies) {
      const responses = await Promise.all([
        todos.GET(request(cookie, "/api/todos")),
        todos.POST(request(cookie, "/api/todos", "POST", { title: "x" })),
        todoItem.GET(request(cookie, "/"), ctx(id)),
        todoItem.PATCH(request(cookie, "/", "PATCH", { status: "done" }), ctx(id)),
        weekly.GET(request(cookie, "/api/weekly")),
        weeklyItem.DELETE(request(cookie, "/", "DELETE"), ctx(id)),
        goals.GET(request(cookie, "/api/goals")),
        goalItem.PUT(request(cookie, "/", "PUT", { title: "x" }), ctx(id)),
        me.GET(request(cookie, "/api/me")),
      ]);
      expect(responses.map((r) => r.status), String(cookie)).toEqual(Array(9).fill(401));
    }
    expect(await Todo.countDocuments()).toBe(0);
  });

  it("/api/me 는 로그인한 사용자의 username, avatarUrl", async () => {
    const { cookie } = await signIn("octocat");
    const res = await me.GET(request(cookie, "/api/me"));
    expect(await res.json()).toEqual({
      username: "octocat",
      avatarUrl: "https://avatars.example/octocat",
    });
  });
});

describe("사용자별 데이터 격리", () => {
  it("다른 사용자의 할일은 보이지 않고 조회/수정/이동/삭제할 수 없다", async () => {
    const alice = await signIn("alice");
    const bob = await signIn("bob");
    const aliceTodo = await (
      await todos.POST(request(alice.cookie, "/api/todos", "POST", { title: "앨리스 할일" }))
    ).json();
    await todos.POST(request(bob.cookie, "/api/todos", "POST", { title: "밥 할일" }));

    const bobList = await (await todos.GET(request(bob.cookie, "/api/todos"))).json();
    expect(bobList.map((t: any) => t.title)).toEqual(["밥 할일"]);

    const id = ctx(aliceTodo._id);
    expect((await todoItem.GET(request(bob.cookie, "/"), id)).status).toBe(404);
    expect((await todoItem.PUT(request(bob.cookie, "/", "PUT", { title: "해킹" }), id)).status).toBe(404);
    expect((await todoItem.PATCH(request(bob.cookie, "/", "PATCH", { status: "done" }), id)).status).toBe(404);
    expect((await todoItem.DELETE(request(bob.cookie, "/", "DELETE"), id)).status).toBe(404);

    const untouched = await Todo.findById(aliceTodo._id).lean();
    expect(untouched).toMatchObject({ title: "앨리스 할일", status: "todo" });

    // 본인은 그대로 조회/수정/삭제 가능
    expect((await todoItem.PUT(request(alice.cookie, "/", "PUT", { title: "수정" }), id)).status).toBe(200);
    expect((await todoItem.DELETE(request(alice.cookie, "/", "DELETE"), id)).status).toBe(200);
  });

  it("새 할일은 로그인한 사용자 소유이고 body 의 userId 는 무시된다", async () => {
    const alice = await signIn("alice");
    const bob = await signIn("bob");
    const created = await (
      await todos.POST(
        request(alice.cookie, "/api/todos", "POST", { title: "t", userId: String(bob.user._id) })
      )
    ).json();
    expect(created.userId).toBe(String(alice.user._id));
  });

  it("다른 사용자의 목표/주간 계획에는 연결할 수 없다", async () => {
    const alice = await signIn("alice");
    const bob = await signIn("bob");
    const bobGoal = await (await goals.POST(request(bob.cookie, "/api/goals", "POST", { title: "g" }))).json();
    const bobPlan = await (
      await weekly.POST(request(bob.cookie, "/api/weekly", "POST", { weekStart: "2026-09-28" }))
    ).json();

    const linkGoal = await todos.POST(
      request(alice.cookie, "/api/todos", "POST", { title: "t", goalId: bobGoal._id })
    );
    expect(linkGoal.status).toBe(400);
    const linkPlan = await todos.POST(
      request(alice.cookie, "/api/todos", "POST", { title: "t", weeklyPlanId: bobPlan._id })
    );
    expect(linkPlan.status).toBe(400);
    const planGoal = await weekly.POST(
      request(alice.cookie, "/api/weekly", "POST", { weekStart: "2026-09-28", goalId: bobGoal._id })
    );
    expect(planGoal.status).toBe(400);
  });

  it("주간 계획/목표도 격리되고, 서로 다른 사용자는 같은 주의 계획을 각각 만든다", async () => {
    await WeeklyPlan.init(); // { userId, weekStart } unique 인덱스 생성 대기
    const alice = await signIn("alice");
    const bob = await signIn("bob");

    const week = { weekStart: "2026-09-30" };
    expect((await weekly.POST(request(alice.cookie, "/api/weekly", "POST", week))).status).toBe(201);
    expect((await weekly.POST(request(bob.cookie, "/api/weekly", "POST", week))).status).toBe(201);
    expect((await weekly.POST(request(alice.cookie, "/api/weekly", "POST", week))).status).toBe(409);

    const alicePlans = await (await weekly.GET(request(alice.cookie, "/api/weekly"))).json();
    expect(alicePlans).toHaveLength(1);
    expect(alicePlans[0].userId).toBe(String(alice.user._id));
    expect((await weeklyItem.GET(request(bob.cookie, "/"), ctx(alicePlans[0]._id))).status).toBe(404);

    const aliceGoal = await (await goals.POST(request(alice.cookie, "/api/goals", "POST", { title: "g" }))).json();
    expect(await (await goals.GET(request(bob.cookie, "/api/goals"))).json()).toEqual([]);
    expect((await goalItem.DELETE(request(bob.cookie, "/", "DELETE"), ctx(aliceGoal._id))).status).toBe(404);
  });

  it("목표 진행률은 본인 할일만으로 계산", async () => {
    const alice = await signIn("alice");
    const bob = await signIn("bob");
    const goal = await (await goals.POST(request(alice.cookie, "/api/goals", "POST", { title: "g" }))).json();
    await todos.POST(request(alice.cookie, "/api/todos", "POST", { title: "t", goalId: goal._id, status: "done" }));
    // 다른 사용자가 직접 DB 에 같은 goalId 를 가진 할일을 넣어도 영향 없음
    await Todo.create({ userId: bob.user._id, title: "x", order: "a0", goalId: goal._id });

    const [listed] = await (await goals.GET(request(alice.cookie, "/api/goals"))).json();
    expect(listed.progress).toBe(100);
  });
});

describe("GitHub OAuth", () => {
  it("/auth/github 는 state 쿠키를 심고 GitHub 인증 화면으로 보낸다", async () => {
    const res = github.GET(new NextRequest("http://test/auth/github"));
    expect(res.status).toBe(307);

    const location = new URL(res.headers.get("location")!);
    expect(location.origin + location.pathname).toBe("https://github.com/login/oauth/authorize");
    expect(location.searchParams.get("client_id")).toBe("test-client-id");
    expect(location.searchParams.get("redirect_uri")).toBe("http://test/auth/github/callback");

    const state = res.cookies.get(OAUTH_STATE_COOKIE);
    expect(state?.value).toBeTruthy();
    expect(location.searchParams.get("state")).toBe(state?.value);
    expect(state?.httpOnly).toBe(true);
    // 시크릿은 브라우저로 나가지 않는다
    expect(res.headers.get("location")).not.toContain("test-client-secret");
  });

  it("APP_URL 이 있으면 콜백 URL 의 기준으로 쓴다", () => {
    process.env.APP_URL = "https://planner.example.com";
    const res = github.GET(new NextRequest("http://internal:3000/auth/github"));
    const location = new URL(res.headers.get("location")!);
    expect(location.searchParams.get("redirect_uri")).toBe(
      "https://planner.example.com/auth/github/callback"
    );
  });

  it("환경 변수가 없으면 GitHub 로 보내지 않고 /login?error=config", () => {
    vi.spyOn(console, "error").mockImplementation(() => {});
    delete process.env.GITHUB_CLIENT_SECRET;
    const res = github.GET(new NextRequest("http://test/auth/github"));
    expect(res.headers.get("location")).toBe("http://test/login?error=config");
  });

  function callbackRequest(query: string, stateCookie?: string) {
    return new NextRequest(`http://test/auth/github/callback?${query}`, {
      headers: stateCookie ? { cookie: `${OAUTH_STATE_COOKIE}=${stateCookie}` } : {},
    });
  }

  function mockGitHub(profile = { id: 42, login: "octocat", avatar_url: "https://avatars.githubusercontent.com/u/42" }) {
    const fetchMock = vi.fn(async (url: string, init?: RequestInit) => {
      if (url === "https://github.com/login/oauth/access_token") {
        const body = JSON.parse(String(init?.body));
        if (body.code !== "good-code") return Response.json({ error: "bad_verification_code" });
        return Response.json({ access_token: "gh-token" });
      }
      if (url === "https://api.github.com/user") return Response.json(profile);
      throw new Error(`unexpected fetch ${url}`);
    });
    vi.stubGlobal("fetch", fetchMock);
    return fetchMock;
  }

  it("state 가 없거나 다르면 토큰 교환 없이 /login?error=state", async () => {
    const fetchMock = mockGitHub();
    for (const [query, cookie] of [
      ["code=good-code&state=abc", undefined],
      ["code=good-code&state=abc", "different"],
      ["code=good-code", "abc"],
    ] as const) {
      const res = await callback.GET(callbackRequest(query, cookie));
      expect(res.headers.get("location")).toBe("http://test/login?error=state");
      expect(res.cookies.get(SESSION_COOKIE)).toBeUndefined();
    }
    expect(fetchMock).not.toHaveBeenCalled();
    expect(await Session.countDocuments()).toBe(0);
  });

  it("사용자가 승인을 거부하면 /login?error=denied", async () => {
    const res = await callback.GET(callbackRequest("error=access_denied&state=abc", "abc"));
    expect(res.headers.get("location")).toBe("http://test/login?error=denied");
  });

  it("GitHub 토큰 교환이 실패하면 /login?error=oauth 이고 세션은 없다", async () => {
    vi.spyOn(console, "error").mockImplementation(() => {});
    mockGitHub();
    const res = await callback.GET(callbackRequest("code=bad-code&state=abc", "abc"));
    expect(res.headers.get("location")).toBe("http://test/login?error=oauth");
    expect(await Session.countDocuments()).toBe(0);
    expect(await User.countDocuments()).toBe(0);
  });

  it("성공하면 username/avatar_url 을 저장하고 세션 쿠키로 로그인시킨다", async () => {
    const fetchMock = mockGitHub();
    const res = await callback.GET(callbackRequest("code=good-code&state=abc", "abc"));

    expect(res.headers.get("location")).toBe("http://test/");
    const tokenCall = JSON.parse(String(fetchMock.mock.calls[0][1]?.body));
    expect(tokenCall).toMatchObject({
      client_id: "test-client-id",
      client_secret: "test-client-secret",
      code: "good-code",
      redirect_uri: "http://test/auth/github/callback",
    });

    const user = await User.findOne({ githubId: 42 }).lean();
    expect(user).toMatchObject({
      username: "octocat",
      avatarUrl: "https://avatars.githubusercontent.com/u/42",
    });

    const session = res.cookies.get(SESSION_COOKIE);
    expect(session?.httpOnly).toBe(true);
    expect(session?.sameSite).toBe("lax");
    // DB 에는 원문 토큰이 아니라 해시만 있다
    const stored = await Session.findOne({ userId: user!._id }).lean();
    expect(stored?.tokenHash).toBe(hashToken(session!.value));
    expect(stored?.tokenHash).not.toBe(session!.value);
    // state 쿠키는 한 번 쓰고 지운다
    expect(res.cookies.get(OAUTH_STATE_COOKIE)?.value).toBe("");

    // 받은 쿠키로 API 사용 가능
    const meRes = await me.GET(request(`${SESSION_COOKIE}=${session!.value}`, "/api/me"));
    expect(await meRes.json()).toEqual({
      username: "octocat",
      avatarUrl: "https://avatars.githubusercontent.com/u/42",
    });
  });

  it("같은 계정의 첫 로그인이 동시에 와도 둘 다 성공하고 사용자는 하나", async () => {
    await User.init(); // githubId unique 인덱스가 있어야 실제 충돌이 재현된다
    mockGitHub();
    const results = await Promise.all(
      Array.from({ length: 4 }, () =>
        callback.GET(callbackRequest("code=good-code&state=abc", "abc"))
      )
    );
    expect(results.map((r) => r.headers.get("location"))).toEqual(
      Array(4).fill("http://test/")
    );
    expect(await User.countDocuments({ githubId: 42 })).toBe(1);
  });

  it("다시 로그인하면 같은 사용자를 갱신한다 (GitHub 에서 이름/아바타 변경)", async () => {
    mockGitHub();
    await callback.GET(callbackRequest("code=good-code&state=abc", "abc"));
    mockGitHub({ id: 42, login: "renamed", avatar_url: "https://avatars.githubusercontent.com/u/42?v=2" });
    await callback.GET(callbackRequest("code=good-code&state=abc", "abc"));

    const users = await User.find().lean();
    expect(users).toHaveLength(1);
    expect(users[0]).toMatchObject({ githubId: 42, username: "renamed" });
  });
});

describe("로그아웃", () => {
  it("DB 세션을 지우고 쿠키를 만료시키며, 같은 토큰은 더 이상 쓸 수 없다", async () => {
    const { cookie, token } = await signIn("alice");
    const other = await signIn("alice-other-device");

    const res = await logout.POST(request(cookie, "/auth/logout", "POST"));
    expect(res.status).toBe(303);
    expect(res.headers.get("location")).toBe("http://test/login");

    const cleared = res.cookies.get(SESSION_COOKIE);
    expect(cleared?.value).toBe("");
    expect(cleared?.maxAge).toBe(0);

    expect(await Session.exists({ tokenHash: hashToken(token) })).toBeNull();
    expect((await todos.GET(request(cookie, "/api/todos"))).status).toBe(401);
    // 다른 세션은 영향받지 않는다
    expect((await todos.GET(request(other.cookie, "/api/todos"))).status).toBe(200);
  });

  it("다른 사이트에서 보낸 로그아웃 요청은 403 이고 쿠키를 건드리지 않는다", async () => {
    const { cookie, token } = await signIn("alice");
    const res = await logout.POST(
      new NextRequest("http://test/auth/logout", {
        method: "POST",
        headers: { cookie, "sec-fetch-site": "cross-site" },
      })
    );
    expect(res.status).toBe(403);
    expect(res.cookies.get(SESSION_COOKIE)).toBeUndefined();
    expect(await Session.exists({ tokenHash: hashToken(token) })).not.toBeNull();
  });

  it("쿠키 없이 로그아웃해도 오류 없이 /login 으로 보낸다", async () => {
    const res = await logout.POST(request(undefined, "/auth/logout", "POST"));
    expect(res.status).toBe(303);
  });
});
