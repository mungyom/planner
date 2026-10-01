import type { TodoStatus } from "@/types";

const pad = (n: number) => String(n).padStart(2, "0");

/** UTC 기준 YYYY-MM-DD (DB 에 저장된 날짜 전용 값 표시용) */
export function toDateKey(date: Date | string): string {
  const d = new Date(date);
  return `${d.getUTCFullYear()}-${pad(d.getUTCMonth() + 1)}-${pad(d.getUTCDate())}`;
}

/** 사용자의 로컬 달력 기준 YYYY-MM-DD */
export function localDateKey(date: Date = new Date()): string {
  return `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())}`;
}

function mondayOf(utcMidnight: Date): Date {
  const daysSinceMonday = (utcMidnight.getUTCDay() + 6) % 7;
  utcMidnight.setUTCDate(utcMidnight.getUTCDate() - daysSinceMonday);
  return utcMidnight;
}

/** 로컬 달력 날짜가 속한 주의 월요일 (UTC 자정으로 표현) */
export function getWeekStart(date: Date = new Date()): Date {
  return mondayOf(
    new Date(Date.UTC(date.getFullYear(), date.getMonth(), date.getDate()))
  );
}

/** API 입력값(YYYY-MM-DD 또는 ISO 문자열)을 주 시작일로 정규화. 해석 불가면 null */
export function normalizeWeekStart(value: unknown): Date | null {
  if (typeof value !== "string" && !(value instanceof Date)) return null;
  const d = new Date(value);
  if (Number.isNaN(d.getTime())) return null;
  return mondayOf(
    new Date(Date.UTC(d.getUTCFullYear(), d.getUTCMonth(), d.getUTCDate()))
  );
}

export function formatWeekRange(weekStart: Date | string): string {
  const start = new Date(weekStart);
  const end = new Date(start);
  end.setUTCDate(end.getUTCDate() + 6);
  const fmt = (d: Date) => `${d.getUTCMonth() + 1}/${d.getUTCDate()}`;
  return `${start.getUTCFullYear()}년 ${fmt(start)} ~ ${fmt(end)}`;
}

export function isPastDate(dateKey: string, today: Date = new Date()): boolean {
  return dateKey < localDateKey(today);
}

export function isOverdue(
  dueDate: string | Date | null | undefined,
  status: TodoStatus,
  today: Date = new Date()
): boolean {
  if (!dueDate || status === "done") return false;
  return isPastDate(toDateKey(dueDate), today);
}

export function percent(done: number, total: number): number {
  return total === 0 ? 0 : Math.round((done / total) * 100);
}

interface GoalLinked {
  status: TodoStatus;
  goalId?: unknown;
  weeklyPlanId?: unknown;
}
interface PlanLinked {
  _id: unknown;
  goalId?: unknown;
}

/**
 * 할일 → 주간 계획 → 1년 목표 연결 구조.
 * 할일에 직접 연결된 목표가 없으면 소속 주간 계획의 목표를 따른다.
 */
export function effectiveGoalId(
  todo: Omit<GoalLinked, "status">,
  plans: PlanLinked[]
): string | null {
  if (todo.goalId) return String(todo.goalId);
  if (!todo.weeklyPlanId) return null;
  const plan = plans.find((p) => String(p._id) === String(todo.weeklyPlanId));
  return plan?.goalId ? String(plan.goalId) : null;
}

export function goalStats(
  goalId: unknown,
  todos: GoalLinked[],
  plans: PlanLinked[]
): { total: number; done: number; progress: number } {
  const linked = todos.filter(
    (t) => effectiveGoalId(t, plans) === String(goalId)
  );
  const done = linked.filter((t) => t.status === "done").length;
  return { total: linked.length, done, progress: percent(done, linked.length) };
}

/** 주간 진행률: 주간 목표 달성(goals[].done)과 그 주에 속한 할일 완료 두 가지 */
export function weeklyStats(
  plan: { _id: unknown; goals: { done: boolean }[] },
  todos: { status: TodoStatus; weeklyPlanId?: unknown }[]
) {
  const planTodos = todos.filter(
    (t) => t.weeklyPlanId && String(t.weeklyPlanId) === String(plan._id)
  );
  const goalsDone = plan.goals.filter((g) => g.done).length;
  const todosDone = planTodos.filter((t) => t.status === "done").length;
  return {
    goalsDone,
    goalsTotal: plan.goals.length,
    goalPercent: percent(goalsDone, plan.goals.length),
    todosDone,
    todosTotal: planTodos.length,
    todoPercent: percent(todosDone, planTodos.length),
  };
}

// 월요일 시작. 값은 Date#getDay 와 동일 (0=일 ~ 6=토)
export const WEEK_DAYS: { value: number; label: string }[] = [
  { value: 1, label: "월" },
  { value: 2, label: "화" },
  { value: 3, label: "수" },
  { value: 4, label: "목" },
  { value: 5, label: "금" },
  { value: 6, label: "토" },
  { value: 0, label: "일" },
];

export const STATUS_LABEL: Record<TodoStatus, string> = {
  todo: "할 일",
  doing: "진행 중",
  done: "완료",
};
