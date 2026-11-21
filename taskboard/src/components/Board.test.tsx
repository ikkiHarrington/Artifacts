import { fireEvent, render, screen, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { describe, expect, it } from "vitest";
import { Board } from "./Board";

interface AddOptions {
  description?: string;
  assignee?: string;
  priority?: string;
  dueDate?: string;
}

async function addTask(title: string, { description, assignee, priority, dueDate }: AddOptions = {}) {
  const user = userEvent.setup();
  await user.type(screen.getByLabelText("タイトル"), title);
  if (description) await user.type(screen.getByLabelText("説明"), description);
  if (assignee) await user.type(screen.getByLabelText("担当者"), assignee);
  if (priority) await user.selectOptions(screen.getByLabelText("優先度"), priority);
  if (dueDate) fireEvent.change(screen.getByLabelText("期限"), { target: { value: dueDate } });
  await user.click(screen.getByRole("button", { name: "追加" }));
}

describe("Board", () => {
  it("renders three columns", () => {
    render(<Board />);
    for (const name of ["未着手", "進行中", "完了"]) {
      expect(screen.getByRole("region", { name })).toBeInTheDocument();
    }
  });

  it("adds a task with title and description to 未着手", async () => {
    render(<Board />);
    await addTask("買い物", { description: "牛乳" });
    const todo = screen.getByRole("region", { name: "未着手" });
    expect(within(todo).getByText("買い物")).toBeInTheDocument();
    expect(within(todo).getByText("牛乳")).toBeInTheDocument();
    expect(screen.getByLabelText("タイトル")).toHaveValue("");
  });

  it("shows assignee, priority and due date on the card", async () => {
    render(<Board />);
    await addTask("資料作成", { assignee: "田中", priority: "high", dueDate: "2099-12-31" });
    const card = screen.getByText("資料作成").closest("article")!;
    expect(within(card).getByText("担当: 田中")).toBeInTheDocument();
    expect(within(card).getByText("優先度: 高")).toBeInTheDocument();
    expect(within(card).getByText("期限: 2099-12-31")).toBeInTheDocument();
  });

  it("defaults priority to 中 and omits assignee and due date when not entered", async () => {
    render(<Board />);
    await addTask("メモ");
    const card = screen.getByText("メモ").closest("article")!;
    expect(within(card).getByText("優先度: 中")).toBeInTheDocument();
    expect(within(card).queryByText(/担当:/)).toBeNull();
    expect(within(card).queryByText(/期限:/)).toBeNull();
  });

  it("resets the extra fields after adding", async () => {
    render(<Board />);
    await addTask("A", { assignee: "鈴木", priority: "low", dueDate: "2099-01-01" });
    expect(screen.getByLabelText("担当者")).toHaveValue("");
    expect(screen.getByLabelText("優先度")).toHaveValue("medium");
    expect(screen.getByLabelText("期限")).toHaveValue("");
  });

  it("marks an overdue task and does not mark it once it is done", async () => {
    render(<Board />);
    await addTask("遅延", { dueDate: "2000-01-01" });
    const card = screen.getByText("遅延").closest("article")!;
    expect(within(card).getByText("期限: 2000-01-01")).toHaveAttribute("data-overdue", "true");

    const store: Record<string, string> = {};
    const dataTransfer = {
      setData: (k: string, v: string) => (store[k] = v),
      getData: (k: string) => store[k],
      effectAllowed: "",
    };
    fireEvent.dragStart(card, { dataTransfer });
    fireEvent.drop(screen.getByRole("region", { name: "完了" }), { dataTransfer });
    expect(screen.getByText("期限: 2000-01-01")).not.toHaveAttribute("data-overdue", "true");
  });

  it("does not add a task with a blank title", () => {
    render(<Board />);
    expect(screen.getByRole("button", { name: "追加" })).toBeDisabled();
  });

  it("moves a task between columns by drag and drop", async () => {
    render(<Board />);
    await addTask("A");
    const card = screen.getByText("A").closest("article")!;
    const store: Record<string, string> = {};
    const dataTransfer = {
      setData: (k: string, v: string) => (store[k] = v),
      getData: (k: string) => store[k],
      effectAllowed: "",
    };
    fireEvent.dragStart(card, { dataTransfer });
    const done = screen.getByRole("region", { name: "完了" });
    fireEvent.dragOver(done, { dataTransfer });
    fireEvent.drop(done, { dataTransfer });
    expect(within(done).getByText("A")).toBeInTheDocument();
    expect(within(screen.getByRole("region", { name: "未着手" })).queryByText("A")).toBeNull();
  });
});
