"use client";

import { useState, type FormEvent } from "react";

interface TaskFormProps {
  onAdd: (title: string, description: string) => boolean;
}

export function TaskForm({ onAdd }: TaskFormProps) {
  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");

  const handleSubmit = (e: FormEvent) => {
    e.preventDefault();
    if (onAdd(title, description)) {
      setTitle("");
      setDescription("");
    }
  };

  return (
    <form onSubmit={handleSubmit} className="flex flex-col gap-2 rounded-lg border border-zinc-200 bg-white p-4 shadow-sm sm:flex-row sm:items-start">
      <input
        aria-label="タイトル"
        placeholder="タイトル"
        value={title}
        onChange={(e) => setTitle(e.target.value)}
        className="rounded border border-zinc-300 px-3 py-2 text-sm sm:w-56"
      />
      <input
        aria-label="説明"
        placeholder="説明"
        value={description}
        onChange={(e) => setDescription(e.target.value)}
        className="flex-1 rounded border border-zinc-300 px-3 py-2 text-sm"
      />
      <button
        type="submit"
        disabled={!title.trim()}
        className="rounded bg-blue-600 px-4 py-2 text-sm font-medium text-white hover:bg-blue-700 disabled:opacity-40"
      >
        追加
      </button>
    </form>
  );
}
