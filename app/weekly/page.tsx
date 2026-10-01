"use client";

import { useState } from "react";
import Modal from "@/components/shared/Modal";
import PageState from "@/components/shared/PageState";
import WeeklyPlanCard from "@/components/weekly/WeeklyPlanCard";
import WeeklyPlanForm from "@/components/weekly/WeeklyPlanForm";
import { useInitialData } from "@/lib/useInitialData";
import { getWeekStart, toDateKey } from "@/lib/utils";
import { useStore } from "@/store";

const RECENT_WEEKS = 4;

export default function WeeklyPage() {
  const { loaded, error } = useInitialData();
  // 스토어는 weekStart 내림차순을 유지한다
  const recent = useStore((s) => s.weeklyPlans).slice(0, RECENT_WEEKS);
  const [creating, setCreating] = useState(false);
  const currentWeek = toDateKey(getWeekStart());

  return (
    <div className="mx-auto max-w-5xl">
      <div className="mb-4 flex items-center justify-between">
        <p className="text-sm text-slate-500">최근 {RECENT_WEEKS}주의 주간 계획입니다.</p>
        <button type="button" className="btn-primary" onClick={() => setCreating(true)}>
          + 새 주간 계획
        </button>
      </div>

      <PageState loaded={loaded} error={error} />

      {loaded && recent.length === 0 && (
        <p className="card text-center text-sm text-slate-500">
          아직 주간 계획이 없습니다. 이번 주 계획부터 세워 보세요.
        </p>
      )}
      <div className="grid gap-4 sm:grid-cols-2">
        {recent.map((plan) => (
          <WeeklyPlanCard
            key={plan._id}
            plan={plan}
            isCurrent={toDateKey(plan.weekStart) === currentWeek}
          />
        ))}
      </div>

      {creating && (
        <Modal title="새 주간 계획" onClose={() => setCreating(false)}>
          <WeeklyPlanForm onDone={() => setCreating(false)} />
        </Modal>
      )}
    </div>
  );
}
