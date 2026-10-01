"use client";

import { useStore } from "@/store";
import type { WeeklyPlan } from "@/types";
import WeeklyGoalItem from "./WeeklyGoalItem";

/** 주간 목표 체크리스트. 대시보드와 주간 상세에서 함께 쓴다 */
export default function WeeklyGoalList({ plan }: { plan: WeeklyPlan }) {
  const toggleGoal = useStore((s) => s.toggleGoal);

  if (plan.goals.length === 0) {
    return <p className="text-sm text-slate-500">이번 주 목표가 아직 없습니다.</p>;
  }
  return (
    <ul className="space-y-0.5">
      {plan.goals.map((goal, index) => (
        <WeeklyGoalItem
          key={goal._id ?? index}
          goal={goal}
          onToggle={() => toggleGoal(plan._id, index)}
        />
      ))}
    </ul>
  );
}
