import { describe, expect, it, vi } from "vitest";
import { createTaskStore, parseTasks, serializeTasks, STORAGE_KEY } from "./taskStorage";
import type { Task } from "@/types/task";

const make = (id: string, over: Partial<Task> = {}): Task => ({
  id,
  title: id,
  description: "",
  status: "todo",
  assignee: "",
  priority: "medium",
  dueDate: "",
  ...over,
});

function fakeStorage(initial: Record<string, string> = {}) {
  const data = { ...initial };
  return {
    data,
    getItem: vi.fn((k: string) => data[k] ?? null),
    setItem: vi.fn((k: string, v: string) => {
      data[k] = v;
    }),
  };
}

describe("parseTasks", () => {
  it("returns [] for null, broken JSON and non-arrays", () => {
    expect(parseTasks(null)).toEqual([]);
    expect(parseTasks("{broken")).toEqual([]);
    expect(parseTasks('{"a":1}')).toEqual([]);
  });

  it("round-trips serialized tasks", () => {
    const tasks = [make("a", { assignee: "田中", priority: "high", dueDate: "2026-12-01", status: "on-hold" })];
    expect(parseTasks(serializeTasks(tasks))).toEqual(tasks);
  });

  it("drops entries that are not valid tasks", () => {
    const raw = JSON.stringify([make("ok"), null, 1, { id: "x" }, make("bad", { status: "archived" as never }), { ...make("blank"), title: "  " }]);
    expect(parseTasks(raw).map((t) => t.id)).toEqual(["ok"]);
  });

  it("fills in defaults for tasks saved before assignee/priority/dueDate existed", () => {
    const legacy = JSON.stringify([{ id: "1", title: "旧", description: "d", status: "done" }]);
    expect(parseTasks(legacy)).toEqual([make("1", { title: "旧", description: "d", status: "done" })]);
  });

  it("normalizes an invalid priority and dueDate", () => {
    const raw = JSON.stringify([{ ...make("1"), priority: "urgent", dueDate: "来週" }]);
    expect(parseTasks(raw)[0]).toMatchObject({ priority: "medium", dueDate: "" });
  });
});

describe("createTaskStore", () => {
  it("loads the initial snapshot from storage and keeps it referentially stable", () => {
    const storage = fakeStorage({ [STORAGE_KEY]: serializeTasks([make("a")]) });
    const store = createTaskStore(() => storage);
    const first = store.getSnapshot();
    expect(first.map((t) => t.id)).toEqual(["a"]);
    expect(store.getSnapshot()).toBe(first);
    expect(storage.getItem).toHaveBeenCalledTimes(1);
  });

  it("returns the same empty array for the server snapshot", () => {
    const store = createTaskStore(() => fakeStorage());
    expect(store.getServerSnapshot()).toEqual([]);
    expect(store.getServerSnapshot()).toBe(store.getServerSnapshot());
  });

  it("persists dispatched actions and notifies subscribers", () => {
    const storage = fakeStorage();
    const store = createTaskStore(() => storage);
    const listener = vi.fn();
    const unsubscribe = store.subscribe(listener);

    store.dispatch({ type: "add", task: make("a") });
    expect(listener).toHaveBeenCalledTimes(1);
    expect(parseTasks(storage.data[STORAGE_KEY]).map((t) => t.id)).toEqual(["a"]);

    store.dispatch({ type: "move", id: "a", status: "done" });
    expect(parseTasks(storage.data[STORAGE_KEY])[0].status).toBe("done");

    unsubscribe();
    store.dispatch({ type: "add", task: make("b") });
    expect(listener).toHaveBeenCalledTimes(2);
  });

  it("does not write or notify when an action changes nothing", () => {
    const storage = fakeStorage({ [STORAGE_KEY]: serializeTasks([make("a")]) });
    const store = createTaskStore(() => storage);
    const listener = vi.fn();
    store.subscribe(listener);
    store.dispatch({ type: "move", id: "a", status: "todo" });
    expect(storage.setItem).not.toHaveBeenCalled();
    expect(listener).not.toHaveBeenCalled();
  });

  it("keeps working in memory when storage is unavailable", () => {
    const store = createTaskStore(() => null);
    store.dispatch({ type: "add", task: make("a") });
    expect(store.getSnapshot().map((t) => t.id)).toEqual(["a"]);
  });

  it("keeps working in memory when writing to storage throws (quota, private mode)", () => {
    const storage = fakeStorage();
    storage.setItem.mockImplementation(() => {
      throw new DOMException("full", "QuotaExceededError");
    });
    const store = createTaskStore(() => storage);
    expect(() => store.dispatch({ type: "add", task: make("a") })).not.toThrow();
    expect(store.getSnapshot()).toHaveLength(1);
  });

  it("reloads from storage when another tab changes the stored value", () => {
    const storage = fakeStorage();
    const store = createTaskStore(() => storage);
    const listener = vi.fn();
    const unsubscribe = store.subscribe(listener);
    expect(store.getSnapshot()).toEqual([]);

    storage.data[STORAGE_KEY] = serializeTasks([make("remote")]);
    window.dispatchEvent(new StorageEvent("storage", { key: STORAGE_KEY }));
    expect(listener).toHaveBeenCalledTimes(1);
    expect(store.getSnapshot().map((t) => t.id)).toEqual(["remote"]);

    window.dispatchEvent(new StorageEvent("storage", { key: "unrelated" }));
    expect(listener).toHaveBeenCalledTimes(1);

    unsubscribe();
    window.dispatchEvent(new StorageEvent("storage", { key: STORAGE_KEY }));
    expect(listener).toHaveBeenCalledTimes(1);
  });
});
