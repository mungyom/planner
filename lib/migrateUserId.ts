import type { Types } from "mongoose";
import { Goal } from "@/models/Goal";
import { Session } from "@/models/Session";
import { Todo } from "@/models/Todo";
import { User } from "@/models/User";
import { WeeklyPlan } from "@/models/WeeklyPlan";

// 로그인 도입 전 스키마의 "주당 계획 1개" 인덱스. 사용자가 여럿이면 같은 주를 막아 버린다
const LEGACY_WEEK_INDEX = "weekStart_1";

export interface MigrationResult {
  todos: number;
  weeklyPlans: number;
  goals: number;
  droppedLegacyIndex: boolean;
}

/**
 * userId 가 없는 기존 문서를 한 사용자에게 할당하고 인덱스를 새 스키마에 맞춘다.
 * 이미 할당된 문서는 건드리지 않으므로 여러 번 실행해도 안전하다.
 */
export async function migrateUserId(userId: Types.ObjectId): Promise<MigrationResult> {
  const orphan = { $or: [{ userId: { $exists: false } }, { userId: null }] };
  const assign = { $set: { userId } };
  const [todos, weeklyPlans, goals] = await Promise.all([
    Todo.updateMany(orphan, assign),
    WeeklyPlan.updateMany(orphan, assign),
    Goal.updateMany(orphan, assign),
  ]);

  // 컬렉션이 아직 없으면 indexes() 가 실패한다: 지울 인덱스도 없다는 뜻
  const indexes = await WeeklyPlan.collection.indexes().catch(() => []);
  const droppedLegacyIndex = indexes.some((index) => index.name === LEGACY_WEEK_INDEX);
  if (droppedLegacyIndex) await WeeklyPlan.collection.dropIndex(LEGACY_WEEK_INDEX);

  await Promise.all(
    [Todo, WeeklyPlan, Goal, User, Session].map((model) => model.createIndexes())
  );

  return {
    todos: todos.modifiedCount,
    weeklyPlans: weeklyPlans.modifiedCount,
    goals: goals.modifiedCount,
    droppedLegacyIndex,
  };
}
