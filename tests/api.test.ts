import { NextRequest } from "next/server";
import { beforeEach, describe, expect, it } from "vitest";
import * as goalItem from "@/app/api/goals/[id]/route";
import * as goals from "@/app/api/goals/route";
import * as todoItem from "@/app/api/todos/[id]/route";
import * as todos from "@/app/api/todos/route";
import * as weeklyItem from "@/app/api/weekly/[id]/route";
import * as weekly from "@/app/api/weekly/route";
import { MAX_KEY_LENGTH } from "@/lib/fractionalIndex";
import { request, resetDb, signIn, useMemoryDb } from "./helpers";

// 로그인 도입 전의 CRUD 동작이 그대로인지 확인한다. 모든 요청은 로그인한 한 사용자로 보낸다
useMemoryDb();

let cookie: string;

beforeEach(async () => {
  await resetDb();
  ({ cookie } = await signIn());
});

function req(path: string, method = "GET", body?: unknown) {
  return request(cookie, path, method, body);
}
const ctx = (id: string) => ({ params: { id } });
const MISSING_ID = "0123456789abcdef01234567";

async function create<T = Record<string, any>>(
  route: { POST: (r: NextRequest) => Promise<Response> },
  path: string,
  body: unknown
): Promise<T> {
  const res = await route.POST(req(path, "POST", body));
  expect(res.status).toBe(201);
  return res.json();
}

describe("goals API", () => {
  it("CRUD", async () => {
    const created = await create(goals, "/api/goals", { title: "취업", description: "백엔드" });
    expect(created).toMatchObject({ title: "취업", description: "백엔드", progress: 0 });

    const list = await (await goals.GET(req("/api/goals"))).json();
    expect(list).toHaveLength(1);

    const got = await goalItem.GET(req(`/api/goals/${created._id}`), ctx(created._id));
    expect(got.status).toBe(200);

    const updated = await goalItem.PUT(
      req(`/api/goals/${created._id}`, "PUT", { title: "이직" }),
      ctx(created._id)
    );
    expect(await updated.json()).toMatchObject({ title: "이직", description: "백엔드" });

    const deleted = await goalItem.DELETE(req("/", "DELETE"), ctx(created._id));
    expect(deleted.status).toBe(200);
    expect(await (await goals.GET(req("/api/goals"))).json()).toEqual([]);
  });

  it("제목이 없으면 400", async () => {
    const res = await goals.POST(req("/api/goals", "POST", { description: "x" }));
    expect(res.status).toBe(400);
  });

  it("JSON 이 아닌 본문은 400", async () => {
    const res = await goals.POST(
      new NextRequest("http://test/api/goals", {
        method: "POST",
        headers: { cookie },
        body: "{oops",
      })
    );
    expect(res.status).toBe(400);
  });

  it("잘못된 ObjectId 는 400, 없는 문서는 404", async () => {
    expect((await goalItem.GET(req("/"), ctx("nope"))).status).toBe(400);
    expect((await goalItem.PUT(req("/", "PUT", {}), ctx("123"))).status).toBe(400);
    expect((await goalItem.DELETE(req("/", "DELETE"), ctx("zzz"))).status).toBe(400);
    expect((await goalItem.GET(req("/"), ctx(MISSING_ID))).status).toBe(404);
  });

  it("progress 는 직접 연결 + 주간 계획을 통한 연결 할일의 완료율", async () => {
    const goal = await create(goals, "/api/goals", { title: "목표" });
    const plan = await create(weekly, "/api/weekly", {
      weekStart: "2026-09-28",
      goalId: goal._id,
    });
    await create(todos, "/api/todos", { title: "직접", goalId: goal._id, status: "done" });
    await create(todos, "/api/todos", { title: "계획 경유", weeklyPlanId: plan._id });
    await create(todos, "/api/todos", { title: "무관", status: "done" });

    const [listed] = await (await goals.GET(req("/api/goals"))).json();
    expect(listed.progress).toBe(50);
  });

  it("삭제 시 할일/주간 계획의 연결을 끊는다", async () => {
    const goal = await create(goals, "/api/goals", { title: "목표" });
    const plan = await create(weekly, "/api/weekly", { weekStart: "2026-09-28", goalId: goal._id });
    const todo = await create(todos, "/api/todos", { title: "t", goalId: goal._id });

    await goalItem.DELETE(req("/", "DELETE"), ctx(goal._id));

    expect((await (await todoItem.GET(req("/"), ctx(todo._id))).json()).goalId).toBeNull();
    expect((await (await weeklyItem.GET(req("/"), ctx(plan._id))).json()).goalId).toBeNull();
  });
});

describe("weekly API", () => {
  const base = { weekStart: "2026-09-30", goals: [{ text: "운동" }, { text: "독서" }] };

  it("weekStart 를 월요일로 정규화해 생성", async () => {
    const plan = await create(weekly, "/api/weekly", { ...base, memo: "메모" });
    expect(plan.weekStart).toBe("2026-09-28T00:00:00.000Z");
    expect(plan.goals).toMatchObject([
      { text: "운동", done: false },
      { text: "독서", done: false },
    ]);
    expect(plan).toMatchObject({ memo: "메모", retrospective: "" });
  });

  it("같은 주 중복 생성은 409", async () => {
    await create(weekly, "/api/weekly", base);
    // 같은 주의 다른 요일
    const res = await weekly.POST(req("/api/weekly", "POST", { weekStart: "2026-10-04" }));
    expect(res.status).toBe(409);
  });

  it("weekStart 누락/형식 오류는 400, 목표 6개 이상은 400", async () => {
    expect((await weekly.POST(req("/api/weekly", "POST", {}))).status).toBe(400);
    expect(
      (await weekly.POST(req("/api/weekly", "POST", { weekStart: "어제" }))).status
    ).toBe(400);
    const six = Array.from({ length: 6 }, (_, i) => ({ text: `목표 ${i}` }));
    const res = await weekly.POST(
      req("/api/weekly", "POST", { weekStart: "2026-09-28", goals: six })
    );
    expect(res.status).toBe(400);
  });

  it("GET: 최신 주 우선, weekStart 필터와 limit 지원", async () => {
    await create(weekly, "/api/weekly", { weekStart: "2026-09-14" });
    await create(weekly, "/api/weekly", { weekStart: "2026-09-28" });
    await create(weekly, "/api/weekly", { weekStart: "2026-09-21" });

    const all = await (await weekly.GET(req("/api/weekly"))).json();
    expect(all.map((p: any) => p.weekStart.slice(0, 10))).toEqual([
      "2026-09-28",
      "2026-09-21",
      "2026-09-14",
    ]);

    const limited = await (await weekly.GET(req("/api/weekly?limit=2"))).json();
    expect(limited).toHaveLength(2);

    const filtered = await (await weekly.GET(req("/api/weekly?weekStart=2026-09-23"))).json();
    expect(filtered).toHaveLength(1);
    expect(filtered[0].weekStart).toBe("2026-09-21T00:00:00.000Z");

    expect((await weekly.GET(req("/api/weekly?weekStart=xx"))).status).toBe(400);
  });

  it("PUT: 목표/메모/회고 수정, weekStart 는 유지", async () => {
    const plan = await create(weekly, "/api/weekly", base);
    const res = await weeklyItem.PUT(
      req("/", "PUT", {
        goals: [{ ...plan.goals[0], done: true }, { text: "새 목표" }],
        retrospective: "회고",
        weekStart: "2020-01-01",
      }),
      ctx(plan._id)
    );
    const updated = await res.json();
    expect(updated.weekStart).toBe(plan.weekStart);
    expect(updated.retrospective).toBe("회고");
    expect(updated.goals).toMatchObject([
      { _id: plan.goals[0]._id, text: "운동", done: true },
      { text: "새 목표", done: false },
    ]);
  });

  it("PATCH: goals[n].done 토글이 응답의 서브도큐먼트에 반영", async () => {
    const plan = await create(weekly, "/api/weekly", base);

    const on = await weeklyItem.PATCH(
      req("/", "PATCH", { goalIndex: 1, done: true }),
      ctx(plan._id)
    );
    expect((await on.json()).goals.map((g: any) => g.done)).toEqual([false, true]);

    // done 생략 시 반전
    const flipped = await weeklyItem.PATCH(req("/", "PATCH", { goalIndex: 1 }), ctx(plan._id));
    expect((await flipped.json()).goals[1].done).toBe(false);

    const persisted = await (await weeklyItem.GET(req("/"), ctx(plan._id))).json();
    expect(persisted.goals.map((g: any) => g.done)).toEqual([false, false]);
  });

  it("PATCH: 범위를 벗어난 goalIndex / 잘못된 done 은 400", async () => {
    const plan = await create(weekly, "/api/weekly", base);
    for (const body of [{ goalIndex: 5 }, { goalIndex: "0" }, {}, { goalIndex: 0, done: "yes" }]) {
      const res = await weeklyItem.PATCH(req("/", "PATCH", body), ctx(plan._id));
      expect(res.status).toBe(400);
    }
  });

  it("DELETE: 연결된 할일의 계획/요일 배치를 해제", async () => {
    const plan = await create(weekly, "/api/weekly", base);
    const todo = await create(todos, "/api/todos", {
      title: "t",
      weeklyPlanId: plan._id,
      dayOfWeek: 3,
    });

    expect((await weeklyItem.DELETE(req("/", "DELETE"), ctx(plan._id))).status).toBe(200);
    expect((await weeklyItem.GET(req("/"), ctx(plan._id))).status).toBe(404);

    const orphan = await (await todoItem.GET(req("/"), ctx(todo._id))).json();
    expect(orphan).toMatchObject({ weeklyPlanId: null, dayOfWeek: null });
  });

  it("잘못된 ObjectId 는 400", async () => {
    expect((await weeklyItem.GET(req("/"), ctx("bad-id"))).status).toBe(400);
    expect((await weeklyItem.PATCH(req("/", "PATCH", {}), ctx("bad-id"))).status).toBe(400);
  });
});

describe("todos API", () => {
  it("생성 시 기본값과 컬럼 끝의 order 를 부여", async () => {
    const a = await create(todos, "/api/todos", { title: "a" });
    const b = await create(todos, "/api/todos", { title: "b" });
    const c = await create(todos, "/api/todos", { title: "c", status: "doing" });

    expect(a).toMatchObject({ status: "todo", priority: "medium", dueDate: null });
    expect(typeof a.order).toBe("string");
    expect(a.order < b.order).toBe(true);
    // 다른 컬럼은 독립적으로 첫 키부터 시작
    expect(c.order).toBe(a.order);
  });

  it("클라이언트가 보낸 order 는 무시", async () => {
    const todo = await create(todos, "/api/todos", { title: "a", order: "zzz" });
    expect(todo.order).not.toBe("zzz");
  });

  it("검증 실패는 400", async () => {
    for (const body of [
      {},
      { title: "t", status: "archived" },
      { title: "t", priority: "urgent" },
      { title: "t", dayOfWeek: 7 },
      { title: "t", dayOfWeek: 1.5 },
      { title: "t", goalId: "not-an-id" },
      { title: "t", dueDate: "언젠가" },
    ]) {
      const res = await todos.POST(req("/api/todos", "POST", body));
      expect(res.status, JSON.stringify(body)).toBe(400);
    }
  });

  it("GET: status / weeklyPlanId / goalId 필터, order 순 정렬", async () => {
    const goal = await create(goals, "/api/goals", { title: "g" });
    const plan = await create(weekly, "/api/weekly", { weekStart: "2026-09-28" });
    await create(todos, "/api/todos", { title: "1" });
    await create(todos, "/api/todos", { title: "2", weeklyPlanId: plan._id });
    await create(todos, "/api/todos", { title: "3", goalId: goal._id, status: "done" });

    const titles = async (query: string) =>
      (await (await todos.GET(req(`/api/todos${query}`))).json()).map((t: any) => t.title);

    expect(await titles("")).toHaveLength(3);
    expect(await titles("?status=todo")).toEqual(["1", "2"]);
    expect(await titles(`?weeklyPlanId=${plan._id}`)).toEqual(["2"]);
    expect(await titles(`?goalId=${goal._id}`)).toEqual(["3"]);
    expect(await titles(`?status=todo&goalId=${goal._id}`)).toEqual([]);

    expect((await todos.GET(req("/api/todos?status=nope"))).status).toBe(400);
    expect((await todos.GET(req("/api/todos?goalId=nope"))).status).toBe(400);
  });

  it("PUT: 필드 수정, 선택 필드는 null 로 해제", async () => {
    const todo = await create(todos, "/api/todos", {
      title: "원래",
      dueDate: "2026-10-01",
      priority: "high",
    });
    expect(todo.dueDate).toBe("2026-10-01T00:00:00.000Z");

    const res = await todoItem.PUT(
      req("/", "PUT", { title: "수정", dueDate: null, dayOfWeek: 2 }),
      ctx(todo._id)
    );
    expect(await res.json()).toMatchObject({
      title: "수정",
      dueDate: null,
      dayOfWeek: 2,
      priority: "high",
      order: todo.order,
    });
  });

  it("PUT 으로 상태를 바꾸면 새 컬럼의 끝으로 이동", async () => {
    const done = await create(todos, "/api/todos", { title: "done", status: "done" });
    const todo = await create(todos, "/api/todos", { title: "t" });

    const res = await todoItem.PUT(req("/", "PUT", { status: "done" }), ctx(todo._id));
    const moved = await res.json();
    expect(moved.status).toBe("done");
    expect(moved.order > done.order).toBe(true);
  });

  it("PATCH: status/order 저장 (칸반 이동)", async () => {
    const todo = await create(todos, "/api/todos", { title: "t" });

    const res = await todoItem.PATCH(
      req("/", "PATCH", { status: "doing", order: "a0V" }),
      ctx(todo._id)
    );
    expect(res.status).toBe(200);
    expect(await res.json()).toMatchObject({ status: "doing", order: "a0V" });

    // 새로고침(재조회) 후에도 유지
    const persisted = await (await todoItem.GET(req("/"), ctx(todo._id))).json();
    expect(persisted).toMatchObject({ status: "doing", order: "a0V", title: "t" });
  });

  it("PATCH: 잘못된 입력은 400", async () => {
    const todo = await create(todos, "/api/todos", { title: "t" });
    for (const body of [{}, { order: "" }, { order: 3 }, { status: "nope" }]) {
      const res = await todoItem.PATCH(req("/", "PATCH", body), ctx(todo._id));
      expect(res.status, JSON.stringify(body)).toBe(400);
    }
    const unchanged = await (await todoItem.GET(req("/"), ctx(todo._id))).json();
    expect(unchanged).toMatchObject({ status: "todo", order: todo.order });
  });

  it("PATCH: 키가 임계 길이를 넘으면 컬럼을 재정규화하되 순서는 보존", async () => {
    const a = await create(todos, "/api/todos", { title: "a" });
    const b = await create(todos, "/api/todos", { title: "b" });
    const c = await create(todos, "/api/todos", { title: "c" });
    // a 와 b 사이에 들어가는 매우 긴 키
    const longKey = a.order + "V".repeat(MAX_KEY_LENGTH);
    expect(longKey > a.order && longKey < b.order).toBe(true);

    const res = await todoItem.PATCH(req("/", "PATCH", { order: longKey }), ctx(c._id));
    const moved = await res.json();
    expect(moved.order.length).toBeLessThanOrEqual(MAX_KEY_LENGTH);

    const list = await (await todos.GET(req("/api/todos?status=todo"))).json();
    expect(list.map((t: any) => t.title)).toEqual(["a", "c", "b"]);
    expect(list.every((t: any) => t.order.length <= MAX_KEY_LENGTH)).toBe(true);
  });

  it("DELETE", async () => {
    const todo = await create(todos, "/api/todos", { title: "t" });
    expect((await todoItem.DELETE(req("/", "DELETE"), ctx(todo._id))).status).toBe(200);
    expect((await todoItem.GET(req("/"), ctx(todo._id))).status).toBe(404);
    expect((await todoItem.DELETE(req("/", "DELETE"), ctx(todo._id))).status).toBe(404);
  });

  it("잘못된 ObjectId 는 400", async () => {
    for (const handler of [todoItem.GET, todoItem.DELETE]) {
      expect((await handler(req("/"), ctx("1234"))).status).toBe(400);
    }
    expect((await todoItem.PATCH(req("/", "PATCH", { status: "done" }), ctx("x"))).status).toBe(400);
    expect((await todoItem.PUT(req("/", "PUT", { title: "x" }), ctx("x"))).status).toBe(400);
  });
});
