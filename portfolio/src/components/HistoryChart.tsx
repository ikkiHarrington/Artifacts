import { yen } from "@/lib/format";
import type { Snapshot } from "@/types/portfolio";

const W = 600;
const H = 160;
const PAD = 8;

/** 総資産(評価額)と取得額の推移 */
export function HistoryChart({ snapshots }: { snapshots: Snapshot[] }) {
  if (snapshots.length < 2) {
    return (
      <p className="text-sm text-zinc-500">
        「価格を更新」を実行した日ごとに記録されます。2日分以上たまると推移を表示します。
      </p>
    );
  }

  const values = snapshots.flatMap((s) => [s.totalValue, s.totalCost]);
  const min = Math.min(...values);
  const max = Math.max(...values);
  const span = max - min || 1;
  const x = (i: number) => PAD + (i * (W - PAD * 2)) / (snapshots.length - 1);
  const y = (v: number) => H - PAD - ((v - min) * (H - PAD * 2)) / span;
  const line = (pick: (s: Snapshot) => number) => snapshots.map((s, i) => `${x(i)},${y(pick(s))}`).join(" ");

  return (
    <div>
      <svg viewBox={`0 0 ${W} ${H}`} className="h-40 w-full" role="img" aria-label="総資産の推移">
        <polyline points={line((s) => s.totalCost)} fill="none" stroke="#a1a1aa" strokeWidth="1.5" strokeDasharray="4 3" />
        <polyline points={line((s) => s.totalValue)} fill="none" stroke="#2563eb" strokeWidth="2" />
      </svg>
      <div className="flex justify-between text-xs text-zinc-500">
        <span>{snapshots[0].date}</span>
        <span>
          <span className="text-blue-600">― 評価額</span> <span>- - 取得額</span> ・ 範囲 {yen(min)} 〜 {yen(max)}
        </span>
        <span>{snapshots.at(-1)!.date}</span>
      </div>
    </div>
  );
}
