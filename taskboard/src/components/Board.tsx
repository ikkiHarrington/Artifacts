"use client";

import { useTasks } from "@/hooks/useTasks";
import { filterByStatus } from "@/lib/taskReducer";
import { STATUSES } from "@/types/task";
import { Column } from "./Column";
import { TaskForm } from "./TaskForm";

export function Board() {
  const { tasks, addTask, moveTask } = useTasks();

  return (
    <div className="mx-auto flex w-full max-w-6xl flex-col gap-6 p-6">
      <h1 className="text-2xl font-bold">TaskBoard</h1>
      <TaskForm onAdd={addTask} />
      <div className="grid gap-4 md:grid-cols-3">
        {STATUSES.map((status) => (
          <Column key={status} status={status} tasks={filterByStatus(tasks, status)} onDropTask={moveTask} />
        ))}
      </div>
    </div>
  );
}
