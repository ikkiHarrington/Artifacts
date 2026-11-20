import type { DragEvent } from "react";
import type { Task } from "@/types/task";

export const DRAG_MIME = "text/plain";

export function TaskCard({ task }: { task: Task }) {
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
    </article>
  );
}
