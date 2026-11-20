import { describe, expect, it } from "vitest";
import { createTask, filterByStatus, taskReducer } from "./taskReducer";
import type { Task } from "@/types/task";

const make = (id: string, status: Task["status"] = "todo"): Task => ({ id, title: id, description: "", status });

describe("createTask", () => {
  it("trims input and starts as todo", () => {
    expect(createTask("  a  ", " d ", "1")).toEqual({ id: "1", title: "a", description: "d", status: "todo" });
  });
  it("returns null for blank title", () => {
    expect(createTask("   ", "x", "1")).toBeNull();
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
