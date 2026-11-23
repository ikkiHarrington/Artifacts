import { parseInline, parseMarkdown } from "./markdown";

describe("parseMarkdown", () => {
  it("見出し・段落・箇条書き・番号付きリストを分ける", () => {
    const md = "## 1. 全体の状況\n投資信託が\n過半です。\n\n- 現金 16%\n- 日本株 30%\n\n1. 一つ目\n2. 二つ目";
    expect(parseMarkdown(md)).toEqual([
      { type: "heading", level: 2, text: "1. 全体の状況" },
      { type: "paragraph", text: "投資信託が\n過半です。" },
      { type: "list", ordered: false, items: ["現金 16%", "日本株 30%"] },
      { type: "list", ordered: true, items: ["一つ目", "二つ目"] },
    ]);
  });

  it("空行なしで見出しや箇条書きが続いても区切る。入れ子の項目は直前の項目に連結する", () => {
    expect(parseMarkdown("前置き\n### 見出し\n* a\n  * a-1\n* b\n後ろ")).toEqual([
      { type: "paragraph", text: "前置き" },
      { type: "heading", level: 3, text: "見出し" },
      { type: "list", ordered: false, items: ["a a-1", "b"] },
      { type: "paragraph", text: "後ろ" },
    ]);
  });

  it("表・区切り線・引用・コードブロックを読む", () => {
    const md = "| 分類 | 比率 |\n|---|---:|\n| 投資信託 | 54.5% |\n| 現金 | 16.0% |\n\n---\n> 注意\n> 続き\n```\nraw *text*\n```";
    expect(parseMarkdown(md)).toEqual([
      { type: "table", header: ["分類", "比率"], rows: [["投資信託", "54.5%"], ["現金", "16.0%"]] },
      { type: "hr" },
      { type: "quote", text: "注意\n続き" },
      { type: "code", text: "raw *text*" },
    ]);
  });

  it("CRLF と空の入力を扱える", () => {
    expect(parseMarkdown("# A\r\nb")).toEqual([
      { type: "heading", level: 1, text: "A" },
      { type: "paragraph", text: "b" },
    ]);
    expect(parseMarkdown("")).toEqual([]);
  });
});

describe("parseInline", () => {
  it("太字・斜体・コードを取り出し、残りは文字のまま", () => {
    expect(parseInline("集中度は **66.1%** で *やや高め*、`AI_PROVIDER` も確認")).toEqual([
      { type: "text", text: "集中度は " },
      { type: "strong", text: "66.1%" },
      { type: "text", text: " で " },
      { type: "em", text: "やや高め" },
      { type: "text", text: "、" },
      { type: "code", text: "AI_PROVIDER" },
      { type: "text", text: " も確認" },
    ]);
  });

  it("閉じていない記号や掛け算の * はそのまま残す", () => {
    expect(parseInline("2 * 3 と **未完")).toEqual([{ type: "text", text: "2 * 3 と **未完" }]);
  });
});
