import { NextRequest, NextResponse } from "next/server";
import { SESSION_COOKIE } from "@/lib/authConstants";

/**
 * 1차 관문: 세션 쿠키가 없으면 막는다. Edge 런타임이라 DB 를 볼 수 없으므로
 * 세션이 실제로 유효한지는 각 API 가 requireUserId 로 다시 확인한다.
 */
export function middleware(req: NextRequest) {
  if (req.cookies.get(SESSION_COOKIE)?.value) return NextResponse.next();

  if (req.nextUrl.pathname.startsWith("/api/")) {
    return NextResponse.json({ error: "로그인이 필요합니다." }, { status: 401 });
  }
  return NextResponse.redirect(new URL("/login", req.url));
}

export const config = {
  // 로그인 화면, OAuth 경로, 정적 파일은 로그인 없이 연다
  matcher: ["/((?!login(?:$|/)|auth/|_next/|favicon.ico).*)"],
};
