"use client";

import { useDroppable } from "@dnd-kit/core";
import { SortableContext, verticalListSortingStrategy } from "@dnd-kit/sortable";
import { STATUS_LABEL } from "@/lib/utils";
import type { Todo, TodoStatus } from "@/types";
import TodoCard from "./TodoCard";

interface Props {
  status: TodoStatus;
  /** 표시 순서대로 정렬된 이 컬럼의 할일 */
  todos: Todo[];
  onOpen: (todo: Todo) => void;
  onAdd: () => void;
}

export default function KanbanColumn({ status, todos, onOpen, onAdd }: Props) {
  const { setNodeRef, isOver } = useDroppable({ id: status });

  return (
    <section
      aria-label={STATUS_LABEL[status]}
      className={`flex min-w-0 flex-col rounded-xl border p-3 transition-colors ${
        isOver ? "border-indigo-300 bg-indigo-50" : "border-slate-200 bg-slate-100"
      }`}
    >
      <div className="mb-3 flex items-center justify-between">
        <h2 className="text-sm font-semibold text-slate-700">
          {STATUS_LABEL[status]}
          <span className="ml-2 rounded-full bg-white px-2 py-0.5 text-xs text-slate-500">
            {todos.length}
          </span>
        </h2>
        <button
          type="button"
          onClick={onAdd}
          aria-label={`${STATUS_LABEL[status]}에 할일 추가`}
          className="rounded px-2 text-lg leading-none text-slate-500 hover:bg-white"
        >
          +
        </button>
      </div>

      <SortableContext
        items={todos.map((t) => t._id)}
        strategy={verticalListSortingStrategy}
      >
        <div ref={setNodeRef} className="flex min-h-24 flex-1 flex-col gap-2">
          {todos.map((todo) => (
            <TodoCard key={todo._id} todo={todo} onOpen={() => onOpen(todo)} />
          ))}
          {todos.length === 0 && (
            <p className="py-6 text-center text-xs text-slate-400">
              여기로 카드를 끌어다 놓으세요
            </p>
          )}
        </div>
      </SortableContext>
    </section>
  );
}
