"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { AiPanel } from "./AiPanel";
import { AllocationChart } from "./AllocationChart";
import { AppIcon } from "./AppIcon";
import { CsvImport } from "./CsvImport";
import { applyImport } from "@/lib/import/rakutenCsv";
import { HistoryChart } from "./HistoryChart";
import { HoldingForm } from "./HoldingForm";
import { HoldingsTable } from "./HoldingsTable";
import { jstDate, percent, yen } from "@/lib/text/format";
import { changeSincePrevious, summarize } from "@/lib/data/portfolio";
import { panelClass, pnlTextClass, primaryButton, secondaryButton } from "./ui";
import type { Holding, PortfolioData } from "@/types/portfolio";

async function requestJson<T>(url: string, init?: RequestInit): Promise<T> {
  const res = await fetch(url, init);
  const body = await res.json().catch(() => ({}));
  if (!res.ok) throw new Error((body as { error?: string }).error ?? `HTTP ${res.status}`);
  return body as T;
}

/** ヘッダーのボタンで開く入力欄 */
type Drawer = "csv" | "form" | null;

function StatCard({ label, value, sub, tone }: { label: string; value: string; sub?: string; tone?: string }) {
  return (
    <div className={`${panelClass} flex flex-col gap-1.5 px-[18px] py-4`}>
      <p className="text-[13px] text-muted">{label}</p>
      <p className={`text-2xl font-bold tabular-nums ${tone ?? ""}`}>{value}</p>
      {sub && <p className={`text-sm tabular-nums ${tone ?? "text-muted"}`}>{sub}</p>}
    </div>
  );
}

export function Dashboard() {
  const [data, setData] = useState<PortfolioData | null>(null);
  const [error, setError] = useState("");
  const [notices, setNotices] = useState<string[]>([]);
  const [busy, setBusy] = useState(false);
  const [drawer, setDrawer] = useState<Drawer>(null);
  const [editing, setEditing] = useState<Holding | null>(null);
  const drawerRef = useRef<HTMLElement>(null);

  useEffect(() => {
    requestJson<PortfolioData>("/api/portfolio")
      .then(setData)
      .catch((e: Error) => setError(e.message));
  }, []);

  // 表の「編集」で開いたときも、入力欄が見える位置までスクロールする
  useEffect(() => {
    if (drawer) drawerRef.current?.scrollIntoView?.({ behavior: "smooth", block: "nearest" });
  }, [drawer, editing]);

  const summary = useMemo(() => summarize(data?.holdings ?? []), [data]);
  const change = useMemo(
    () => (data ? changeSincePrevious(data.snapshots, summary.totalValue, jstDate(new Date())) : null),
    [data, summary.totalValue],
  );

  function openDrawer(next: Drawer) {
    setEditing(null);
    setDrawer((current) => (current === next ? null : next));
  }

  function closeDrawer() {
    setEditing(null);
    setDrawer(null);
  }

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
    return <p className="p-6 text-sm text-muted">{error || "読み込み中…"}</p>;
  }

  const holdings = data.holdings;
  const lastSnapshot = data.snapshots.at(-1);

  return (
    <div className="mx-auto flex max-w-[1360px] flex-col gap-5 px-6 pt-6 pb-16">
      <header className="flex flex-wrap items-center justify-between gap-3">
        <div className="flex flex-wrap items-baseline gap-x-4 gap-y-1">
          <h1 className="flex items-center gap-2.5 text-2xl font-bold">
            <AppIcon className="h-8 w-8" />
            資産レビュー
          </h1>
          <p className="text-sm text-muted">
            保有 {holdings.length} 件{lastSnapshot && ` · 最終記録 ${lastSnapshot.date}`}
          </p>
        </div>
        <div className="flex flex-wrap gap-2">
          <button type="button" onClick={() => openDrawer("csv")} aria-expanded={drawer === "csv"} className={secondaryButton}>
            CSV を取り込む
          </button>
          <button
            type="button"
            onClick={() => openDrawer("form")}
            aria-expanded={drawer === "form" && !editing}
            className={secondaryButton}
          >
            保有を追加
          </button>
          <button type="button" onClick={refresh} disabled={busy} className={primaryButton}>
            {busy ? "処理中…" : "価格を更新して記録"}
          </button>
        </div>
      </header>

      {error && (
        <p role="alert" className="rounded-lg bg-red-50 p-3 text-sm text-loss">
          {error}
        </p>
      )}
      {notices.length > 0 && (
        <ul className="rounded-lg bg-amber-50 p-3 text-sm text-amber-900">
          {notices.map((n) => (
            <li key={n}>{n}</li>
          ))}
        </ul>
      )}

      {drawer && (
        <section ref={drawerRef} className={`${panelClass} space-y-3 p-5`} aria-label={drawer === "csv" ? "CSV の取り込み" : "保有の入力"}>
          <div className="flex items-center justify-between gap-2">
            <h2 className="text-base font-semibold">
              {drawer === "csv" ? "楽天証券の CSV を取り込む" : editing ? `編集: ${editing.name}` : "保有を追加"}
            </h2>
            <button type="button" onClick={closeDrawer} className="h-9 rounded-md px-3 text-sm text-muted hover:bg-zinc-100">
              閉じる
            </button>
          </div>
          {drawer === "csv" ? (
            <CsvImport
              disabled={busy}
              onImport={(imported) => {
                closeDrawer();
                saveHoldings(applyImport(holdings, imported));
              }}
            />
          ) : (
            <HoldingForm
              key={editing?.id ?? "new"}
              initial={editing ?? undefined}
              onCancel={closeDrawer}
              onSubmit={(h) => {
                const next = editing ? holdings.map((x) => (x.id === h.id ? h : x)) : [...holdings, h];
                if (editing) closeDrawer();
                saveHoldings(next);
              }}
            />
          )}
        </section>
      )}

      <div className="flex flex-wrap items-start gap-5">
        <div className="flex min-w-0 flex-[999_1_640px] flex-col gap-4">
          <section aria-label="要約" className="grid grid-cols-[repeat(auto-fit,minmax(180px,1fr))] gap-3">
            <StatCard label="総資産" value={yen(summary.totalValue)} />
            <StatCard
              label="評価損益"
              value={percent(summary.pnlRate, { signed: true })}
              sub={yen(summary.pnl, { signed: true })}
              tone={pnlTextClass(summary.pnl)}
            />
            {change ? (
              <StatCard
                label={`前回の記録(${change.date})から`}
                value={percent(change.rate, { signed: true })}
                sub={yen(change.diff, { signed: true })}
                tone={pnlTextClass(change.diff)}
              />
            ) : (
              <StatCard label="前回の記録から" value="—" sub="記録が2日分たまると表示" />
            )}
          </section>

          <section className={`${panelClass} flex flex-wrap items-center gap-6 px-6 py-5`}>
            <div className="space-y-2">
              <h2 className="text-sm font-semibold">資産配分</h2>
              <AllocationChart rows={summary.byClass} />
            </div>
            <div className="min-w-0 flex-[1_1_280px] space-y-2">
              <h2 className="text-sm font-semibold">推移</h2>
              <HistoryChart snapshots={data.snapshots} />
            </div>
          </section>

          <section className={`${panelClass} space-y-3 px-6 py-5`}>
            <h2 className="text-base font-semibold">保有一覧</h2>
            <HoldingsTable
              rows={summary.byHolding}
              onEdit={(h) => {
                setEditing(h);
                setDrawer("form");
              }}
              onDelete={(h) => {
                if (window.confirm(`${h.name} を削除しますか?`)) saveHoldings(holdings.filter((x) => x.id !== h.id));
              }}
            />
          </section>
        </div>

        <aside aria-label="AI による見直し" className={`${panelClass} flex-[1_1_400px] space-y-4 p-5`}>
          <h2 className="text-base font-semibold">AI による見直し</h2>
          <AiPanel reviews={data.reviews} onReviewsChange={(reviews) => setData((d) => (d ? { ...d, reviews } : d))} />
        </aside>
      </div>
    </div>
  );
}
