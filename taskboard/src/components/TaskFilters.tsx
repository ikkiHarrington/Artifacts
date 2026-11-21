"use client";

import { EMPTY_FILTER, type TaskFilter } from "@/lib/taskReducer";
import { isTaskPriority, PRIORITIES, PRIORITY_LABELS } from "@/types/task";

interface TaskFiltersProps {
  filter: TaskFilter;
  assignees: string[];
  onChange: (filter: TaskFilter) => void;
}

const fieldClass = "rounded border border-zinc-300 bg-white px-3 py-2 text-sm";

export function TaskFilters({ filter, assignees, onChange }: TaskFiltersProps) {
  const isActive = filter.query !== "" || filter.assignee !== "" || filter.priority !== "";

  return (
    <div role="search" className="flex flex-col gap-2 sm:flex-row sm:items-center">
      <input
        type="search"
        aria-label="検索"
        placeholder="タイトル・説明を検索"
        value={filter.query}
        onChange={(e) => onChange({ ...filter, query: e.target.value })}
        className={`${fieldClass} flex-1`}
      />
      <select
        aria-label="担当者で絞り込み"
        value={filter.assignee}
        onChange={(e) => onChange({ ...filter, assignee: e.target.value })}
        className={fieldClass}
      >
        <option value="">すべて</option>
        {assignees.map((name) => (
          <option key={name} value={name}>
            {name}
          </option>
        ))}
      </select>
      <select
        aria-label="優先度で絞り込み"
        value={filter.priority}
        onChange={(e) => onChange({ ...filter, priority: isTaskPriority(e.target.value) ? e.target.value : "" })}
        className={fieldClass}
      >
        <option value="">すべて</option>
        {PRIORITIES.map((p) => (
          <option key={p} value={p}>
            {PRIORITY_LABELS[p]}
          </option>
        ))}
      </select>
      {isActive && (
        <button type="button" onClick={() => onChange(EMPTY_FILTER)} className="rounded px-3 py-2 text-sm text-blue-700 hover:bg-blue-50">
          条件をクリア
        </button>
      )}
    </div>
  );
}
