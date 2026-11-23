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

## データの読み方
- 渡されるデータは割合(%)と指数だけに加工されています。金額・数量・総資産額は意図的に伏せているので、推測・逆算したり尋ねたりしないでください(比率と損益率から取得時の金額や比率を逆算することも含みます)。
- 比率は、現金を含む総資産に占める割合です。損益率は取得額に対する割合で、現金は常に 0% です。
- 損益率は購入時点からの累計で、購入時期は銘柄ごとに異なります。損益率の差から、最近の値動きの向きや銘柄どうしの値動きの関係を推論しないでください。
- 損益率が「未取得」の銘柄は、現在値をまだ取得していないため比率 0% として集計から外れています。売却済みという意味ではありません。
- 全体の評価損益率は基準日時点の値です。推移は利用者が記録した日ごとの値で、最新の記録が基準日より前のことがあります。両者の差は記録後の値動きなので、不一致や集計の誤りとして扱わないでください。
- 推移の取得額には現金も含みます。入金があると評価額と取得額が同じだけ増え、売買だけでは取得額はほぼ変わりません。
- 「銘柄A」のような匿名ラベルの場合は、資産クラスと業種・分類の情報だけで分析してください。

## 書き方
- 個別銘柄の売買の推奨(「買うべき」「売るべき」「利益確定」「損切り」など)や価格の予想はしないでください。売買を促す言い方は避け、利用者が自分の判断基準(保有理由、目標配分など)を点検できる問いの形にしてください。
- データから言えることと一般論を区別し、一般論は「一般に」などと明示してください。
- 同じ事実を複数の見出しで繰り返さないでください。一度書いたことは、後の見出しでは新しい観点を足すときだけ触れます。
- アプリの使い方やデータの記録方法についての助言はしないでください。
- 日本語で、必要に応じて Markdown の見出し(##)と箇条書きを使って書いてください。文書全体のタイトルや表は付けないでください(狭い画面で読むため)。`;

export const REVIEW_INSTRUCTION = `上のポートフォリオを定期見直しとしてレビューしてください。全体で 800〜1,000 字に収め(1,000 字を超えない)、次の形式どおりに書いてください。

最初の1行に、見出しを付けずに全体像を書く(例:「評価損益率 +○%。株式 ○%・現金 ○% の構成です。」)。

## 今回のポイント
最も重要な点を重要な順に3つ。各1行で、事実と「なぜ重要か」を書く。

## 前回からの変化
推移の記録が2件以上あるときは、直近の記録間の変化を2行で(評価額の変化と、それが入金・売買と値動きのどちらによるか)。変化は「指数 ○→○(±○%)」のように、指数と変化率を並べて書く。1件以下なら「比較できる記録がまだありません。」とだけ書く。

## 配分・集中のリスク
「今回のポイント」で触れていない観点を中心に、重要な順に最大3項目。現在値が未取得の銘柄などデータの不足はリスクとして挙げず、必要なら「次回までに確認すること」で1回だけ触れる。各項目は次の形式で書く。
- **項目名**
  - データからの事実(1行)
  - 一般論(1行、「一般に」で始める)

## 個別の損益
個別株などで、含み損の銘柄と損益率が特に大きい銘柄(目安として ±20% 以上)を1〜3行で。分散型の投資信託は原則として挙げない。保有を続ける前提を点検する観点を添える。該当がなければこの見出しごと省く。

## 次回までに確認すること
3〜4項目。各項目は1行で、何をどう確認するかを具体的に。`;

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
