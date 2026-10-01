import type { Types } from "mongoose";
import { Todo } from "@/models/Todo";
import { WeeklyPlan } from "@/models/WeeklyPlan";
import { goalStats } from "./utils";

/** 목표 응답에 연결된 todo 완료율(progress)을 계산해 채운다 */
export async function withProgress<T extends { _id: unknown }>(
  userId: Types.ObjectId,
  goals: T[]
): Promise<(T & { progress: number })[]> {
  const [todos, plans] = await Promise.all([
    Todo.find({ userId }, "status goalId weeklyPlanId").lean(),
    WeeklyPlan.find({ userId }, "goalId").lean(),
  ]);
  return goals.map((goal) => ({
    ...goal,
    progress: goalStats(goal._id, todos, plans).progress,
  }));
}
