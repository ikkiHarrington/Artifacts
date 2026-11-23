import { jstDate } from "@/lib/format";
import { AiError, buildPortfolioContext, getProvider, loadPrompts, parseChatTurns } from "@/lib/ai";
import { loadPortfolio } from "@/lib/storage";

/** マスク済みのポートフォリオを前提に質問に答える。会話履歴は保存しない */
export async function POST(request: Request) {
  const body = (await request.json().catch(() => ({}))) as { revealNames?: unknown; messages?: unknown };
  const messages = parseChatTurns(body.messages);
  if (!messages) return Response.json({ error: "会話の形式が不正です" }, { status: 400 });

  try {
    const provider = getProvider();
    const [data, prompts] = await Promise.all([loadPortfolio(), loadPrompts()]);
    const context = buildPortfolioContext(data, jstDate(new Date()), body.revealNames === true);
    const text = await provider.complete({
      system: `${prompts.system}\n\n# 現在のポートフォリオ\n\n${context}`,
      messages,
      effort: "medium",
    });
    return Response.json({ text });
  } catch (e) {
    const status = e instanceof AiError ? 502 : 500;
    return Response.json({ error: e instanceof Error ? e.message : String(e) }, { status });
  }
}
