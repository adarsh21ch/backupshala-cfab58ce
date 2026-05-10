import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { Film, Info, Loader2 } from "lucide-react";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Tooltip, TooltipContent, TooltipTrigger } from "@/components/ui/tooltip";

interface Props {
  courseId: string;
}

type CourseVideoFields = {
  allow_forward_seeking: boolean | null;
  allow_speed_control: boolean | null;
};

/**
 * Course-wide video defaults. Two simple toggles — keep it dead simple for
 * non-technical creators. Watermark and completion threshold are managed by
 * admin globally; per-module overrides removed.
 */
const CourseVideoSettings = ({ courseId }: Props) => {
  const qc = useQueryClient();

  const { data, isLoading } = useQuery({
    queryKey: ["course-video-settings", courseId],
    queryFn: async (): Promise<CourseVideoFields> => {
      const { data, error } = await supabase
        .from("courses")
        .select("allow_forward_seeking, allow_speed_control")
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
      toast.success("Saved");
    },
    onError: (e: any) => toast.error(e.message),
  });

  if (!courseId || courseId === "new") return null;

  // Default behaviour when null = allowed (true).
  const seek = data?.allow_forward_seeking ?? true;
  const speed = data?.allow_speed_control ?? true;

  const Row = ({
    label,
    hint,
    checked,
    onChange,
  }: {
    label: string;
    hint: string;
    checked: boolean;
    onChange: (v: boolean) => void;
  }) => (
    <div className="flex items-start justify-between gap-4 rounded-lg border border-border bg-secondary/40 p-3">
      <div className="min-w-0">
        <div className="flex items-center gap-1.5">
          <Label className="text-sm font-medium">{label}</Label>
          <Tooltip>
            <TooltipTrigger asChild>
              <Info className="h-3 w-3 text-muted-foreground cursor-help" />
            </TooltipTrigger>
            <TooltipContent className="max-w-[260px] text-xs">{hint}</TooltipContent>
          </Tooltip>
        </div>
      </div>
      <Switch checked={checked} onCheckedChange={onChange} />
    </div>
  );

  return (
    <div className="rounded-xl border border-border bg-card p-4 space-y-4">
      <div className="flex items-center gap-2">
        <Film className="h-4 w-4 text-primary" />
        <h3 className="font-heading font-700 text-base">Video Settings</h3>
      </div>
      <p className="text-xs text-muted-foreground -mt-2">
        Applies to every video in this course.
      </p>

      {isLoading ? (
        <div className="flex items-center gap-2 text-sm text-muted-foreground">
          <Loader2 className="h-4 w-4 animate-spin" /> Loading…
        </div>
      ) : (
        <div className="grid sm:grid-cols-2 gap-3">
          <Row
            label="Allow forward seeking"
            hint="When on, students can skip ahead. When off, they must watch from start without skipping."
            checked={seek}
            onChange={(v) => updateMut.mutate({ allow_forward_seeking: v })}
          />
          <Row
            label="Allow speed control"
            hint="When on, students can change playback speed (0.5× – 2×)."
            checked={speed}
            onChange={(v) => updateMut.mutate({ allow_speed_control: v })}
          />
        </div>
      )}
    </div>
  );
};

export default CourseVideoSettings;
