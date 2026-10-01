import { NextRequest, NextResponse } from "next/server";
import { endSession } from "@/lib/auth";
import { dbConnect } from "@/lib/mongodb";

export const dynamic = "force-dynamic";

// GET 이 아닌 POST: 링크 프리페치나 외부 이미지 태그로 로그아웃되지 않게 한다
export async function POST(req: NextRequest) {
  // 다른 사이트의 폼이 사용자를 강제로 로그아웃시키지 못하게 한다
  if (req.headers.get("sec-fetch-site") === "cross-site") {
    return NextResponse.json({ error: "허용되지 않은 요청입니다." }, { status: 403 });
  }
  // 303: 폼 POST 뒤 브라우저가 /login 을 GET 으로 연다
  const res = NextResponse.redirect(new URL("/login", req.url), 303);
  try {
    await dbConnect();
    await endSession(req, res);
  } catch (error) {
    console.error(error);
    return NextResponse.json({ error: "로그아웃에 실패했습니다." }, { status: 500 });
  }
  return res;
}
