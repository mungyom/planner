import { Model, Schema, model, models } from "mongoose";

export interface IUser {
  githubId: number;
  username: string;
  avatarUrl: string;
  createdAt: Date;
  updatedAt: Date;
}

const UserSchema = new Schema<IUser>(
  {
    // username 은 GitHub 에서 바꿀 수 있으므로 식별은 숫자 id 로 한다
    githubId: { type: Number, required: true, unique: true },
    username: { type: String, required: true },
    avatarUrl: { type: String, default: "" },
  },
  { timestamps: true }
);

export const User: Model<IUser> =
  (models.User as Model<IUser>) || model<IUser>("User", UserSchema);
