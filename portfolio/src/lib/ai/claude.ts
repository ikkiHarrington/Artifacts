import Anthropic from "@anthropic-ai/sdk";
import { AiError, type AiProvider, type CompletionRequest } from "./types";

export const CLAUDE_MODEL = "claude-opus-5-5";

type CreateParams = Anthropic.Beta.Messages.MessageCreateParamsNonStreaming;

/** テストで差し替えられるよう、使う部分だけを型にする */
export interface ClaudeClient {
  beta: { messages: { create(params: CreateParams): PromiseLike<Anthropic.Beta.BetaMessage> } };
}

function toUserMessage(error: unknown): string {
  if (error instanceof Anthropic.AuthenticationError) {
    return "Claude API の認証に失敗しました。portfolio/.env.local の ANTHROPIC_API_KEY を確認してください。";
  }
  if (error instanceof Anthropic.RateLimitError) return "Claude API の利用上限に達しました。しばらく待ってから再実行してください。";
  if (error instanceof Anthropic.APIConnectionError) return "Claude API に接続できません。ネットワークを確認してください。";
  if (error instanceof Anthropic.APIError) return `Claude API でエラーが発生しました (HTTP ${error.status}): ${error.message}`;
  if (error instanceof Error && /api ?key|authentication/i.test(error.message)) {
    return "Claude API のキーが設定されていません。portfolio/.env.local に ANTHROPIC_API_KEY=... を書いて、開発サーバーを再起動してください。";
  }
  return `AI の呼び出しに失敗しました: ${error instanceof Error ? error.message : String(error)}`;
}

export function createClaudeProvider(getClient: () => ClaudeClient = () => new Anthropic()): AiProvider {
  return {
    name: `Claude (${CLAUDE_MODEL})`,
    external: true,
    async complete({ system, messages, effort }: CompletionRequest) {
      let response: Anthropic.Beta.BetaMessage;
      try {
        response = await getClient().beta.messages.create({
          model: CLAUDE_MODEL,
          max_tokens: 16000,
          // 安全上の理由で応答が拒否された場合、サーバー側で別モデルに切り替えて再試行する
          betas: ["server-side-fallback-2026-07-01"],
          fallbacks: "default",
          output_config: { effort },
          system,
          messages,
        });
      } catch (e) {
        throw new AiError(toUserMessage(e));
      }

      if (response.stop_reason === "refusal") {
        throw new AiError("AI が応答を控えました。質問の内容を変えて再度お試しください。");
      }
      const text = response.content
        .filter((b): b is Anthropic.Beta.BetaTextBlock => b.type === "text")
        .map((b) => b.text)
        .join("");
      if (!text) throw new AiError("AI から空の応答が返りました。");
      return response.stop_reason === "max_tokens" ? `${text}\n\n(出力が上限に達したため途中で切れています)` : text;
    },
  };
}
