import Anthropic from "@anthropic-ai/sdk";
import { createClaudeProvider, CLAUDE_MODEL, type ClaudeClient } from "./claude";
import { AiError, buildPortfolioContext, getProvider, parseChatTurns } from "./index";

function message(overrides: Partial<Anthropic.Beta.BetaMessage>): Anthropic.Beta.BetaMessage {
  return {
    id: "msg_1",
    type: "message",
    role: "assistant",
    model: CLAUDE_MODEL,
    content: [{ type: "text", text: "レビュー本文", citations: null }],
    stop_reason: "end_turn",
    stop_sequence: null,
    ...overrides,
  } as Anthropic.Beta.BetaMessage;
}

function fakeClient(create: ClaudeClient["beta"]["messages"]["create"]): ClaudeClient {
  return { beta: { messages: { create } } };
}

describe("Claude プロバイダー", () => {
  it("モデル・フォールバック・effort を指定して呼び、テキストを返す", async () => {
    const create = vi.fn(async () => message({}));
    const provider = createClaudeProvider(() => fakeClient(create));

    const text = await provider.complete({ system: "sys", messages: [{ role: "user", content: "hi" }], effort: "high" });

    expect(text).toBe("レビュー本文");
    expect(create).toHaveBeenCalledWith(
      expect.objectContaining({
        model: "claude-opus-5-5",
        fallbacks: "default",
        betas: ["server-side-fallback-2026-07-01"],
        output_config: { effort: "high" },
        system: "sys",
        messages: [{ role: "user", content: "hi" }],
      }),
    );
    expect(provider.external).toBe(true);
  });

  it("refusal は AiError にする", async () => {
    const provider = createClaudeProvider(() => fakeClient(async () => message({ stop_reason: "refusal", content: [] })));
    await expect(provider.complete({ system: "", messages: [{ role: "user", content: "x" }], effort: "medium" })).rejects.toThrow(
      AiError,
    );
  });

  it("max_tokens で切れたら注記を付ける", async () => {
    const provider = createClaudeProvider(() => fakeClient(async () => message({ stop_reason: "max_tokens" })));
    await expect(provider.complete({ system: "", messages: [{ role: "user", content: "x" }], effort: "medium" })).resolves.toContain(
      "途中で切れています",
    );
  });

  it("キー未設定などのエラーは設定方法を案内する AiError にする", async () => {
    const provider = createClaudeProvider(() => {
      throw new Error("Could not resolve authentication method. Expected either apiKey or authToken to be set.");
    });
    await expect(provider.complete({ system: "", messages: [{ role: "user", content: "x" }], effort: "medium" })).rejects.toThrow(
      "ANTHROPIC_API_KEY",
    );
  });
});

describe("getProvider", () => {
  it("既定は Claude、ollama はスタブで未実装エラー", async () => {
    expect(getProvider({}).name).toContain("Claude");
    const ollama = getProvider({ AI_PROVIDER: "ollama" });
    expect(ollama.external).toBe(false);
    await expect(ollama.complete({ system: "", messages: [], effort: "medium" })).rejects.toThrow("まだ実装されていません");
  });

  it("claude-code でサブスク経由のプロバイダーを選ぶ", () => {
    const p = getProvider({ AI_PROVIDER: "Claude-Code" });
    expect(p.name).toContain("Claude Code");
    expect(p.external).toBe(true);
  });

  it("不明な値はエラー", () => {
    expect(() => getProvider({ AI_PROVIDER: "gpt" })).toThrow(AiError);
  });
});

describe("parseChatTurns", () => {
  it("user から交互に並び user で終わる履歴を受け付ける", () => {
    expect(
      parseChatTurns([
        { role: "user", content: " 質問 " },
        { role: "assistant", content: "回答" },
        { role: "user", content: "追加の質問" },
      ]),
    ).toEqual([
      { role: "user", content: "質問" },
      { role: "assistant", content: "回答" },
      { role: "user", content: "追加の質問" },
    ]);
  });

  it.each([
    [[]],
    [[{ role: "assistant", content: "x" }]],
    [[{ role: "user", content: "x" }, { role: "assistant", content: "y" }]],
    [[{ role: "user", content: "" }]],
    [[{ role: "system", content: "x" }]],
    [[{ role: "user", content: "a".repeat(4001) }]],
    ["not array"],
  ])("不正な履歴 %# は null", (value) => {
    expect(parseChatTurns(value)).toBeNull();
  });
});

describe("buildPortfolioContext", () => {
  it("マスク済みテキストを返す", () => {
    const text = buildPortfolioContext(
      {
        holdings: [
          { id: "a", assetClass: "jp_stock", code: "7203", name: "トヨタ", sector: "輸送用機器", quantity: 100, costPrice: 1000, currentPrice: 1500, priceUpdatedAt: "" },
        ],
        snapshots: [],
        reviews: [],
      },
      "2026-11-23",
      false,
    );
    expect(text).toContain("銘柄A | 日本株 | 輸送用機器 | 比率 100% | 損益率 50%");
    expect(text).not.toContain("トヨタ");
  });
});
