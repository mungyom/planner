import { NextRequest, NextResponse } from "next/server";
import { HttpError, handle } from "@/lib/api";
import { getSessionUser } from "@/lib/auth";

export const dynamic = "force-dynamic";

export function GET(req: NextRequest) {
  return handle(async () => {
    const user = await getSessionUser(req);
    if (!user) throw new HttpError(401, "로그인이 필요합니다.");
    return NextResponse.json({ username: user.username, avatarUrl: user.avatarUrl });
  });
}
