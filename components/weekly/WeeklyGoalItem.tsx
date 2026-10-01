"use client";

import type { WeeklyGoal } from "@/types";

interface Props {
  goal: WeeklyGoal;
  onToggle: () => void;
}

export default function WeeklyGoalItem({ goal, onToggle }: Props) {
  return (
    <li>
      <label className="flex cursor-pointer items-start gap-2 rounded-lg px-2 py-1.5 hover:bg-slate-50">
        <input
          type="checkbox"
          className="mt-0.5 h-4 w-4 accent-indigo-600"
          checked={goal.done}
          onChange={onToggle}
        />
        <span
          className={`break-words text-sm ${
            goal.done ? "text-slate-400 line-through" : ""
          }`}
        >
          {goal.text}
        </span>
      </label>
    </li>
  );
}
