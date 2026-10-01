export type TodoStatus = "todo" | "doing" | "done";
export type Priority = "high" | "medium" | "low";

export interface Goal {
  _id: string;
  title: string;
  description: string;
  progress: number;
  createdAt: string;
  updatedAt: string;
}

export interface WeeklyGoal {
  _id?: string;
  text: string;
  done: boolean;
}

export interface WeeklyPlan {
  _id: string;
  weekStart: string;
  goals: WeeklyGoal[];
  memo: string;
  retrospective: string;
  goalId?: string | null;
  createdAt: string;
  updatedAt: string;
}

export interface Todo {
  _id: string;
  title: string;
  description?: string;
  status: TodoStatus;
  priority: Priority;
  dueDate?: string | null;
  dayOfWeek?: number | null;
  order: string;
  weeklyPlanId?: string | null;
  goalId?: string | null;
  createdAt: string;
  updatedAt: string;
}

export type GoalInput = Pick<Goal, "title" | "description">;

export interface WeeklyPlanInput {
  weekStart?: string;
  goals?: WeeklyGoal[];
  memo?: string;
  retrospective?: string;
  goalId?: string | null;
}

export type TodoInput = Partial<
  Pick<
    Todo,
    | "title"
    | "description"
    | "status"
    | "priority"
    | "dueDate"
    | "dayOfWeek"
    | "weeklyPlanId"
    | "goalId"
  >
>;
