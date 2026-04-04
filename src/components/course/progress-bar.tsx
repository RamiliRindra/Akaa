type ProgressBarProps = {
  value: number;
  label?: string;
};

export function ProgressBar({ value, label }: ProgressBarProps) {
  const safeValue = Math.min(Math.max(value, 0), 100);

  return (
    <div className="space-y-2">
      {label ? <div className="flex items-center justify-between text-sm text-[#0c0910]/70"><span>{label}</span><span className="font-semibold text-[#0c0910]">{safeValue}%</span></div> : null}
      <div className="h-2 overflow-hidden rounded-full bg-[#0c0910]/10">
        <div className="h-full rounded-full bg-[#0F63FF] transition-all" style={{ width: `${safeValue}%` }} />
      </div>
    </div>
  );
}
