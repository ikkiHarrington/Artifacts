import { describe, expect, it } from "vitest";
import { createTask, filterByStatus, isOverdue, taskReducer } from "./taskReducer";
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

describe("filterByStatus", () => {
  it("returns only matching tasks", () => {
    const tasks = [make("a"), make("b", "done")];
    expect(filterByStatus(tasks, "done").map((t) => t.id)).toEqual(["b"]);
  });
});
