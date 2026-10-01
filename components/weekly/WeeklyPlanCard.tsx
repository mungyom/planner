"use client";

import Link from "next/link";
import Badge from "@/components/shared/Badge";
import { formatWeekRange } from "@/lib/utils";
import { useStore } from "@/store";
import type { WeeklyPlan } from "@/types";
import WeeklyProgress from "./WeeklyProgress";

interface Props {
  plan: WeeklyPlan;
  isCurrent: boolean;
}

export default function WeeklyPlanCard({ plan, isCurrent }: Props) {
  const goal = useStore((s) => s.goals.find((g) => g._id === plan.goalId));

  return (
    <Link
      href={`/weekly/${plan._id}`}
      className="card block transition-shadow hover:shadow-md"
    >
      <div className="mb-3 flex flex-wrap items-center gap-2">
        <h3 className="font-semibold">{formatWeekRange(plan.weekStart)}</h3>
        {isCurrent && <Badge className="bg-indigo-600 text-white">이번 주</Badge>}
        {goal && <Badge className="bg-indigo-50 text-indigo-700">{goal.title}</Badge>}
      </div>
      <WeeklyProgress plan={plan} />
    </Link>
  );
}
