import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { useStore } from "@/store";
import type { Todo, WeeklyPlan } from "@/types";

const todo: Todo = {
  _id: "t1",
  title: "할일",
  status: "todo",
  priority: "medium",
  order: "a0",
  createdAt: "",
  updatedAt: "",
};

const plan: WeeklyPlan = {
  _id: "p1",
  weekStart: "2026-09-28T00:00:00.000Z",
  goals: [{ text: "목표", done: false }],
  memo: "",
  retrospective: "",
  createdAt: "",
  updatedAt: "",
};

const fetchMock = vi.fn();
const respond = (status: number, body: unknown) =>
  new Response(JSON.stringify(body), { status });

beforeEach(() => {
  vi.stubGlobal("fetch", fetchMock);
  useStore.setState({ todos: [todo], weeklyPlans: [plan], todoError: null, weeklyError: null });
});

afterEach(() => {
  fetchMock.mockReset();
  vi.unstubAllGlobals();
});

describe("moveTodo", () => {
  it("PATCH 를 정확히 1회 호출하고 status/order 를 반영", async () => {
    fetchMock.mockResolvedValue(respond(200, { ...todo, status: "doing", order: "a1" }));

    await useStore.getState().moveTodo("t1", "doing", "a1");

    expect(fetchMock).toHaveBeenCalledTimes(1);
    const [url, init] = fetchMock.mock.calls[0];
    expect(url).toBe("/api/todos/t1");
    expect(init.method).toBe("PATCH");
    expect(JSON.parse(init.body)).toEqual({ status: "doing", order: "a1" });
    expect(useStore.getState().todos[0]).toMatchObject({ status: "doing", order: "a1" });
  });

  it("응답을 기다리지 않고 즉시 반영 (optimistic)", async () => {
    let resolve!: (res: Response) => void;
    fetchMock.mockReturnValue(new Promise<Response>((r) => (resolve = r)));

    const pending = useStore.getState().moveTodo("t1", "done", "a5");
    expect(useStore.getState().todos[0]).toMatchObject({ status: "done", order: "a5" });

    resolve(respond(200, { ...todo, status: "done", order: "a5" }));
    await pending;
  });

  it("API 실패 시 이전 상태로 롤백하고 에러를 기록", async () => {
    fetchMock.mockResolvedValue(respond(500, { error: "서버 오류가 발생했습니다." }));

    await useStore.getState().moveTodo("t1", "doing", "a1");

    expect(useStore.getState().todos[0]).toEqual(todo);
    expect(useStore.getState().todoError).toBe("서버 오류가 발생했습니다.");
  });

  it("네트워크 오류에도 롤백", async () => {
    fetchMock.mockRejectedValue(new TypeError("Failed to fetch"));

    await useStore.getState().moveTodo("t1", "doing", "a1");

    expect(useStore.getState().todos[0]).toEqual(todo);
  });

  it("서버가 컬럼을 재정규화해 order 가 달라지면 목록을 다시 불러온다", async () => {
    const renormalized = { ...todo, status: "doing", order: "a0" };
    fetchMock
      .mockResolvedValueOnce(respond(200, renormalized))
      .mockResolvedValueOnce(respond(200, [renormalized]));

    await useStore.getState().moveTodo("t1", "doing", "a".repeat(40));

    expect(fetchMock).toHaveBeenCalledTimes(2);
    expect(fetchMock.mock.calls[1][0]).toBe("/api/todos");
    expect(useStore.getState().todos).toEqual([renormalized]);
  });
});

describe("toggleGoal", () => {
  it("즉시 done 을 반영하고 PATCH 로 goalIndex/done 을 보낸다", async () => {
    const saved = { ...plan, goals: [{ text: "목표", done: true }] };
    fetchMock.mockResolvedValue(respond(200, saved));

    const pending = useStore.getState().toggleGoal("p1", 0);
    expect(useStore.getState().weeklyPlans[0].goals[0].done).toBe(true);
    await pending;

    expect(fetchMock).toHaveBeenCalledTimes(1);
    expect(JSON.parse(fetchMock.mock.calls[0][1].body)).toEqual({ goalIndex: 0, done: true });
    expect(useStore.getState().weeklyPlans[0]).toEqual(saved);
  });

  it("실패 시 롤백", async () => {
    fetchMock.mockResolvedValue(respond(500, { error: "실패" }));

    await useStore.getState().toggleGoal("p1", 0);

    expect(useStore.getState().weeklyPlans[0]).toEqual(plan);
    expect(useStore.getState().weeklyError).toBe("실패");
  });
});
