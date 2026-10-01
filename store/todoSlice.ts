import { api, errorMessage } from "@/lib/fetcher";
import type { Todo, TodoInput, TodoStatus } from "@/types";
import type { Slice } from "./index";

export interface TodoSlice {
  todos: Todo[];
  todosLoaded: boolean;
  todoError: string | null;
  fetchTodos: () => Promise<void>;
  addTodo: (input: TodoInput) => Promise<void>;
  updateTodo: (id: string, input: TodoInput) => Promise<void>;
  deleteTodo: (id: string) => Promise<void>;
  moveTodo: (id: string, status: TodoStatus, order: string) => Promise<void>;
}

const replaceTodo = (todos: Todo[], todo: Todo) =>
  todos.map((t) => (t._id === todo._id ? todo : t));

export const createTodoSlice: Slice<TodoSlice> = (set, get) => ({
  todos: [],
  todosLoaded: false,
  todoError: null,

  fetchTodos: async () => {
    try {
      const todos = await api<Todo[]>("/api/todos");
      set({ todos, todosLoaded: true, todoError: null }, false, "todos/fetch");
    } catch (error) {
      set({ todosLoaded: true, todoError: errorMessage(error) }, false, "todos/fetchFailed");
    }
  },

  addTodo: async (input) => {
    const todo = await api<Todo>("/api/todos", "POST", input);
    set((s) => ({ todos: [...s.todos, todo] }), false, "todos/add");
  },

  updateTodo: async (id, input) => {
    const todo = await api<Todo>(`/api/todos/${id}`, "PUT", input);
    set((s) => ({ todos: replaceTodo(s.todos, todo) }), false, "todos/update");
  },

  deleteTodo: async (id) => {
    await api(`/api/todos/${id}`, "DELETE");
    set((s) => ({ todos: s.todos.filter((t) => t._id !== id) }), false, "todos/delete");
  },

  // 칸반 이동: 카드 1건만 PATCH 하고, 실패하면 이전 위치로 되돌린다
  moveTodo: async (id, status, order) => {
    const previous = get().todos.find((t) => t._id === id);
    if (!previous) return;

    set(
      (s) => ({
        todos: replaceTodo(s.todos, { ...previous, status, order }),
        todoError: null,
      }),
      false,
      "todos/move"
    );

    try {
      const todo = await api<Todo>(`/api/todos/${id}`, "PATCH", { status, order });
      if (todo.order !== order) {
        // 서버가 컬럼을 재정규화했으므로 다른 카드의 키도 바뀌었다
        await get().fetchTodos();
      }
    } catch (error) {
      set(
        (s) => {
          // 그사이 같은 카드를 다시 옮겼다면 그 이동을 덮어쓰지 않는다
          const current = s.todos.find((t) => t._id === id);
          const stillOurs = current?.status === status && current.order === order;
          return {
            todos: stillOurs ? replaceTodo(s.todos, previous) : s.todos,
            todoError: errorMessage(error),
          };
        },
        false,
        "todos/moveRollback"
      );
    }
  },
});
