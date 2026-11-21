import { fireEvent, render, screen, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { describe, expect, it } from "vitest";
import { STORAGE_KEY } from "@/lib/taskStorage";
import { Board } from "./Board";

function dragTo(card: HTMLElement, columnName: string) {
  const store: Record<string, string> = {};
  const dataTransfer = {
    setData: (k: string, v: string) => (store[k] = v),
    getData: (k: string) => store[k],
    effectAllowed: "",
  };
  fireEvent.dragStart(card, { dataTransfer });
  const column = screen.getByRole("region", { name: columnName });
  fireEvent.dragOver(column, { dataTransfer });
  fireEvent.drop(column, { dataTransfer });
}

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
  it("renders four columns in order: 未着手, 進行中, 保留, 完了", () => {
    render(<Board />);
    const names = screen.getAllByRole("region").map((r) => r.getAttribute("aria-label"));
    expect(names).toEqual(["未着手", "進行中", "保留", "完了"]);
  });

  it("can move a task into 保留", async () => {
    render(<Board />);
    await addTask("A");
    dragTo(screen.getByText("A").closest("article")!, "保留");
    expect(within(screen.getByRole("region", { name: "保留" })).getByText("A")).toBeInTheDocument();
  });

  describe("search and filters", () => {
    async function seed() {
      render(<Board />);
      await addTask("買い物", { description: "牛乳", assignee: "田中", priority: "high" });
      await addTask("資料作成", { description: "四半期レポート", assignee: "鈴木", priority: "low" });
      await addTask("掃除", { assignee: "田中", priority: "low" });
    }
    const visible = (title: string) => screen.queryByText(title);

    it("searches title and description", async () => {
      await seed();
      const user = userEvent.setup();
      await user.type(screen.getByLabelText("検索"), "牛乳");
      expect(visible("買い物")).toBeInTheDocument();
      expect(visible("資料作成")).toBeNull();
      expect(visible("掃除")).toBeNull();

      await user.clear(screen.getByLabelText("検索"));
      await user.type(screen.getByLabelText("検索"), "資料");
      expect(visible("資料作成")).toBeInTheDocument();
      expect(visible("買い物")).toBeNull();
    });

    it("filters by assignee using the assignees that exist on the board", async () => {
      await seed();
      const user = userEvent.setup();
      const select = screen.getByLabelText("担当者で絞り込み");
      expect(within(select).getAllByRole("option").map((o) => o.textContent)).toEqual(["すべて", "田中", "鈴木"]);
      await user.selectOptions(select, "田中");
      expect(visible("買い物")).toBeInTheDocument();
      expect(visible("掃除")).toBeInTheDocument();
      expect(visible("資料作成")).toBeNull();
    });

    it("filters by priority", async () => {
      await seed();
      const user = userEvent.setup();
      await user.selectOptions(screen.getByLabelText("優先度で絞り込み"), "high");
      expect(visible("買い物")).toBeInTheDocument();
      expect(visible("資料作成")).toBeNull();
      expect(visible("掃除")).toBeNull();
    });

    it("combines search and filters, and the clear button resets them", async () => {
      await seed();
      const user = userEvent.setup();
      await user.selectOptions(screen.getByLabelText("担当者で絞り込み"), "田中");
      await user.selectOptions(screen.getByLabelText("優先度で絞り込み"), "low");
      expect(visible("掃除")).toBeInTheDocument();
      expect(visible("買い物")).toBeNull();

      await user.type(screen.getByLabelText("検索"), "存在しない");
      expect(visible("掃除")).toBeNull();

      await user.click(screen.getByRole("button", { name: "条件をクリア" }));
      expect(screen.getByLabelText("検索")).toHaveValue("");
      expect(screen.getByLabelText("担当者で絞り込み")).toHaveValue("");
      expect(screen.getByLabelText("優先度で絞り込み")).toHaveValue("");
      for (const t of ["買い物", "資料作成", "掃除"]) expect(visible(t)).toBeInTheDocument();
    });

    it("shows column counts for the filtered tasks only", async () => {
      await seed();
      await userEvent.setup().selectOptions(screen.getByLabelText("担当者で絞り込み"), "鈴木");
      expect(within(screen.getByRole("region", { name: "未着手" })).getByText("1")).toBeInTheDocument();
    });
  });

  describe("persistence", () => {
    it("restores tasks after a reload", async () => {
      const first = render(<Board />);
      await addTask("残るタスク", { assignee: "田中", priority: "high", dueDate: "2099-12-31" });
      first.unmount();

      render(<Board />);
      const card = (await screen.findByText("残るタスク")).closest("article")!;
      expect(within(card).getByText("担当: 田中")).toBeInTheDocument();
      expect(within(card).getByText("優先度: 高")).toBeInTheDocument();
      expect(within(card).getByText("期限: 2099-12-31")).toBeInTheDocument();
    });

    it("restores the column a task was moved to", async () => {
      const first = render(<Board />);
      await addTask("A");
      dragTo(screen.getByText("A").closest("article")!, "保留");
      first.unmount();

      render(<Board />);
      const onHold = await screen.findByRole("region", { name: "保留" });
      expect(await within(onHold).findByText("A")).toBeInTheDocument();
    });

    it("loads tasks that were already in localStorage", async () => {
      window.localStorage.setItem(
        STORAGE_KEY,
        JSON.stringify([{ id: "1", title: "既存", description: "", status: "done", assignee: "", priority: "low", dueDate: "" }]),
      );
      render(<Board />);
      expect(within(await screen.findByRole("region", { name: "完了" })).getByText("既存")).toBeInTheDocument();
    });

    it("starts empty instead of crashing when the stored data is corrupt", () => {
      window.localStorage.setItem(STORAGE_KEY, "{not json");
      render(<Board />);
      expect(screen.getAllByRole("region")).toHaveLength(4);
      expect(screen.queryAllByRole("article")).toHaveLength(0);
    });
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
