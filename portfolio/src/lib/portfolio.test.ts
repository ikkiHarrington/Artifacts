import {
  addReview,
  createHolding,
  marketValue,
  parsePortfolioData,
  summarize,
  takeSnapshot,
  upsertSnapshot,
} from "./portfolio";
import type { Holding } from "@/types/portfolio";

function holding(overrides: Partial<Holding>): Holding {
  return {
    id: "h1",
    assetClass: "jp_stock",
    code: "7203",
    name: "トヨタ自動車",
    sector: "輸送用機器",
    quantity: 100,
    costPrice: 2000,
    currentPrice: 2500,
    priceUpdatedAt: "",
    ...overrides,
  };
}

describe("marketValue", () => {
  it("株式は数量×現在値", () => {
    expect(marketValue(holding({}))).toBe(250000);
  });

  it("投資信託は1万口あたりの基準価額で計算する", () => {
    expect(marketValue(holding({ assetClass: "fund", quantity: 500000, currentPrice: 20000 }))).toBe(
      1000000,
    );
  });
});

describe("summarize", () => {
  it("合計・損益・配分を計算し、銘柄は評価額の大きい順に並べる", () => {
    const s = summarize([
      holding({ id: "a" }), // 評価 250,000 / 取得 200,000
      holding({ id: "b", assetClass: "cash", quantity: 1, costPrice: 750000, currentPrice: 750000 }),
    ]);
    expect(s.totalValue).toBe(1000000);
    expect(s.totalCost).toBe(950000);
    expect(s.pnl).toBe(50000);
    expect(s.pnlRate).toBeCloseTo(50000 / 950000);
    expect(s.byHolding.map((r) => r.holding.id)).toEqual(["b", "a"]);
    expect(s.byHolding[1].weight).toBeCloseTo(0.25);
    expect(s.byHolding[1].pnlRate).toBeCloseTo(0.25);
    expect(s.byClass).toEqual([
      { assetClass: "jp_stock", value: 250000, weight: 0.25 },
      { assetClass: "cash", value: 750000, weight: 0.75 },
    ]);
  });

  it("保有がなくても 0 除算しない", () => {
    const s = summarize([]);
    expect(s.totalValue).toBe(0);
    expect(s.pnlRate).toBe(0);
    expect(s.byClass).toEqual([]);
  });
});

describe("createHolding", () => {
  it("入力をトリムして Holding を作る", () => {
    const h = createHolding(
      { assetClass: "jp_stock", code: " 7203 ", name: " トヨタ ", sector: "", quantity: 100, costPrice: 2000, currentPrice: 0 },
      "id1",
    );
    expect(h).toMatchObject({ id: "id1", code: "7203", name: "トヨタ", currentPrice: 0 });
  });

  it("現在値が 0 なら取得単価で代用しない(未取得のまま)", () => {
    const h = createHolding(
      { assetClass: "jp_stock", code: "7203", name: "トヨタ", sector: "", quantity: 1, costPrice: 100, currentPrice: 0 },
      "id1",
    );
    expect(h?.currentPrice).toBe(0);
  });

  it("現金は金額だけで作れる(数量 1、取得・現在値ともに金額)", () => {
    const h = createHolding(
      { assetClass: "cash", code: "", name: "普通預金", sector: "", quantity: 0, costPrice: 0, currentPrice: 300000 },
      "id1",
    );
    expect(h).toMatchObject({ quantity: 1, costPrice: 300000, currentPrice: 300000 });
  });

  it.each([
    [{ name: "" }],
    [{ quantity: -1 }],
    [{ quantity: Number.NaN }],
    [{ costPrice: -5 }],
    [{ assetClass: "bond" }],
  ])("不正な入力 %o は null", (override) => {
    const base = { assetClass: "jp_stock", code: "7203", name: "トヨタ", sector: "", quantity: 1, costPrice: 1, currentPrice: 1 };
    expect(createHolding({ ...base, ...override }, "id1")).toBeNull();
  });
});

describe("parsePortfolioData", () => {
  it("壊れた入力は空データにする", () => {
    expect(parsePortfolioData(null)).toEqual({ holdings: [], snapshots: [], reviews: [] });
    expect(parsePortfolioData({ holdings: "x" })).toEqual({ holdings: [], snapshots: [], reviews: [] });
  });

  it("不正な保有は捨て、正しいものは残す", () => {
    const data = parsePortfolioData({
      holdings: [holding({ id: "ok" }), { id: "bad", name: "" }],
      snapshots: [
        { date: "2026-11-01", totalValue: 1, totalCost: 1, byClass: { jp_stock: 1 } },
        { date: "invalid" },
      ],
    });
    expect(data.holdings.map((h) => h.id)).toEqual(["ok"]);
    expect(data.snapshots).toEqual([
      { date: "2026-11-01", totalValue: 1, totalCost: 1, byClass: { jp_stock: 1, fund: 0, cash: 0, other: 0 } },
    ]);
  });
});

describe("スナップショット", () => {
  it("takeSnapshot は資産クラス別の評価額を記録する", () => {
    const snap = takeSnapshot([holding({})], "2026-11-23");
    expect(snap).toEqual({
      date: "2026-11-23",
      totalValue: 250000,
      totalCost: 200000,
      byClass: { jp_stock: 250000, fund: 0, cash: 0, other: 0 },
    });
  });

  it("upsertSnapshot は同じ日付を上書きし、日付順に保つ", () => {
    const a = takeSnapshot([], "2026-11-01");
    const b = takeSnapshot([], "2026-11-08");
    const b2 = { ...b, totalValue: 99 };
    expect(upsertSnapshot([b, a], b2)).toEqual([a, b2]);
  });
});

describe("見直しレポート", () => {
  it("parsePortfolioData は不正なレポートを捨てる", () => {
    const data = parsePortfolioData({
      reviews: [{ createdAt: "2026-11-23T00:00:00Z", text: "ok" }, { createdAt: 1, text: "x" }, { createdAt: "x", text: "" }],
    });
    expect(data.reviews).toEqual([{ createdAt: "2026-11-23T00:00:00Z", text: "ok" }]);
  });

  it("addReview は先頭に追加し、上限を超えた古いものを捨てる", () => {
    const r = (n: number) => ({ createdAt: String(n), text: String(n) });
    expect(addReview([r(2), r(1)], r(3), 2)).toEqual([r(3), r(2)]);
  });
});
