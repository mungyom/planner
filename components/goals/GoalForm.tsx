"use client";

import { useState } from "react";
import FormActions from "@/components/shared/FormActions";
import { useSubmit } from "@/lib/useSubmit";
import { useStore } from "@/store";
import type { Goal } from "@/types";

interface Props {
  goal?: Goal;
  onDone: () => void;
}

export default function GoalForm({ goal, onDone }: Props) {
  const addGoal = useStore((s) => s.addGoal);
  const updateGoal = useStore((s) => s.updateGoal);
  const [title, setTitle] = useState(goal?.title ?? "");
  const [description, setDescription] = useState(goal?.description ?? "");

  const { saving, error, onSubmit } = useSubmit(() => {
    const input = { title: title.trim(), description };
    return goal ? updateGoal(goal._id, input) : addGoal(input);
  }, onDone);

  return (
    <form onSubmit={onSubmit} className="space-y-4">
      <div>
        <label className="label" htmlFor="goal-title">
          제목 *
        </label>
        <input
          id="goal-title"
          className="input"
          value={title}
          onChange={(e) => setTitle(e.target.value)}
          placeholder="예: 백엔드 개발자로 취업하기"
          maxLength={200}
          required
          autoFocus
        />
      </div>
      <div>
        <label className="label" htmlFor="goal-description">
          설명
        </label>
        <textarea
          id="goal-description"
          className="input"
          rows={4}
          value={description}
          onChange={(e) => setDescription(e.target.value)}
          placeholder="왜 이 목표를 이루고 싶은지 적어 보세요."
        />
      </div>
      <FormActions error={error} saving={saving} onCancel={onDone} />
    </form>
  );
}
