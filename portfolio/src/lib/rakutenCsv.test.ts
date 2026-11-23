import { applyImport, decodeShiftJis, parseNumber, parseRakutenCsv, RAKUTEN_SOURCE } from "./rakutenCsv";
import type { Holding } from "@/types/portfolio";
import { RAKUTEN_CSV_FIXTURE } from "./rakutenCsv.fixture";

const CSV = RAKUTEN_CSV_FIXTURE;

const now = new Date("2026-11-23T00:00:00Z");

function ids() {
  let n = 0;
  return () => `id${++n}`;
}

describe("parseNumber", () => {
  it.each([
    ["1,234.50", 1234.5],
    ["+20,000", 20000],
    ["-14.29", -14.29],
    ["-", null],
    ["", null],
    ["abc", null],
  ])("%s → %s", (input, expected) => {
    expect(parseNumber(input)).toBe(expected);
  });
});

describe("decodeShiftJis", () => {
  it("Shift_JIS のバイト列を文字列にする", () => {
    expect(decodeShiftJis(new Uint8Array([142, 237, 149, 202]))).toBe("種別");
  });
});

describe("parseRakutenCsv", () => {
  const { holdings, warnings } = parseRakutenCsv(CSV, now, ids());
  const byName = (name: string) => holdings.find((h) => h.name === name);

  it("国内株式は株数・取得単価・現在値で取り込み、口座違いの同じ銘柄は加重平均で1件にまとめる", () => {
    expect(byName("テスト工業")).toMatchObject({
      assetClass: "jp_stock",
      code: "9999",
      quantity: 400,
      costPrice: 1300, // (1000×100 + 1400×300) / 400
      currentPrice: 1200,
      priceUpdatedAt: now.toISOString(),
      source: RAKUTEN_SOURCE,
    });
    expect(byName("新興テスト")).toMatchObject({ code: "123A", quantity: 100 });
  });

  it("投資信託は口数と1万口あたりの価額で取り込む", () => {
    expect(byName("テスト全世界株式インデックス")).toMatchObject({
      assetClass: "fund",
      quantity: 1000000,
      costPrice: 20000,
      currentPrice: 30000,
    });
  });

  it("米国株式は円換算の評価額で「その他」にし、分類に種別を入れる", () => {
    expect(byName("テスト・コーポ")).toMatchObject({
      assetClass: "other",
      code: "TEST",
      sector: "米国株式",
      quantity: 1,
      currentPrice: 180000,
      costPrice: 150000,
    });
  });

  it("外貨預り金と、資産合計欄の円の預り金を現金にする", () => {
    expect(byName("楽天証券 米ドル")).toMatchObject({ assetClass: "cash", currentPrice: 1500 });
    expect(byName("楽天証券 預り金")).toMatchObject({ assetClass: "cash", currentPrice: 50000 });
  });

  it("評価額と整合していれば警告は出ない", () => {
    expect(warnings).toEqual([]);
    expect(holdings).toHaveLength(6);
  });

  it("数量×現在値が評価額とずれていれば警告する", () => {
    const broken = CSV.replace('"3,000,000",-,"+1,000,000"', '"30,000,000",-,"+1,000,000"');
    expect(parseRakutenCsv(broken, now, ids()).warnings[0]).toContain("1% 以上ずれています");
  });

  it("数値が読めない行は警告して飛ばす", () => {
    const broken = CSV.replace("新興テスト,特定,100,", "新興テスト,特定,-,");
    const result = parseRakutenCsv(broken, now, ids());
    expect(result.holdings.find((h) => h.name === "新興テスト")).toBeUndefined();
    expect(result.warnings[0]).toContain("新興テスト(123A)");
  });

  it("形式が違う CSV はエラー", () => {
    expect(() => parseRakutenCsv("a,b,c\r\n1,2,3", now, ids())).toThrow("楽天証券の保有商品一覧");
  });
});

describe("applyImport", () => {
  const manual: Holding = {
    id: "manual",
    assetClass: "cash",
    code: "",
    name: "他行の預金",
    sector: "",
    quantity: 1,
    costPrice: 1,
    currentPrice: 1,
    priceUpdatedAt: "",
  };

  it("前回の取り込み分だけ入れ替え、手入力は残し、id と業種を引き継ぐ", () => {
    const first = parseRakutenCsv(CSV, now, ids()).holdings.map((h) => (h.code === "9999" ? { ...h, sector: "機械" } : h));
    const existing = [manual, ...first];
    const second = parseRakutenCsv(CSV.replace("新興テスト", "別の銘柄").replace("123A", "456B"), now, () => "new");

    const next = applyImport(existing, second.holdings);

    expect(next[0]).toBe(manual);
    const stock = next.find((h) => h.code === "9999")!;
    expect(stock.id).toBe(first.find((h) => h.code === "9999")!.id);
    expect(stock.sector).toBe("機械");
    expect(next.some((h) => h.code === "123A")).toBe(false); // 売却済みは消える
    expect(next.find((h) => h.code === "456B")?.id).toBe("new");
    expect(next).toHaveLength(1 + 6);
  });
});
