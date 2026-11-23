import { createHolding, type HoldingInput } from "@/lib/portfolio";
import { loadPortfolio, savePortfolio } from "@/lib/storage";

export async function GET() {
  try {
    return Response.json(await loadPortfolio());
  } catch (e) {
    return Response.json({ error: e instanceof Error ? e.message : String(e) }, { status: 500 });
  }
}

/** 保有一覧をまるごと置き換える。スナップショットはそのまま残す */
export async function PUT(request: Request) {
  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return Response.json({ error: "JSON を解釈できません" }, { status: 400 });
  }
  const items = (body as { holdings?: unknown })?.holdings;
  if (!Array.isArray(items)) return Response.json({ error: "holdings が配列ではありません" }, { status: 400 });

  const holdings = [];
  for (const item of items) {
    const raw = (item ?? {}) as HoldingInput & { id?: unknown };
    const h = typeof raw.id === "string" && raw.id ? createHolding(raw, raw.id) : null;
    if (!h) return Response.json({ error: "不正な保有データが含まれています" }, { status: 400 });
    holdings.push(h);
  }

  try {
    const data = await loadPortfolio();
    const next = { ...data, holdings };
    await savePortfolio(next);
    return Response.json(next);
  } catch (e) {
    return Response.json({ error: e instanceof Error ? e.message : String(e) }, { status: 500 });
  }
}
