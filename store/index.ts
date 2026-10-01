import { StateCreator, create } from "zustand";
import { devtools } from "zustand/middleware";
import { GoalSlice, createGoalSlice } from "./goalSlice";
import { TodoSlice, createTodoSlice } from "./todoSlice";
import { WeeklySlice, createWeeklySlice } from "./weeklySlice";

export type Store = TodoSlice & WeeklySlice & GoalSlice;

export type Slice<T> = StateCreator<Store, [["zustand/devtools", never]], [], T>;

export const useStore = create<Store>()(
  devtools(
    (...args) => ({
      ...createTodoSlice(...args),
      ...createWeeklySlice(...args),
      ...createGoalSlice(...args),
    }),
    { name: "planner-store" }
  )
);
