import { NextRequest, NextResponse } from "next/server";
import { startSession } from "@/lib/auth";
import { OAUTH_STATE_COOKIE } from "@/lib/authConstants";
import { callbackUrl, exchangeCode, fetchProfile } from "@/lib/github";
import { dbConnect } from "@/lib/mongodb";
import { User } from "@/models/User";

export const dynamic = "force-dynamic";

function fail(req: NextRequest, error: string) {
  const res = NextResponse.redirect(new URL(`/login?error=${error}`, req.url));
  res.cookies.delete(OAUTH_STATE_COOKIE);
  return res;
}

export async function GET(req: NextRequest) {
  const params = req.nextUrl.searchParams;
  // 사용자가 GitHub 화면에서 승인을 거부한 경우
  if (params.get("error")) return fail(req, "denied");

  const code = params.get("code");
  const state = params.get("state");
  const expected = req.cookies.get(OAUTH_STATE_COOKIE)?.value;
  if (!code || !state || !expected || state !== expected) return fail(req, "state");

  try {
    const accessToken = await exchangeCode(code, callbackUrl(req));
    const profile = await fetchProfile(accessToken);

    await dbConnect();
    const upsertUser = () =>
      User.findOneAndUpdate(
        { githubId: profile.id },
        { $set: { username: profile.login, avatarUrl: profile.avatar_url } },
        { upsert: true, returnDocument: "after", runValidators: true }
      );
    // 같은 계정의 첫 로그인이 동시에 오면 한쪽 upsert 가 unique 충돌한다: 이미 생긴 문서를 갱신하면 된다
    const user = await upsertUser().catch((error) => {
      if ((error as { code?: number }).code === 11000) return upsertUser();
      throw error;
    });
    if (!user) throw new Error("사용자를 저장하지 못했습니다.");

    const res = NextResponse.redirect(new URL("/", req.url));
    res.cookies.delete(OAUTH_STATE_COOKIE);
    await startSession(res, user._id);
    return res;
  } catch (error) {
    console.error(error);
    return fail(req, "oauth");
  }
}
