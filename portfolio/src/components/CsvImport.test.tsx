import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { CsvImport } from "./CsvImport";
import { RAKUTEN_CSV_FIXTURE } from "@/lib/rakutenCsv.fixture";

// テストでは Shift_JIS のバイト列を作れないので、UTF-8 として読む
vi.mock("@/lib/rakutenCsv", async (importOriginal) => ({
  ...(await importOriginal<typeof import("@/lib/rakutenCsv")>()),
  decodeShiftJis: (bytes: Uint8Array) => new TextDecoder("utf-8").decode(bytes),
}));

function csvFile(text: string, name = "assetbalance(all)_20261123.csv") {
  return new File([text], name, { type: "text/csv" });
}

describe("CsvImport", () => {
  it("ファイルを選ぶと内訳を表示し、取り込むで onImport を呼ぶ", async () => {
    const onImport = vi.fn();
    render(<CsvImport onImport={onImport} />);

    await userEvent.upload(screen.getByLabelText("CSV ファイル"), csvFile(RAKUTEN_CSV_FIXTURE));

    const summary = await screen.findByLabelText("取り込み内容");
    expect(summary).toHaveTextContent("6 件(日本株 2 / 投資信託 1 / 現金 2 / その他 1)");
    await userEvent.click(screen.getByRole("button", { name: "取り込む" }));

    expect(onImport).toHaveBeenCalledTimes(1);
    expect(onImport.mock.calls[0][0]).toHaveLength(6);
    expect(screen.queryByLabelText("取り込み内容")).not.toBeInTheDocument();
  });

  it("キャンセルすると取り込まない", async () => {
    const onImport = vi.fn();
    render(<CsvImport onImport={onImport} />);

    await userEvent.upload(screen.getByLabelText("CSV ファイル"), csvFile(RAKUTEN_CSV_FIXTURE));
    await userEvent.click(await screen.findByRole("button", { name: "キャンセル" }));

    expect(onImport).not.toHaveBeenCalled();
    expect(screen.queryByLabelText("取り込み内容")).not.toBeInTheDocument();
  });

  it("形式の違うファイルはエラーを表示する", async () => {
    render(<CsvImport onImport={vi.fn()} />);
    await userEvent.upload(screen.getByLabelText("CSV ファイル"), csvFile("a,b\r\n1,2", "other.csv"));
    expect(await screen.findByRole("alert")).toHaveTextContent("楽天証券の保有商品一覧の CSV ではない");
  });
});
