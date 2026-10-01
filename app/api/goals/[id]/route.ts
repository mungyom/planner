import { NextRequest, NextResponse } from "next/server";
import { assertObjectId, handle, notFound, pick, readBody } from "@/lib/api";
import { requireUserId } from "@/lib/auth";
import { withProgress } from "@/lib/goalProgress";
import { Goal } from "@/models/Goal";
import { Todo } from "@/models/Todo";
import { WeeklyPlan } from "@/models/WeeklyPlan";

type Ctx = { params: { id: string } };

// 다른 사용자의 문서는 존재 여부도 드러내지 않도록 404 로 취급한다

export function GET(req: NextRequest, { params }: Ctx) {
  return handle(async () => {
    const userId = await requireUserId(req);
    assertObjectId(params.id);
    const goal = await Goal.findOne({ _id: params.id, userId }).lean();
    if (!goal) throw notFound("목표");
    return NextResponse.json((await withProgress(userId, [goal]))[0]);
  });
}

export function PUT(req: NextRequest, { params }: Ctx) {
  return handle(async () => {
    const userId = await requireUserId(req);
    assertObjectId(params.id);
    const body = await readBody(req);
    const goal = await Goal.findOneAndUpdate(
      { _id: params.id, userId },
      { $set: pick(body, ["title", "description"]) },
      { returnDocument: "after", runValidators: true }
    ).lean();
    if (!goal) throw notFound("목표");
    return NextResponse.json((await withProgress(userId, [goal]))[0]);
  });
}

export function DELETE(req: NextRequest, { params }: Ctx) {
  return handle(async () => {
    const userId = await requireUserId(req);
    assertObjectId(params.id);
    const goal = await Goal.findOneAndDelete({ _id: params.id, userId }).lean();
    if (!goal) throw notFound("목표");
    // 삭제된 목표를 가리키는 연결을 끊는다
    await Promise.all([
      Todo.updateMany({ userId, goalId: params.id }, { $set: { goalId: null } }),
      WeeklyPlan.updateMany({ userId, goalId: params.id }, { $set: { goalId: null } }),
    ]);
    return NextResponse.json({ ok: true });
  });
}
