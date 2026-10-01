import { api, errorMessage } from "@/lib/fetcher";
import type { Goal, GoalInput } from "@/types";
import type { Slice } from "./index";

export interface GoalSlice {
  goals: Goal[];
  goalsLoaded: boolean;
  goalError: string | null;
  fetchGoals: () => Promise<void>;
  addGoal: (input: GoalInput) => Promise<void>;
  updateGoal: (id: string, input: GoalInput) => Promise<void>;
  deleteGoal: (id: string) => Promise<void>;
}

export const createGoalSlice: Slice<GoalSlice> = (set) => ({
  goals: [],
  goalsLoaded: false,
  goalError: null,

  fetchGoals: async () => {
    try {
      const goals = await api<Goal[]>("/api/goals");
      set({ goals, goalsLoaded: true, goalError: null }, false, "goals/fetch");
    } catch (error) {
      set({ goalsLoaded: true, goalError: errorMessage(error) }, false, "goals/fetchFailed");
    }
  },

  addGoal: async (input) => {
    const goal = await api<Goal>("/api/goals", "POST", input);
    set((s) => ({ goals: [goal, ...s.goals] }), false, "goals/add");
  },

  updateGoal: async (id, input) => {
    const goal = await api<Goal>(`/api/goals/${id}`, "PUT", input);
    set(
      (s) => ({ goals: s.goals.map((g) => (g._id === id ? goal : g)) }),
      false,
      "goals/update"
    );
  },

  deleteGoal: async (id) => {
    await api(`/api/goals/${id}`, "DELETE");
    // 서버가 끊은 연결을 스토어에도 반영
    set(
      (s) => ({
        goals: s.goals.filter((g) => g._id !== id),
        todos: s.todos.map((t) => (t.goalId === id ? { ...t, goalId: null } : t)),
        weeklyPlans: s.weeklyPlans.map((p) =>
          p.goalId === id ? { ...p, goalId: null } : p
        ),
      }),
      false,
      "goals/delete"
    );
  },
});
