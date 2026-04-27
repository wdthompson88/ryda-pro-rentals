export function StepProgress({
  steps,
  current,
}: {
  steps: string[];
  current: number;
}) {
  return (
    <div className="mb-10">
      <div className="flex items-center gap-2 sm:gap-3">
        {steps.map((label, i) => {
          const done = i < current;
          const active = i === current;
          return (
            <div key={i} className="flex flex-1 items-center gap-2">
              <span
                className={`flex h-8 w-8 shrink-0 items-center justify-center rounded-full text-xs font-medium transition-colors ${
                  done
                    ? "bg-red text-cream"
                    : active
                    ? "border border-red bg-cream text-red"
                    : "border border-rule bg-cream text-mute"
                }`}
              >
                {done ? "✓" : i + 1}
              </span>
              <span
                className={`hidden truncate text-xs uppercase tracking-wider sm:inline ${
                  active ? "text-ink" : "text-mute"
                }`}
              >
                {label}
              </span>
              {i < steps.length - 1 && (
                <span
                  className={`h-px flex-1 ${done ? "bg-red" : "bg-rule"}`}
                />
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
}
