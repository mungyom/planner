"use client";

import Modal from "@/components/shared/Modal";
import { errorMessage } from "@/lib/fetcher";
import { useStore } from "@/store";
import type { Todo, TodoInput } from "@/types";
import TodoForm from "./TodoForm";

interface Props {
  /** 있으면 수정, 없으면 생성 */
  todo?: Todo;
  defaults?: TodoInput;
  onClose: () => void;
}

export default function TodoModal({ todo, defaults, onClose }: Props) {
  const deleteTodo = useStore((s) => s.deleteTodo);

  const handleDelete = async () => {
    if (!todo || !window.confirm(`"${todo.title}" 할일을 삭제할까요?`)) return;
    try {
      await deleteTodo(todo._id);
      onClose();
    } catch (err) {
      window.alert(errorMessage(err));
    }
  };

  return (
    <Modal title={todo ? "할일 수정" : "새 할일"} onClose={onClose}>
      <TodoForm todo={todo} defaults={defaults} onDone={onClose} />
      {todo && (
        <button
          type="button"
          className="mt-3 text-sm text-red-600 hover:underline"
          onClick={handleDelete}
        >
          이 할일 삭제
        </button>
      )}
    </Modal>
  );
}
