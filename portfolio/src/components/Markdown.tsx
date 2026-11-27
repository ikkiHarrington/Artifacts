import { Fragment } from "react";
import { parseInline, parseMarkdown, type Block } from "@/lib/text/markdown";

function InlineText({ text }: { text: string }) {
  return (
    <>
      {parseInline(text).map((part, i) => {
        switch (part.type) {
          case "strong":
            return (
              <strong key={i} className="font-semibold text-ink">
                {part.text}
              </strong>
            );
          case "em":
            return <em key={i}>{part.text}</em>;
          case "code":
            return (
              <code key={i} className="rounded bg-zinc-100 px-1 py-0.5 text-[0.9em]">
                {part.text}
              </code>
            );
          default:
            return <Fragment key={i}>{part.text}</Fragment>;
        }
      })}
    </>
  );
}

const HEADING_CLASS: Record<number, string> = {
  1: "text-lg font-bold",
  2: "border-b border-line pb-1 text-base font-bold",
  3: "text-[15px] font-semibold",
};

function BlockView({ block }: { block: Block }) {
  switch (block.type) {
    case "heading": {
      const className = `mt-5 first:mt-0 ${HEADING_CLASS[block.level] ?? "text-sm font-semibold"}`;
      const Tag = (`h${Math.min(block.level + 2, 6)}` as "h3" | "h4" | "h5" | "h6");
      return (
        <Tag className={className}>
          <InlineText text={block.text} />
        </Tag>
      );
    }
    case "paragraph":
      return (
        <p className="whitespace-pre-line">
          <InlineText text={block.text} />
        </p>
      );
    case "list": {
      const Tag = block.ordered ? "ol" : "ul";
      return (
        <Tag className={`space-y-1 pl-5 ${block.ordered ? "list-decimal" : "list-disc"} marker:text-muted`}>
          {block.items.map((item, i) => (
            <li key={i} className="pl-0.5">
              <InlineText text={item} />
            </li>
          ))}
        </Tag>
      );
    }
    case "table":
      return (
        <div className="overflow-x-auto">
          <table className="w-full border-collapse text-[13px]">
            <thead>
              <tr>
                {block.header.map((cell, i) => (
                  <th key={i} className="border-b border-line px-2 py-1.5 text-left font-medium text-muted">
                    <InlineText text={cell} />
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {block.rows.map((row, r) => (
                <tr key={r}>
                  {row.map((cell, c) => (
                    <td key={c} className="border-b border-line-soft px-2 py-1.5 align-top">
                      <InlineText text={cell} />
                    </td>
                  ))}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      );
    case "quote":
      return (
        <blockquote className="whitespace-pre-line rounded-md bg-zinc-100 px-3 py-2 text-muted">
          <InlineText text={block.text} />
        </blockquote>
      );
    case "code":
      return <pre className="overflow-x-auto rounded-md bg-zinc-100 p-3 text-xs">{block.text}</pre>;
    case "hr":
      return <hr className="border-line" />;
  }
}

/** AI の回答を Markdown として読みやすく表示する */
export function Markdown({ text, size = "normal", className = "" }: { text: string; size?: "normal" | "large"; className?: string }) {
  const sizeClass = size === "large" ? "text-[15px] leading-8" : "text-sm leading-7";
  return (
    <div className={`space-y-3 text-zinc-800 ${sizeClass} ${className}`}>
      {parseMarkdown(text).map((block, i) => (
        <BlockView key={i} block={block} />
      ))}
    </div>
  );
}
