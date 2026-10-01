import { NextRequest, NextResponse } from "next/server";
import { OAUTH_STATE_COOKIE_OPTIONS, newToken } from "@/lib/auth";
import { OAUTH_STATE_COOKIE } from "@/lib/authConstants";
import { callbackUrl, githubConfig } from "@/lib/github";

export const dynamic = "force-dynamic";

/** GitHub 인증 화면으로 보낸다. state 는 콜백에서 CSRF 를 막기 위해 쿠키와 대조한다 */
export function GET(req: NextRequest) {
  const config = githubConfig();
  if (!config) {
    console.error("GITHUB_CLIENT_ID / GITHUB_CLIENT_SECRET 환경 변수가 없습니다.");
    return NextResponse.redirect(new URL("/login?error=config", req.url));
  }

  const state = newToken();
  const authorize = new URL("https://github.com/login/oauth/authorize");
  authorize.searchParams.set("client_id", config.clientId);
  authorize.searchParams.set("redirect_uri", callbackUrl(req));
  authorize.searchParams.set("state", state);
  // 공개 프로필(login, avatar_url)만 필요하므로 scope 를 요청하지 않는다

  const res = NextResponse.redirect(authorize);
  res.cookies.set(OAUTH_STATE_COOKIE, state, OAUTH_STATE_COOKIE_OPTIONS);
  return res;
}
