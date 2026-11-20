import type { Task, TaskStatus } from "@/types/task";

export type TaskAction =
  | { type: "add"; task: Task }
  | { type: "move"; id: string; status: TaskStatus };

export function createTask(title: string, description: string, id: string): Task | null {
  const trimmed = title.trim();
  if (!trimmed) return null;
  return { id, title: trimmed, description: description.trim(), status: "todo" };
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
