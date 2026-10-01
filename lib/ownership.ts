import type { Types } from "mongoose";
import { Goal } from "@/models/Goal";
import { WeeklyPlan } from "@/models/WeeklyPlan";
import { HttpError, assertObjectId } from "./api";

const REFS = [
  { field: "goalId", model: Goal, label: "목표" },
  { field: "weeklyPlanId", model: WeeklyPlan, label: "주간 계획" },
] as const;

/** 다른 사용자의 목표/주간 계획에 연결하지 못하게 한다. null 은 연결 해제이므로 통과 */
export async function assertOwnedRefs(
  userId: Types.ObjectId,
  data: Record<string, unknown>
): Promise<void> {
  for (const { field, model, label } of REFS) {
    const value = data[field];
    if (value == null || value === "") continue;
    assertObjectId(String(value));
    // 두 모델의 타입이 달라 union 에서 exists 를 직접 부를 수 없다
    const exists = await (model as typeof Goal).exists({ _id: value, userId });
    if (!exists) throw new HttpError(400, `연결할 ${label}을(를) 찾을 수 없습니다.`);
  }
}
