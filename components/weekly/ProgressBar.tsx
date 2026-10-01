interface Props {
  label: string;
  value: number;
  detail?: string;
}

export default function ProgressBar({ label, value, detail }: Props) {
  return (
    <div>
      <div className="mb-1 flex items-baseline justify-between text-sm">
        <span className="font-medium text-slate-700">{label}</span>
        <span className="text-slate-500">
          {detail && <span className="mr-2 text-xs">{detail}</span>}
          <span className="font-semibold text-indigo-600">{value}%</span>
        </span>
      </div>
      <div
        role="progressbar"
        aria-label={label}
        aria-valuenow={value}
        aria-valuemin={0}
        aria-valuemax={100}
        className="h-2 overflow-hidden rounded-full bg-slate-200"
      >
        <div
          className="h-full rounded-full bg-indigo-500 transition-all"
          style={{ width: `${value}%` }}
        />
      </div>
    </div>
  );
}
