"use client";

import {
  CollisionDetection,
  DndContext,
  DragEndEvent,
  DragOverlay,
  KeyboardSensor,
  MouseSensor,
  TouchSensor,
  closestCorners,
  pointerWithin,
  useSensor,
  useSensors,
} from "@dnd-kit/core";
import { sortableKeyboardCoordinates } from "@dnd-kit/sortable";
import { useState } from "react";
import { STATUSES, computeMove, isStatus, sortColumn } from "@/lib/kanban";
import { useStore } from "@/store";
import type { Todo, TodoStatus } from "@/types";
import KanbanColumn from "./KanbanColumn";
import { TodoCardBody } from "./TodoCard";
import TodoModal from "./TodoModal";

// 카드는 컬럼 드롭 영역 안에 있으므로 포인터가 둘 다에 걸린다. 카드를 우선한다.
const detectCollision: CollisionDetection = (args) => {
  const hits = pointerWithin(args);
  if (hits.length === 0) return closestCorners(args); // 키보드 조작에는 포인터가 없다
  return [hits.find((hit) => !isStatus(hit.id)) ?? hits[0]];
};

type ModalState = { todo: Todo } | { status: TodoStatus } | null;

export default function KanbanBoard() {
  const todos = useStore((s) => s.todos);
  const moveTodo = useStore((s) => s.moveTodo);
  const [activeId, setActiveId] = useState<string | null>(null);
  const [modal, setModal] = useState<ModalState>(null);

  const sensors = useSensors(
    useSensor(MouseSensor, { activationConstraint: { distance: 5 } }),
    // 터치는 길게 눌러야 드래그: 짧은 스와이프는 스크롤로 남긴다
    useSensor(TouchSensor, { activationConstraint: { delay: 200, tolerance: 5 } }),
    useSensor(KeyboardSensor, { coordinateGetter: sortableKeyboardCoordinates })
  );

  const handleDragEnd = ({ active, over }: DragEndEvent) => {
    setActiveId(null);
    if (!over) return;
    const move = computeMove(todos, String(active.id), String(over.id));
    if (move) moveTodo(String(active.id), move.status, move.order);
  };

  const activeTodo = todos.find((t) => t._id === activeId);

  return (
    <>
      <DndContext
        sensors={sensors}
        collisionDetection={detectCollision}
        onDragStart={({ active }) => setActiveId(String(active.id))}
        onDragEnd={handleDragEnd}
        onDragCancel={() => setActiveId(null)}
      >
        <div className="grid gap-4 md:grid-cols-3">
          {STATUSES.map((status) => (
            <KanbanColumn
              key={status}
              status={status}
              todos={sortColumn(todos, status)}
              onOpen={(todo) => setModal({ todo })}
              onAdd={() => setModal({ status })}
            />
          ))}
        </div>
        <DragOverlay>
          {activeTodo && (
            <div className="rotate-2 cursor-grabbing">
              <TodoCardBody todo={activeTodo} />
            </div>
          )}
        </DragOverlay>
      </DndContext>

      {modal && (
        <TodoModal
          todo={"todo" in modal ? modal.todo : undefined}
          defaults={"status" in modal ? { status: modal.status } : undefined}
          onClose={() => setModal(null)}
        />
      )}
    </>
  );
}
