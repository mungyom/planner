"use client";

import Link from "next/link";
import GoalProgress from "@/components/goals/GoalProgress";
import PageState from "@/components/shared/PageState";
import WeeklyGoalList from "@/components/weekly/WeeklyGoalList";
import WeeklyProgress from "@/components/weekly/WeeklyProgress";
import { STATUSES } from "@/lib/kanban";
import { useInitialData } from "@/lib/useInitialData";
import {
  STATUS_LABEL,
  effectiveGoalId,
  formatWeekRange,
  getWeekStart,
  toDateKey,
} from "@/lib/utils";
import { useStore } from "@/store";
import type { TodoStatus } from "@/types";

const STATUS_COUNT_COLOR: Record<TodoStatus, string> = {
  todo: "text-slate-600",
  doing: "text-amber-500",
  done: "text-emerald-600",
};

export default function DashboardPage() {
  const { loaded, error } = useInitialData();
  const todos = useStore((s) => s.todos);
  const plans = useStore((s) => s.weeklyPlans);
  const goals = useStore((s) => s.goals);

  const currentWeek = toDateKey(getWeekStart());
  const plan = plans.find((p) => toDateKey(p.weekStart) === currentWeek);
  const weekTodos = plan ? todos.filter((t) => t.weeklyPlanId === plan._id) : [];

  return (
    <div className="mx-auto max-w-5xl space-y-4">
      <PageState loaded={loaded} error={error} />

      <section aria-label="상태별 할일 수" className="grid grid-cols-3 gap-3">
        {STATUSES.map((status) => (
          <Link
            key={status}
            href="/todos"
            className="card text-center transition-shadow hover:shadow-md"
          >
            <p className="text-xs text-slate-500">{STATUS_LABEL[status]}</p>
            <p className={`mt-1 text-2xl font-bold ${STATUS_COUNT_COLOR[status]}`}>
              {todos.filter((t) => t.status === status).length}
            </p>
          </Link>
        ))}
      </section>

      {plan ? (
        <div className="grid gap-4 md:grid-cols-2">
          <section className="card">
            <div className="mb-2 flex items-baseline justify-between gap-2">
              <h2 className="text-sm font-semibold text-slate-700">이번 주 목표</h2>
              <Link
                href={`/weekly/${plan._id}`}
                className="text-xs text-indigo-600 hover:underline"
              >
                {formatWeekRange(plan.weekStart)} →
              </Link>
            </div>
            <WeeklyGoalList plan={plan} />
          </section>
          <section className="card">
            <h2 className="mb-3 text-sm font-semibold text-slate-700">주간 진행률</h2>
            <WeeklyProgress plan={plan} />
          </section>
        </div>
      ) : (
        loaded && (
          <section className="card text-center">
            <p className="mb-3 text-sm text-slate-500">
              이번 주 계획이 아직 없습니다. 1년 목표를 떠올리며 이번 주 계획을 세워 보세요.
            </p>
            <Link href="/weekly" className="btn-primary">
              주간 계획 작성하기
            </Link>
          </section>
        )
      )}

      <section className="card">
        <h2 className="mb-3 text-sm font-semibold text-slate-700">1년 목표</h2>
        {goals.length === 0 ? (
          <p className="text-sm text-slate-500">
            아직 목표가 없습니다.{" "}
            <Link href="/goals" className="text-indigo-600 hover:underline">
              목표 만들기
            </Link>
          </p>
        ) : (
          <ul className="space-y-4">
            {goals.map((goal) => (
              <li key={goal._id}>
                <div className="mb-1 flex items-baseline justify-between gap-2">
                  <span className="break-words text-sm font-medium">{goal.title}</span>
                  <span className="shrink-0 text-xs text-slate-500">
                    이번 주 할일{" "}
                    {weekTodos.filter((t) => effectiveGoalId(t, plans) === goal._id).length}개
                  </span>
                </div>
                <GoalProgress goalId={goal._id} />
              </li>
            ))}
          </ul>
        )}
      </section>
    </div>
  );
}
