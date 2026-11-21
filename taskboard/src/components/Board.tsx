"use client";

import { useMemo, useState } from "react";
import { useTasks } from "@/hooks/useTasks";
import { EMPTY_FILTER, filterByStatus, filterTasks, listAssignees, type TaskFilter } from "@/lib/taskReducer";
import { STATUSES } from "@/types/task";
import { Column } from "./Column";
import { TaskFilters } from "./TaskFilters";
import { TaskForm } from "./TaskForm";

export function Board() {
  const { tasks, addTask, moveTask } = useTasks();
  const [filter, setFilter] = useState<TaskFilter>(EMPTY_FILTER);

  const assignees = useMemo(() => listAssignees(tasks), [tasks]);
  const visibleTasks = useMemo(() => filterTasks(tasks, filter), [tasks, filter]);

  return (
    <div className="mx-auto flex w-full max-w-6xl flex-col gap-6 p-6">
      <h1 className="text-2xl font-bold">TaskBoard</h1>
      <TaskForm onAdd={addTask} />
      <TaskFilters filter={filter} assignees={assignees} onChange={setFilter} />
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
        {STATUSES.map((status) => (
          <Column key={status} status={status} tasks={filterByStatus(visibleTasks, status)} onDropTask={moveTask} />
        ))}
      </div>
    </div>
  );
}
