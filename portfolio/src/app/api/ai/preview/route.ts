import { jstDate } from "@/lib/format";
import { AiError, buildPortfolioContext, getProvider, loadPrompts } from "@/lib/ai";
import { loadPortfolio } from "@/lib/storage";

/** AI に送る内容(マスク済みのデータと、ファイルから読んだプロンプト)をそのまま返す。送信前の確認用 */
export async function GET(request: Request) {
  try {
    const revealNames = new URL(request.url).searchParams.get("revealNames") === "true";
    const provider = getProvider();
    const [data, prompts] = await Promise.all([loadPortfolio(), loadPrompts()]);
    return Response.json({
      provider: provider.name,
      external: provider.external,
      text: buildPortfolioContext(data, jstDate(new Date()), revealNames),
      prompts,
    });
  } catch (e) {
    const status = e instanceof AiError ? 400 : 500;
    return Response.json({ error: e instanceof Error ? e.message : String(e) }, { status });
  }
}
