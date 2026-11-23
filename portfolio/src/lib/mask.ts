import { summarize } from "./portfolio";
import { ASSET_CLASS_LABELS, type Holding, type Snapshot } from "@/types/portfolio";

/**
 * 外部の AI に送るためのマスク処理。
 *
 * 送るのは「割合」と「指数」だけ。金額・数量・単価・総資産額・id は一切含めない。
 * 銘柄名は revealNames が true のときだけ送り、false なら「銘柄A(業種)」のような匿名ラベルにする。
 */
export interface MaskOptions {
  revealNames: boolean;
}

export interface MaskedHolding {
  label: string;
  assetClass: string;
  sector: string;
  /** 総資産に占める割合(%) */
  weightPct: number;
  /** 取得額に対する損益率(%)。現在値が未取得なら null */
  pnlPct: number | null;
}

export interface MaskedPortfolio {
  asOf: string;
  holdingCount: number;
  totalPnlPct: number;
  allocation: { assetClass: string; weightPct: number }[];
  holdings: MaskedHolding[];
  concentration: { top1Pct: number; top3Pct: number; top5Pct: number };
  /** 最初のスナップショットの評価額を 100 とした指数 */
  history: { date: string; valueIndex: number; costIndex: number }[];
}

const round1 = (n: number) => Math.round(n * 10) / 10;

/** 0→A, 25→Z, 26→AA … */
function anonymousName(index: number): string {
  let s = "";
  let n = index;
  do {
    s = String.fromCharCode(65 + (n % 26)) + s;
    n = Math.floor(n / 26) - 1;
  } while (n >= 0);
  return `銘柄${s}`;
}

export function maskPortfolio(
  holdings: Holding[],
  snapshots: Snapshot[],
  asOf: string,
  { revealNames }: MaskOptions,
): MaskedPortfolio {
  const summary = summarize(holdings);
  const rows = summary.byHolding;

  const masked = rows.map((row, i) => {
    const h = row.holding;
    const label = revealNames ? (h.code ? `${h.name}(${h.code})` : h.name) : anonymousName(i);
    return {
      label,
      assetClass: ASSET_CLASS_LABELS[h.assetClass],
      sector: h.sector || "不明",
      weightPct: round1(row.weight * 100),
      pnlPct: h.currentPrice === 0 ? null : round1(row.pnlRate * 100),
    };
  });

  const topN = (n: number) => round1(rows.slice(0, n).reduce((sum, r) => sum + r.weight, 0) * 100);

  const base = snapshots.find((s) => s.totalValue > 0)?.totalValue ?? 0;
  const history =
    base === 0
      ? []
      : snapshots.map((s) => ({
          date: s.date,
          valueIndex: round1((s.totalValue / base) * 100),
          costIndex: round1((s.totalCost / base) * 100),
        }));

  return {
    asOf,
    holdingCount: holdings.length,
    totalPnlPct: round1(summary.pnlRate * 100),
    allocation: summary.byClass.map((c) => ({
      assetClass: ASSET_CLASS_LABELS[c.assetClass],
      weightPct: round1(c.weight * 100),
    })),
    holdings: masked,
    concentration: { top1Pct: topN(1), top3Pct: topN(3), top5Pct: topN(5) },
    history,
  };
}

/** AI に実際に送るテキスト。画面のプレビューにもこの文字列をそのまま表示する */
export function renderMaskedPortfolio(p: MaskedPortfolio): string {
  const lines = [
    `基準日: ${p.asOf}`,
    `保有数: ${p.holdingCount}`,
    `全体の評価損益率: ${p.totalPnlPct}%`,
    "",
    "## 資産クラス別の配分",
    ...p.allocation.map((a) => `- ${a.assetClass}: ${a.weightPct}%`),
    "",
    "## 銘柄別(比率の大きい順)",
    ...p.holdings.map(
      (h) =>
        `- ${h.label} | ${h.assetClass} | ${h.sector} | 比率 ${h.weightPct}% | 損益率 ${h.pnlPct === null ? "未取得" : `${h.pnlPct}%`}`,
    ),
    "",
    "## 集中度",
    `- 上位1銘柄: ${p.concentration.top1Pct}% / 上位3銘柄: ${p.concentration.top3Pct}% / 上位5銘柄: ${p.concentration.top5Pct}%`,
    "",
    "## 推移(最初の記録の評価額 = 100)",
    ...(p.history.length === 0
      ? ["- 記録なし"]
      : p.history.map((s) => `- ${s.date}: 評価額 ${s.valueIndex} / 取得額 ${s.costIndex}`)),
  ];
  return lines.join("\n");
}
