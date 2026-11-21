import { DEFAULT_PRIORITY, isTaskPriority, type Task, type TaskPriority, type TaskStatus } from "@/types/task";

export type TaskAction =
  | { type: "add"; task: Task }
  | { type: "move"; id: string; status: TaskStatus };

export interface TaskExtras {
  assignee?: string;
  priority?: TaskPriority;
  dueDate?: string;
}

const DATE_PATTERN = /^\d{4}-\d{2}-\d{2}$/;

export function createTask(title: string, description: string, id: string, extras: TaskExtras = {}): Task | null {
  const trimmed = title.trim();
  if (!trimmed) return null;
  const dueDate = extras.dueDate?.trim() ?? "";
  return {
    id,
    title: trimmed,
    description: description.trim(),
    status: "todo",
    assignee: extras.assignee?.trim() ?? "",
    priority: isTaskPriority(extras.priority) ? extras.priority : DEFAULT_PRIORITY,
    dueDate: DATE_PATTERN.test(dueDate) ? dueDate : "",
  };
}

function toDateString(date: Date): string {
  const mm = String(date.getMonth() + 1).padStart(2, "0");
  const dd = String(date.getDate()).padStart(2, "0");
  return `${date.getFullYear()}-${mm}-${dd}`;
}

/** 期限が今日より前で、かつ完了していないタスクか。YYYY-MM-DD は文字列比較で日付順になる。 */
export function isOverdue(task: Task, today: Date = new Date()): boolean {
  return task.status !== "done" && task.dueDate !== "" && task.dueDate < toDateString(today);
}

export function taskReducer(tasks: Task[], action: TaskAction): Task[] {
  switch (action.type) {
    case "add":
      return [...tasks, action.task];
    case "move": {
      const target = tasks.find((t) => t.id === action.id);
      if (!target || target.status === action.status) return tasks;
      return tasks.map((t) => (t.id === action.id ? { ...t, status: action.status } : t));
    }
  }
}

export function filterByStatus(tasks: Task[], status: TaskStatus): Task[] {
  return tasks.filter((t) => t.status === status);
}

export interface TaskFilter {
  /** タイトルと説明を対象にした部分一致検索 */
  query: string;
  /** 担当者の完全一致。空文字は絞り込みなし */
  assignee: string;
  /** 優先度の完全一致。空文字は絞り込みなし */
  priority: TaskPriority | "";
}

export const EMPTY_FILTER: TaskFilter = { query: "", assignee: "", priority: "" };

export function filterTasks(tasks: Task[], filter: TaskFilter): Task[] {
  const query = filter.query.trim().toLowerCase();
  if (!query && !filter.assignee && !filter.priority) return tasks;
  return tasks.filter(
    (t) =>
      (!query || t.title.toLowerCase().includes(query) || t.description.toLowerCase().includes(query)) &&
      (!filter.assignee || t.assignee === filter.assignee) &&
      (!filter.priority || t.priority === filter.priority),
  );
}

/** 絞り込み用の担当者一覧(重複と未設定を除き、コードユニット順で安定して並べる) */
export function listAssignees(tasks: Task[]): string[] {
  return [...new Set(tasks.map((t) => t.assignee).filter(Boolean))].sort();
}
