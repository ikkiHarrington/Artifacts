/** アプリのアイコン(src/app/icon.svg と同じ図柄)。見出しの横に飾りとして表示する */
export function AppIcon({ className = "" }: { className?: string }) {
  return (
    <svg viewBox="0 0 64 64" className={className} aria-hidden="true">
      <rect width="64" height="64" rx="14" fill="#2457c5" />
      <g transform="rotate(-90 32 32)" fill="none" strokeWidth="10">
        <circle cx="32" cy="32" r="17" pathLength={100} stroke="#ffffff" strokeDasharray="55 45" />
        <circle cx="32" cy="32" r="17" pathLength={100} stroke="#f0904f" strokeDasharray="27 73" strokeDashoffset="-57" />
        <circle cx="32" cy="32" r="17" pathLength={100} stroke="#a9c0f0" strokeDasharray="14 86" strokeDashoffset="-86" />
      </g>
    </svg>
  );
}
