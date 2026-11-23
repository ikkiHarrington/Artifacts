import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { HoldingForm } from "./HoldingForm";

describe("HoldingForm", () => {
  it("日本株を追加すると onSubmit に Holding を渡し、フォームを空にする", async () => {
    const onSubmit = vi.fn();
    render(<HoldingForm onSubmit={onSubmit} />);

    await userEvent.type(screen.getByLabelText("銘柄コード"), "7203");
    await userEvent.type(screen.getByLabelText("名称"), "トヨタ自動車");
    await userEvent.type(screen.getByLabelText("株数"), "100");
    await userEvent.type(screen.getByLabelText("取得単価"), "2000");
    await userEvent.click(screen.getByRole("button", { name: "追加" }));

    expect(onSubmit).toHaveBeenCalledWith(
      expect.objectContaining({ assetClass: "jp_stock", code: "7203", name: "トヨタ自動車", quantity: 100, costPrice: 2000, currentPrice: 0 }),
    );
    expect(screen.getByLabelText("名称")).toHaveValue("");
  });

  it("現金は金額だけ入力できる", async () => {
    const onSubmit = vi.fn();
    render(<HoldingForm onSubmit={onSubmit} />);

    await userEvent.selectOptions(screen.getByLabelText("種類"), "cash");
    expect(screen.queryByLabelText("株数")).not.toBeInTheDocument();
    await userEvent.type(screen.getByLabelText("名称"), "普通預金");
    await userEvent.type(screen.getByLabelText("金額"), "500000");
    await userEvent.click(screen.getByRole("button", { name: "追加" }));

    expect(onSubmit).toHaveBeenCalledWith(
      expect.objectContaining({ assetClass: "cash", quantity: 1, costPrice: 500000, currentPrice: 500000 }),
    );
  });

  it("株数が空ならエラーを表示して送信しない", async () => {
    const onSubmit = vi.fn();
    render(<HoldingForm onSubmit={onSubmit} />);

    await userEvent.type(screen.getByLabelText("名称"), "トヨタ");
    await userEvent.click(screen.getByRole("button", { name: "追加" }));

    expect(onSubmit).not.toHaveBeenCalled();
    expect(screen.getByRole("alert")).toHaveTextContent("0 以上の数値");
  });

  it("編集時は既存の値が入り、同じ id で更新する", async () => {
    const onSubmit = vi.fn();
    render(
      <HoldingForm
        initial={{ id: "x1", assetClass: "fund", code: "", name: "全世界株式", sector: "", quantity: 100000, costPrice: 18000, currentPrice: 21000, priceUpdatedAt: "" }}
        onSubmit={onSubmit}
      />,
    );

    expect(screen.getByLabelText("口数")).toHaveValue("100000");
    await userEvent.click(screen.getByRole("button", { name: "更新" }));
    expect(onSubmit).toHaveBeenCalledWith(expect.objectContaining({ id: "x1", quantity: 100000, currentPrice: 21000 }));
  });
});
