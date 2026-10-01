"use client";

import { FormEvent, useState } from "react";
import { errorMessage } from "./fetcher";

/** 폼 제출의 저장 중/에러 상태를 관리한다. 성공하면 onDone 호출 */
export function useSubmit(action: () => Promise<unknown>, onDone: () => void) {
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const onSubmit = async (e: FormEvent) => {
    e.preventDefault();
    setSaving(true);
    setError(null);
    try {
      await action();
      onDone();
    } catch (err) {
      setError(errorMessage(err));
      setSaving(false);
    }
  };

  return { saving, error, onSubmit };
}
