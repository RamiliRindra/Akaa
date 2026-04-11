type WeeklyXpBarsPoint = {
  label: string;
  value: number;
};

type WeeklyXpBarsProps = {
  points: WeeklyXpBarsPoint[];
};

/**
 * Histogramme XP sur 7 jours (style maquette dashboard, sans lib externe).
 */
const BAR_MAX_PX = 160;

export function WeeklyXpBars({ points }: WeeklyXpBarsProps) {
  const max = Math.max(...points.map((p) => p.value), 1);

  return (
    <div className="flex h-48 items-end justify-between gap-1.5 sm:gap-2">
      {points.map((point) => {
        const barHeightPx = Math.max(6, Math.round((point.value / max) * BAR_MAX_PX));
        const isPeak = point.value === max && point.value > 0;

        return (
          <div key={point.label} className="flex min-w-0 flex-1 flex-col items-center gap-2">
            <div
              className={`w-full rounded-t-sm transition-colors ${
                isPeak ? "bg-[var(--color-primary)]" : "cursor-default bg-[var(--color-primary)]/10 hover:bg-[var(--color-primary)]/16"
              }`}
              style={{ height: `${barHeightPx}px` }}
              title={`${point.value} XP`}
            />
            <span
              className={`text-[10px] font-bold uppercase ${isPeak ? "text-[var(--color-text)]" : "text-[var(--color-text)]/45"}`}
            >
              {point.label}
            </span>
          </div>
        );
      })}
    </div>
  );
}
