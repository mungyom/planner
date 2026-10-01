"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState } from "react";
import Badge from "@/components/shared/Badge";
import Modal from "@/components/shared/Modal";
import PageState from "@/components/shared/PageState";
import NoteField from "@/components/weekly/NoteField";
import WeekGrid from "@/components/weekly/WeekGrid";
import WeeklyGoalList from "@/components/weekly/WeeklyGoalList";
import WeeklyPlanForm from "@/components/weekly/WeeklyPlanForm";
import WeeklyProgress from "@/components/weekly/WeeklyProgress";
import { errorMessage } from "@/lib/fetcher";
import { useInitialData } from "@/lib/useInitialData";
import { formatWeekRange } from "@/lib/utils";
import { useStore } from "@/store";

export default function WeeklyDetailPage({ params }: { params: { id: string } }) {
  const router = useRouter();
  const { loaded, error } = useInitialData();
  const plan = useStore((s) => s.weeklyPlans.find((p) => p._id === params.id));
  const goal = useStore((s) => s.goals.find((g) => g._id === plan?.goalId));
  const updateWeeklyPlan = useStore((s) => s.updateWeeklyPlan);
  const deleteWeeklyPlan = useStore((s) => s.deleteWeeklyPlan);
  const [editing, setEditing] = useState(false);

  if (!plan) {
    return (
      <div className="mx-auto max-w-5xl">
        <PageState loaded={loaded} error={error} />
        {loaded && !error && (
          <p className="card text-sm text-slate-500">
            주간 계획을 찾을 수 없습니다.{" "}
            <Link href="/weekly" className="text-indigo-600 hover:underline">
              목록으로
            </Link>
          </p>
        )}
      </div>
    );
  }

  const handleDelete = async () => {
    if (!window.confirm("이 주간 계획을 삭제할까요? 연결된 할일은 남습니다.")) return;
    try {
      await deleteWeeklyPlan(plan._id);
      router.push("/weekly");
    } catch (err) {
      window.alert(errorMessage(err));
    }
  };

  return (
    <div className="mx-auto max-w-6xl space-y-4">
      <PageState loaded={loaded} error={error} />

      <div className="flex flex-wrap items-center gap-2">
        <Link href="/weekly" className="text-sm text-slate-500 hover:underline">
          ← 목록
        </Link>
        <h2 className="text-lg font-semibold">{formatWeekRange(plan.weekStart)}</h2>
        {goal && <Badge className="bg-indigo-50 text-indigo-700">{goal.title}</Badge>}
        <div className="ml-auto flex gap-2">
          <button type="button" className="btn-ghost" onClick={() => setEditing(true)}>
            수정
          </button>
          <button type="button" className="btn-danger" onClick={handleDelete}>
            삭제
          </button>
        </div>
      </div>

      <div className="grid gap-4 md:grid-cols-2">
        <section className="card">
          <h3 className="mb-2 text-sm font-semibold text-slate-700">주간 목표</h3>
          <WeeklyGoalList plan={plan} />
        </section>
        <section className="card">
          <h3 className="mb-3 text-sm font-semibold text-slate-700">주간 진행률</h3>
          <WeeklyProgress plan={plan} />
        </section>
      </div>

      <section className="card">
        <h3 className="mb-3 text-sm font-semibold text-slate-700">요일별 할일</h3>
        <WeekGrid plan={plan} />
      </section>

      {/* key: 수정 폼에서 메모가 바뀌면 입력 중이던 로컬 상태를 새 값으로 다시 시작 */}
      <div className="grid gap-4 md:grid-cols-2">
        <NoteField
          key={`memo-${plan.memo}`}
          id="weekly-memo"
          label="주간 메모"
          placeholder="이번 주에 기억해 둘 것들"
          value={plan.memo}
          onSave={(memo) => updateWeeklyPlan(plan._id, { memo })}
        />
        <NoteField
          key={`retro-${plan.retrospective}`}
          id="weekly-retrospective"
          label="주간 회고"
          placeholder="잘한 점, 아쉬운 점, 다음 주에 바꿀 점"
          value={plan.retrospective}
          onSave={(retrospective) => updateWeeklyPlan(plan._id, { retrospective })}
        />
      </div>

      {editing && (
        <Modal title="주간 계획 수정" onClose={() => setEditing(false)}>
          <WeeklyPlanForm plan={plan} onDone={() => setEditing(false)} />
        </Modal>
      )}
    </div>
  );
}
