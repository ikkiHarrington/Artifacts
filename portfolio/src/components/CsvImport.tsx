"use client";

import { useRef, useState, type ChangeEvent } from "react";
import { decodeShiftJis, parseRakutenCsv, type ImportResult } from "@/lib/rakutenCsv";
import { darkButton, secondaryButton } from "./ui";
import { ASSET_CLASS_LABELS, ASSET_CLASSES, type Holding } from "@/types/portfolio";

interface Props {
  /** 確定時に、取り込んだ保有(楽天証券分の入れ替え前)を渡す */
  onImport: (imported: Holding[]) => void;
  disabled?: boolean;
}

/** 楽天証券の保有商品一覧 CSV を読み、内容を確認してから取り込む。ファイルはブラウザ内で読み、そのまま送信しない */
export function CsvImport({ onImport, disabled }: Props) {
  const [result, setResult] = useState<ImportResult | null>(null);
  const [fileName, setFileName] = useState("");
  const [error, setError] = useState("");
  const inputRef = useRef<HTMLInputElement>(null);

  function reset() {
    setResult(null);
    setFileName("");
    if (inputRef.current) inputRef.current.value = "";
  }

  async function handleFile(e: ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;
    setError("");
    try {
      const text = decodeShiftJis(new Uint8Array(await file.arrayBuffer()));
      setResult(parseRakutenCsv(text, new Date(), () => crypto.randomUUID()));
      setFileName(file.name);
    } catch (err) {
      setResult(null);
      setError((err as Error).message);
    }
  }

  const counts = result
    ? ASSET_CLASSES.map((c) => [c, result.holdings.filter((h) => h.assetClass === c).length] as const).filter(([, n]) => n > 0)
    : [];

  return (
    <div className="space-y-3 text-sm">
      <p className="text-xs leading-relaxed text-muted">
        楽天証券の「保有商品一覧」で保存した CSV(assetbalance(all)_*.csv)を選んでください。前回取り込んだ楽天証券の保有だけを入れ替え、手入力の保有はそのまま残します。
      </p>
      <input ref={inputRef} type="file" accept=".csv,text/csv" onChange={handleFile} disabled={disabled} aria-label="CSV ファイル" />

      {error && (
        <p role="alert" className="rounded-lg bg-red-50 p-3 text-loss">
          {error}
        </p>
      )}

      {result && (
        <div className="space-y-3 rounded-lg border border-line bg-zinc-50 p-3" aria-label="取り込み内容">
          <p>
            {fileName}: {result.holdings.length} 件(
            {counts.map(([c, n]) => `${ASSET_CLASS_LABELS[c]} ${n}`).join(" / ")})
          </p>
          {result.warnings.length > 0 && (
            <ul className="list-inside list-disc text-amber-800">
              {result.warnings.map((w) => (
                <li key={w}>{w}</li>
              ))}
            </ul>
          )}
          <div className="flex gap-2">
            <button
              type="button"
              disabled={disabled || result.holdings.length === 0}
              onClick={() => {
                onImport(result.holdings);
                reset();
              }}
              className={darkButton}
            >
              取り込む
            </button>
            <button type="button" onClick={reset} className={secondaryButton}>
              キャンセル
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
