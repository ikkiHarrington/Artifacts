/**
 * 見直しレポートのプロンプト評価(手動実行専用。PROMPT_OUT を指定したときだけ動き、通常の npm test では skip される)。
 *
 * 目的: プロンプトを変えたときに、論点を仕込んだ架空のポートフォリオ2種類でレポートを作り、出力を見比べる。
 *       実データは使わない(CLAUDE.md のルール)。Claude Code(サブスク)を2回呼び出す。
 * 使い方(PowerShell、portfolio/ で実行):
 *   $env:PROMPT_OUT = "<出力先フォルダ>"   # 必須。in-A.md / out-<PROMPT_ITER>-A.md などを書き出す
 *   $env:PROMPT_DIR = "<フォルダ>"         # 任意。試したい system.md / review.md のフォルダ(既定はアプリと同じ prompts/)
 *   $env:PROMPT_ITER = "1"                 # 任意。出力ファイル名の番号(既定 0)
 *   npx vitest run src/lib/ai/reviewPrompt.eval.test.ts
 * 架空データ A: 銘柄名あり・推移あり。指数の重複、業種の偏り、価格未取得、途中の入金、含み損を含む。
 * 架空データ B: 匿名・推移1件。現金が過半、日本株が1業種のみ。
 */
import { mkdir, writeFile } from "node:fs/promises";
import path from "node:path";
import { buildPortfolioContext, loadPrompts } from "./index";
import { createClaudeCodeProvider } from "./claudeCode";
import type { Holding, PortfolioData, Snapshot } from "@/types/portfolio";

const out = process.env.PROMPT_OUT ?? "";
const promptDir = process.env.PROMPT_DIR ?? "";
const iter = process.env.PROMPT_ITER ?? "0";

function h(id: string, assetClass: Holding["assetClass"], name: string, sector: string, quantity: number, costPrice: number, currentPrice: number, code = ""): Holding {
  return { id, assetClass, code, name, sector, quantity, costPrice, currentPrice, priceUpdatedAt: "" };
}
const snap = (date: string, totalValue: number, totalCost: number): Snapshot => ({ date, totalValue, totalCost, byClass: { jp_stock: 0, fund: 0, cash: 0, other: 0 } });

// 架空A: 指数の重複(全世界と S&P500)、電気機器への偏り、価格未取得、途中の入金(取得額の急増)、含み損銘柄
const A: PortfolioData = {
  holdings: [
    h("1", "fund", "全世界株式インデックス(架空)", "全世界株式", 1_500_000, 23_000, 28_000),
    h("2", "fund", "米国株式S&P500インデックス(架空)", "米国株式", 800_000, 26_000, 32_500),
    h("3", "cash", "預り金", "", 1, 2_000_000, 2_000_000),
    h("4", "jp_stock", "みらい電機(架空)", "電気機器", 500, 2_600, 2_900, "9901"),
    h("5", "jp_stock", "ひかり半導体(架空)", "電気機器", 200, 3_500, 4_900, "9902"),
    h("6", "jp_stock", "あおば銀行(架空)", "銀行業", 600, 1_000, 920, "9903"),
    h("7", "jp_stock", "架空商事", "卸売業", 200, 2_500, 0, "9904"),
  ],
  snapshots: [
    snap("2026-08-03", 9_000_000, 8_600_000),
    snap("2026-09-01", 9_300_000, 8_600_000),
    snap("2026-10-01", 10_900_000, 10_100_000),
    snap("2026-11-02", 11_100_000, 10_100_000),
    snap("2026-11-16", 10_950_000, 10_100_000),
  ],
  reviews: [],
};

// 架空B: 匿名・推移なし。現金が多く、日本株は少数の業種に集中
const B: PortfolioData = {
  holdings: [
    h("1", "cash", "普通預金", "", 1, 3_000_000, 3_000_000),
    h("2", "jp_stock", "架空自動車", "輸送用機器", 300, 2_000, 2_600, "9911"),
    h("3", "jp_stock", "架空部品", "輸送用機器", 400, 1_500, 1_350, "9912"),
    h("4", "fund", "先進国債券ファンド(架空)", "先進国債券", 500_000, 10_000, 10_400),
    h("5", "other", "金ETF(架空)", "コモディティ", 1, 400_000, 520_000),
  ],
  snapshots: [snap("2026-11-23", 5_360_000, 5_100_000)],
  reviews: [],
};

describe.runIf(out)("見直しレポートのプロンプト評価", () => {
  it("架空データでレポートを生成して書き出す", async () => {
    // アプリと同じ読み込み方(ファイルがなければ既定のプロンプト)
    const { system, review: instruction } = await loadPrompts(promptDir || undefined);
    await mkdir(out, { recursive: true });
    const provider = createClaudeCodeProvider();
    const cases: [string, PortfolioData, boolean][] = [["A", A, true], ["B", B, false]];
    await Promise.all(
      cases.map(async ([key, data, reveal]) => {
        const context = buildPortfolioContext(data, "2026-11-23", reveal);
        const started = Date.now();
        const text = await provider.complete({ system, messages: [{ role: "user", content: `# ポートフォリオ\n\n${context}\n\n---\n\n${instruction}` }], effort: "high" });
        await writeFile(path.join(out, `in-${key}.md`), context);
        await writeFile(path.join(out, `out-${iter}-${key}.md`), `<!-- ${Math.round((Date.now() - started) / 1000)}s, ${text.length} chars -->\n${text}`);
      }),
    );
  }, 600_000);
});
