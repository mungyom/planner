"use client";

import { useState } from "react";
import FormActions from "@/components/shared/FormActions";
import { useSubmit } from "@/lib/useSubmit";
import { getWeekStart, toDateKey } from "@/lib/utils";
import { useStore } from "@/store";
import type { WeeklyGoal, WeeklyPlan } from "@/types";

const MAX_GOALS = 5;

interface Props {
  plan?: WeeklyPlan;
  onDone: () => void;
}

export default function WeeklyPlanForm({ plan, onDone }: Props) {
  const addWeeklyPlan = useStore((s) => s.addWeeklyPlan);
  const updateWeeklyPlan = useStore((s) => s.updateWeeklyPlan);
  const yearGoals = useStore((s) => s.goals);

  const [weekDate, setWeekDate] = useState(toDateKey(getWeekStart()));
  const [goals, setGoals] = useState<WeeklyGoal[]>(
    plan?.goals.length ? plan.goals : [{ text: "", done: false }]
  );
  const [memo, setMemo] = useState(plan?.memo ?? "");
  const [goalId, setGoalId] = useState(plan?.goalId ?? "");

  const { saving, error, onSubmit } = useSubmit(() => {
    const input = {
      goals: goals
        .map((g) => ({ ...g, text: g.text.trim() }))
        .filter((g) => g.text),
      memo,
      goalId: goalId || null,
    };
    return plan
      ? updateWeeklyPlan(plan._id, input)
      : addWeeklyPlan({ ...input, weekStart: weekDate });
  }, onDone);

  const setGoalText = (index: number, text: string) =>
    setGoals(goals.map((g, i) => (i === index ? { ...g, text } : g)));

  return (
    <form onSubmit={onSubmit} className="space-y-4">
      {!plan && (
        <div>
          <label className="label" htmlFor="plan-week">
            주 선택
          </label>
          <input
            id="plan-week"
            type="date"
            className="input"
            value={weekDate}
            onChange={(e) => setWeekDate(e.target.value)}
            required
          />
          <p className="mt-1 text-xs text-slate-500">
            고른 날짜가 속한 주(월~일)의 계획으로 저장됩니다.
          </p>
        </div>
      )}

      <fieldset>
        <legend className="label">주간 목표 (최대 {MAX_GOALS}개)</legend>
        <div className="space-y-2">
          {goals.map((goal, index) => (
            <div key={goal._id ?? `new-${index}`} className="flex gap-2">
              <input
                className="input"
                aria-label={`주간 목표 ${index + 1}`}
                value={goal.text}
                onChange={(e) => setGoalText(index, e.target.value)}
                placeholder={`목표 ${index + 1}`}
                maxLength={200}
              />
              <button
                type="button"
                className="btn-ghost"
                aria-label={`주간 목표 ${index + 1} 삭제`}
                onClick={() => setGoals(goals.filter((_, i) => i !== index))}
              >
                ✕
              </button>
            </div>
          ))}
        </div>
        {goals.length < MAX_GOALS && (
          <button
            type="button"
            className="mt-2 text-sm text-indigo-600 hover:underline"
            onClick={() => setGoals([...goals, { text: "", done: false }])}
          >
            + 목표 추가
          </button>
        )}
      </fieldset>

      <div>
        <label className="label" htmlFor="plan-memo">
          주간 메모
        </label>
        <textarea
          id="plan-memo"
          className="input"
          rows={3}
          value={memo}
          onChange={(e) => setMemo(e.target.value)}
        />
      </div>

      <div>
        <label className="label" htmlFor="plan-goal">
          연결할 1년 목표
        </label>
        <select
          id="plan-goal"
          className="input"
          value={goalId}
          onChange={(e) => setGoalId(e.target.value)}
        >
          <option value="">연결 안 함</option>
          {yearGoals.map((goal) => (
            <option key={goal._id} value={goal._id}>
              {goal.title}
            </option>
          ))}
        </select>
      </div>

      <FormActions error={error} saving={saving} onCancel={onDone} />
    </form>
  );
}
