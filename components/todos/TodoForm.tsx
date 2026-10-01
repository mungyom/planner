"use client";

import { useState } from "react";
import FormActions from "@/components/shared/FormActions";
import { PRIORITY_LABEL } from "@/components/shared/PriorityBadge";
import { STATUSES } from "@/lib/kanban";
import { useSubmit } from "@/lib/useSubmit";
import {
  STATUS_LABEL,
  WEEK_DAYS,
  formatWeekRange,
  isPastDate,
  toDateKey,
} from "@/lib/utils";
import { useStore } from "@/store";
import type { Priority, Todo, TodoInput, TodoStatus } from "@/types";

interface Props {
  todo?: Todo;
  /** 새 할일의 초기값 (예: 주간 그리드에서 요일 셀을 눌렀을 때) */
  defaults?: TodoInput;
  onDone: () => void;
}

const PRIORITIES: Priority[] = ["high", "medium", "low"];

export default function TodoForm({ todo, defaults, onDone }: Props) {
  const addTodo = useStore((s) => s.addTodo);
  const updateTodo = useStore((s) => s.updateTodo);
  const plans = useStore((s) => s.weeklyPlans);
  const goals = useStore((s) => s.goals);

  const initial = todo ?? defaults ?? {};
  const [title, setTitle] = useState(initial.title ?? "");
  const [description, setDescription] = useState(initial.description ?? "");
  const [status, setStatus] = useState<TodoStatus>(initial.status ?? "todo");
  const [priority, setPriority] = useState<Priority>(initial.priority ?? "medium");
  const [dueDate, setDueDate] = useState(
    initial.dueDate ? toDateKey(initial.dueDate) : ""
  );
  const [weeklyPlanId, setWeeklyPlanId] = useState(initial.weeklyPlanId ?? "");
  const [goalId, setGoalId] = useState(initial.goalId ?? "");
  const [dayOfWeek, setDayOfWeek] = useState(
    initial.dayOfWeek == null ? "" : String(initial.dayOfWeek)
  );

  const { saving, error, onSubmit } = useSubmit(() => {
    const input: TodoInput = {
      title: title.trim(),
      description,
      status,
      priority,
      dueDate: dueDate || null,
      weeklyPlanId: weeklyPlanId || null,
      goalId: goalId || null,
      // 요일 배치는 주간 계획에 속할 때만 의미가 있다
      dayOfWeek: weeklyPlanId && dayOfWeek !== "" ? Number(dayOfWeek) : null,
    };
    return todo ? updateTodo(todo._id, input) : addTodo(input);
  }, onDone);

  return (
    <form onSubmit={onSubmit} className="space-y-4">
      <div>
        <label className="label" htmlFor="todo-title">
          제목 *
        </label>
        <input
          id="todo-title"
          className="input"
          value={title}
          onChange={(e) => setTitle(e.target.value)}
          maxLength={200}
          required
          autoFocus
        />
      </div>
      <div>
        <label className="label" htmlFor="todo-description">
          설명
        </label>
        <textarea
          id="todo-description"
          className="input"
          rows={3}
          value={description}
          onChange={(e) => setDescription(e.target.value)}
        />
      </div>

      <div className="grid grid-cols-2 gap-3">
        <div>
          <label className="label" htmlFor="todo-status">
            상태
          </label>
          <select
            id="todo-status"
            className="input"
            value={status}
            onChange={(e) => setStatus(e.target.value as TodoStatus)}
          >
            {STATUSES.map((s) => (
              <option key={s} value={s}>
                {STATUS_LABEL[s]}
              </option>
            ))}
          </select>
        </div>
        <div>
          <label className="label" htmlFor="todo-priority">
            우선순위
          </label>
          <select
            id="todo-priority"
            className="input"
            value={priority}
            onChange={(e) => setPriority(e.target.value as Priority)}
          >
            {PRIORITIES.map((p) => (
              <option key={p} value={p}>
                {PRIORITY_LABEL[p]}
              </option>
            ))}
          </select>
        </div>
      </div>

      <div>
        <label className="label" htmlFor="todo-due">
          마감일
        </label>
        <input
          id="todo-due"
          type="date"
          className="input"
          value={dueDate}
          onChange={(e) => setDueDate(e.target.value)}
        />
        {dueDate && isPastDate(dueDate) && (
          <p className="mt-1 text-xs text-amber-600">
            ⚠ 오늘보다 이전 날짜입니다. 그대로 저장할 수 있습니다.
          </p>
        )}
      </div>

      <div className="grid grid-cols-2 gap-3">
        <div>
          <label className="label" htmlFor="todo-plan">
            주간 계획
          </label>
          <select
            id="todo-plan"
            className="input"
            value={weeklyPlanId}
            onChange={(e) => setWeeklyPlanId(e.target.value)}
          >
            <option value="">연결 안 함</option>
            {plans.map((plan) => (
              <option key={plan._id} value={plan._id}>
                {formatWeekRange(plan.weekStart)}
              </option>
            ))}
          </select>
        </div>
        <div>
          <label className="label" htmlFor="todo-day">
            요일
          </label>
          <select
            id="todo-day"
            className="input"
            value={dayOfWeek}
            disabled={!weeklyPlanId}
            onChange={(e) => setDayOfWeek(e.target.value)}
          >
            <option value="">미배치</option>
            {WEEK_DAYS.map((day) => (
              <option key={day.value} value={day.value}>
                {day.label}요일
              </option>
            ))}
          </select>
        </div>
      </div>

      <div>
        <label className="label" htmlFor="todo-goal">
          1년 목표
        </label>
        <select
          id="todo-goal"
          className="input"
          value={goalId}
          onChange={(e) => setGoalId(e.target.value)}
        >
          <option value="">
            {weeklyPlanId ? "주간 계획의 목표를 따름" : "연결 안 함"}
          </option>
          {goals.map((goal) => (
            <option key={goal._id} value={goal._id}>
              {goal.title}
            </option>
          ))}
        </select>
      </div>

      <FormActions error={error} saving={saving} onCancel={onDone} />
    </form>
  );
}
