"use client";

import { useState, type FormEvent } from "react";
import type { TaskExtras } from "@/lib/taskReducer";
import { DEFAULT_PRIORITY, isTaskPriority, PRIORITIES, PRIORITY_LABELS, type TaskPriority } from "@/types/task";

interface TaskFormProps {
  onAdd: (title: string, description: string, extras: TaskExtras) => boolean;
}

const fieldClass = "rounded border border-zinc-300 px-3 py-2 text-sm";

export function TaskForm({ onAdd }: TaskFormProps) {
  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [assignee, setAssignee] = useState("");
  const [priority, setPriority] = useState<TaskPriority>(DEFAULT_PRIORITY);
  const [dueDate, setDueDate] = useState("");

  const handleSubmit = (e: FormEvent) => {
    e.preventDefault();
    if (onAdd(title, description, { assignee, priority, dueDate })) {
      setTitle("");
      setDescription("");
      setAssignee("");
      setPriority(DEFAULT_PRIORITY);
      setDueDate("");
    }
  };

  return (
    <form onSubmit={handleSubmit} className="flex flex-col gap-2 rounded-lg border border-zinc-200 bg-white p-4 shadow-sm">
      <div className="flex flex-col gap-2 sm:flex-row sm:items-start">
        <input
          aria-label="タイトル"
          placeholder="タイトル"
          value={title}
          onChange={(e) => setTitle(e.target.value)}
          className={`${fieldClass} sm:w-56`}
        />
        <input
          aria-label="説明"
          placeholder="説明"
          value={description}
          onChange={(e) => setDescription(e.target.value)}
          className={`${fieldClass} flex-1`}
        />
      </div>
      <div className="flex flex-col gap-2 sm:flex-row sm:items-start">
        <input
          aria-label="担当者"
          placeholder="担当者"
          value={assignee}
          onChange={(e) => setAssignee(e.target.value)}
          className={`${fieldClass} sm:w-40`}
        />
        <select
          aria-label="優先度"
          value={priority}
          onChange={(e) => {
            if (isTaskPriority(e.target.value)) setPriority(e.target.value);
          }}
          className={fieldClass}
        >
          {PRIORITIES.map((p) => (
            <option key={p} value={p}>
              {PRIORITY_LABELS[p]}
            </option>
          ))}
        </select>
        <input
          type="date"
          aria-label="期限"
          value={dueDate}
          onChange={(e) => setDueDate(e.target.value)}
          className={fieldClass}
        />
        <button
          type="submit"
          disabled={!title.trim()}
          className="rounded bg-blue-600 px-4 py-2 text-sm font-medium text-white hover:bg-blue-700 disabled:opacity-40 sm:ml-auto"
        >
          追加
        </button>
      </div>
    </form>
  );
}
