const ERROR_MESSAGE: Record<string, string> = {
  denied: "GitHub 로그인이 취소되었습니다.",
  state: "로그인 요청이 만료되었거나 올바르지 않습니다. 다시 시도해 주세요.",
  oauth: "GitHub 인증에 실패했습니다. 잠시 후 다시 시도해 주세요.",
  config: "서버에 GitHub OAuth 설정이 없습니다. 관리자에게 문의하세요.",
};

export default function LoginPage({
  searchParams,
}: {
  searchParams: { error?: string };
}) {
  const error = searchParams.error
    ? ERROR_MESSAGE[searchParams.error] ?? ERROR_MESSAGE.oauth
    : null;

  return (
    <div className="flex min-h-[70vh] items-center justify-center">
      <div className="card w-full max-w-sm space-y-5 p-6 text-center">
        <div>
          <h1 className="text-2xl font-bold text-indigo-600">플래너</h1>
          <p className="mt-1 text-sm text-slate-500">
            할일, 주간 계획, 1년 목표를 하나로 연결해 관리하세요.
          </p>
        </div>
        {error && (
          <p
            role="alert"
            className="rounded-lg border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-700"
          >
            {error}
          </p>
        )}
        {/* Link 가 아닌 a: 라우트 핸들러로 가는 전체 페이지 이동이어야 GitHub 로 리다이렉트된다 */}
        <a
          href="/auth/github"
          className="btn w-full gap-2 bg-slate-900 py-2.5 text-white hover:bg-slate-700"
        >
          <svg aria-hidden viewBox="0 0 16 16" className="h-5 w-5 fill-current">
            <path d="M8 0C3.58 0 0 3.58 0 8c0 3.54 2.29 6.53 5.47 7.59.4.07.55-.17.55-.38 0-.19-.01-.82-.01-1.49-2.01.37-2.53-.49-2.69-.94-.09-.23-.48-.94-.82-1.13-.28-.15-.68-.52-.01-.53.63-.01 1.08.58 1.23.82.72 1.21 1.87.87 2.33.66.07-.52.28-.87.51-1.07-1.78-.2-3.64-.89-3.64-3.95 0-.87.31-1.59.82-2.15-.08-.2-.36-1.02.08-2.12 0 0 .67-.21 2.2.82.64-.18 1.32-.27 2-.27.68 0 1.36.09 2 .27 1.53-1.04 2.2-.82 2.2-.82.44 1.1.16 1.92.08 2.12.51.56.82 1.27.82 2.15 0 3.07-1.87 3.75-3.65 3.95.29.25.54.73.54 1.48 0 1.07-.01 1.93-.01 2.2 0 .21.15.46.55.38A8.013 8.013 0 0016 8c0-4.42-3.58-8-8-8z" />
          </svg>
          GitHub 로 로그인
        </a>
      </div>
    </div>
  );
}
