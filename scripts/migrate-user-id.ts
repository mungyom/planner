// 사용법: npm run migrate:user-id -- <GitHub username>
// 로그인 도입 전에 만든 할일/주간 계획/목표를 그 사용자에게 넘긴다.
// 대상 사용자는 먼저 한 번 GitHub 로 로그인해 users 컬렉션에 있어야 한다.
import mongoose from "mongoose";
import { migrateUserId } from "@/lib/migrateUserId";
import { dbConnect } from "@/lib/mongodb";
import { User } from "@/models/User";

async function main() {
  const username = process.argv[2];
  if (!username) {
    throw new Error("사용법: npm run migrate:user-id -- <GitHub username>");
  }

  try {
    process.loadEnvFile(".env");
  } catch {
    // .env 가 없으면 이미 설정된 환경 변수를 쓴다
  }

  await dbConnect();
  // GitHub 아이디는 대소문자를 구분하지 않는다
  const user = await User.findOne({ username })
    .collation({ locale: "en", strength: 2 })
    .lean();
  if (!user) {
    throw new Error(
      `GitHub 사용자 "${username}" 를 찾을 수 없습니다. 먼저 앱에서 한 번 로그인하세요.`
    );
  }

  const result = await migrateUserId(user._id);
  console.log(`"${username}" 에게 할당: 할일 ${result.todos}건, 주간 계획 ${result.weeklyPlans}건, 목표 ${result.goals}건`);
  console.log(
    result.droppedLegacyIndex
      ? "weeklyplans 의 weekStart 단일 unique 인덱스를 { userId, weekStart } 로 교체했습니다."
      : "교체할 기존 인덱스가 없습니다."
  );
}

main()
  .catch((error) => {
    console.error(error instanceof Error ? error.message : error);
    process.exitCode = 1;
  })
  .finally(() => mongoose.disconnect());
