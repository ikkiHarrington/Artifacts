"use client";

import { percent, yen } from "@/lib/format";
import type { HoldingRow } from "@/lib/portfolio";
import { ASSET_CLASS_LABELS, type Holding } from "@/types/portfolio";

interface Props {
  rows: HoldingRow[];
  onEdit: (holding: Holding) => void;
  onDelete: (holding: Holding) => void;
}

function pnlClass(pnl: number): string {
  if (pnl > 0) return "text-emerald-700";
  if (pnl < 0) return "text-red-600";
  return "";
}

export function HoldingsTable({ rows, onEdit, onDelete }: Props) {
  if (rows.length === 0) {
    return <p className="text-sm text-zinc-500">保有がまだありません。下のフォームから追加してください。</p>;
  }
  return (
    <div className="overflow-x-auto">
      <table className="w-full text-sm">
        <thead className="text-left text-xs text-zinc-500">
          <tr>
            <th className="py-1">名称</th>
            <th>種類</th>
            <th className="text-right">評価額</th>
            <th className="text-right">損益</th>
            <th className="text-right">比率</th>
            <th className="text-right">価格更新</th>
            <th />
          </tr>
        </thead>
        <tbody>
          {rows.map(({ holding: h, value, pnl, pnlRate, weight }) => (
            <tr key={h.id} className="border-t border-zinc-100">
              <td className="py-1.5">
                {h.name}
                {h.code && <span className="ml-1 text-xs text-zinc-400">{h.code}</span>}
              </td>
              <td>{ASSET_CLASS_LABELS[h.assetClass]}</td>
              <td className="text-right tabular-nums">{h.currentPrice === 0 ? "未取得" : yen(value)}</td>
              <td className={`text-right tabular-nums ${pnlClass(pnl)}`}>
                {h.currentPrice === 0 ? "-" : `${yen(pnl)} (${percent(pnlRate, { signed: true })})`}
              </td>
              <td className="text-right tabular-nums">{percent(weight)}</td>
              <td className="text-right text-xs text-zinc-400">
                {h.priceUpdatedAt ? new Date(h.priceUpdatedAt).toLocaleDateString("ja-JP") : "手入力"}
              </td>
              <td className="whitespace-nowrap text-right">
                <button type="button" className="px-1 text-xs text-zinc-600 hover:underline" onClick={() => onEdit(h)}>
                  編集
                </button>
                <button
                  type="button"
                  className="px-1 text-xs text-red-600 hover:underline"
                  onClick={() => onDelete(h)}
                  aria-label={`${h.name}を削除`}
                >
                  削除
                </button>
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
