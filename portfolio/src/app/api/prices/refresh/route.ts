import { jstDate } from "@/lib/text/format";
import { takeSnapshot, upsertSnapshot } from "@/lib/data/portfolio";
import { refreshPrices } from "@/lib/data/prices";
import { loadPortfolio, savePortfolio } from "@/lib/data/storage";

/** 日本株の価格を更新し、今日のスナップショットを記録する */
export async function POST() {
  try {
    const now = new Date();
    const data = await loadPortfolio();
    const { holdings, errors } = await refreshPrices(data.holdings, now);
    const snapshots = upsertSnapshot(data.snapshots, takeSnapshot(holdings, jstDate(now)));
    const next = { ...data, holdings, snapshots };
    await savePortfolio(next);
    return Response.json({ data: next, errors });
  } catch (e) {
    return Response.json({ error: e instanceof Error ? e.message : String(e) }, { status: 500 });
  }
}
