import { maskPortfolio, renderMaskedPortfolio } from "./mask";
import type { Holding, Snapshot } from "@/types/portfolio";

const holdings: Holding[] = [
  {
    id: "secret-id-1",
    assetClass: "jp_stock",
    code: "7203",
    name: "トヨタ自動車",
    sector: "輸送用機器",
    quantity: 300,
    costPrice: 2000,
    currentPrice: 3000, // 評価 900,000 / 取得 600,000
    priceUpdatedAt: "",
  },
  {
    id: "secret-id-2",
    assetClass: "cash",
    code: "",
    name: "楽天銀行 普通預金",
    sector: "",
    quantity: 1,
    costPrice: 100000,
    currentPrice: 100000,
    priceUpdatedAt: "",
  },
];

const snapshots: Snapshot[] = [
  { date: "2026-11-01", totalValue: 800000, totalCost: 700000, byClass: { jp_stock: 700000, fund: 0, cash: 100000, other: 0 } },
  { date: "2026-11-23", totalValue: 1000000, totalCost: 700000, byClass: { jp_stock: 900000, fund: 0, cash: 100000, other: 0 } },
];

describe("maskPortfolio", () => {
  it("割合・損益率・指数だけにする", () => {
    const p = maskPortfolio(holdings, snapshots, "2026-11-23", { revealNames: true });
    expect(p.totalPnlPct).toBe(42.9); // 300,000 / 700,000
    expect(p.allocation).toEqual([
      { assetClass: "日本株", weightPct: 90 },
      { assetClass: "現金", weightPct: 10 },
    ]);
    expect(p.holdings[0]).toEqual({ label: "トヨタ自動車(7203)", assetClass: "日本株", sector: "輸送用機器", weightPct: 90, pnlPct: 50 });
    expect(p.concentration).toEqual({ top1Pct: 90, top3Pct: 100, top5Pct: 100 });
    expect(p.history).toEqual([
      { date: "2026-11-01", valueIndex: 100, costIndex: 87.5 },
      { date: "2026-11-23", valueIndex: 125, costIndex: 87.5 },
    ]);
  });

  it("revealNames=false では銘柄名・コードを匿名ラベルにする", () => {
    const p = maskPortfolio(holdings, snapshots, "2026-11-23", { revealNames: false });
    expect(p.holdings.map((h) => h.label)).toEqual(["銘柄A", "銘柄B"]);
    expect(p.holdings[1].sector).toBe("不明");
  });

  it("現在値が未取得の銘柄は損益率を null にする", () => {
    const p = maskPortfolio([{ ...holdings[0], currentPrice: 0 }], [], "2026-11-23", { revealNames: false });
    expect(p.holdings[0].pnlPct).toBeNull();
    expect(p.history).toEqual([]);
  });
});

describe("renderMaskedPortfolio(送信テキスト)", () => {
  const sensitive = [
    "900000",
    "900,000",
    "1000000",
    "1,000,000",
    "700000",
    "100000",
    "300", // 株数
    "3000", // 単価
    "secret-id",
  ];

  it.each([true, false])("revealNames=%s でも金額・数量・単価・id を含まない", (revealNames) => {
    const text = renderMaskedPortfolio(maskPortfolio(holdings, snapshots, "2026-11-23", { revealNames }));
    for (const s of sensitive) {
      // 日付や割合の一部として偶然一致しないよう、数字の境界で判定する
      expect(text).not.toMatch(new RegExp(`(^|[^0-9.,])${s}($|[^0-9.,])`));
    }
  });

  it("匿名モードでは銘柄名・コード・口座の名称を含まない", () => {
    const text = renderMaskedPortfolio(maskPortfolio(holdings, snapshots, "2026-11-23", { revealNames: false }));
    expect(text).not.toContain("トヨタ");
    expect(text).not.toContain("7203");
    expect(text).not.toContain("楽天銀行");
    expect(text).toContain("銘柄A | 日本株 | 輸送用機器 | 比率 90% | 損益率 50%");
  });
});
