"use client";

import { useState, type FormEvent } from "react";
import type { ChatTurn } from "@/lib/ai/types";
import type { Review } from "@/types/portfolio";

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
      <div className="flex flex-wrap items-center gap-3">
        <label className="flex items-center gap-1.5 text-sm">
          <input
            type="checkbox"
            checked={revealNames}
            onChange={(e) => {
              setRevealNames(e.target.checked);
              setPreview(null);
            }}
          />
          銘柄名を送る(オフなら「銘柄A(業種)」の匿名表示)
        </label>
        <button type="button" onClick={togglePreview} disabled={busy !== null} className="rounded border px-3 py-1.5 text-sm disabled:opacity-50">
          {preview ? "送信内容を閉じる" : "送信内容を確認"}
        </button>
        <button
          type="button"
          onClick={createReview}
          disabled={busy !== null}
          className="rounded bg-violet-600 px-3 py-1.5 text-sm text-white hover:bg-violet-500 disabled:opacity-50"
        >
          {busy === "review" ? "作成中…(1〜2分かかることがあります)" : "見直しレポートを作成"}
        </button>
      </div>

      <p className="text-xs text-zinc-500">
        AI に送るのは割合・損益率・指数だけで、金額・株数・単価・総資産額は送りません。内容は「送信内容を確認」で見られます。
      </p>

      {error && (
        <p role="alert" className="rounded bg-red-50 p-2 text-sm text-red-700">
          {error}
        </p>
      )}

      {preview && (
        <div className="rounded border border-zinc-200 bg-zinc-50 p-3">
          <p className="mb-2 text-xs text-zinc-600">
            送信先: {preview.provider}
            {preview.external ? "(外部 API)" : "(この PC 内)"}
          </p>
          <pre className="whitespace-pre-wrap text-xs" aria-label="送信内容">
            {preview.text}
          </pre>
        </div>
      )}

      {latest ? (
        <article className="rounded border border-violet-200 bg-violet-50/40 p-3">
          <h3 className="mb-2 text-xs font-semibold text-violet-800">最新の見直しレポート({formatDateTime(latest.createdAt)})</h3>
          <div className="whitespace-pre-wrap text-sm leading-relaxed">{latest.text}</div>
        </article>
      ) : (
        <p className="text-sm text-zinc-500">まだ見直しレポートがありません。</p>
      )}

      {older.length > 0 && (
        <details className="text-sm">
          <summary className="cursor-pointer text-zinc-600">過去のレポート({older.length}件)</summary>
          <div className="mt-2 space-y-2">
            {older.map((r) => (
              <details key={r.createdAt} className="rounded border border-zinc-200 p-2">
                <summary className="cursor-pointer text-xs text-zinc-600">{formatDateTime(r.createdAt)}</summary>
                <div className="mt-2 whitespace-pre-wrap">{r.text}</div>
              </details>
            ))}
          </div>
        </details>
      )}

      <div className="space-y-2 border-t border-zinc-100 pt-3">
        <h3 className="text-sm font-semibold text-zinc-700">AI に質問</h3>
        {turns.length > 0 && (
          <ul className="space-y-2" aria-label="会話">
            {turns.map((t, i) => (
              <li
                key={i}
                className={`whitespace-pre-wrap rounded p-2 text-sm ${t.role === "user" ? "ml-12 bg-zinc-100" : "mr-12 border border-zinc-200"}`}
              >
                {t.content}
              </li>
            ))}
          </ul>
        )}
        <form onSubmit={sendChat} className="flex gap-2">
          <input
            className="flex-1 rounded border border-zinc-300 px-2 py-1.5 text-sm"
            value={input}
            onChange={(e) => setInput(e.target.value)}
            placeholder="例: 業種の偏りで気をつけることは?"
            aria-label="質問"
            maxLength={4000}
          />
          <button type="submit" disabled={busy !== null || !input.trim()} className="rounded bg-zinc-900 px-3 py-1.5 text-sm text-white disabled:opacity-50">
            {busy === "chat" ? "回答中…" : "送信"}
          </button>
          {turns.length > 0 && (
            <button type="button" onClick={() => setTurns([])} disabled={busy !== null} className="rounded border px-3 py-1.5 text-sm">
              会話をクリア
            </button>
          )}
        </form>
      </div>
    </div>
  );
}
