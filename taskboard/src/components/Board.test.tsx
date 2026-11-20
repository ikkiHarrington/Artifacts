import { fireEvent, render, screen, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { describe, expect, it } from "vitest";
import { Board } from "./Board";

function addTask(title: string, description = "") {
  return (async () => {
    const user = userEvent.setup();
    await user.type(screen.getByLabelText("タイトル"), title);
    if (description) await user.type(screen.getByLabelText("説明"), description);
    await user.click(screen.getByRole("button", { name: "追加" }));
  })();
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
    await addTask("買い物", "牛乳");
    const todo = screen.getByRole("region", { name: "未着手" });
    expect(within(todo).getByText("買い物")).toBeInTheDocument();
    expect(within(todo).getByText("牛乳")).toBeInTheDocument();
    expect(screen.getByLabelText("タイトル")).toHaveValue("");
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
