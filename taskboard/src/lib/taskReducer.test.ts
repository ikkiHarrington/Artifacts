import { describe, expect, it } from "vitest";
import { createTask, EMPTY_FILTER, filterByStatus, filterTasks, isOverdue, listAssignees, taskReducer } from "./taskReducer";
import type { Task } from "@/types/task";

const make = (id: string, status: Task["status"] = "todo"): Task => ({
  id,
  title: id,
  description: "",
  status,
  assignee: "",
  priority: "medium",
  dueDate: "",
});

describe("createTask", () => {
  it("trims input, starts as todo and applies defaults for assignee/priority/dueDate", () => {
    expect(createTask("  a  ", " d ", "1")).toEqual({
      id: "1",
      title: "a",
      description: "d",
      status: "todo",
      assignee: "",
      priority: "medium",
      dueDate: "",
    });
  });
  it("returns null for blank title", () => {
    expect(createTask("   ", "x", "1")).toBeNull();
  });
  it("stores trimmed assignee, priority and dueDate", () => {
    const task = createTask("a", "", "1", { assignee: "  田中  ", priority: "high", dueDate: "2026-12-01" });
    expect(task).toMatchObject({ assignee: "田中", priority: "high", dueDate: "2026-12-01" });
  });
  it("falls back to medium for an invalid priority and to empty for an invalid dueDate", () => {
    const task = createTask("a", "", "1", { priority: "urgent" as never, dueDate: "来週" });
    expect(task).toMatchObject({ priority: "medium", dueDate: "" });
  });
});

describe("isOverdue", () => {
  const today = new Date(2026, 10, 21); // 2026-11-21 (local)
  it("is true only when dueDate is before today and the task is not done", () => {
    expect(isOverdue({ ...make("a"), dueDate: "2026-11-20" }, today)).toBe(true);
    expect(isOverdue({ ...make("a"), dueDate: "2026-11-21" }, today)).toBe(false);
    expect(isOverdue({ ...make("a"), dueDate: "2026-11-22" }, today)).toBe(false);
  });
  it("is false for done tasks and tasks without a dueDate", () => {
    expect(isOverdue({ ...make("a", "done"), dueDate: "2026-01-01" }, today)).toBe(false);
    expect(isOverdue(make("a"), today)).toBe(false);
  });
});

describe("taskReducer", () => {
  it("adds a task", () => {
    expect(taskReducer([make("a")], { type: "add", task: make("b") })).toHaveLength(2);
  });
  it("moves a task to another status without mutating", () => {
    const before = [make("a"), make("b")];
    const after = taskReducer(before, { type: "move", id: "a", status: "done" });
    expect(after[0].status).toBe("done");
    expect(after[1]).toBe(before[1]);
    expect(before[0].status).toBe("todo");
  });
  it("returns same state for same status or unknown id", () => {
    const before = [make("a")];
    expect(taskReducer(before, { type: "move", id: "a", status: "todo" })).toBe(before);
    expect(taskReducer(before, { type: "move", id: "zzz", status: "done" })).toBe(before);
  });
});

describe("filterTasks", () => {
  const tasks = [
    { ...make("a"), title: "買い物", description: "牛乳とパン", assignee: "田中", priority: "high" as const },
    { ...make("b"), title: "資料作成", description: "Quarterly REPORT", assignee: "鈴木", priority: "low" as const },
    { ...make("c"), title: "掃除", assignee: "田中", priority: "low" as const },
  ];
  const ids = (list: Task[]) => list.map((t) => t.id);

  it("returns everything for the empty filter", () => {
    expect(filterTasks(tasks, EMPTY_FILTER)).toBe(tasks);
  });
  it("searches title and description, case-insensitively and ignoring surrounding spaces", () => {
    expect(ids(filterTasks(tasks, { ...EMPTY_FILTER, query: "買い" }))).toEqual(["a"]);
    expect(ids(filterTasks(tasks, { ...EMPTY_FILTER, query: "牛乳" }))).toEqual(["a"]);
    expect(ids(filterTasks(tasks, { ...EMPTY_FILTER, query: "  quarterly report " }))).toEqual(["b"]);
  });
  it("does not search the assignee", () => {
    expect(filterTasks(tasks, { ...EMPTY_FILTER, query: "田中" })).toEqual([]);
  });
  it("filters by assignee and priority", () => {
    expect(ids(filterTasks(tasks, { ...EMPTY_FILTER, assignee: "田中" }))).toEqual(["a", "c"]);
    expect(ids(filterTasks(tasks, { ...EMPTY_FILTER, priority: "low" }))).toEqual(["b", "c"]);
  });
  it("combines all conditions with AND", () => {
    expect(ids(filterTasks(tasks, { query: "掃", assignee: "田中", priority: "low" }))).toEqual(["c"]);
    expect(filterTasks(tasks, { query: "買い物", assignee: "田中", priority: "low" })).toEqual([]);
  });
});

describe("listAssignees", () => {
  it("returns unique, non-empty assignees in sorted order", () => {
    const tasks = [{ ...make("a"), assignee: "鈴木" }, { ...make("b"), assignee: "" }, { ...make("c"), assignee: "鈴木" }, { ...make("d"), assignee: "田中" }];
    expect(listAssignees(tasks)).toEqual(["田中", "鈴木"]);
  });
});

describe("filterByStatus", () => {
  it("returns only matching tasks", () => {
    const tasks = [make("a"), make("b", "done")];
    expect(filterByStatus(tasks, "done").map((t) => t.id)).toEqual(["b"]);
  });
});
