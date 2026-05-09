import { Check } from "lucide-react";
import { cn } from "@/lib/utils";

export interface BuilderStep {
  id: number;
  label: string;
  key: string;
}

interface Props {
  steps: BuilderStep[];
  activeStep: number;
  completedSteps: number[];
  onStepClick: (step: number) => void;
}

const BuilderSidebar = ({ steps, activeStep, completedSteps, onStepClick }: Props) => {
  return (
    <aside className="lg:w-60 lg:shrink-0">
      {/* Mobile horizontal nav */}
      <nav className="lg:hidden flex gap-2 overflow-x-auto pb-2 -mx-1 px-1">
        {steps.map((s) => {
          const isActive = activeStep === s.id;
          const isDone = completedSteps.includes(s.id);
          return (
            <button
              key={s.id}
              onClick={() => onStepClick(s.id)}
              className={cn(
                "flex items-center gap-2 px-3 py-2 rounded-lg text-xs font-medium whitespace-nowrap transition-colors",
                isActive
                  ? "bg-primary text-primary-foreground"
                  : "bg-secondary text-muted-foreground hover:text-foreground"
              )}
            >
              <span
                className={cn(
                  "flex h-5 w-5 items-center justify-center rounded-full text-[10px] font-bold shrink-0",
                  isActive
                    ? "bg-primary-foreground/20 text-primary-foreground"
                    : isDone
                      ? "bg-primary/20 text-primary"
                      : "bg-background text-muted-foreground"
                )}
              >
                {isDone && !isActive ? <Check className="h-3 w-3" /> : s.id}
              </span>
              {s.label}
            </button>
          );
        })}
      </nav>

      {/* Desktop vertical sidebar */}
      <div className="hidden lg:block sticky top-4">
        <p className="text-xs font-semibold uppercase tracking-wider text-muted-foreground mb-3 px-3">
          Course Setup
        </p>
        <nav className="flex flex-col gap-1">
          {steps.map((s) => {
            const isActive = activeStep === s.id;
            const isDone = completedSteps.includes(s.id);
            return (
              <button
                key={s.id}
                onClick={() => onStepClick(s.id)}
                className={cn(
                  "flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium text-left transition-colors",
                  isActive
                    ? "bg-primary text-primary-foreground"
                    : "text-muted-foreground hover:bg-muted hover:text-foreground"
                )}
              >
                <span
                  className={cn(
                    "flex h-6 w-6 items-center justify-center rounded-full text-xs font-bold shrink-0",
                    isActive
                      ? "bg-primary-foreground/20 text-primary-foreground"
                      : isDone
                        ? "bg-primary/20 text-primary"
                        : "bg-secondary text-muted-foreground"
                  )}
                >
                  {isDone && !isActive ? <Check className="h-3.5 w-3.5" /> : s.id}
                </span>
                {s.label}
              </button>
            );
          })}
        </nav>
      </div>
    </aside>
  );
};

export default BuilderSidebar;
