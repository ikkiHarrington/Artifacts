import { mkdtemp, rm, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import path from "node:path";
import { REVIEW_INSTRUCTION, SYSTEM_PROMPT, cleanPrompt, loadPrompts, promptsDir } from "./prompts";

describe("loadPrompts", () => {
  let dir: string;
  beforeEach(async () => {
    dir = await mkdtemp(path.join(tmpdir(), "portfolio-prompts-"));
  });
  afterEach(async () => {
    await rm(dir, { recursive: true, force: true });
  });

  it("ファイルがあれば毎回それを読む(書き換えが次の呼び出しに反映される)", async () => {
    await writeFile(path.join(dir, "system.md"), "システム v1");
    await writeFile(path.join(dir, "review.md"), "レポート v1");
    expect(await loadPrompts(dir)).toEqual({
      system: "システム v1",
      review: "レポート v1",
      source: { system: "file", review: "file" },
    });

    await writeFile(path.join(dir, "review.md"), "レポート v2");
    expect((await loadPrompts(dir)).review).toBe("レポート v2");
  });

  it("ファイルがない・空(コメントだけを含む)なら既定のプロンプトを使う", async () => {
    await writeFile(path.join(dir, "review.md"), "<!-- メモだけ -->\n\n");
    expect(await loadPrompts(dir)).toEqual({
      system: SYSTEM_PROMPT,
      review: REVIEW_INSTRUCTION,
      source: { system: "default", review: "default" },
    });
  });

  it("既定のフォルダは PORTFOLIO_PROMPTS_DIR で変えられる", () => {
    vi.stubEnv("PORTFOLIO_PROMPTS_DIR", dir);
    expect(promptsDir()).toBe(dir);
  });
});

describe("cleanPrompt", () => {
  it("BOM・コメントを取り除き、余分な空行を詰める", () => {
    expect(cleanPrompt("﻿<!--\n説明\n-->\n\n本文1\n\n\n\n本文2<!-- 行内 -->\n")).toBe("本文1\n\n本文2");
  });
});

describe("prompts/ の同梱ファイル", () => {
  it("リポジトリの prompts/*.md がファイルとして読める(内容は利用者が自由に編集するため比べない)", async () => {
    const prompts = await loadPrompts(path.join(process.cwd(), "prompts"));
    expect(prompts.source).toEqual({ system: "file", review: "file" });
    // 説明用のコメントが送信内容に残っていないこと
    expect(prompts.system).not.toContain("<!--");
    expect(prompts.review).not.toContain("<!--");
  });
});
