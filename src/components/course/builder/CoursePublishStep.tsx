import { Check, Copy } from "lucide-react";
import { useState } from "react";
import { Button } from "@/components/ui/button";

export interface PublishCheck {
  label: string;
  ok: boolean;
}

interface Props {
  status: string;
  checks: PublishCheck[];
  enrollmentUrl: string;
  onSubmit: () => void;
}

const CoursePublishStep = ({ status, checks, enrollmentUrl, onSubmit }: Props) => {
  const [copied, setCopied] = useState(false);
  const allChecked = checks.every((c) => c.ok);
  return (
    <div className="rounded-xl border border-border bg-card p-6 space-y-4">
      <h2 className="font-heading text-base font-600">Publish Checklist</h2>
      <div className="space-y-2">
        {checks.map((c, i) => (
          <div key={i} className="flex items-center gap-2">
            <div
              className={`flex h-5 w-5 items-center justify-center rounded-full ${
                c.ok ? "bg-primary/20 text-primary" : "bg-secondary text-muted-foreground"
              }`}
            >
              {c.ok ? <Check className="h-3 w-3" /> : <span className="text-[10px]">✗</span>}
            </div>
            <span className={`text-sm ${c.ok ? "" : "text-muted-foreground"}`}>{c.label}</span>
          </div>
        ))}
      </div>

      <div className="border-t border-border pt-4">
        <p className="text-sm">
          Status: <span className="font-semibold">{(status || "draft").replace("_", " ")}</span>
        </p>
      </div>

      {status === "draft" && (
        <Button
          onClick={onSubmit}
          disabled={!allChecked}
          className="rounded-md bg-accent hover:bg-accent/90 text-accent-foreground font-semibold"
        >
          Submit for Review
        </Button>
      )}

      {status === "published" && (
        <div className="space-y-2">
          <p className="text-xs text-muted-foreground">Enrollment Link:</p>
          <div className="flex items-center gap-2">
            <div className="flex-1 rounded-lg border border-accent/30 bg-accent/5 px-3 py-2 font-mono text-xs text-accent truncate">
              {enrollmentUrl}
            </div>
            <Button
              variant="outline"
              size="sm"
              onClick={() => {
                navigator.clipboard.writeText(enrollmentUrl);
                setCopied(true);
                setTimeout(() => setCopied(false), 2000);
              }}
            >
              {copied ? <Check className="h-4 w-4 text-primary" /> : <Copy className="h-4 w-4" />}
            </Button>
          </div>
        </div>
      )}
    </div>
  );
};

export default CoursePublishStep;
