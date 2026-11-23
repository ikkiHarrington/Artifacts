/** 画面全体で共通のスタイル(C 案のデザインに合わせる) */

export const panelClass = "rounded-xl border border-line bg-white";

const buttonBase =
  "inline-flex h-11 items-center justify-center rounded-lg px-4 text-sm transition-colors disabled:cursor-not-allowed disabled:opacity-50";

export const primaryButton = `${buttonBase} bg-accent font-semibold text-white hover:bg-accent-hover`;
export const secondaryButton = `${buttonBase} border border-zinc-300 bg-white text-ink hover:bg-zinc-50`;
export const darkButton = `${buttonBase} bg-ink text-white hover:bg-zinc-700`;

/** 損益の色。色だけに頼らないよう、表示側で必ず +/− の符号も付ける */
export function pnlTextClass(value: number): string {
  if (value > 0) return "text-gain";
  if (value < 0) return "text-loss";
  return "text-muted";
}
