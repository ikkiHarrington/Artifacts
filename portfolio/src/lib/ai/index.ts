import { createClaudeProvider } from "./claude";
import { createClaudeCodeProvider } from "./claudeCode";
import { renderMaskedPortfolio, maskPortfolio } from "../mask";
import { createOllamaProvider } from "./ollama";
import { AiError, type AiProvider, type ChatTurn } from "./types";
import type { PortfolioData } from "@/types/portfolio";

export { AiError } from "./types";
export { REVIEW_INSTRUCTION, SYSTEM_PROMPT, loadPrompts, promptsDir, type Prompts } from "./prompts";
export type { AiProvider, ChatTurn } from "./types";

/** AI_PROVIDER(claude | claude-code | ollama、既定は claude)で実装を選ぶ */
export function getProvider(env: Record<string, string | undefined> = process.env): AiProvider {
  const name = (env.AI_PROVIDER ?? "claude").trim().toLowerCase();
  if (name === "claude" || name === "") return createClaudeProvider();
  if (name === "claude-code") return createClaudeCodeProvider();
  if (name === "ollama") return createOllamaProvider();
  throw new AiError(`AI_PROVIDER の値が不正です: ${name}(claude / claude-code / ollama のいずれかを指定してください)`);
}

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
