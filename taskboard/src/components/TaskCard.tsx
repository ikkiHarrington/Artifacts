import type { DragEvent } from "react";
import { isOverdue } from "@/lib/taskReducer";
import { PRIORITY_LABELS, type Task, type TaskPriority } from "@/types/task";

export const DRAG_MIME = "text/plain";

const PRIORITY_STYLES: Record<TaskPriority, string> = {
  low: "bg-zinc-100 text-zinc-700",
  medium: "bg-amber-100 text-amber-800",
  high: "bg-red-100 text-red-700",
};

export function TaskCard({ task }: { task: Task }) {
  const overdue = isOverdue(task);

  const handleDragStart = (e: DragEvent<HTMLElement>) => {
    e.dataTransfer.setData(DRAG_MIME, task.id);
    e.dataTransfer.effectAllowed = "move";
  };

  return (
    <article
      draggable
      onDragStart={handleDragStart}
      data-testid={`task-${task.id}`}
      className="cursor-grab rounded-md border border-zinc-200 bg-white p-3 shadow-sm active:cursor-grabbing"
    >
      <h3 className="text-sm font-semibold">{task.title}</h3>
      {task.description && <p className="mt-1 whitespace-pre-wrap text-xs text-zinc-600">{task.description}</p>}
      <div className="mt-2 flex flex-wrap items-center gap-1.5 text-xs">
        <span className={`rounded px-1.5 py-0.5 ${PRIORITY_STYLES[task.priority]}`}>優先度: {PRIORITY_LABELS[task.priority]}</span>
        {task.assignee && <span className="text-zinc-600">担当: {task.assignee}</span>}
        {task.dueDate && (
          <span
            data-overdue={overdue}
            className={overdue ? "font-semibold text-red-600" : "text-zinc-600"}
          >
            期限: {task.dueDate}
          </span>
        )}
      </div>
    </article>
  );
}
