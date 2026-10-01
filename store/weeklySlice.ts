import { api, errorMessage } from "@/lib/fetcher";
import type { WeeklyPlan, WeeklyPlanInput } from "@/types";
import type { Slice } from "./index";

export interface WeeklySlice {
  weeklyPlans: WeeklyPlan[];
  weeklyLoaded: boolean;
  weeklyError: string | null;
  fetchWeeklyPlans: () => Promise<void>;
  addWeeklyPlan: (input: WeeklyPlanInput) => Promise<WeeklyPlan>;
  updateWeeklyPlan: (id: string, input: WeeklyPlanInput) => Promise<void>;
  deleteWeeklyPlan: (id: string) => Promise<void>;
  toggleGoal: (id: string, goalIndex: number) => Promise<void>;
}

const replacePlan = (plans: WeeklyPlan[], plan: WeeklyPlan) =>
  plans.map((p) => (p._id === plan._id ? plan : p));

export const createWeeklySlice: Slice<WeeklySlice> = (set, get) => ({
  weeklyPlans: [],
  weeklyLoaded: false,
  weeklyError: null,

  fetchWeeklyPlans: async () => {
    try {
      const weeklyPlans = await api<WeeklyPlan[]>("/api/weekly");
      set({ weeklyPlans, weeklyLoaded: true, weeklyError: null }, false, "weekly/fetch");
    } catch (error) {
      set(
        { weeklyLoaded: true, weeklyError: errorMessage(error) },
        false,
        "weekly/fetchFailed"
      );
    }
  },

  addWeeklyPlan: async (input) => {
    const plan = await api<WeeklyPlan>("/api/weekly", "POST", input);
    set(
      (s) => ({
        weeklyPlans: [...s.weeklyPlans, plan].sort((a, b) =>
          b.weekStart.localeCompare(a.weekStart)
        ),
      }),
      false,
      "weekly/add"
    );
    return plan;
  },

  updateWeeklyPlan: async (id, input) => {
    const plan = await api<WeeklyPlan>(`/api/weekly/${id}`, "PUT", input);
    set((s) => ({ weeklyPlans: replacePlan(s.weeklyPlans, plan) }), false, "weekly/update");
  },

  deleteWeeklyPlan: async (id) => {
    await api(`/api/weekly/${id}`, "DELETE");
    set(
      (s) => ({
        weeklyPlans: s.weeklyPlans.filter((p) => p._id !== id),
        todos: s.todos.map((t) =>
          t.weeklyPlanId === id ? { ...t, weeklyPlanId: null, dayOfWeek: null } : t
        ),
      }),
      false,
      "weekly/delete"
    );
  },

  toggleGoal: async (id, goalIndex) => {
    const previous = get().weeklyPlans.find((p) => p._id === id);
    const target = previous?.goals[goalIndex];
    if (!previous || !target) return;

    const done = !target.done;
    const optimistic: WeeklyPlan = {
      ...previous,
      goals: previous.goals.map((g, i) => (i === goalIndex ? { ...g, done } : g)),
    };
    set(
      (s) => ({ weeklyPlans: replacePlan(s.weeklyPlans, optimistic), weeklyError: null }),
      false,
      "weekly/toggleGoal"
    );

    try {
      const plan = await api<WeeklyPlan>(`/api/weekly/${id}`, "PATCH", { goalIndex, done });
      set((s) => ({ weeklyPlans: replacePlan(s.weeklyPlans, plan) }), false, "weekly/toggleGoalDone");
    } catch (error) {
      set(
        (s) => ({
          weeklyPlans: replacePlan(s.weeklyPlans, previous),
          weeklyError: errorMessage(error),
        }),
        false,
        "weekly/toggleGoalRollback"
      );
    }
  },
});
