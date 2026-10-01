import type { Types } from "mongoose";
import { NextRequest, NextResponse } from "next/server";
import { HttpError, assertObjectId, handle, pick, readBody } from "@/lib/api";
import { requireUserId } from "@/lib/auth";
import { isStatus } from "@/lib/kanban";
import { assertOwnedRefs } from "@/lib/ownership";
import { TODO_FIELDS, nextOrder } from "@/lib/todoOrder";
import { Todo } from "@/models/Todo";

export const dynamic = "force-dynamic";

export function GET(req: NextRequest) {
  return handle(async () => {
    const userId = await requireUserId(req);
    const { searchParams } = req.nextUrl;
    const filter: Record<string, string | Types.ObjectId> = { userId };

    const status = searchParams.get("status");
    if (status) {
      if (!isStatus(status)) throw new HttpError(400, "status 값이 잘못되었습니다.");
      filter.status = status;
    }
    for (const key of ["weeklyPlanId", "goalId"]) {
      const value = searchParams.get(key);
      if (value) {
        assertObjectId(value);
        filter[key] = value;
      }
    }

    const todos = await Todo.find(filter).sort({ order: 1 }).lean();
    return NextResponse.json(todos);
  });
}

export function POST(req: NextRequest) {
  return handle(async () => {
    const userId = await requireUserId(req);
    const data = pick(await readBody(req), TODO_FIELDS);
    const status = data.status ?? "todo";
    if (!isStatus(status)) throw new HttpError(400, "status 값이 잘못되었습니다.");
    await assertOwnedRefs(userId, data);

    const todo = await Todo.create({
      ...data,
      userId,
      order: await nextOrder(userId, status),
    });
    return NextResponse.json(todo.toObject(), { status: 201 });
  });
}
