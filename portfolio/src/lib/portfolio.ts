import {
  ASSET_CLASSES,
  PRICE_UNITS,
  isAssetClass,
  type AssetClass,
  type Holding,
  type PortfolioData,
  type Snapshot,
} from "@/types/portfolio";

export function marketValue(h: Holding): number {
  return (h.quantity * h.currentPrice) / PRICE_UNITS[h.assetClass];
}

export function costBasis(h: Holding): number {
  return (h.quantity * h.costPrice) / PRICE_UNITS[h.assetClass];
}

function ratio(numerator: number, denominator: number): number {
  return denominator === 0 ? 0 : numerator / denominator;
}

export interface HoldingRow {
  holding: Holding;
  value: number;
  cost: number;
  pnl: number;
  pnlRate: number;
  /** 総資産に占める割合(0〜1) */
  weight: number;
}

export interface ClassRow {
  assetClass: AssetClass;
  value: number;
  weight: number;
}

export interface Summary {
  totalValue: number;
  totalCost: number;
  pnl: number;
  pnlRate: number;
  /** 評価額の大きい順 */
  byHolding: HoldingRow[];
  /** ASSET_CLASSES の順。保有のないクラスは含めない */
  byClass: ClassRow[];
}

export function summarize(holdings: Holding[]): Summary {
  const totalValue = holdings.reduce((sum, h) => sum + marketValue(h), 0);
  const totalCost = holdings.reduce((sum, h) => sum + costBasis(h), 0);

  const byHolding = holdings
    .map((holding) => {
      const value = marketValue(holding);
      const cost = costBasis(holding);
      return {
        holding,
        value,
        cost,
        pnl: value - cost,
        pnlRate: ratio(value - cost, cost),
        weight: ratio(value, totalValue),
      };
    })
    .sort((a, b) => b.value - a.value);

  const byClass = ASSET_CLASSES.flatMap((assetClass) => {
    const inClass = holdings.filter((h) => h.assetClass === assetClass);
    if (inClass.length === 0) return [];
    const value = inClass.reduce((sum, h) => sum + marketValue(h), 0);
    return [{ assetClass, value, weight: ratio(value, totalValue) }];
  });

  return {
    totalValue,
    totalCost,
    pnl: totalValue - totalCost,
    pnlRate: ratio(totalValue - totalCost, totalCost),
    byHolding,
    byClass,
  };
}

export interface HoldingInput {
  assetClass: unknown;
  code: unknown;
  name: unknown;
  sector: unknown;
  quantity: unknown;
  costPrice: unknown;
  currentPrice: unknown;
  priceUpdatedAt?: unknown;
}

function text(value: unknown): string {
  return typeof value === "string" ? value.trim() : "";
}

function nonNegative(value: unknown): number | null {
  const n = typeof value === "string" && value.trim() !== "" ? Number(value) : value;
  return typeof n === "number" && Number.isFinite(n) && n >= 0 ? n : null;
}

/** 入力を検証して Holding を作る。不正なら null */
export function createHolding(input: HoldingInput, id: string): Holding | null {
  if (!isAssetClass(input.assetClass)) return null;
  const name = text(input.name);
  if (!name) return null;

  const quantity = nonNegative(input.quantity);
  const costPrice = nonNegative(input.costPrice);
  const currentPrice = nonNegative(input.currentPrice);
  if (quantity === null || costPrice === null || currentPrice === null) return null;

  const base = {
    id,
    assetClass: input.assetClass,
    code: text(input.code),
    name,
    sector: text(input.sector),
    priceUpdatedAt: text(input.priceUpdatedAt),
  };

  // 現金・その他は金額だけを扱う。取得額が未入力なら現在の金額と同じとみなす
  if (input.assetClass === "cash" || input.assetClass === "other") {
    const amount = currentPrice;
    return { ...base, quantity: 1, costPrice: costPrice || amount, currentPrice: amount };
  }

  return { ...base, quantity, costPrice, currentPrice };
}

const DATE_RE = /^\d{4}-\d{2}-\d{2}$/;

function emptyByClass(): Record<AssetClass, number> {
  return { jp_stock: 0, fund: 0, cash: 0, other: 0 };
}

function parseSnapshot(value: unknown): Snapshot | null {
  if (typeof value !== "object" || value === null) return null;
  const v = value as Record<string, unknown>;
  if (typeof v.date !== "string" || !DATE_RE.test(v.date)) return null;
  const totalValue = nonNegative(v.totalValue);
  const totalCost = nonNegative(v.totalCost);
  if (totalValue === null || totalCost === null) return null;

  const byClass = emptyByClass();
  if (typeof v.byClass === "object" && v.byClass !== null) {
    for (const c of ASSET_CLASSES) {
      byClass[c] = nonNegative((v.byClass as Record<string, unknown>)[c]) ?? 0;
    }
  }
  return { date: v.date, totalValue, totalCost, byClass };
}

/** 保存データを検証・正規化する。壊れた要素は捨てる */
export function parsePortfolioData(value: unknown): PortfolioData {
  if (typeof value !== "object" || value === null) return { holdings: [], snapshots: [] };
  const v = value as Record<string, unknown>;

  const holdings = Array.isArray(v.holdings)
    ? v.holdings.flatMap((item) => {
        if (typeof item !== "object" || item === null) return [];
        const raw = item as Record<string, unknown> & HoldingInput;
        if (typeof raw.id !== "string" || raw.id === "") return [];
        const h = createHolding(raw, raw.id);
        return h ? [h] : [];
      })
    : [];

  const snapshots = Array.isArray(v.snapshots)
    ? v.snapshots.flatMap((s) => {
        const parsed = parseSnapshot(s);
        return parsed ? [parsed] : [];
      })
    : [];

  return { holdings, snapshots };
}

export function takeSnapshot(holdings: Holding[], date: string): Snapshot {
  const byClass = emptyByClass();
  for (const h of holdings) byClass[h.assetClass] += marketValue(h);
  const { totalValue, totalCost } = summarize(holdings);
  return { date, totalValue, totalCost, byClass };
}

/** 同じ日付のスナップショットを置き換え、日付の昇順に並べる */
export function upsertSnapshot(snapshots: Snapshot[], snapshot: Snapshot): Snapshot[] {
  return [...snapshots.filter((s) => s.date !== snapshot.date), snapshot].sort((a, b) =>
    a.date.localeCompare(b.date),
  );
}
