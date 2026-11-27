import { percent } from "@/lib/text/format";
import type { ClassRow } from "@/lib/data/portfolio";
import { ASSET_CLASS_LABELS, type AssetClass } from "@/types/portfolio";

/** 隣り合っても見分けやすいよう、色相だけでなく明るさも変えている */
export const CLASS_COLORS: Record<AssetClass, string> = {
  fund: "#2457c5",
  jp_stock: "#e07b39",
  cash: "#b7bec6",
  other: "#6a3fb5",
};

const RADIUS = 40;
const CIRCUMFERENCE = 2 * Math.PI * RADIUS;

/** 資産クラス別のドーナツグラフ */
export function AllocationChart({ rows }: { rows: ClassRow[] }) {
  if (rows.length === 0) return <p className="text-sm text-muted">データがありません</p>;

  const segments = rows.reduce<{ row: ClassRow; offset: number }[]>((acc, row) => {
    const prev = acc.at(-1);
    const offset = prev ? prev.offset + prev.row.weight * CIRCUMFERENCE : 0;
    return [...acc, { row, offset }];
  }, []);
  const label = rows.map((r) => `${ASSET_CLASS_LABELS[r.assetClass]} ${percent(r.weight)}`).join("、");

  return (
    <div className="flex flex-wrap items-center gap-6">
      <svg viewBox="0 0 100 100" className="h-36 w-36 shrink-0 -rotate-90" role="img" aria-label={`資産配分: ${label}`}>
        {segments.map(({ row, offset }) => (
          <circle
            key={row.assetClass}
            cx="50"
            cy="50"
            r={RADIUS}
            fill="none"
            stroke={CLASS_COLORS[row.assetClass]}
            strokeWidth="14"
            strokeDasharray={`${row.weight * CIRCUMFERENCE} ${CIRCUMFERENCE}`}
            strokeDashoffset={-offset}
          />
        ))}
      </svg>
      <ul className="min-w-40 space-y-2 text-sm">
        {rows.map((row) => (
          <li key={row.assetClass} className="flex items-center gap-2">
            <span className="inline-block h-3 w-3 rounded-sm" style={{ background: CLASS_COLORS[row.assetClass] }} />
            <span>{ASSET_CLASS_LABELS[row.assetClass]}</span>
            <span className="ml-auto pl-4 font-semibold tabular-nums">{percent(row.weight)}</span>
          </li>
        ))}
      </ul>
    </div>
  );
}
