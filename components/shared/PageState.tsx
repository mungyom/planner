interface Props {
  loaded: boolean;
  error: string | null;
}

/** 페이지 공통 로딩/에러 표시 */
export default function PageState({ loaded, error }: Props) {
  if (error) {
    return (
      <p
        role="alert"
        className="mb-4 rounded-lg border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-700"
      >
        {error}
      </p>
    );
  }
  if (!loaded) return <p className="mb-4 text-sm text-slate-500">불러오는 중…</p>;
  return null;
}
