export interface ChatTurn {
  role: "user" | "assistant";
  content: string;
}

export type AiEffort = "medium" | "high";

export interface CompletionRequest {
  system: string;
  messages: ChatTurn[];
  effort: AiEffort;
}

/** AI の実装を差し替えるためのインターフェース(Claude / Ollama) */
export interface AiProvider {
  /** 画面表示用の名前 */
  name: string;
  /** 外部に送信するか。true の場合はマスク済みデータだけを渡す */
  external: boolean;
  complete(request: CompletionRequest): Promise<string>;
}

/** 利用者にそのまま見せてよいエラー */
export class AiError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "AiError";
  }
}
