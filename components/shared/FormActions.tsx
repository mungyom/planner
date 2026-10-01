interface Props {
  error: string | null;
  saving: boolean;
  onCancel: () => void;
}

/** 폼 하단의 에러 메시지 + 취소/저장 버튼 */
export default function FormActions({ error, saving, onCancel }: Props) {
  return (
    <>
      {error && (
        <p role="alert" className="text-sm text-red-600">
          {error}
        </p>
      )}
      <div className="flex justify-end gap-2 pt-2">
        <button type="button" className="btn-ghost" onClick={onCancel}>
          취소
        </button>
        <button type="submit" className="btn-primary" disabled={saving}>
          {saving ? "저장 중…" : "저장"}
        </button>
      </div>
    </>
  );
}
