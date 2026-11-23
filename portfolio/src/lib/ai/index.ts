import { createClaudeProvider } from "./claude";
import { createClaudeCodeProvider } from "./claudeCode";
import { renderMaskedPortfolio, maskPortfolio } from "../mask";
import { createOllamaProvider } from "./ollama";
import { AiError, type AiProvider, type ChatTurn } from "./types";
import type { PortfolioData } from "@/types/portfolio";

export { AiError } from "./types";
export type { AiProvider, ChatTurn } from "./types";

/** AI_PROVIDER(claude | claude-code | ollama、既定は claude)で実装を選ぶ */
export function getProvider(env: Record<string, string | undefined> = process.env): AiProvider {
  const name = (env.AI_PROVIDER ?? "claude").trim().toLowerCase();
  if (name === "claude" || name === "") return createClaudeProvider();
  if (name === "claude-code") return createClaudeCodeProvider();
  if (name === "ollama") return createOllamaProvider();
  throw new AiError(`AI_PROVIDER の値が不正です: ${name}(claude / claude-code / ollama のいずれかを指定してください)`);
}

export const SYSTEM_PROMPT = `あなたは個人投資家の資産ポートフォリオを定期的に見直すアシスタントです。

- 渡されるデータは、割合(%)と指数だけに加工されています。金額・数量・総資産額は意図的に伏せているので、推測したり尋ねたりしないでください。
- 「銘柄A」のような匿名ラベルの場合は、資産クラスと業種・分類の情報だけで分析してください。
- 個別銘柄の売買の推奨(「買うべき」「売るべき」など)や価格の予想はしないでください。代わりに、確認すべき観点・リスク・取りうる選択肢を整理して示してください。
- データから言えることと一般論は区別して書いてください。
- 日本語で、Markdown の見出しと箇条書きを使って簡潔にまとめてください。`;

export const REVIEW_INSTRUCTION = `上のポートフォリオを定期見直しとしてレビューしてください。次の見出しでまとめてください。

1. 全体の状況(配分と損益の要点を3行以内で)
2. 前回からの変化(推移の記録がある場合。取得額の指数の変化は入金・売買、評価額だけの変化は値動きとして区別する)
3. 配分・集中のリスク(資産クラス・業種・銘柄の偏り)
4. 次回の見直しまでに確認するとよいこと(3〜5項目)`;

/** AI に渡すポートフォリオのテキスト(マスク済み)。プレビューと送信で同じものを使う */
export function buildPortfolioContext(data: PortfolioData, asOf: string, revealNames: boolean): string {
  return renderMaskedPortfolio(maskPortfolio(data.holdings, data.snapshots, asOf, { revealNames }));
}

const MAX_TURNS = 40;
const MAX_CONTENT = 4000;

/** チャット履歴を検証する。user から始まって交互に並び、user で終わること */
export function parseChatTurns(value: unknown): ChatTurn[] | null {
  if (!Array.isArray(value) || value.length === 0 || value.length > MAX_TURNS) return null;
  const turns: ChatTurn[] = [];
  for (const [i, item] of value.entries()) {
    const { role, content } = (item ?? {}) as Record<string, unknown>;
    const expected = i % 2 === 0 ? "user" : "assistant";
    if (role !== expected || typeof content !== "string") return null;
    const trimmed = content.trim();
    if (!trimmed || trimmed.length > MAX_CONTENT) return null;
    turns.push({ role: expected, content: trimmed });
  }
  return turns.at(-1)!.role === "user" ? turns : null;
}
