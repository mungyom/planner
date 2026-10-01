/** JSON API 호출. 2xx 가 아니면 서버의 error 메시지로 throw */
export async function api<T>(
  url: string,
  method: "GET" | "POST" | "PUT" | "PATCH" | "DELETE" = "GET",
  body?: unknown
): Promise<T> {
  const res = await fetch(url, {
    method,
    headers: body === undefined ? undefined : { "Content-Type": "application/json" },
    body: body === undefined ? undefined : JSON.stringify(body),
  });
  const data = await res.json().catch(() => null);
  // 세션이 만료되었거나 로그아웃된 상태: 로그인 화면으로 보낸다
  if (res.status === 401 && typeof window !== "undefined") {
    window.location.assign("/login");
  }
  if (!res.ok) {
    throw new Error(data?.error ?? `요청에 실패했습니다. (${res.status})`);
  }
  return data as T;
}

export function errorMessage(error: unknown): string {
  return error instanceof Error ? error.message : "알 수 없는 오류가 발생했습니다.";
}
