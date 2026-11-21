import { createTask, taskReducer, type TaskAction } from "./taskReducer";
import { isTaskPriority, isTaskStatus, type Task } from "@/types/task";

export const STORAGE_KEY = "taskboard:tasks:v1";

const EMPTY: Task[] = [];

type StorageLike = Pick<Storage, "getItem" | "setItem">;

/** localStorage は SSR・プライバシーモード等で使えないことがあるため、取得自体を失敗許容にする */
function defaultGetStorage(): StorageLike | null {
  try {
    return typeof window === "undefined" ? null : window.localStorage;
  } catch {
    return null;
  }
}

export function serializeTasks(tasks: Task[]): string {
  return JSON.stringify(tasks);
}

/** 保存データは信頼できないので、1件ずつ検証して正規化する。壊れた入力は空配列にする。 */
export function parseTasks(raw: string | null): Task[] {
  if (!raw) return [];
  let data: unknown;
  try {
    data = JSON.parse(raw);
  } catch {
    return [];
  }
  if (!Array.isArray(data)) return [];

  const tasks: Task[] = [];
  for (const item of data) {
    if (typeof item !== "object" || item === null) continue;
    const r = item as Record<string, unknown>;
    if (typeof r.id !== "string" || typeof r.title !== "string" || !isTaskStatus(r.status)) continue;
    // createTask に通して、タイトルのトリム・優先度や期限の既定値を新規作成時と同じ規則にする
    const task = createTask(r.title, typeof r.description === "string" ? r.description : "", r.id, {
      assignee: typeof r.assignee === "string" ? r.assignee : "",
      priority: isTaskPriority(r.priority) ? r.priority : undefined,
      dueDate: typeof r.dueDate === "string" ? r.dueDate : "",
    });
    if (task) tasks.push({ ...task, status: r.status });
  }
  return tasks;
}

/**
 * localStorage を裏に持つ useSyncExternalStore 用のストア。
 * getSnapshot は変更があるまで同じ配列を返す(React の要件)。
 * getServerSnapshot は SSR とハイドレーションで常に空配列を返し、不一致を防ぐ。
 */
export function createTaskStore(getStorage: () => StorageLike | null = defaultGetStorage) {
  let cache: Task[] | null = null;
  const listeners = new Set<() => void>();

  const notify = () => listeners.forEach((l) => l());

  function getSnapshot(): Task[] {
    if (cache === null) {
      try {
        cache = parseTasks(getStorage()?.getItem(STORAGE_KEY) ?? null);
      } catch {
        cache = [];
      }
    }
    return cache;
  }

  function dispatch(action: TaskAction) {
    const current = getSnapshot();
    const next = taskReducer(current, action);
    if (next === current) return;
    cache = next;
    try {
      getStorage()?.setItem(STORAGE_KEY, serializeTasks(next));
    } catch {
      // 容量超過などで保存できなくても、画面上の状態は維持する
    }
    notify();
  }

  // 他タブでの変更を取り込む。購読者がいる間だけ window を監視する。
  const onStorage = (e: StorageEvent) => {
    if (e.key !== null && e.key !== STORAGE_KEY) return;
    cache = null;
    notify();
  };

  function subscribe(listener: () => void) {
    if (listeners.size === 0) window.addEventListener("storage", onStorage);
    listeners.add(listener);
    return () => {
      listeners.delete(listener);
      if (listeners.size === 0) window.removeEventListener("storage", onStorage);
    };
  }

  return { getSnapshot, getServerSnapshot: () => EMPTY, subscribe, dispatch };
}
