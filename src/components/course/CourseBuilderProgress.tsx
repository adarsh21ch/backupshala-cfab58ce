import { Check } from 'lucide-react';

interface Step {
  label: string;
  done: boolean;
  active?: boolean;
}

interface Props {
  steps: Step[];
  current: number; // index of current step (0-based)
}

const CourseBuilderProgress = ({ steps, current }: Props) => {
  const total = steps.length;
  return (
    <div className="rounded-xl border border-border bg-card p-4">
      {/* Mobile compact view */}
      <div className="sm:hidden">
        <p className="text-xs font-semibold uppercase tracking-wider text-muted-foreground mb-1">
          Step {current + 1} of {total}
        </p>
        <p className="text-sm font-heading font-700 text-foreground">{steps[current]?.label}</p>
        <div className="mt-3 h-1.5 w-full rounded-full bg-secondary overflow-hidden">
          <div
            className="h-full bg-accent transition-all"
            style={{ width: `${((current + 1) / total) * 100}%` }}
          />
        </div>
      </div>

      {/* Desktop full step list */}
      <div className="hidden sm:flex items-center gap-2">
        {steps.map((s, i) => {
          const isActive = i === current;
          const isDone = s.done && !isActive;
          return (
            <div key={s.label} className="flex items-center flex-1">
              <div className="flex items-center gap-2 min-w-0">
                <div
                  className={`flex h-7 w-7 shrink-0 items-center justify-center rounded-full text-xs font-bold transition-colors ${
                    isDone
                      ? 'bg-primary text-primary-foreground'
                      : isActive
                        ? 'bg-accent text-accent-foreground ring-4 ring-accent/20'
                        : 'bg-secondary text-muted-foreground'
                  }`}
                >
                  {isDone ? <Check className="h-3.5 w-3.5" /> : i + 1}
                </div>
                <span
                  className={`text-xs font-medium truncate ${
                    isActive ? 'text-foreground' : isDone ? 'text-muted-foreground' : 'text-muted-foreground/60'
                  }`}
                >
                  {s.label}
                </span>
              </div>
              {i < steps.length - 1 && (
                <div className={`mx-2 h-0.5 flex-1 ${isDone ? 'bg-primary' : 'bg-secondary'}`} />
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
};

export default CourseBuilderProgress;
