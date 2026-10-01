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
import { needsRenormalize } from "@/lib/fractionalIndex";
import { assertOwnedRefs } from "@/lib/ownership";
import { TODO_FIELDS, nextOrder, renormalizeColumn } from "@/lib/todoOrder";
import { Todo } from "@/models/Todo";

type Ctx = { params: { id: string } };

/** 다른 사용자의 할일은 존재 여부도 드러내지 않도록 404 */
async function findTodo(userId: Types.ObjectId, id: string) {
  assertObjectId(id);
  const todo = await Todo.findOne({ _id: id, userId });
  if (!todo) throw notFound("할일");
  return todo;
}

export function GET(req: NextRequest, { params }: Ctx) {
  return handle(async () => {
    const todo = await findTodo(await requireUserId(req), params.id);
    return NextResponse.json(todo.toObject());
  });
}

export function PUT(req: NextRequest, { params }: Ctx) {
  return handle(async () => {
    const userId = await requireUserId(req);
    const todo = await findTodo(userId, params.id);
    const data = pick(await readBody(req), TODO_FIELDS);
    await assertOwnedRefs(userId, data);
    todo.set(data);
    if (todo.isModified("status")) {
      await todo.validate();
      todo.order = await nextOrder(userId, todo.status);
    }
    await todo.save();
    return NextResponse.json(todo.toObject());
  });
}

/** 칸반 이동 전용: 카드 1건의 status / order 만 변경 */
export function PATCH(req: NextRequest, { params }: Ctx) {
  return handle(async () => {
    const userId = await requireUserId(req);
    const todo = await findTodo(userId, params.id);
    const { status, order } = await readBody(req);
    if (status === undefined && order === undefined) {
      throw new HttpError(400, "status 또는 order 가 필요합니다.");
    }
    if (order !== undefined && (typeof order !== "string" || !order)) {
      throw new HttpError(400, "order 는 비어 있지 않은 문자열이어야 합니다.");
    }

    if (status !== undefined) todo.set({ status });
    await todo.validate();
    if (order !== undefined) todo.order = order;
    else if (todo.isModified("status")) todo.order = await nextOrder(userId, todo.status);
    await todo.save();

    if (!needsRenormalize(todo.order)) {
      return NextResponse.json(todo.toObject());
    }
    await renormalizeColumn(userId, todo.status);
    return NextResponse.json((await findTodo(userId, params.id)).toObject());
  });
}

export function DELETE(req: NextRequest, { params }: Ctx) {
  return handle(async () => {
    const todo = await findTodo(await requireUserId(req), params.id);
    await todo.deleteOne();
    return NextResponse.json({ ok: true });
  });
}
