"use client";

import { useState, type DragEvent } from "react";
import { STATUS_LABELS, type Task, type TaskStatus } from "@/types/task";
import { DRAG_MIME, TaskCard } from "./TaskCard";

interface ColumnProps {
  status: TaskStatus;
  tasks: Task[];
  onDropTask: (id: string, status: TaskStatus) => void;
}

export function Column({ status, tasks, onDropTask }: ColumnProps) {
  const [isOver, setIsOver] = useState(false);

  const handleDrop = (e: DragEvent<HTMLElement>) => {
    e.preventDefault();
    setIsOver(false);
    const id = e.dataTransfer.getData(DRAG_MIME);
    if (id) onDropTask(id, status);
  };

  return (
    <section
      aria-label={STATUS_LABELS[status]}
      onDragOver={(e) => {
        e.preventDefault();
        setIsOver(true);
      }}
      onDragLeave={() => setIsOver(false)}
      onDrop={handleDrop}
      className={`flex min-h-64 flex-col gap-3 rounded-lg p-3 transition-colors ${isOver ? "bg-blue-100" : "bg-zinc-100"}`}
    >
      <h2 className="flex items-center justify-between text-sm font-bold text-zinc-700">
        {STATUS_LABELS[status]}
        <span className="rounded-full bg-zinc-200 px-2 text-xs">{tasks.length}</span>
      </h2>
      {tasks.map((task) => (
        <TaskCard key={task.id} task={task} />
      ))}
    </section>
  );
}
