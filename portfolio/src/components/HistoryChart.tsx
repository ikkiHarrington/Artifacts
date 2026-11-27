import { yen } from "@/lib/text/format";
import type { Snapshot } from "@/types/portfolio";

const W = 600;
const H = 160;
const PAD = 8;

/** 総資産(評価額)と取得額の推移 */
export function HistoryChart({ snapshots }: { snapshots: Snapshot[] }) {
  if (snapshots.length < 2) {
    return (
      <p className="text-sm text-muted">
        「価格を更新して記録」を押した日ごとに記録されます。2日分以上たまると推移を表示します。
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
  const first = snapshots[0];
  const last = snapshots.at(-1)!;

  return (
    <div className="space-y-1">
      <div className="flex flex-wrap justify-between gap-2 text-xs text-muted">
        <span>
          <span className="text-accent">━</span> 評価額 <span className="pl-2">┅</span> 取得額
        </span>
        <span className="tabular-nums">
          範囲 {yen(min)} 〜 {yen(max)}
        </span>
      </div>
      <svg
        viewBox={`0 0 ${W} ${H}`}
        preserveAspectRatio="none"
        className="h-32 w-full"
        role="img"
        aria-label={`評価額の推移: ${first.date} ${yen(first.totalValue)} から ${last.date} ${yen(last.totalValue)}`}
      >
        <line x1="0" y1={H - 1} x2={W} y2={H - 1} stroke="#e3e5e8" vectorEffect="non-scaling-stroke" />
        <polyline points={line((s) => s.totalCost)} fill="none" stroke="#8a9199" strokeWidth="2" strokeDasharray="6 5" vectorEffect="non-scaling-stroke" />
        <polyline points={line((s) => s.totalValue)} fill="none" stroke="#2457c5" strokeWidth="3" vectorEffect="non-scaling-stroke" />
      </svg>
      <div className="flex justify-between text-xs text-muted tabular-nums">
        <span>{first.date}</span>
        <span>{last.date}</span>
      </div>
    </div>
  );
}
