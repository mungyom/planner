import mongoose from "mongoose";

interface MongooseCache {
  conn: typeof mongoose | null;
  promise: Promise<typeof mongoose> | null;
}

// Next.js HMR 이 모듈을 다시 평가해도 연결이 누적되지 않도록 global 에 캐싱
const globalWithMongoose = globalThis as typeof globalThis & {
  _mongoose?: MongooseCache;
};
const cached: MongooseCache = (globalWithMongoose._mongoose ??= {
  conn: null,
  promise: null,
});

export async function dbConnect(): Promise<typeof mongoose> {
  if (cached.conn) return cached.conn;

  const uri = process.env.MONGODB_URI;
  if (!uri) throw new Error("MONGODB_URI 환경 변수가 설정되지 않았습니다.");

  cached.promise ??= mongoose.connect(uri, {
    bufferCommands: false,
    serverSelectionTimeoutMS: 5000,
  });
  try {
    cached.conn = await cached.promise;
  } catch (error) {
    cached.promise = null;
    throw error;
  }
  return cached.conn;
}
