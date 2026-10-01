import mongoose from "mongoose";
import { beforeEach, describe, expect, it } from "vitest";
import { migrateUserId } from "@/lib/migrateUserId";
import { WeeklyPlan } from "@/models/WeeklyPlan";
import { resetDb, signIn, useMemoryDb } from "./helpers";

useMemoryDb();

beforeEach(async () => {
  await resetDb();
  // 이전 테스트가 만든 인덱스를 지워 로그인 도입 전 DB 를 재현한다
  await mongoose.connection.db!.dropDatabase();
});

/** 로그인 도입 전 스키마로 저장된 문서: userId 가 없고 weekStart 가 단독 unique */
async function seedLegacyData() {
  const db = mongoose.connection.db!;
  await db.collection("weeklyplans").createIndex({ weekStart: 1 }, { unique: true });
  await db.collection("goals").insertOne({ title: "옛 목표", description: "" });
  await db.collection("weeklyplans").insertMany([
    { weekStart: new Date("2026-09-21"), goals: [], memo: "", retrospective: "" },
    { weekStart: new Date("2026-09-28"), goals: [], memo: "", retrospective: "" },
  ]);
  await db.collection("todos").insertMany([
    { title: "옛 할일 1", status: "todo", priority: "medium", order: "a0" },
    { title: "옛 할일 2", status: "done", priority: "high", order: "a0" },
  ]);
}

describe("migrateUserId", () => {
  it("userId 없는 문서를 지정 사용자에게 할당하고 weekStart 인덱스를 교체", async () => {
    await seedLegacyData();
    const { user } = await signIn("owner");
    const db = mongoose.connection.db!;

    const result = await migrateUserId(user._id);
    expect(result).toEqual({ todos: 2, weeklyPlans: 2, goals: 1, droppedLegacyIndex: true });

    for (const name of ["todos", "weeklyplans", "goals"]) {
      const missing = await db.collection(name).countDocuments({ userId: { $exists: false } });
      expect(missing, name).toBe(0);
      const owned = await db.collection(name).countDocuments({ userId: user._id });
      expect(owned, name).toBeGreaterThan(0);
    }

    const indexes = await db.collection("weeklyplans").indexes();
    expect(indexes.map((i) => i.name)).not.toContain("weekStart_1");
    expect(indexes.find((i) => i.name === "userId_1_weekStart_1")?.unique).toBe(true);

    // 이제 다른 사용자도 같은 주의 계획을 만들 수 있다
    const { user: other } = await signIn("other");
    await expect(
      WeeklyPlan.create({ userId: other._id, weekStart: new Date("2026-09-28") })
    ).resolves.toBeTruthy();
  });

  it("다시 실행해도 아무것도 바꾸지 않는다 (재실행 안전)", async () => {
    await seedLegacyData();
    const { user } = await signIn("owner");
    await migrateUserId(user._id);

    const { user: someoneElse } = await signIn("someone-else");
    const second = await migrateUserId(someoneElse._id);
    expect(second).toEqual({ todos: 0, weeklyPlans: 0, goals: 0, droppedLegacyIndex: false });

    const db = mongoose.connection.db!;
    expect(await db.collection("todos").countDocuments({ userId: user._id })).toBe(2);
  });

  it("빈 DB 에서도 실패하지 않는다", async () => {
    const { user } = await signIn("owner");
    await expect(migrateUserId(user._id)).resolves.toEqual({
      todos: 0,
      weeklyPlans: 0,
      goals: 0,
      droppedLegacyIndex: false,
    });
  });
});
