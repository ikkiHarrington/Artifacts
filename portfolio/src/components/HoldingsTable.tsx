"use client";

import { percent, yen } from "@/lib/text/format";
import type { HoldingRow } from "@/lib/data/portfolio";
import { ASSET_CLASS_LABELS, type Holding } from "@/types/portfolio";
import { pnlTextClass } from "./ui";

interface Props {
  rows: HoldingRow[];
  onEdit: (holding: Holding) => void;
  onDelete: (holding: Holding) => void;
}

const th = "border-b border-line px-2 py-2 font-medium";
const td = "border-b border-line-soft px-2 py-2.5";
const rowButton = "h-9 rounded-md px-2.5 text-xs hover:bg-zinc-100";

export function HoldingsTable({ rows, onEdit, onDelete }: Props) {
  if (rows.length === 0) {
    return <p className="text-sm text-muted">保有がまだありません。上の「保有を追加」か「CSV を取り込む」から登録してください。</p>;
  }
  return (
    <div className="overflow-x-auto">
      <table className="w-full min-w-[640px] border-collapse text-sm">
        <thead className="text-left text-xs text-muted">
          <tr>
            <th className={th}>銘柄</th>
            <th className={`${th} text-right`}>評価額</th>
            <th className={`${th} text-right`}>比率</th>
            <th className={`${th} text-right`}>損益</th>
            <th className={`${th} text-right`}>価格更新</th>
            <th className={th}>
              <span className="sr-only">操作</span>
            </th>
          </tr>
        </thead>
        <tbody>
          {rows.map(({ holding: h, value, pnl, pnlRate, weight }) => {
            const noPrice = h.currentPrice === 0;
            return (
              <tr key={h.id}>
                <td className={td}>
                  {h.name}
                  <span className="ml-1.5 text-xs text-muted">
                    {h.code && `${h.code} · `}
                    {ASSET_CLASS_LABELS[h.assetClass]}
                  </span>
                </td>
                <td className={`${td} text-right tabular-nums`}>{noPrice ? "未取得" : yen(value)}</td>
                <td className={`${td} text-right tabular-nums`}>{percent(weight)}</td>
                <td className={`${td} text-right tabular-nums ${noPrice ? "" : pnlTextClass(pnl)}`}>
                  {noPrice ? (
                    "-"
                  ) : (
                    <>
                      {percent(pnlRate, { signed: true })}
                      <span className="block text-xs">{yen(pnl, { signed: true })}</span>
                    </>
                  )}
                </td>
                <td className={`${td} text-right text-xs text-muted`}>
                  {h.priceUpdatedAt ? new Date(h.priceUpdatedAt).toLocaleDateString("ja-JP") : "手入力"}
                </td>
                <td className={`${td} whitespace-nowrap text-right`}>
                  <button type="button" className={`${rowButton} text-ink`} onClick={() => onEdit(h)} aria-label={`${h.name}を編集`}>
                    編集
                  </button>
                  <button type="button" className={`${rowButton} text-loss`} onClick={() => onDelete(h)} aria-label={`${h.name}を削除`}>
                    削除
                  </button>
                </td>
              </tr>
            );
          })}
        </tbody>
      </table>
    </div>
  );
}
