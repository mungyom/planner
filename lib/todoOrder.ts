import type { Types } from "mongoose";
import { Todo } from "@/models/Todo";
import type { TodoStatus } from "@/types";
import { evenKeys, keyAfter } from "./fractionalIndex";

/** 클라이언트가 직접 쓸 수 있는 필드. order 는 서버가 부여하거나 PATCH 로만 바꾼다 */
export const TODO_FIELDS = [
  "title",
  "description",
  "status",
  "priority",
  "dueDate",
  "dayOfWeek",
  "weeklyPlanId",
  "goalId",
];

/** 사용자의 컬럼 맨 끝에 놓일 order 키 */
export async function nextOrder(
  userId: Types.ObjectId,
  status: TodoStatus
): Promise<string> {
  const last = await Todo.findOne({ userId, status }, "order").sort({ order: -1 }).lean();
  return keyAfter(last?.order);
}

/** 키가 너무 길어졌을 때 사용자의 컬럼 전체에 균등한 키를 다시 부여한다 */
export async function renormalizeColumn(
  userId: Types.ObjectId,
  status: TodoStatus
): Promise<void> {
  const todos = await Todo.find({ userId, status }, "_id").sort({ order: 1 }).lean();
  const keys = evenKeys(todos.length);
  await Todo.bulkWrite(
    todos.map((todo, i) => ({
      updateOne: {
        filter: { _id: todo._id },
        update: { $set: { order: keys[i] } },
      },
    }))
  );
}
