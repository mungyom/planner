"use client";

import { weeklyStats } from "@/lib/utils";
import { useStore } from "@/store";
import type { WeeklyPlan } from "@/types";
import ProgressBar from "./ProgressBar";

export default function WeeklyProgress({ plan }: { plan: WeeklyPlan }) {
  const todos = useStore((s) => s.todos);
  const stats = weeklyStats(plan, todos);

  return (
    <div className="space-y-3">
      <ProgressBar
        label="주간 목표 달성률"
        value={stats.goalPercent}
        detail={`${stats.goalsDone}/${stats.goalsTotal}`}
      />
      <ProgressBar
        label="할일 완료율"
        value={stats.todoPercent}
        detail={`${stats.todosDone}/${stats.todosTotal}`}
      />
    </div>
  );
}
