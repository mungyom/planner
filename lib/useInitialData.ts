"use client";

import { useEffect } from "react";
import { useStore } from "@/store";

/** 할일·주간 계획·목표를 한 번에 불러온다. 진행률은 세 가지가 모두 있어야 계산된다 */
export function useInitialData() {
  const fetchTodos = useStore((s) => s.fetchTodos);
  const fetchWeeklyPlans = useStore((s) => s.fetchWeeklyPlans);
  const fetchGoals = useStore((s) => s.fetchGoals);

  useEffect(() => {
    fetchTodos();
    fetchWeeklyPlans();
    fetchGoals();
  }, [fetchTodos, fetchWeeklyPlans, fetchGoals]);

  const loaded = useStore((s) => s.todosLoaded && s.weeklyLoaded && s.goalsLoaded);
  const error = useStore((s) => s.todoError ?? s.weeklyError ?? s.goalError);
  return { loaded, error };
}
