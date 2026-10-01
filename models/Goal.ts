import { Model, Schema, Types, model, models } from "mongoose";

export interface IGoal {
  userId: Types.ObjectId;
  title: string;
  description: string;
  progress: number;
  createdAt: Date;
  updatedAt: Date;
}

const GoalSchema = new Schema<IGoal>(
  {
    userId: { type: Schema.Types.ObjectId, ref: "User", required: true, index: true },
    title: { type: String, required: true, trim: true, maxlength: 200 },
    description: { type: String, default: "" },
    // 저장값이 아니라 응답 시 연결된 todo 완료율로 계산된다 (lib/goalProgress.ts)
    progress: { type: Number, default: 0, min: 0, max: 100 },
  },
  { timestamps: true }
);

export const Goal: Model<IGoal> =
  (models.Goal as Model<IGoal>) || model<IGoal>("Goal", GoalSchema);
