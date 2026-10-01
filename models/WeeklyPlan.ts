import { Model, Schema, Types, model, models } from "mongoose";

export const MAX_WEEKLY_GOALS = 5;

export interface IWeeklyGoal {
  text: string;
  done: boolean;
}

export interface IWeeklyPlan {
  userId: Types.ObjectId;
  weekStart: Date;
  goals: IWeeklyGoal[];
  memo: string;
  retrospective: string;
  goalId?: Types.ObjectId | null;
  createdAt: Date;
  updatedAt: Date;
}

const WeeklyGoalSchema = new Schema<IWeeklyGoal>({
  text: { type: String, required: true, trim: true, maxlength: 200 },
  done: { type: Boolean, default: false },
});

const WeeklyPlanSchema = new Schema<IWeeklyPlan>(
  {
    userId: { type: Schema.Types.ObjectId, ref: "User", required: true },
    weekStart: { type: Date, required: true },
    goals: {
      type: [WeeklyGoalSchema],
      default: [],
      validate: {
        validator: (goals: IWeeklyGoal[]) => goals.length <= MAX_WEEKLY_GOALS,
        message: `주간 목표는 최대 ${MAX_WEEKLY_GOALS}개까지 가능합니다.`,
      },
    },
    memo: { type: String, default: "" },
    retrospective: { type: String, default: "" },
    goalId: { type: Schema.Types.ObjectId, ref: "Goal", default: null },
  },
  { timestamps: true }
);

// 같은 주의 계획은 사용자당 하나 (예전 weekStart 단일 unique 인덱스는 마이그레이션이 교체)
WeeklyPlanSchema.index({ userId: 1, weekStart: 1 }, { unique: true });

export const WeeklyPlan: Model<IWeeklyPlan> =
  (models.WeeklyPlan as Model<IWeeklyPlan>) ||
  model<IWeeklyPlan>("WeeklyPlan", WeeklyPlanSchema);
