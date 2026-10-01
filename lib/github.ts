import type { NextRequest } from "next/server";

export interface GitHubProfile {
  id: number;
  login: string;
  avatar_url: string;
}

/** 시크릿은 환경 변수에서만 읽는다. 하나라도 없으면 null */
export function githubConfig(): { clientId: string; clientSecret: string } | null {
  const clientId = process.env.GITHUB_CLIENT_ID;
  const clientSecret = process.env.GITHUB_CLIENT_SECRET;
  return clientId && clientSecret ? { clientId, clientSecret } : null;
}

/** GitHub OAuth App 에 등록한 콜백 URL 과 정확히 같아야 한다 */
export function callbackUrl(req: NextRequest): string {
  const base = process.env.APP_URL || req.nextUrl.origin;
  return new URL("/auth/github/callback", base).toString();
}

export async function exchangeCode(
  code: string,
  redirectUri: string
): Promise<string> {
  const config = githubConfig();
  if (!config) throw new Error("GitHub OAuth 환경 변수가 없습니다.");

  const res = await fetch("https://github.com/login/oauth/access_token", {
    method: "POST",
    headers: { Accept: "application/json", "Content-Type": "application/json" },
    body: JSON.stringify({
      client_id: config.clientId,
      client_secret: config.clientSecret,
      code,
      redirect_uri: redirectUri,
    }),
  });
  // GitHub 은 잘못된 code 에도 200 과 { error } 를 돌려준다
  const data = await res.json().catch(() => null);
  if (!res.ok || !data?.access_token) {
    throw new Error(`GitHub 토큰 교환 실패: ${data?.error ?? res.status}`);
  }
  return data.access_token;
}

export async function fetchProfile(accessToken: string): Promise<GitHubProfile> {
  const res = await fetch("https://api.github.com/user", {
    headers: {
      Authorization: `Bearer ${accessToken}`,
      Accept: "application/vnd.github+json",
      "User-Agent": "planner-app",
    },
  });
  const data = await res.json().catch(() => null);
  if (!res.ok || typeof data?.id !== "number" || typeof data?.login !== "string") {
    throw new Error(`GitHub 사용자 조회 실패: ${res.status}`);
  }
  return { id: data.id, login: data.login, avatar_url: data.avatar_url ?? "" };
}
