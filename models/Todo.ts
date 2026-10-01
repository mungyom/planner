import { Model, Schema, Types, model, models } from "mongoose";
import type { Priority, TodoStatus } from "@/types";

export interface ITodo {
  userId: Types.ObjectId;
  title: string;
  description: string;
  status: TodoStatus;
  priority: Priority;
  dueDate?: Date | null;
  dayOfWeek?: number | null;
  order: string;
  weeklyPlanId?: Types.ObjectId | null;
  goalId?: Types.ObjectId | null;
  createdAt: Date;
  updatedAt: Date;
}

const TodoSchema = new Schema<ITodo>(
  {
    userId: { type: Schema.Types.ObjectId, ref: "User", required: true },
    title: { type: String, required: true, trim: true, maxlength: 200 },
    description: { type: String, default: "" },
    status: { type: String, enum: ["todo", "doing", "done"], default: "todo" },
    priority: {
      type: String,
      enum: ["high", "medium", "low"],
      default: "medium",
    },
    dueDate: { type: Date, default: null },
    dayOfWeek: {
      type: Number,
      default: null,
      min: 0,
      max: 6,
      validate: {
        validator: (v: number | null) => v === null || Number.isInteger(v),
        message: "dayOfWeek 는 0~6 사이의 정수여야 합니다.",
      },
    },
    order: { type: String, required: true },
    weeklyPlanId: {
      type: Schema.Types.ObjectId,
      ref: "WeeklyPlan",
      default: null,
    },
    goalId: { type: Schema.Types.ObjectId, ref: "Goal", default: null },
  },
  { timestamps: true }
);

TodoSchema.index({ status: 1, order: 1 });
TodoSchema.index({ userId: 1, status: 1, order: 1 });

export const Todo: Model<ITodo> =
  (models.Todo as Model<ITodo>) || model<ITodo>("Todo", TodoSchema);
