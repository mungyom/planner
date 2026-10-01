"use client";

import { useState } from "react";
import { errorMessage } from "@/lib/fetcher";

interface Props {
  id: string;
  label: string;
  placeholder: string;
  value: string;
  onSave: (value: string) => Promise<void>;
}

/** 메모/회고처럼 상세 화면에서 바로 고쳐 쓰는 긴 글 필드 */
export default function NoteField({ id, label, placeholder, value, onSave }: Props) {
  const [text, setText] = useState(value);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const save = async () => {
    setSaving(true);
    setError(null);
    try {
      await onSave(text);
    } catch (err) {
      setError(errorMessage(err));
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="card">
      <label className="label" htmlFor={id}>
        {label}
      </label>
      <textarea
        id={id}
        className="input"
        rows={4}
        value={text}
        placeholder={placeholder}
        onChange={(e) => setText(e.target.value)}
      />
      <div className="mt-2 flex items-center justify-end gap-3">
        {error && (
          <span role="alert" className="text-sm text-red-600">
            {error}
          </span>
        )}
        <button
          type="button"
          className="btn-primary"
          disabled={saving || text === value}
          onClick={save}
        >
          {saving ? "저장 중…" : "저장"}
        </button>
      </div>
    </div>
  );
}
