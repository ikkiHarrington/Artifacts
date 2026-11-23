import { percent, yen } from "@/lib/format";
import type { ClassRow } from "@/lib/portfolio";
import { ASSET_CLASS_LABELS, type AssetClass } from "@/types/portfolio";

export const CLASS_COLORS: Record<AssetClass, string> = {
  jp_stock: "#2563eb",
  fund: "#0d9488",
  cash: "#a1a1aa",
  other: "#d97706",
};

const RADIUS = 40;
const CIRCUMFERENCE = 2 * Math.PI * RADIUS;

/** 資産クラス別のドーナツグラフ */
export function AllocationChart({ rows }: { rows: ClassRow[] }) {
  if (rows.length === 0) return <p className="text-sm text-zinc-500">データがありません</p>;

  const segments = rows.reduce<{ row: ClassRow; offset: number }[]>((acc, row) => {
    const prev = acc.at(-1);
    const offset = prev ? prev.offset + prev.row.weight * CIRCUMFERENCE : 0;
    return [...acc, { row, offset }];
  }, []);

  return (
    <div className="flex items-center gap-6">
      <svg viewBox="0 0 100 100" className="h-36 w-36 -rotate-90" role="img" aria-label="資産配分">
        {segments.map(({ row, offset }) => (
          <circle
            key={row.assetClass}
            cx="50"
            cy="50"
            r={RADIUS}
            fill="none"
            stroke={CLASS_COLORS[row.assetClass]}
            strokeWidth="16"
            strokeDasharray={`${row.weight * CIRCUMFERENCE} ${CIRCUMFERENCE}`}
            strokeDashoffset={-offset}
          />
        ))}
      </svg>
      <ul className="space-y-1 text-sm">
        {rows.map((row) => (
          <li key={row.assetClass} className="flex items-center gap-2">
            <span className="inline-block h-3 w-3 rounded-sm" style={{ background: CLASS_COLORS[row.assetClass] }} />
            <span className="w-16">{ASSET_CLASS_LABELS[row.assetClass]}</span>
            <span className="w-14 text-right tabular-nums">{percent(row.weight)}</span>
            <span className="text-zinc-500 tabular-nums">{yen(row.value)}</span>
          </li>
        ))}
      </ul>
    </div>
  );
}
