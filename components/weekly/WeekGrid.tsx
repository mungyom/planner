"use client";

import { useState } from "react";
import TodoModal from "@/components/todos/TodoModal";
import { errorMessage } from "@/lib/fetcher";
import { WEEK_DAYS } from "@/lib/utils";
import { useStore } from "@/store";
import type { Todo, TodoInput, WeeklyPlan } from "@/types";

type ModalState = { todo: Todo } | { defaults: TodoInput } | null;

function TodoChip({
  todo,
  selected,
  onClick,
}: {
  todo: Todo;
  selected?: boolean;
  onClick: () => void;
}) {
  return (
    <button
      type="button"
      onClick={(e) => {
        e.stopPropagation(); // 셀 클릭(배치/생성)으로 번지지 않게
        onClick();
      }}
      aria-pressed={selected}
      className={`w-full break-words rounded-md border px-2 py-1 text-left text-xs ${
        selected
          ? "border-indigo-500 bg-indigo-50 text-indigo-700"
          : "border-slate-200 bg-white hover:border-indigo-300"
      } ${todo.status === "done" ? "text-slate-400 line-through" : ""}`}
    >
      {todo.title}
    </button>
  );
}

export default function WeekGrid({ plan }: { plan: WeeklyPlan }) {
  const todos = useStore((s) => s.todos);
  const updateTodo = useStore((s) => s.updateTodo);
  const [modal, setModal] = useState<ModalState>(null);
  // 미배치 목록에서 고른 할일. 이 상태에서 요일 셀을 누르면 그 요일로 배치된다
  const [placingId, setPlacingId] = useState<string | null>(null);

  const planTodos = todos.filter((t) => t.weeklyPlanId === plan._id);
  const unplaced = planTodos.filter((t) => t.dayOfWeek == null);

  const handleCellClick = async (dayOfWeek: number) => {
    if (!placingId) {
      setModal({ defaults: { weeklyPlanId: plan._id, dayOfWeek } });
      return;
    }
    try {
      await updateTodo(placingId, { dayOfWeek });
      setPlacingId(null);
    } catch (err) {
      window.alert(errorMessage(err));
    }
  };

  const weekStart = new Date(plan.weekStart);

  return (
    <div className="space-y-3">
      <div className="rounded-lg border border-dashed border-slate-300 p-3">
        <div className="mb-2 flex items-center justify-between">
          <h3 className="text-sm font-medium text-slate-700">
            미배치 할일 ({unplaced.length})
          </h3>
          <button
            type="button"
            className="text-sm text-indigo-600 hover:underline"
            onClick={() => setModal({ defaults: { weeklyPlanId: plan._id } })}
          >
            + 할일 추가
          </button>
        </div>
        {unplaced.length === 0 ? (
          <p className="text-xs text-slate-400">
            요일 칸을 눌러 그 요일의 할일을 바로 만들 수 있습니다.
          </p>
        ) : (
          <>
            <p className="mb-2 text-xs text-slate-500">
              {placingId
                ? "배치할 요일 칸을 누르세요."
                : "할일을 고른 뒤 요일 칸을 누르면 배치됩니다."}
            </p>
            <div className="grid gap-1.5 sm:grid-cols-3 lg:grid-cols-4">
              {unplaced.map((todo) => (
                <TodoChip
                  key={todo._id}
                  todo={todo}
                  selected={placingId === todo._id}
                  onClick={() =>
                    setPlacingId(placingId === todo._id ? null : todo._id)
                  }
                />
              ))}
            </div>
          </>
        )}
      </div>

      <div className="grid grid-cols-2 gap-2 sm:grid-cols-4 lg:grid-cols-7">
        {WEEK_DAYS.map((day, index) => {
          const date = new Date(weekStart);
          date.setUTCDate(date.getUTCDate() + index);
          const dayTodos = planTodos.filter((t) => t.dayOfWeek === day.value);
          const action = placingId ? "배치" : "할일 추가";

          return (
            <div
              key={day.value}
              onClick={() => handleCellClick(day.value)}
              className={`min-h-28 cursor-pointer rounded-lg border p-2 transition-colors ${
                placingId
                  ? "border-indigo-300 bg-indigo-50/50 hover:bg-indigo-100"
                  : "border-slate-200 bg-slate-50 hover:border-indigo-300"
              }`}
            >
              {/* 셀 전체가 클릭 영역이지만 키보드 사용자를 위해 같은 동작의 버튼을 둔다 */}
              <button
                type="button"
                aria-label={`${day.label}요일에 ${action}`}
                className="mb-2 flex w-full items-baseline justify-between text-left"
              >
                <span className="text-sm font-semibold">{day.label}</span>
                <span className="text-xs text-slate-400">
                  {date.getUTCMonth() + 1}/{date.getUTCDate()}
                </span>
              </button>
              <div className="space-y-1">
                {dayTodos.map((todo) => (
                  <TodoChip
                    key={todo._id}
                    todo={todo}
                    onClick={() => setModal({ todo })}
                  />
                ))}
              </div>
            </div>
          );
        })}
      </div>

      {modal && (
        <TodoModal
          todo={"todo" in modal ? modal.todo : undefined}
          defaults={"defaults" in modal ? modal.defaults : undefined}
          onClose={() => setModal(null)}
        />
      )}
    </div>
  );
}
