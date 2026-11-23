/**
 * AI の回答(Markdown)を表示用のブロックに分ける最小限のパーサー。
 * HTML は生成せず、React の要素として描画する(AI の出力をそのまま HTML として埋め込まないため)。
 * 対応: 見出し(#)、段落、箇条書き(- * +)、番号付きリスト、表、区切り線、コードブロック、引用
 */

export type Block =
  | { type: "heading"; level: number; text: string }
  | { type: "paragraph"; text: string }
  | { type: "list"; ordered: boolean; items: string[] }
  | { type: "table"; header: string[]; rows: string[][] }
  | { type: "quote"; text: string }
  | { type: "code"; text: string }
  | { type: "hr" };

export type Inline =
  | { type: "text"; text: string }
  | { type: "strong"; text: string }
  | { type: "em"; text: string }
  | { type: "code"; text: string };

const HEADING = /^(#{1,6})\s+(.*?)\s*#*\s*$/;
const BULLET = /^\s*[-*+]\s+(.*)$/;
const ORDERED = /^\s*\d+[.)]\s+(.*)$/;
const HR = /^\s*([-*_])(\s*\1){2,}\s*$/;
const TABLE_DIVIDER = /^\s*\|?\s*:?-{2,}:?\s*(\|\s*:?-{2,}:?\s*)*\|?\s*$/;

function splitRow(line: string): string[] {
  return line
    .trim()
    .replace(/^\|/, "")
    .replace(/\|$/, "")
    .split("|")
    .map((cell) => cell.trim());
}

export function parseMarkdown(source: string): Block[] {
  const lines = source.replace(/\r\n?/g, "\n").split("\n");
  const blocks: Block[] = [];
  let i = 0;

  while (i < lines.length) {
    const line = lines[i];

    if (line.trim() === "") {
      i++;
      continue;
    }

    if (line.trim().startsWith("```")) {
      const body: string[] = [];
      i++;
      while (i < lines.length && !lines[i].trim().startsWith("```")) body.push(lines[i++]);
      i++; // 閉じの ``` を飛ばす(なければ末尾まで)
      blocks.push({ type: "code", text: body.join("\n") });
      continue;
    }

    const heading = HEADING.exec(line);
    if (heading) {
      blocks.push({ type: "heading", level: heading[1].length, text: heading[2] });
      i++;
      continue;
    }

    if (HR.test(line)) {
      blocks.push({ type: "hr" });
      i++;
      continue;
    }

    if (line.includes("|") && i + 1 < lines.length && TABLE_DIVIDER.test(lines[i + 1])) {
      const header = splitRow(line);
      const rows: string[][] = [];
      i += 2;
      while (i < lines.length && lines[i].includes("|") && lines[i].trim() !== "") rows.push(splitRow(lines[i++]));
      blocks.push({ type: "table", header, rows });
      continue;
    }

    if (BULLET.test(line) || ORDERED.test(line)) {
      const ordered = !BULLET.test(line);
      const pattern = ordered ? ORDERED : BULLET;
      const indent = (s: string) => s.length - s.trimStart().length;
      const baseIndent = indent(line);
      const items: string[] = [];
      while (i < lines.length && lines[i].trim() !== "") {
        const current = lines[i];
        const match = pattern.exec(current);
        if (match && indent(current) <= baseIndent) {
          items.push(match[1]);
        } else if (indent(current) > baseIndent && items.length > 0) {
          // 深いインデントの行(入れ子の項目や続きの行)は直前の項目に連結する
          const nested = BULLET.exec(current) ?? ORDERED.exec(current);
          items[items.length - 1] += ` ${nested ? nested[1] : current.trim()}`;
        } else {
          break;
        }
        i++;
      }
      blocks.push({ type: "list", ordered, items });
      continue;
    }

    if (line.trimStart().startsWith(">")) {
      const body: string[] = [];
      while (i < lines.length && lines[i].trimStart().startsWith(">")) body.push(lines[i++].trimStart().replace(/^>\s?/, ""));
      blocks.push({ type: "quote", text: body.join("\n") });
      continue;
    }

    const body: string[] = [];
    while (
      i < lines.length &&
      lines[i].trim() !== "" &&
      !HEADING.test(lines[i]) &&
      !BULLET.test(lines[i]) &&
      !ORDERED.test(lines[i]) &&
      !HR.test(lines[i]) &&
      !lines[i].trim().startsWith("```") &&
      !lines[i].trimStart().startsWith(">")
    ) {
      body.push(lines[i++].trim());
    }
    blocks.push({ type: "paragraph", text: body.join("\n") });
  }

  return blocks;
}

const INLINE = /(\*\*(.+?)\*\*|__(.+?)__|`([^`]+)`|\*([^*\s](?:[^*]*[^*\s])?)\*)/g;

export function parseInline(text: string): Inline[] {
  const parts: Inline[] = [];
  let last = 0;
  for (const m of text.matchAll(INLINE)) {
    if (m.index > last) parts.push({ type: "text", text: text.slice(last, m.index) });
    if (m[2] !== undefined || m[3] !== undefined) parts.push({ type: "strong", text: m[2] ?? m[3] });
    else if (m[4] !== undefined) parts.push({ type: "code", text: m[4] });
    else parts.push({ type: "em", text: m[5] });
    last = m.index + m[0].length;
  }
  if (last < text.length) parts.push({ type: "text", text: text.slice(last) });
  return parts;
}
