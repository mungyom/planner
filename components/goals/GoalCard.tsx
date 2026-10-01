"use client";

import type { Goal } from "@/types";
import GoalProgress from "./GoalProgress";

interface Props {
  goal: Goal;
  onEdit: () => void;
  onDelete: () => void;
}

export default function GoalCard({ goal, onEdit, onDelete }: Props) {
  return (
    <article className="card flex flex-col gap-3">
      <div>
        <h3 className="break-words font-semibold">{goal.title}</h3>
        {goal.description && (
          <p className="mt-1 whitespace-pre-wrap break-words text-sm text-slate-600">
            {goal.description}
          </p>
        )}
      </div>
      <GoalProgress goalId={goal._id} />
      <div className="mt-auto flex justify-end gap-2">
        <button type="button" className="btn-ghost" onClick={onEdit}>
          수정
        </button>
        <button type="button" className="btn-danger" onClick={onDelete}>
          삭제
        </button>
      </div>
    </article>
  );
}
