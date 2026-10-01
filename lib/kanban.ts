import type { Todo, TodoStatus } from "@/types";
import { compareKeys, keyBetween } from "./fractionalIndex";

export const STATUSES: TodoStatus[] = ["todo", "doing", "done"];

export function isStatus(value: unknown): value is TodoStatus {
  return STATUSES.includes(value as TodoStatus);
}

const isPinned = (todo: Todo) => todo.priority === "high";

/** 컬럼 표시 순서: High 우선순위를 상단에 고정하고, 그 안에서는 order 사전순 */
export function sortColumn(todos: Todo[], status: TodoStatus): Todo[] {
  return todos
    .filter((t) => t.status === status)
    .sort(
      (a, b) =>
        Number(isPinned(b)) - Number(isPinned(a)) ||
        compareKeys(a.order, b.order)
    );
}

/**
 * 드래그 결과를 카드 1건의 { status, order } 변경으로 환산한다.
 * overId 는 카드 id 또는 컬럼 id(status). 변화가 없으면 null.
 */
export function computeMove(
  todos: Todo[],
  activeId: string,
  overId: string
): { status: TodoStatus; order: string } | null {
  const active = todos.find((t) => t._id === activeId);
  if (!active || activeId === overId) return null;

  const overTodo = todos.find((t) => t._id === overId);
  const status = overTodo?.status ?? (isStatus(overId) ? overId : null);
  if (!status) return null;

  const column = sortColumn(todos, status);
  const rest = column.filter((t) => t._id !== activeId);
  // 같은 컬럼이면 arrayMove 와 동일하게 over 카드의 자리를 차지하고, 컬럼에 놓으면 맨 끝
  const index = overTodo
    ? column.findIndex((t) => t._id === overId)
    : rest.length;

  // High 고정 그룹의 경계를 넘으면 order 가 단조롭지 않으므로 같은 그룹의 이웃만 본다
  const sameGroup = (t: Todo) => isPinned(t) === isPinned(active);
  const before = rest.slice(0, index).filter(sameGroup);
  const prev = before[before.length - 1];
  const next = rest.slice(index).find(sameGroup);

  if (active.status === status) {
    const group = column.filter(sameGroup);
    const at = group.findIndex((t) => t._id === activeId);
    if (group[at - 1]?._id === prev?._id && group[at + 1]?._id === next?._id) {
      return null;
    }
  }

  try {
    return { status, order: keyBetween(prev?.order, next?.order) };
  } catch {
    // 이웃의 order 가 중복된 비정상 데이터: 이동을 포기한다
    return null;
  }
}
