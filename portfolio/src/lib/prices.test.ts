import { fetchJpStockPrice, refreshPrices } from "./prices";
import type { Holding } from "@/types/portfolio";

function jsonResponse(body: unknown, status = 200): Response {
  return new Response(JSON.stringify(body), { status, headers: { "Content-Type": "application/json" } });
}

describe("fetchJpStockPrice", () => {
  it("東証の銘柄コードに .T を付けて取得し、regularMarketPrice を返す", async () => {
    const fetchMock = vi.fn(async () => jsonResponse({ chart: { result: [{ meta: { regularMarketPrice: 2512.5 } }] } }));
    await expect(fetchJpStockPrice("7203", fetchMock as unknown as typeof fetch)).resolves.toBe(2512.5);
    expect(String((fetchMock.mock.calls[0] as unknown[])[0])).toContain("/chart/7203.T?");
  });

  it("HTTP エラーや価格なしは例外にする", async () => {
    const notFound = vi.fn(async () => jsonResponse({}, 404)) as unknown as typeof fetch;
    await expect(fetchJpStockPrice("7203", notFound)).rejects.toThrow("HTTP 404");
    const empty = vi.fn(async () => jsonResponse({ chart: { result: [] } })) as unknown as typeof fetch;
    await expect(fetchJpStockPrice("7203", empty)).rejects.toThrow("含まれていません");
  });

  it("不正なコードはリクエストせずに例外にする", async () => {
    const fetchMock = vi.fn();
    await expect(fetchJpStockPrice("../x", fetchMock as unknown as typeof fetch)).rejects.toThrow("不正");
    expect(fetchMock).not.toHaveBeenCalled();
  });
});

describe("refreshPrices", () => {
  const base: Holding = {
    id: "a",
    assetClass: "jp_stock",
    code: "7203",
    name: "トヨタ",
    sector: "",
    quantity: 100,
    costPrice: 2000,
    currentPrice: 2100,
    priceUpdatedAt: "",
  };
  const now = new Date("2026-11-23T06:00:00Z");

  it("日本株だけ更新し、失敗した銘柄は前回値のままエラーを返す", async () => {
    const holdings: Holding[] = [
      base,
      { ...base, id: "b", code: "9999", name: "失敗銘柄" },
      { ...base, id: "c", assetClass: "fund", code: "", name: "投信" },
    ];
    const fetchPrice = vi.fn(async (code: string) => {
      if (code === "9999") throw new Error("HTTP 404");
      return 2600;
    });

    const result = await refreshPrices(holdings, now, fetchPrice);

    expect(result.holdings[0]).toMatchObject({ currentPrice: 2600, priceUpdatedAt: now.toISOString() });
    expect(result.holdings[1]).toEqual(holdings[1]);
    expect(result.holdings[2]).toEqual(holdings[2]);
    expect(result.errors).toEqual(["失敗銘柄: HTTP 404"]);
    expect(fetchPrice).toHaveBeenCalledTimes(2);
  });
});
