"use client";

import { useCallback, useState, useSyncExternalStore } from "react";
import { createTask, type TaskExtras } from "@/lib/taskReducer";
import { createTaskStore } from "@/lib/taskStorage";
import type { TaskStatus } from "@/types/task";

export function useTasks() {
  // ストアはコンポーネントごとに1つ。テストでの再マウント時に状態が漏れないようモジュールスコープには置かない。
  const [store] = useState(createTaskStore);
  const tasks = useSyncExternalStore(store.subscribe, store.getSnapshot, store.getServerSnapshot);

  const addTask = useCallback(
    (title: string, description: string, extras?: TaskExtras): boolean => {
      const task = createTask(title, description, crypto.randomUUID(), extras);
      if (!task) return false;
      store.dispatch({ type: "add", task });
      return true;
    },
    [store],
  );

  const moveTask = useCallback(
    (id: string, status: TaskStatus) => {
      store.dispatch({ type: "move", id, status });
    },
    [store],
  );

  return { tasks, addTask, moveTask };
}
