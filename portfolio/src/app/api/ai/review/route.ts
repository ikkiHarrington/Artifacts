import { jstDate } from "@/lib/format";
import { AiError, buildPortfolioContext, getProvider, loadPrompts } from "@/lib/ai";
import { addReview } from "@/lib/portfolio";
import { loadPortfolio, savePortfolio } from "@/lib/storage";

/** マスク済みデータで見直しレポートを作り、履歴に保存する */
export async function POST(request: Request) {
  const body = (await request.json().catch(() => ({}))) as { revealNames?: unknown };
  try {
    const provider = getProvider();
    const data = await loadPortfolio();
    if (data.holdings.length === 0) throw new AiError("保有が登録されていません。");

    // プロンプトは毎回ファイルから読む(prompts/*.md を保存すれば、ビルドなしで反映される)
    const prompts = await loadPrompts();
    const now = new Date();
    const context = buildPortfolioContext(data, jstDate(now), body.revealNames === true);
    const text = await provider.complete({
      system: prompts.system,
      messages: [{ role: "user", content: `# ポートフォリオ\n\n${context}\n\n---\n\n${prompts.review}` }],
      effort: "high",
    });

    // AI 呼び出しの間に保有が編集されていても上書きしないよう、保存直前に読み直す
    const latest = await loadPortfolio();
    const review = { createdAt: now.toISOString(), text };
    const next = { ...latest, reviews: addReview(latest.reviews, review) };
    await savePortfolio(next);
    return Response.json({ review, reviews: next.reviews });
  } catch (e) {
    const status = e instanceof AiError ? 502 : 500;
    return Response.json({ error: e instanceof Error ? e.message : String(e) }, { status });
  }
}
