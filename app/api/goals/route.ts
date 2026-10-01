import { NextRequest, NextResponse } from "next/server";
import { handle, pick, readBody } from "@/lib/api";
import { requireUserId } from "@/lib/auth";
import { withProgress } from "@/lib/goalProgress";
import { Goal } from "@/models/Goal";

export const dynamic = "force-dynamic";

export function GET(req: NextRequest) {
  return handle(async () => {
    const userId = await requireUserId(req);
    const goals = await Goal.find({ userId }).sort({ createdAt: -1 }).lean();
    return NextResponse.json(await withProgress(userId, goals));
  });
}

export function POST(req: NextRequest) {
  return handle(async () => {
    const userId = await requireUserId(req);
    const body = await readBody(req);
    const goal = await Goal.create({ ...pick(body, ["title", "description"]), userId });
    return NextResponse.json(goal.toObject(), { status: 201 });
  });
}
