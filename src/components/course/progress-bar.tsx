type ProgressBarProps = {
  value: number;
  label?: string;
};

export function ProgressBar({ value, label }: ProgressBarProps) {
  const safeValue = Math.min(Math.max(value, 0), 100);

  return (
    <div className="space-y-2.5">
      {label ? (
        <div className="flex items-center justify-between text-sm text-[var(--color-text)]/70">
          <span>{label}</span>
          <span className="font-semibold text-[var(--color-text)]">{safeValue}%</span>
        </div>
      ) : null}
      <div className="h-3 overflow-hidden rounded-full bg-[#dfe5ea]">
        <div
          className="h-full rounded-full bg-[linear-gradient(90deg,#0050d6_0%,#0f63ff_62%,#3d87ff_100%)] transition-all"
          style={{ width: `${safeValue}%` }}
        />
      </div>
    </div>
  );
}
