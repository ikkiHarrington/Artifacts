import type { Holding } from "@/types/portfolio";

/**
 * 日本株の現在値を Yahoo Finance のチャート API(非公式)から取得する。
 * 個人利用の範囲で、銘柄ごとに1リクエストだけ送る。
 */
export async function fetchJpStockPrice(code: string, fetchImpl: typeof fetch = fetch): Promise<number> {
  if (!/^[0-9A-Z]{4}$/.test(code)) throw new Error(`銘柄コードの形式が不正です: ${code}`);

  const url = `https://query1.finance.yahoo.com/v8/finance/chart/${code}.T?range=1d&interval=1d`;
  const res = await fetchImpl(url, { headers: { "User-Agent": "Mozilla/5.0 (portfolio-local)" } });
  if (!res.ok) throw new Error(`価格の取得に失敗しました (${code}): HTTP ${res.status}`);

  const body: unknown = await res.json();
  const price = (body as { chart?: { result?: { meta?: { regularMarketPrice?: unknown } }[] } })?.chart
    ?.result?.[0]?.meta?.regularMarketPrice;
  if (typeof price !== "number" || !Number.isFinite(price) || price <= 0) {
    throw new Error(`価格がレスポンスに含まれていません (${code})`);
  }
  return price;
}

export interface RefreshResult {
  holdings: Holding[];
  /** 取得に失敗した銘柄のメッセージ。失敗した銘柄は前回の価格のまま */
  errors: string[];
}

/** 日本株の現在値を更新する。投資信託・現金・その他は手入力のため対象外 */
export async function refreshPrices(
  holdings: Holding[],
  now: Date,
  fetchPrice: (code: string) => Promise<number> = (code) => fetchJpStockPrice(code),
): Promise<RefreshResult> {
  const errors: string[] = [];
  const updated = await Promise.all(
    holdings.map(async (h) => {
      if (h.assetClass !== "jp_stock") return h;
      try {
        const currentPrice = await fetchPrice(h.code);
        return { ...h, currentPrice, priceUpdatedAt: now.toISOString() };
      } catch (e) {
        errors.push(`${h.name}: ${e instanceof Error ? e.message : String(e)}`);
        return h;
      }
    }),
  );
  return { holdings: updated, errors };
}
