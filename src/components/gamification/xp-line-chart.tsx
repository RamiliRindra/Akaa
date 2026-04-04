type XpLineChartPoint = {
  label: string;
  value: number;
};

type XpLineChartProps = {
  points: XpLineChartPoint[];
};

export function XpLineChart({ points }: XpLineChartProps) {
  if (!points.length) {
    return (
      <div className="panel-card px-4 py-6 text-sm text-[#2c2f31]/65">
        Pas encore assez d’activité pour afficher une courbe d’évolution.
      </div>
    );
  }

  const width = 320;
  const height = 180;
  const paddingX = 18;
  const paddingY = 20;
  const maxValue = Math.max(...points.map((point) => point.value), 1);
  const minValue = Math.min(...points.map((point) => point.value), 0);
  const range = Math.max(maxValue - minValue, 1);

  const coordinates = points.map((point, index) => {
    const x =
      paddingX + (index * (width - paddingX * 2)) / Math.max(points.length - 1, 1);
    const y =
      height - paddingY - ((point.value - minValue) / range) * (height - paddingY * 2);

    return { ...point, x, y };
  });

  const path = coordinates
    .map((point, index) => `${index === 0 ? "M" : "L"} ${point.x.toFixed(2)} ${point.y.toFixed(2)}`)
    .join(" ");

  const areaPath = `${path} L ${coordinates[coordinates.length - 1]?.x ?? width - paddingX} ${height - paddingY} L ${coordinates[0]?.x ?? paddingX} ${height - paddingY} Z`;

  return (
    <div className="panel-card p-4">
      <div className="mb-3 flex items-end justify-between gap-3">
        <div>
          <p className="text-sm font-semibold text-[#2c2f31]">Évolution récente</p>
          <p className="text-xs text-[#2c2f31]/62">Progression cumulée sur les 7 derniers jours.</p>
        </div>
        <span className="chip chip-primary">{points[points.length - 1]?.value ?? 0} XP</span>
      </div>

      <svg viewBox={`0 0 ${width} ${height}`} className="h-44 w-full overflow-visible">
        <defs>
          <linearGradient id="xp-line-fill" x1="0%" y1="0%" x2="0%" y2="100%">
            <stop offset="0%" stopColor="rgba(0,80,214,0.28)" />
            <stop offset="100%" stopColor="rgba(0,80,214,0.02)" />
          </linearGradient>
          <linearGradient id="xp-line-stroke" x1="0%" y1="0%" x2="100%" y2="0%">
            <stop offset="0%" stopColor="#0050d6" />
            <stop offset="100%" stopColor="#119da4" />
          </linearGradient>
        </defs>

        {[0, 1, 2].map((tick) => {
          const y = paddingY + (tick * (height - paddingY * 2)) / 2;
          return (
            <line
              key={tick}
              x1={paddingX}
              x2={width - paddingX}
              y1={y}
              y2={y}
              stroke="rgba(44,47,49,0.08)"
              strokeDasharray="5 6"
            />
          );
        })}

        <path d={areaPath} fill="url(#xp-line-fill)" />
        <path d={path} fill="none" stroke="url(#xp-line-stroke)" strokeWidth="4" strokeLinecap="round" />

        {coordinates.map((point) => (
          <g key={point.label}>
            <circle cx={point.x} cy={point.y} r="5" fill="#ffffff" stroke="#0050d6" strokeWidth="3" />
            <text
              x={point.x}
              y={height - 2}
              textAnchor="middle"
              className="fill-[#2c2f31]/65 text-[10px] font-semibold"
            >
              {point.label}
            </text>
          </g>
        ))}
      </svg>
    </div>
  );
}
