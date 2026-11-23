import { AiError, type AiProvider } from "./types";

/**
 * ローカル AI(Ollama)のスタブ。AI_PROVIDER=ollama で選ばれるが、まだ呼び出しは実装していない。
 *
 * 実装するときのメモ:
 * - POST http://localhost:11434/api/chat に { model, messages: [{role:"system",...}, ...], stream: false } を送り、
 *   レスポンスの message.content を返す(モデルは OLLAMA_MODEL、例: gpt-oss:20b)
 * - PC の外に出ないので external: false。マスクを緩めて生の金額を渡すかどうかは、そのとき決める
 */
export function createOllamaProvider(): AiProvider {
  return {
    name: "Ollama(ローカル・未実装)",
    external: false,
    async complete() {
      throw new AiError("ローカル AI(Ollama)はまだ実装されていません。AI_PROVIDER を claude にしてください。");
    },
  };
}
