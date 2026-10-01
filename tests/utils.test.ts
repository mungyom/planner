import { describe, expect, it } from "vitest";
import {
  effectiveGoalId,
  formatWeekRange,
  getWeekStart,
  goalStats,
  isOverdue,
  normalizeWeekStart,
  percent,
  toDateKey,
  weeklyStats,
} from "@/lib/utils";

describe("getWeekStart", () => {
  it.each([
    ["수요일", new Date(2026, 8, 30), "2026-09-28"],
    ["월요일 당일", new Date(2026, 8, 28), "2026-09-28"],
    ["일요일은 그 주의 마지막 날", new Date(2026, 9, 4), "2026-09-28"],
    ["자정 직전", new Date(2026, 9, 4, 23, 59), "2026-09-28"],
    ["연도 경계", new Date(2027, 0, 1), "2026-12-28"],
  ])("%s → 그 주 월요일", (_name, date, expected) => {
    expect(toDateKey(getWeekStart(date))).toBe(expected);
  });
});

describe("normalizeWeekStart", () => {
  it("YYYY-MM-DD 문자열을 월요일 UTC 자정으로 정규화", () => {
    expect(normalizeWeekStart("2026-10-01")?.toISOString()).toBe(
      "2026-09-28T00:00:00.000Z"
    );
  });

  it("해석할 수 없는 값은 null", () => {
    expect(normalizeWeekStart("not-a-date")).toBeNull();
    expect(normalizeWeekStart(undefined)).toBeNull();
    expect(normalizeWeekStart(123)).toBeNull();
  });
});

describe("formatWeekRange", () => {
  it("월요일~일요일 범위를 표시", () => {
    expect(formatWeekRange("2026-09-28T00:00:00.000Z")).toBe("2026년 9/28 ~ 10/4");
  });
});

describe("isOverdue", () => {
  const today = new Date(2026, 8, 30);

  it("마감일이 오늘 이전이고 미완료면 지남", () => {
    expect(isOverdue("2026-09-29T00:00:00.000Z", "todo", today)).toBe(true);
    expect(isOverdue("2026-09-29T00:00:00.000Z", "doing", today)).toBe(true);
  });

  it("오늘이 마감이면 아직 지나지 않음", () => {
    expect(isOverdue("2026-09-30T00:00:00.000Z", "todo", today)).toBe(false);
  });

  it("완료했거나 마감일이 없으면 지남이 아님", () => {
    expect(isOverdue("2026-09-01T00:00:00.000Z", "done", today)).toBe(false);
    expect(isOverdue(null, "todo", today)).toBe(false);
  });
});

describe("진행률 계산", () => {
  const plans = [
    { _id: "p1", goalId: "g1", goals: [{ done: true }, { done: false }, { done: false }] },
    { _id: "p2", goalId: null, goals: [] },
  ];
  const todos = [
    { status: "done" as const, goalId: "g1", weeklyPlanId: null },
    { status: "todo" as const, goalId: null, weeklyPlanId: "p1" }, // p1 을 통해 g1
    { status: "done" as const, goalId: "g2", weeklyPlanId: "p1" }, // 직접 연결이 우선
    { status: "doing" as const, goalId: null, weeklyPlanId: "p2" },
    { status: "done" as const, goalId: null, weeklyPlanId: null },
  ];

  it("percent 는 0 나눗셈 없이 반올림", () => {
    expect(percent(0, 0)).toBe(0);
    expect(percent(1, 3)).toBe(33);
    expect(percent(3, 3)).toBe(100);
  });

  it("effectiveGoalId: 직접 연결 → 주간 계획의 목표 → 없음", () => {
    expect(effectiveGoalId(todos[0], plans)).toBe("g1");
    expect(effectiveGoalId(todos[1], plans)).toBe("g1");
    expect(effectiveGoalId(todos[2], plans)).toBe("g2");
    expect(effectiveGoalId(todos[3], plans)).toBeNull();
    expect(effectiveGoalId(todos[4], plans)).toBeNull();
  });

  it("goalStats: 연결된 할일의 완료율", () => {
    expect(goalStats("g1", todos, plans)).toEqual({ total: 2, done: 1, progress: 50 });
    expect(goalStats("g2", todos, plans)).toEqual({ total: 1, done: 1, progress: 100 });
    expect(goalStats("g3", todos, plans)).toEqual({ total: 0, done: 0, progress: 0 });
  });

  it("weeklyStats: 주간 목표 달성률과 할일 완료율", () => {
    expect(weeklyStats(plans[0], todos)).toEqual({
      goalsDone: 1,
      goalsTotal: 3,
      goalPercent: 33,
      todosDone: 1,
      todosTotal: 2,
      todoPercent: 50,
    });
  });
});
