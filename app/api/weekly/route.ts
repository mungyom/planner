import type { Types } from "mongoose";
import { NextRequest, NextResponse } from "next/server";
import { HttpError, handle, pick, readBody } from "@/lib/api";
import { requireUserId } from "@/lib/auth";
import { assertOwnedRefs } from "@/lib/ownership";
import { normalizeWeekStart } from "@/lib/utils";
import { WeeklyPlan } from "@/models/WeeklyPlan";

export const dynamic = "force-dynamic";

export function GET(req: NextRequest) {
  return handle(async () => {
    const userId = await requireUserId(req);
    const { searchParams } = req.nextUrl;
    const filter: { userId: Types.ObjectId; weekStart?: Date } = { userId };

    const weekStartParam = searchParams.get("weekStart");
    if (weekStartParam) {
      const weekStart = normalizeWeekStart(weekStartParam);
      if (!weekStart) throw new HttpError(400, "weekStart 형식이 잘못되었습니다.");
      filter.weekStart = weekStart;
    }

    const limit = Number(searchParams.get("limit")) || 0;
    const plans = await WeeklyPlan.find(filter)
      .sort({ weekStart: -1 })
      .limit(Math.max(0, limit))
      .lean();
    return NextResponse.json(plans);
  });
}

export function POST(req: NextRequest) {
  return handle(async () => {
    const userId = await requireUserId(req);
    const body = await readBody(req);
    const weekStart = normalizeWeekStart(body.weekStart);
    if (!weekStart) throw new HttpError(400, "weekStart 는 필수입니다.");

    if (await WeeklyPlan.exists({ userId, weekStart })) {
      throw new HttpError(409, "해당 주의 주간 계획이 이미 존재합니다.");
    }
    const data = pick(body, ["goals", "memo", "retrospective", "goalId"]);
    await assertOwnedRefs(userId, data);
    // 동시 요청은 { userId, weekStart } unique 인덱스가 막는다 (handle 에서 409 로 매핑)
    const plan = await WeeklyPlan.create({ ...data, weekStart, userId });
    return NextResponse.json(plan.toObject(), { status: 201 });
  });
}
