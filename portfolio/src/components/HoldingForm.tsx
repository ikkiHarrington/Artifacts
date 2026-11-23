"use client";

import { useState, type FormEvent } from "react";
import { createHolding } from "@/lib/portfolio";
import { ASSET_CLASSES, ASSET_CLASS_LABELS, type AssetClass, type Holding } from "@/types/portfolio";

interface Props {
  /** 編集時の元データ。未指定なら新規追加 */
  initial?: Holding;
  onSubmit: (holding: Holding) => void;
  onCancel?: () => void;
}

interface Fields {
  assetClass: AssetClass;
  code: string;
  name: string;
  sector: string;
  quantity: string;
  costPrice: string;
  currentPrice: string;
}

function toFields(h?: Holding): Fields {
  if (!h) {
    return { assetClass: "jp_stock", code: "", name: "", sector: "", quantity: "", costPrice: "", currentPrice: "" };
  }
  const num = (n: number) => (n === 0 ? "" : String(n));
  return {
    assetClass: h.assetClass,
    code: h.code,
    name: h.name,
    sector: h.sector,
    quantity: num(h.quantity),
    costPrice: num(h.costPrice),
    currentPrice: num(h.currentPrice),
  };
}

const inputClass = "w-full rounded border border-zinc-300 px-2 py-1 text-sm";

export function HoldingForm({ initial, onSubmit, onCancel }: Props) {
  const [fields, setFields] = useState<Fields>(() => toFields(initial));
  const [error, setError] = useState("");
  const isAmountOnly = fields.assetClass === "cash" || fields.assetClass === "other";
  const isFund = fields.assetClass === "fund";

  function set<K extends keyof Fields>(key: K, value: Fields[K]) {
    setFields((f) => ({ ...f, [key]: value }));
  }

  function handleSubmit(e: FormEvent) {
    e.preventDefault();
    const h = createHolding(
      {
        ...fields,
        quantity: isAmountOnly ? 1 : fields.quantity,
        costPrice: isAmountOnly ? 0 : fields.costPrice,
        currentPrice: fields.currentPrice === "" ? 0 : fields.currentPrice,
        priceUpdatedAt: initial?.priceUpdatedAt ?? "",
        // 取り込んだ保有を編集しても、次回の取り込みで入れ替え対象になるよう取り込み元を残す
        source: initial?.source,
      },
      initial?.id ?? crypto.randomUUID(),
    );
    if (!h || (!isAmountOnly && h.quantity === 0)) {
      setError("名称と、0 以上の数値を入力してください");
      return;
    }
    setError("");
    onSubmit(h);
    if (!initial) setFields(toFields());
  }

  return (
    <form onSubmit={handleSubmit} className="grid grid-cols-2 gap-2 md:grid-cols-4" aria-label="保有の入力">
      <label className="text-xs text-zinc-600">
        種類
        <select
          className={inputClass}
          value={fields.assetClass}
          onChange={(e) => set("assetClass", e.target.value as AssetClass)}
        >
          {ASSET_CLASSES.map((c) => (
            <option key={c} value={c}>
              {ASSET_CLASS_LABELS[c]}
            </option>
          ))}
        </select>
      </label>
      {!isAmountOnly && (
        <label className="text-xs text-zinc-600">
          {isFund ? "コード(任意)" : "銘柄コード"}
          <input className={inputClass} value={fields.code} onChange={(e) => set("code", e.target.value)} placeholder={isFund ? "" : "7203"} />
        </label>
      )}
      <label className="text-xs text-zinc-600">
        名称
        <input className={inputClass} value={fields.name} onChange={(e) => set("name", e.target.value)} />
      </label>
      <label className="text-xs text-zinc-600">
        {isFund ? "分類(例:全世界株式)" : "業種・分類"}
        <input className={inputClass} value={fields.sector} onChange={(e) => set("sector", e.target.value)} />
      </label>
      {!isAmountOnly && (
        <>
          <label className="text-xs text-zinc-600">
            {isFund ? "口数" : "株数"}
            <input className={inputClass} inputMode="decimal" value={fields.quantity} onChange={(e) => set("quantity", e.target.value)} />
          </label>
          <label className="text-xs text-zinc-600">
            {isFund ? "取得単価(1万口あたり)" : "取得単価"}
            <input className={inputClass} inputMode="decimal" value={fields.costPrice} onChange={(e) => set("costPrice", e.target.value)} />
          </label>
        </>
      )}
      <label className="text-xs text-zinc-600">
        {isAmountOnly ? "金額" : isFund ? "基準価額" : "現在値(空欄なら価格更新で取得)"}
        <input className={inputClass} inputMode="decimal" value={fields.currentPrice} onChange={(e) => set("currentPrice", e.target.value)} />
      </label>
      <div className="col-span-2 flex items-end gap-2 md:col-span-1">
        <button type="submit" className="rounded bg-zinc-900 px-3 py-1.5 text-sm text-white hover:bg-zinc-700">
          {initial ? "更新" : "追加"}
        </button>
        {onCancel && (
          <button type="button" onClick={onCancel} className="rounded border px-3 py-1.5 text-sm">
            キャンセル
          </button>
        )}
      </div>
      {error && (
        <p role="alert" className="col-span-full text-sm text-red-600">
          {error}
        </p>
      )}
    </form>
  );
}
