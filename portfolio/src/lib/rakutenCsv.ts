import { parseCsv } from "./csv";
import { createHolding, marketValue } from "./portfolio";
import type { AssetClass, Holding } from "@/types/portfolio";

/**
 * 楽天証券の「保有商品一覧(すべて)」CSV(assetbalance(all)_*.csv、Shift_JIS)を取り込む。
 *
 * 構成:「■資産合計欄」(資産の種類ごとの集計)→「■ 保有商品詳細」(1行1銘柄)→「■参考為替レート」。
 * 明細は見出し行の列名で列を探すので、列の順番が変わっても読める。
 */

export const RAKUTEN_SOURCE = "rakuten";

export interface ImportResult {
  holdings: Holding[];
  warnings: string[];
}

/** "1,234.5" "+12" "-3.4" → 数値。"-" や空欄は null */
export function parseNumber(value: string | undefined): number | null {
  const s = (value ?? "").replace(/[,\s]/g, "").replace(/^\+/, "");
  if (s === "" || s === "-") return null;
  const n = Number(s);
  return Number.isFinite(n) ? n : null;
}

const COLUMNS = {
  type: "種別",
  code: "銘柄コード・ティッカー",
  name: "銘柄",
  quantity: "保有数量",
  costPrice: "平均取得価額",
  currentPrice: "現在値",
  valueYen: "時価評価額[円]",
  pnlYen: "評価損益[円]",
} as const;

const CASH_TYPES = new Set(["預り金", "外貨預り金", "楽天・マネーファンド"]);

function classify(type: string): AssetClass {
  if (type === "国内株式") return "jp_stock";
  if (type === "投資信託") return "fund";
  if (CASH_TYPES.has(type)) return "cash";
  return "other";
}

/** 同じ銘柄が NISA と特定口座など複数行にあるとき、1件にまとめるためのキー */
export function holdingKey(h: Pick<Holding, "assetClass" | "code" | "name">): string {
  return `${h.assetClass}:${h.code || h.name}`;
}

/** Shift_JIS のバイト列を文字列にする(ブラウザ・Node の TextDecoder を使う) */
export function decodeShiftJis(bytes: ArrayBuffer | Uint8Array): string {
  return new TextDecoder("shift_jis").decode(bytes);
}

export function parseRakutenCsv(text: string, now: Date, newId: () => string): ImportResult {
  const rows = parseCsv(text);
  const warnings: string[] = [];

  const headerIndex = rows.findIndex((r) => r[0] === COLUMNS.type && r.includes(COLUMNS.code));
  if (headerIndex === -1) {
    throw new Error("楽天証券の保有商品一覧の CSV ではないようです(「種別」「銘柄コード・ティッカー」の見出しが見つかりません)");
  }
  const header = rows[headerIndex];
  const col = Object.fromEntries(Object.entries(COLUMNS).map(([key, label]) => [key, header.indexOf(label)])) as Record<
    keyof typeof COLUMNS,
    number
  >;
  const missing = Object.entries(col).filter(([, i]) => i === -1);
  if (missing.length > 0) {
    throw new Error(`CSV に必要な列がありません: ${missing.map(([k]) => COLUMNS[k as keyof typeof COLUMNS]).join("、")}`);
  }

  const priceUpdatedAt = now.toISOString();
  const merged = new Map<string, Holding>();

  function add(h: Holding) {
    const key = holdingKey(h);
    const prev = merged.get(key);
    if (!prev) {
      merged.set(key, h);
      return;
    }
    if (h.assetClass === "cash" || h.assetClass === "other") {
      merged.set(key, { ...prev, costPrice: prev.costPrice + h.costPrice, currentPrice: prev.currentPrice + h.currentPrice });
      return;
    }
    const quantity = prev.quantity + h.quantity;
    const costPrice = quantity === 0 ? 0 : (prev.costPrice * prev.quantity + h.costPrice * h.quantity) / quantity;
    merged.set(key, { ...prev, quantity, costPrice });
  }

  // 明細は見出しの次の行から、空行または次のセクション(■)まで
  for (let i = headerIndex + 1; i < rows.length; i++) {
    const r = rows[i];
    if (r.length === 0 || r[0].startsWith("■")) break;

    const type = r[col.type].trim();
    const code = r[col.code].trim();
    const name = r[col.name].trim() || type;
    const assetClass = classify(type);
    const valueYen = parseNumber(r[col.valueYen]);
    const label = code ? `${name}(${code})` : name;

    if (assetClass === "jp_stock" || assetClass === "fund") {
      const quantity = parseNumber(r[col.quantity]);
      const costPrice = parseNumber(r[col.costPrice]);
      const currentPrice = parseNumber(r[col.currentPrice]);
      if (quantity === null || costPrice === null || currentPrice === null) {
        warnings.push(`${label}: 数量・取得価額・現在値のいずれかが読めないため、取り込みませんでした`);
        continue;
      }
      const h = createHolding(
        { assetClass, code, name, sector: "", quantity, costPrice, currentPrice, priceUpdatedAt, source: RAKUTEN_SOURCE },
        newId(),
      );
      if (!h) {
        warnings.push(`${label}: 値が不正なため、取り込みませんでした`);
        continue;
      }
      // 単位の解釈(投信は 1万口あたり)が CSV の評価額と合っているか確かめる
      if (valueYen !== null && valueYen > 0 && Math.abs(marketValue(h) - valueYen) / valueYen > 0.01) {
        warnings.push(`${label}: 数量×現在値が CSV の評価額と 1% 以上ずれています。単位を確認してください`);
      }
      add(h);
      continue;
    }

    // 現金・外国株などは円換算の評価額で扱う
    if (valueYen === null) {
      warnings.push(`${label}: 円換算の評価額が読めないため、取り込みませんでした`);
      continue;
    }
    const pnlYen = parseNumber(r[col.pnlYen]) ?? 0;
    const h = createHolding(
      {
        assetClass,
        code,
        name: assetClass === "cash" ? `楽天証券 ${name}` : name,
        sector: assetClass === "other" ? type : "",
        quantity: 1,
        costPrice: Math.max(valueYen - pnlYen, 0),
        currentPrice: valueYen,
        priceUpdatedAt,
        source: RAKUTEN_SOURCE,
      },
      newId(),
    );
    if (h) add(h);
  }

  // 円の預り金は明細に出ないため、資産合計欄の「預り金」行から取る
  const summaryHeader = rows.findIndex((r, i) => i < headerIndex && r.includes("時価評価額[円]"));
  if (summaryHeader !== -1) {
    const valueCol = rows[summaryHeader].indexOf("時価評価額[円]");
    const cashRow = rows.slice(summaryHeader + 1, headerIndex).find((r) => r[0] === "預り金");
    const amount = cashRow ? parseNumber(cashRow[valueCol]) : null;
    if (amount !== null && amount > 0 && !merged.has("cash:預り金")) {
      const h = createHolding(
        { assetClass: "cash", code: "", name: "楽天証券 預り金", sector: "", quantity: 1, costPrice: amount, currentPrice: amount, priceUpdatedAt, source: RAKUTEN_SOURCE },
        newId(),
      );
      if (h) merged.set("cash:預り金", h);
    }
  }

  return { holdings: [...merged.values()], warnings };
}

/**
 * 取り込み結果を既存の保有に反映する。
 * 前回取り込んだ楽天証券の保有だけを入れ替え、手入力の保有は残す。
 * 同じ銘柄が前回もあれば、id と業種(CSV にない項目)を引き継ぐ。
 */
export function applyImport(existing: Holding[], imported: Holding[]): Holding[] {
  const previous = new Map(existing.filter((h) => h.source === RAKUTEN_SOURCE).map((h) => [holdingKey(h), h]));
  const kept = existing.filter((h) => h.source !== RAKUTEN_SOURCE);
  const next = imported.map((h) => {
    const prev = previous.get(holdingKey(h));
    return prev ? { ...h, id: prev.id, sector: h.sector || prev.sector } : h;
  });
  return [...kept, ...next];
}
