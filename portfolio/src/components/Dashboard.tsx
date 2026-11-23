"use client";

import { useEffect, useMemo, useState } from "react";
import { AiPanel } from "./AiPanel";
import { AllocationChart } from "./AllocationChart";
import { CsvImport } from "./CsvImport";
import { applyImport } from "@/lib/rakutenCsv";
import { HistoryChart } from "./HistoryChart";
import { HoldingForm } from "./HoldingForm";
import { HoldingsTable } from "./HoldingsTable";
import { percent, yen } from "@/lib/format";
import { summarize } from "@/lib/portfolio";
import type { Holding, PortfolioData } from "@/types/portfolio";

async function requestJson<T>(url: string, init?: RequestInit): Promise<T> {
  const res = await fetch(url, init);
  const body = await res.json().catch(() => ({}));
  if (!res.ok) throw new Error((body as { error?: string }).error ?? `HTTP ${res.status}`);
  return body as T;
}

function Card({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <section className="rounded-lg border border-zinc-200 bg-white p-4">
      <h2 className="mb-3 text-sm font-semibold text-zinc-700">{title}</h2>
      {children}
    </section>
  );
}

export function Dashboard() {
  const [data, setData] = useState<PortfolioData | null>(null);
  const [error, setError] = useState("");
  const [notices, setNotices] = useState<string[]>([]);
  const [busy, setBusy] = useState(false);
  const [editing, setEditing] = useState<Holding | null>(null);

  useEffect(() => {
    requestJson<PortfolioData>("/api/portfolio")
      .then(setData)
      .catch((e: Error) => setError(e.message));
  }, []);

  const summary = useMemo(() => summarize(data?.holdings ?? []), [data]);

  async function saveHoldings(holdings: Holding[]) {
    setBusy(true);
    try {
      setData(
        await requestJson<PortfolioData>("/api/portfolio", {
          method: "PUT",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ holdings }),
        }),
      );
      setError("");
    } catch (e) {
      setError((e as Error).message);
    } finally {
      setBusy(false);
    }
  }

  async function refresh() {
    setBusy(true);
    try {
      const result = await requestJson<{ data: PortfolioData; errors: string[] }>("/api/prices/refresh", {
        method: "POST",
      });
      setData(result.data);
      setNotices(result.errors);
      setError("");
    } catch (e) {
      setError((e as Error).message);
    } finally {
      setBusy(false);
    }
  }

  if (!data) {
    return <p className="p-6 text-sm text-zinc-500">{error || "読み込み中…"}</p>;
  }

  const holdings = data.holdings;

  return (
    <div className="mx-auto max-w-5xl space-y-4 p-6">
      <header className="flex flex-wrap items-center justify-between gap-2">
        <h1 className="text-xl font-bold">資産ポートフォリオ</h1>
        <button
          type="button"
          onClick={refresh}
          disabled={busy}
          className="rounded bg-blue-600 px-3 py-1.5 text-sm text-white hover:bg-blue-500 disabled:opacity-50"
        >
          {busy ? "処理中…" : "価格を更新して記録"}
        </button>
      </header>

      {error && (
        <p role="alert" className="rounded bg-red-50 p-2 text-sm text-red-700">
          {error}
        </p>
      )}
      {notices.length > 0 && (
        <ul className="rounded bg-amber-50 p-2 text-sm text-amber-800">
          {notices.map((n) => (
            <li key={n}>{n}</li>
          ))}
        </ul>
      )}

      <div className="grid gap-4 sm:grid-cols-3">
        <Card title="総資産">
          <p className="text-2xl font-bold tabular-nums">{yen(summary.totalValue)}</p>
        </Card>
        <Card title="評価損益">
          <p className={`text-2xl font-bold tabular-nums ${summary.pnl < 0 ? "text-red-600" : "text-emerald-700"}`}>
            {yen(summary.pnl)}
          </p>
          <p className="text-sm text-zinc-500">{percent(summary.pnlRate, { signed: true })}</p>
        </Card>
        <Card title="銘柄数">
          <p className="text-2xl font-bold tabular-nums">{holdings.length}</p>
        </Card>
      </div>

      <div className="grid gap-4 md:grid-cols-2">
        <Card title="資産配分">
          <AllocationChart rows={summary.byClass} />
        </Card>
        <Card title="推移">
          <HistoryChart snapshots={data.snapshots} />
        </Card>
      </div>

      <Card title="AI による見直し">
        <AiPanel reviews={data.reviews} onReviewsChange={(reviews) => setData((d) => (d ? { ...d, reviews } : d))} />
      </Card>

      <Card title="保有一覧">
        <HoldingsTable
          rows={summary.byHolding}
          onEdit={setEditing}
          onDelete={(h) => {
            if (window.confirm(`${h.name} を削除しますか?`)) saveHoldings(holdings.filter((x) => x.id !== h.id));
          }}
        />
      </Card>

      <Card title="楽天証券の CSV を取り込む">
        <CsvImport disabled={busy} onImport={(imported) => saveHoldings(applyImport(holdings, imported))} />
      </Card>

      <Card title={editing ? `編集: ${editing.name}` : "保有を追加"}>
        <HoldingForm
          key={editing?.id ?? "new"}
          initial={editing ?? undefined}
          onCancel={editing ? () => setEditing(null) : undefined}
          onSubmit={(h) => {
            const next = editing ? holdings.map((x) => (x.id === h.id ? h : x)) : [...holdings, h];
            setEditing(null);
            saveHoldings(next);
          }}
        />
      </Card>
    </div>
  );
}
