"use client";

import { useState } from "react";
import GoalCard from "@/components/goals/GoalCard";
import GoalForm from "@/components/goals/GoalForm";
import Modal from "@/components/shared/Modal";
import PageState from "@/components/shared/PageState";
import { errorMessage } from "@/lib/fetcher";
import { useInitialData } from "@/lib/useInitialData";
import { useStore } from "@/store";
import type { Goal } from "@/types";

export default function GoalsPage() {
  const { loaded, error } = useInitialData();
  const goals = useStore((s) => s.goals);
  const deleteGoal = useStore((s) => s.deleteGoal);
  // "new" 는 생성, Goal 은 수정, null 은 닫힘
  const [editing, setEditing] = useState<Goal | "new" | null>(null);

  const handleDelete = async (goal: Goal) => {
    if (!window.confirm(`"${goal.title}" 목표를 삭제할까요?`)) return;
    try {
      await deleteGoal(goal._id);
    } catch (err) {
      window.alert(errorMessage(err));
    }
  };

  return (
    <div className="mx-auto max-w-5xl">
      <div className="mb-4 flex items-center justify-between">
        <p className="text-sm text-slate-500">1년 동안 이루고 싶은 목표를 관리합니다.</p>
        <button type="button" className="btn-primary" onClick={() => setEditing("new")}>
          + 새 목표
        </button>
      </div>

      <PageState loaded={loaded} error={error} />

      {loaded && goals.length === 0 && (
        <p className="card text-center text-sm text-slate-500">
          아직 목표가 없습니다. 첫 번째 1년 목표를 만들어 보세요.
        </p>
      )}
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
        {goals.map((goal) => (
          <GoalCard
            key={goal._id}
            goal={goal}
            onEdit={() => setEditing(goal)}
            onDelete={() => handleDelete(goal)}
          />
        ))}
      </div>

      {editing && (
        <Modal
          title={editing === "new" ? "새 목표" : "목표 수정"}
          onClose={() => setEditing(null)}
        >
          <GoalForm
            goal={editing === "new" ? undefined : editing}
            onDone={() => setEditing(null)}
          />
        </Modal>
      )}
    </div>
  );
}
