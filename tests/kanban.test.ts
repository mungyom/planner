import { describe, expect, it } from "vitest";
import { computeMove, sortColumn } from "@/lib/kanban";
import type { Priority, Todo, TodoStatus } from "@/types";

function todo(
  _id: string,
  status: TodoStatus,
  order: string,
  priority: Priority = "medium"
): Todo {
  return { _id, title: _id, status, order, priority, createdAt: "", updatedAt: "" };
}

const ids = (todos: Todo[]) => todos.map((t) => t._id);

/** 이동을 적용한 뒤의 컬럼 표시 순서 */
function after(todos: Todo[], activeId: string, overId: string) {
  const move = computeMove(todos, activeId, overId);
  if (!move) return null;
  const next = todos.map((t) => (t._id === activeId ? { ...t, ...move } : t));
  return { move, column: ids(sortColumn(next, move.status)) };
}

describe("sortColumn", () => {
  it("order 를 코드 포인트 순으로 정렬 (대문자 키가 소문자보다 앞)", () => {
    const todos = [todo("b", "todo", "a1"), todo("c", "todo", "a0V"), todo("a", "todo", "Zz")];
    expect(ids(sortColumn(todos, "todo"))).toEqual(["a", "c", "b"]);
  });

  it("High 우선순위를 상단에 고정", () => {
    const todos = [
      todo("m1", "todo", "a0"),
      todo("h1", "todo", "a3", "high"),
      todo("l1", "todo", "a1", "low"),
      todo("h0", "todo", "a2", "high"),
      todo("other", "done", "a0", "high"),
    ];
    expect(ids(sortColumn(todos, "todo"))).toEqual(["h0", "h1", "m1", "l1"]);
  });
});

describe("computeMove", () => {
  const board = [
    todo("a", "todo", "a0"),
    todo("b", "todo", "a1"),
    todo("c", "todo", "a2"),
    todo("x", "doing", "a0"),
    todo("y", "doing", "a1"),
  ];

  it("같은 컬럼에서 아래로 이동", () => {
    const result = after(board, "a", "c");
    expect(result?.column).toEqual(["b", "c", "a"]);
    expect(result?.move.status).toBe("todo");
  });

  it("같은 컬럼에서 위로 이동: 이웃 두 카드 사이의 키", () => {
    const result = after(board, "c", "b");
    expect(result?.column).toEqual(["a", "c", "b"]);
    expect(result!.move.order > "a0" && result!.move.order < "a1").toBe(true);
  });

  it("다른 컬럼의 카드 위에 놓으면 그 카드 앞에 삽입", () => {
    const result = after(board, "a", "y");
    expect(result?.move.status).toBe("doing");
    expect(result?.column).toEqual(["x", "a", "y"]);
  });

  it("컬럼 자체에 놓으면 맨 끝에 추가", () => {
    expect(after(board, "a", "doing")?.column).toEqual(["x", "y", "a"]);
  });

  it("빈 컬럼으로 이동", () => {
    const result = after(board, "a", "done");
    expect(result?.move.status).toBe("done");
    expect(result?.column).toEqual(["a"]);
  });

  it("위치가 그대로면 null (불필요한 PATCH 방지)", () => {
    expect(computeMove(board, "a", "a")).toBeNull();
    expect(computeMove(board, "c", "todo")).toBeNull();
    expect(computeMove(board, "a", "missing")).toBeNull();
    expect(computeMove(board, "missing", "a")).toBeNull();
  });

  it("다른 카드의 order 는 바뀌지 않는다 (카드 1건만 변경)", () => {
    const move = computeMove(board, "a", "y");
    expect(move).toEqual({ status: "doing", order: expect.any(String) });
    expect(Object.keys(move!)).toEqual(["status", "order"]);
  });

  it("High 고정 그룹이 섞여 있어도 같은 그룹의 이웃 사이 키를 만든다", () => {
    const mixed = [
      todo("h", "todo", "a5", "high"),
      todo("m1", "todo", "a1"),
      todo("m2", "todo", "a2"),
      todo("n", "doing", "a0"),
    ];
    // 일반 카드를 High 카드 위에 놓아도 High 아래 그룹의 맨 앞으로 간다
    const result = after(mixed, "n", "h");
    expect(result?.column).toEqual(["h", "n", "m1", "m2"]);
    expect(result!.move.order < "a1").toBe(true);
  });
});
