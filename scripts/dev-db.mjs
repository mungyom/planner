// MongoDB 를 따로 설치하지 않고 개발할 때 쓰는 로컬 DB.
// .data/db 에 데이터를 보존하므로 재시작해도 내용이 유지된다.
import { mkdirSync } from "node:fs";
import { MongoMemoryServer } from "mongodb-memory-server";

const dbPath = ".data/db";
mkdirSync(dbPath, { recursive: true });

const mongod = await MongoMemoryServer.create({
  instance: { port: 27017, dbPath, storageEngine: "wiredTiger" },
});
console.log(`MongoDB 실행 중: ${mongod.getUri()} (데이터: ${dbPath}) — 종료하려면 Ctrl+C`);

for (const signal of ["SIGINT", "SIGTERM"]) {
  process.on(signal, async () => {
    // doCleanup: false — 데이터 디렉터리를 지우지 않는다
    await mongod.stop({ doCleanup: false });
    process.exit(0);
  });
}
