"use client";

import { useEffect, useState, type FormEvent } from "react";
import type { ChatTurn } from "@/lib/ai/types";
import type { Review } from "@/types/portfolio";
import { Markdown } from "./Markdown";
import { darkButton, primaryButton, secondaryButton } from "./ui";

interface Props {
  reviews: Review[];
  onReviewsChange: (reviews: Review[]) => void;
}

type Busy = "preview" | "review" | "chat" | null;

async function postJson<T>(url: string, body: unknown): Promise<T> {
  const res = await fetch(url, { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(body) });
  const json = await res.json().catch(() => ({}));
  if (!res.ok) throw new Error((json as { error?: string }).error ?? `HTTP ${res.status}`);
  return json as T;
}

function formatDateTime(iso: string): string {
  return new Date(iso).toLocaleString("ja-JP", { dateStyle: "medium", timeStyle: "short" });
}

export function AiPanel({ reviews, onReviewsChange }: Props) {
  // 銘柄名は送ってよい(金額・数量・単価は常に送らない)というユーザーの判断により、既定はオン
  const [revealNames, setRevealNames] = useState(true);
  const [preview, setPreview] = useState<{ provider: string; external: boolean; text: string } | null>(null);
  const [busy, setBusy] = useState<Busy>(null);
  const [error, setError] = useState("");
  const [turns, setTurns] = useState<ChatTurn[]>([]);
  const [input, setInput] = useState("");
  /** 大きく表示しているレポート */
  const [reading, setReading] = useState<Review | null>(null);

  useEffect(() => {
    if (!reading) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") setReading(null);
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [reading]);

  async function run(kind: Exclude<Busy, null>, action: () => Promise<void>) {
    setBusy(kind);
    setError("");
    try {
      await action();
    } catch (e) {
      setError((e as Error).message);
    } finally {
      setBusy(null);
    }
  }

  const togglePreview = () => {
    if (preview) {
      setPreview(null);
      return;
    }
    run("preview", async () => {
      const res = await fetch(`/api/ai/preview?revealNames=${revealNames}`);
      const json = await res.json();
      if (!res.ok) throw new Error(json.error ?? `HTTP ${res.status}`);
      setPreview(json);
    });
  };

  const createReview = () =>
    run("review", async () => {
      const { reviews: next } = await postJson<{ reviews: Review[] }>("/api/ai/review", { revealNames });
      onReviewsChange(next);
    });

  function sendChat(e: FormEvent) {
    e.preventDefault();
    const question = input.trim();
    if (!question || busy) return;
    const history: ChatTurn[] = [...turns, { role: "user", content: question }];
    setTurns(history);
    setInput("");
    run("chat", async () => {
      try {
        const { text } = await postJson<{ text: string }>("/api/ai/chat", { revealNames, messages: history });
        setTurns([...history, { role: "assistant", content: text }]);
      } catch (err) {
        // 失敗した質問は履歴から外し、入力欄に戻す
        setTurns(turns);
        setInput(question);
        throw err;
      }
    });
  }

  const [latest, ...older] = reviews;

  return (
    <div className="space-y-4">
      <div className="space-y-2">
        <label className="flex items-center gap-2 text-sm">
          <input
            type="checkbox"
            className="h-4 w-4"
            checked={revealNames}
            onChange={(e) => {
              setRevealNames(e.target.checked);
              setPreview(null);
            }}
          />
          銘柄名を送る
        </label>
        <p className="text-xs leading-relaxed text-muted">
          送るのは割合・損益率・指数だけで、金額・株数・単価・総資産額は送りません。オフにすると銘柄は「銘柄A(業種)」の匿名表示になります。
        </p>
      </div>

      <div className="flex flex-wrap gap-2">
        <button type="button" onClick={createReview} disabled={busy !== null} className={`${primaryButton} flex-[1_1_160px]`}>
          {busy === "review" ? "作成中…(1〜2分)" : "見直しレポートを作成"}
        </button>
        <button type="button" onClick={togglePreview} disabled={busy !== null} className={`${secondaryButton} flex-[1_1_120px]`}>
          {preview ? "送信内容を閉じる" : "送信内容を確認"}
        </button>
      </div>

      {error && (
        <p role="alert" className="rounded-lg bg-red-50 p-3 text-sm text-loss">
          {error}
        </p>
      )}

      {preview && (
        <div className="rounded-lg border border-line bg-zinc-50 p-3">
          <p className="mb-2 text-xs text-muted">
            送信先: {preview.provider}
            {preview.external ? "(外部 API)" : "(この PC 内)"}
          </p>
          <pre className="max-h-80 overflow-auto whitespace-pre-wrap text-xs" aria-label="送信内容">
            {preview.text}
          </pre>
        </div>
      )}

      {latest ? (
        <article className="rounded-lg border border-line bg-white">
          <div className="flex items-center justify-between gap-2 border-b border-line px-4 py-2">
            <h3 className="text-xs text-muted">最新のレポート · {formatDateTime(latest.createdAt)}</h3>
            <button type="button" onClick={() => setReading(latest)} className="h-9 rounded-md px-2 text-xs text-accent hover:bg-accent-soft">
              大きく表示
            </button>
          </div>
          <Markdown text={latest.text} className="max-h-[60vh] overflow-y-auto px-4 py-3" />
        </article>
      ) : (
        <p className="rounded-lg bg-zinc-50 p-4 text-sm text-muted">まだ見直しレポートがありません。</p>
      )}

      {older.length > 0 && (
        <details className="text-sm">
          <summary className="cursor-pointer text-accent hover:text-accent-hover">過去のレポート({older.length}件)</summary>
          <div className="mt-2 space-y-2">
            {older.map((r) => (
              <details key={r.createdAt} className="rounded-lg border border-line p-2">
                <summary className="cursor-pointer text-xs text-muted">{formatDateTime(r.createdAt)}</summary>
                <div className="mt-2 flex justify-end">
                  <button type="button" onClick={() => setReading(r)} className="h-9 rounded-md px-2 text-xs text-accent hover:bg-accent-soft">
                    大きく表示
                  </button>
                </div>
                <Markdown text={r.text} />
              </details>
            ))}
          </div>
        </details>
      )}

      <div className="space-y-3 border-t border-line pt-4">
        <div className="flex items-center justify-between gap-2">
          <h3 className="text-sm font-semibold">AI に質問</h3>
          {turns.length > 0 && (
            <button type="button" onClick={() => setTurns([])} disabled={busy !== null} className="text-xs text-muted hover:underline disabled:opacity-50">
              会話をクリア
            </button>
          )}
        </div>
        {turns.length > 0 && (
          <ul className="flex flex-col gap-2" aria-label="会話">
            {turns.map((t, i) => (
              <li
                key={i}
                className={`max-w-[90%] px-3.5 py-2.5 text-sm leading-relaxed ${
                  t.role === "user"
                    ? "self-end whitespace-pre-wrap rounded-xl rounded-br-sm bg-accent-soft"
                    : "self-start rounded-xl rounded-bl-sm bg-zinc-100"
                }`}
              >
                {t.role === "assistant" ? <Markdown text={t.content} /> : t.content}
              </li>
            ))}
          </ul>
        )}
        <form onSubmit={sendChat} className="flex gap-2">
          <input
            className="h-11 min-w-0 flex-1 rounded-lg border border-zinc-300 px-3 text-sm"
            value={input}
            onChange={(e) => setInput(e.target.value)}
            placeholder="例: 業種の偏りで気をつけることは?"
            aria-label="質問"
            maxLength={4000}
          />
          <button type="submit" disabled={busy !== null || !input.trim()} className={darkButton}>
            {busy === "chat" ? "回答中…" : "送信"}
          </button>
        </form>
        <p className="text-xs text-muted">会話は保存されません。</p>
      </div>

      {reading && (
        <div className="fixed inset-0 z-50 flex items-start justify-center overflow-y-auto bg-black/40 p-4 sm:p-10" onClick={() => setReading(null)}>
          <div
            role="dialog"
            aria-modal="true"
            aria-label="見直しレポート"
            className="w-full max-w-3xl rounded-xl bg-white shadow-xl"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex items-center justify-between gap-2 border-b border-line px-6 py-3">
              <h3 className="text-sm text-muted">見直しレポート · {formatDateTime(reading.createdAt)}</h3>
              <button type="button" autoFocus onClick={() => setReading(null)} className={secondaryButton}>
                閉じる
              </button>
            </div>
            <Markdown text={reading.text} size="large" className="px-6 py-5" />
          </div>
        </div>
      )}
    </div>
  );
}
