"use client";

import { useSortable } from "@dnd-kit/sortable";
import { CSS } from "@dnd-kit/utilities";
import Badge from "@/components/shared/Badge";
import PriorityBadge from "@/components/shared/PriorityBadge";
import { effectiveGoalId, isOverdue, toDateKey } from "@/lib/utils";
import { useStore } from "@/store";
import type { Todo } from "@/types";

/** 카드의 시각 요소. DragOverlay 에서도 그대로 재사용한다 */
export function TodoCardBody({ todo }: { todo: Todo }) {
  const plans = useStore((s) => s.weeklyPlans);
  const goals = useStore((s) => s.goals);
  const goalId = effectiveGoalId(todo, plans);
  const goal = goals.find((g) => g._id === goalId);
  const overdue = isOverdue(todo.dueDate, todo.status);

  return (
    <div className="rounded-lg border border-slate-200 bg-white p-3 shadow-sm">
      <p
        className={`break-words text-sm font-medium ${
          todo.status === "done" ? "text-slate-400 line-through" : ""
        }`}
      >
        {todo.title}
      </p>
      <div className="mt-2 flex flex-wrap items-center gap-1.5">
        <PriorityBadge priority={todo.priority} />
        {goal && <Badge className="bg-indigo-50 text-indigo-700">{goal.title}</Badge>}
        {todo.dueDate && (
          <span
            className={`text-xs ${
              overdue ? "font-semibold text-red-600" : "text-slate-500"
            }`}
          >
            ~{toDateKey(todo.dueDate)}
            {overdue && " (지남)"}
          </span>
        )}
      </div>
    </div>
  );
}

interface Props {
  todo: Todo;
  onOpen: () => void;
}

export default function TodoCard({ todo, onOpen }: Props) {
  const { attributes, listeners, setNodeRef, transform, transition, isDragging } =
    useSortable({ id: todo._id });

  return (
    <div
      ref={setNodeRef}
      style={{ transform: CSS.Transform.toString(transform), transition }}
      className={`cursor-grab rounded-lg focus:outline-none focus-visible:ring-2 focus-visible:ring-indigo-400 ${
        isDragging ? "opacity-40" : ""
      }`}
      // 센서의 활성화 조건(이동 거리/지연)에 못 미친 입력은 클릭으로 처리된다
      onClick={onOpen}
      {...attributes}
      {...listeners}
    >
      <TodoCardBody todo={todo} />
    </div>
  );
}
