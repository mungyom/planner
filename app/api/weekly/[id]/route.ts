import type { Types } from "mongoose";
import { NextRequest, NextResponse } from "next/server";
import {
  HttpError,
  assertObjectId,
  handle,
  notFound,
  pick,
  readBody,
} from "@/lib/api";
import { requireUserId } from "@/lib/auth";
import { assertOwnedRefs } from "@/lib/ownership";
import { Todo } from "@/models/Todo";
import { WeeklyPlan } from "@/models/WeeklyPlan";

type Ctx = { params: { id: string } };

/** 다른 사용자의 계획은 존재 여부도 드러내지 않도록 404 */
async function findPlan(userId: Types.ObjectId, id: string) {
  assertObjectId(id);
  const plan = await WeeklyPlan.findOne({ _id: id, userId });
  if (!plan) throw notFound("주간 계획");
  return plan;
}

export function GET(req: NextRequest, { params }: Ctx) {
  return handle(async () => {
    const plan = await findPlan(await requireUserId(req), params.id);
    return NextResponse.json(plan.toObject());
  });
}

export function PUT(req: NextRequest, { params }: Ctx) {
  return handle(async () => {
    const userId = await requireUserId(req);
    const plan = await findPlan(userId, params.id);
    const body = await readBody(req);
    // weekStart 는 계획의 식별자이므로 수정 대상에서 제외
    const data = pick(body, ["goals", "memo", "retrospective", "goalId"]);
    await assertOwnedRefs(userId, data);
    plan.set(data);
    await plan.save();
    return NextResponse.json(plan.toObject());
  });
}

/** goals[goalIndex].done 토글. done 을 생략하면 현재 값을 반전한다 */
export function PATCH(req: NextRequest, { params }: Ctx) {
  return handle(async () => {
    const plan = await findPlan(await requireUserId(req), params.id);
    const { goalIndex, done } = await readBody(req);

    const goal =
      typeof goalIndex === "number" ? plan.goals[goalIndex] : undefined;
    if (!goal) throw new HttpError(400, "goalIndex 가 올바르지 않습니다.");
    if (done !== undefined && typeof done !== "boolean") {
      throw new HttpError(400, "done 은 boolean 이어야 합니다.");
    }

    goal.done = done ?? !goal.done;
    await plan.save();
    return NextResponse.json(plan.toObject());
  });
}

export function DELETE(req: NextRequest, { params }: Ctx) {
  return handle(async () => {
    const userId = await requireUserId(req);
    const plan = await findPlan(userId, params.id);
    await plan.deleteOne();
    // 계획이 사라지면 요일 배치도 의미가 없으므로 함께 해제
    await Todo.updateMany(
      { userId, weeklyPlanId: params.id },
      { $set: { weeklyPlanId: null, dayOfWeek: null } }
    );
    return NextResponse.json({ ok: true });
  });
}
