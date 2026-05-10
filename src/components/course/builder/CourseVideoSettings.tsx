import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { Film, ChevronDown, ChevronUp, Info, Loader2 } from "lucide-react";
import { Label } from "@/components/ui/label";
import { Slider } from "@/components/ui/slider";
import { Badge } from "@/components/ui/badge";
import { Tooltip, TooltipContent, TooltipTrigger } from "@/components/ui/tooltip";
import { cn } from "@/lib/utils";

interface Props {
  courseId: string;
}

type CourseVideoFields = {
  allow_forward_seeking: boolean | null;
  allow_speed_control: boolean | null;
  video_watermark_enabled: boolean | null;
  min_watch_percentage_to_complete: number | null;
};

/**
 * Course-level video player defaults. Sits one tier above per-module
 * overrides: module override → course default → creator default → platform.
 * NULL = inherit from creator/platform.
 */
const CourseVideoSettings = ({ courseId }: Props) => {
  const qc = useQueryClient();
  const [open, setOpen] = useState(false);

  const { data, isLoading } = useQuery({
    queryKey: ["course-video-settings", courseId],
    queryFn: async (): Promise<CourseVideoFields> => {
      const { data, error } = await supabase
        .from("courses")
        .select(
          "allow_forward_seeking, allow_speed_control, video_watermark_enabled, min_watch_percentage_to_complete",
        )
        .eq("id", courseId)
        .single();
      if (error) throw error;
      return data as CourseVideoFields;
    },
    enabled: !!courseId && courseId !== "new",
  });

  const updateMut = useMutation({
    mutationFn: async (patch: Partial<CourseVideoFields>) => {
      const { error } = await supabase.from("courses").update(patch).eq("id", courseId);
      if (error) throw error;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["course-video-settings", courseId] });
      toast.success("Course video settings saved");
    },
    onError: (e: any) => toast.error(e.message),
  });

  if (!courseId || courseId === "new") return null;

  const v = data || {
    allow_forward_seeking: null,
    allow_speed_control: null,
    video_watermark_enabled: null,
    min_watch_percentage_to_complete: null,
  };

  const TriState = ({
    label,
    hint,
    value,
    onChange,
  }: {
    label: string;
    hint: string;
    value: boolean | null;
    onChange: (v: boolean | null) => void;
  }) => {
    const opts: { v: boolean | null; label: string }[] = [
      { v: null, label: "Inherit" },
      { v: true, label: "Allow" },
      { v: false, label: "Block" },
    ];
    return (
      <div className="space-y-1.5">
        <div className="flex items-center gap-1.5">
          <Label className="text-sm">{label}</Label>
          <Tooltip>
            <TooltipTrigger asChild>
              <Info className="h-3 w-3 text-muted-foreground cursor-help" />
            </TooltipTrigger>
            <TooltipContent className="max-w-[260px] text-xs">{hint}</TooltipContent>
          </Tooltip>
        </div>
        <div className="inline-flex rounded-lg border border-border bg-secondary/50 p-0.5">
          {opts.map((o) => {
            const active = value === o.v;
            return (
              <button
                key={String(o.v)}
                type="button"
                onClick={() => onChange(o.v)}
                className={cn(
                  "px-3 py-1 text-xs font-medium rounded-md transition-colors",
                  active
                    ? "bg-background text-foreground shadow-sm"
                    : "text-muted-foreground hover:text-foreground",
                )}
              >
                {o.label}
              </button>
            );
          })}
        </div>
      </div>
    );
  };

  return (
    <div className="rounded-xl border border-border bg-card overflow-hidden">
      <button
        type="button"
        onClick={() => setOpen((o) => !o)}
        className="w-full flex items-center justify-between p-4 hover:bg-muted/40 transition-colors"
      >
        <span className="flex items-center gap-2 text-sm font-medium">
          <Film className="h-4 w-4 text-primary" />
          Course Video Settings
          <Badge variant="outline" className="h-4 px-1.5 text-[9px] text-muted-foreground">
            Course-wide default
          </Badge>
        </span>
        {open ? (
          <ChevronUp className="h-4 w-4 text-muted-foreground" />
        ) : (
          <ChevronDown className="h-4 w-4 text-muted-foreground" />
        )}
      </button>

      {open && (
        <div className="border-t border-border p-4 space-y-4">
          {isLoading ? (
            <div className="flex items-center gap-2 text-sm text-muted-foreground">
              <Loader2 className="h-4 w-4 animate-spin" /> Loading…
            </div>
          ) : (
            <>
              <p className="text-xs text-muted-foreground">
                These apply to every module in this course unless a specific module overrides them.
                Leave on <strong>Inherit</strong> to fall back to your creator-wide defaults.
              </p>

              <div className="grid sm:grid-cols-2 gap-4">
                <TriState
                  label="Forward Seeking"
                  hint="Allow students to skip ahead in any video. Block = students must watch from start without skipping."
                  value={v.allow_forward_seeking}
                  onChange={(val) => updateMut.mutate({ allow_forward_seeking: val })}
                />
                <TriState
                  label="Speed Control"
                  hint="Allow students to change playback speed (0.5× – 2×)."
                  value={v.allow_speed_control}
                  onChange={(val) => updateMut.mutate({ allow_speed_control: val })}
                />
                <TriState
                  label="Watermark"
                  hint="Show student name + Backupshala watermark over every video in this course."
                  value={v.video_watermark_enabled}
                  onChange={(val) => updateMut.mutate({ video_watermark_enabled: val })}
                />
                <div className="space-y-1.5">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-1.5">
                      <Label className="text-sm">Min Watch %</Label>
                      <Tooltip>
                        <TooltipTrigger asChild>
                          <Info className="h-3 w-3 text-muted-foreground cursor-help" />
                        </TooltipTrigger>
                        <TooltipContent className="max-w-[260px] text-xs">
                          % of a video the student must watch before it counts as completed. 0 = inherit creator default.
                        </TooltipContent>
                      </Tooltip>
                    </div>
                    <span className="text-xs font-mono text-muted-foreground">
                      {v.min_watch_percentage_to_complete ?? "—"}%
                    </span>
                  </div>
                  <Slider
                    min={0}
                    max={100}
                    step={5}
                    value={[v.min_watch_percentage_to_complete ?? 0]}
                    onValueChange={([n]) =>
                      updateMut.mutate({ min_watch_percentage_to_complete: n === 0 ? null : n })
                    }
                  />
                </div>
              </div>
            </>
          )}
        </div>
      )}
    </div>
  );
};

export default CourseVideoSettings;
