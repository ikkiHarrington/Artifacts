const yenFormat = new Intl.NumberFormat("ja-JP", { style: "currency", currency: "JPY", maximumFractionDigits: 0 });

export function yen(value: number): string {
  return yenFormat.format(Math.round(value));
}

/** 0.1234 → "12.3%"。signed なら正の値に + を付ける */
export function percent(rate: number, { signed = false } = {}): string {
  const text = `${(rate * 100).toFixed(1)}%`;
  return signed && rate > 0 ? `+${text}` : text;
}

/** 日本時間の YYYY-MM-DD */
export function jstDate(now: Date): string {
  return new Intl.DateTimeFormat("en-CA", { timeZone: "Asia/Tokyo" }).format(now);
}
