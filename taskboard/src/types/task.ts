export const STATUSES = ["todo", "in-progress", "done"] as const;

export type TaskStatus = (typeof STATUSES)[number];

export const STATUS_LABELS: Record<TaskStatus, string> = {
  todo: "未着手",
  "in-progress": "進行中",
  done: "完了",
};

export const PRIORITIES = ["low", "medium", "high"] as const;

export type TaskPriority = (typeof PRIORITIES)[number];

export const PRIORITY_LABELS: Record<TaskPriority, string> = {
  low: "低",
  medium: "中",
  high: "高",
};

export const DEFAULT_PRIORITY: TaskPriority = "medium";

export interface Task {
  id: string;
  title: string;
  description: string;
  status: TaskStatus;
  /** 担当者名。未設定は空文字 */
  assignee: string;
  priority: TaskPriority;
  /** 期限(YYYY-MM-DD)。未設定は空文字 */
  dueDate: string;
}

export function isTaskPriority(value: unknown): value is TaskPriority {
  return typeof value === "string" && (PRIORITIES as readonly string[]).includes(value);
}

export function isTaskStatus(value: unknown): value is TaskStatus {
  return typeof value === "string" && (STATUSES as readonly string[]).includes(value);
}
