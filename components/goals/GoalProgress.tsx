"use client";

import ProgressBar from "@/components/weekly/ProgressBar";
import { goalStats } from "@/lib/utils";
import { useStore } from "@/store";

/** 목표에 연결된 할일(직접 연결 + 주간 계획을 통한 연결)의 완료율 */
export default function GoalProgress({ goalId }: { goalId: string }) {
  const todos = useStore((s) => s.todos);
  const plans = useStore((s) => s.weeklyPlans);
  const { total, done, progress } = goalStats(goalId, todos, plans);

  return (
    <ProgressBar label="진행률" value={progress} detail={`할일 ${done}/${total}`} />
  );
}
