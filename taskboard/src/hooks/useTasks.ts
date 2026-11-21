"use client";

import { useCallback, useReducer } from "react";
import { createTask, taskReducer, type TaskExtras } from "@/lib/taskReducer";
import type { Task, TaskStatus } from "@/types/task";

export function useTasks(initial: Task[] = []) {
  const [tasks, dispatch] = useReducer(taskReducer, initial);

  const addTask = useCallback((title: string, description: string, extras?: TaskExtras): boolean => {
    const task = createTask(title, description, crypto.randomUUID(), extras);
    if (!task) return false;
    dispatch({ type: "add", task });
    return true;
  }, []);

  const moveTask = useCallback((id: string, status: TaskStatus) => {
    dispatch({ type: "move", id, status });
  }, []);

  return { tasks, addTask, moveTask };
}
