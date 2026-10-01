import { Model, Schema, Types, model, models } from "mongoose";

export interface ISession {
  tokenHash: string;
  userId: Types.ObjectId;
  expiresAt: Date;
  createdAt: Date;
  updatedAt: Date;
}

const SessionSchema = new Schema<ISession>(
  {
    // 쿠키의 원문 토큰은 저장하지 않는다. DB 가 유출돼도 세션을 탈취할 수 없게 해시만 둔다
    tokenHash: { type: String, required: true, unique: true },
    userId: { type: Schema.Types.ObjectId, ref: "User", required: true, index: true },
    // TTL 인덱스: 만료된 세션은 MongoDB 가 자동으로 지운다 (삭제는 지연될 수 있어 조회 시에도 확인)
    expiresAt: { type: Date, required: true, expires: 0 },
  },
  { timestamps: true }
);

export const Session: Model<ISession> =
  (models.Session as Model<ISession>) || model<ISession>("Session", SessionSchema);
