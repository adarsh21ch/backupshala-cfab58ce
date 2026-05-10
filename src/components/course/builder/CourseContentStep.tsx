import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import {
  Plus,
  Trash2,
  ChevronRight,
  ChevronDown,
  Eye,
  EyeOff,
  Loader2,
  FileText,
  FolderPlus,
  Upload,
  CheckCircle2,
  AlertCircle,
  ArrowUp,
  ArrowDown,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import ChapterEditor, { ChapterRow } from "./ChapterEditor";
import CourseVideoSettings from "./CourseVideoSettings";
import { cn } from "@/lib/utils";

interface ModuleRow {
  id: string;
  title: string;
  description?: string | null;
  order_index: number;
  course_id: string;
  // Per-module video player overrides. NULL on any field = inherit from
  // course → creator → platform default. A boolean / number = override.
  allow_seek?: boolean | null;
  allow_speed_change?: boolean | null;
  show_watermark?: boolean | null;
  min_watch_percent?: number | null;
  chapters?: ChapterRow[];
}

type Selection =
  | { type: "module"; id: string }
  | { type: "chapter"; id: string; moduleId: string }
  | null;

interface Props {
  courseId: string;
  isNew: boolean;
  onSaveFirst: () => void;
}

const CourseContentStep = ({ courseId, isNew, onSaveFirst }: Props) => {
  const queryClient = useQueryClient();
  const [selected, setSelected] = useState<Selection>(null);
  const [expandedModules, setExpandedModules] = useState<Set<string>>(new Set());
  const [addingModule, setAddingModule] = useState(false);
  const [newModuleTitle, setNewModuleTitle] = useState("");
  const [mobileView, setMobileView] = useState<"outline" | "editor">("outline");

  const selectAndShow = (sel: Selection) => {
    setSelected(sel);
    if (typeof window !== "undefined" && window.innerWidth < 768) {
      setMobileView("editor");
    }
  };

  const { data: modules = [], isLoading } = useQuery({
    queryKey: ["builder-modules", courseId],
    queryFn: async (): Promise<ModuleRow[]> => {
      if (!courseId || courseId === "new") return [];
      const { data: mods, error } = await supabase
        .from("modules")
        .select("*")
        .eq("course_id", courseId)
        .order("order_index");
      if (error) throw error;
      const withChapters = await Promise.all(
        (mods || []).map(async (mod: any) => {
          const { data: chapters } = await supabase
            .from("course_chapters")
            .select("*")
            .eq("module_id", mod.id)
            .order("chapter_order");
          return { ...mod, chapters: (chapters || []) as ChapterRow[] };
        }),
      );
      return withChapters;
    },
    enabled: !isNew && !!courseId,
  });

  const addModule = useMutation({
    mutationFn: async (title: string) => {
      const { data, error } = await supabase
        .from("modules")
        .insert({
          course_id: courseId,
          title,
          order_index: modules.length,
          module_type: "video",
          is_preview: false,
          video_url: "placeholder",
        })
        .select()
        .single();
      if (error) throw error;
      await supabase
        .from("courses")
        .update({ total_modules: modules.length + 1 })
        .eq("id", courseId);
      return data;
    },
    onSuccess: (data: any) => {
      queryClient.invalidateQueries({ queryKey: ["builder-modules", courseId] });
      setExpandedModules((prev) => new Set([...prev, data.id]));
      selectAndShow({ type: "module", id: data.id });
      setAddingModule(false);
      setNewModuleTitle("");
    },
    onError: (e: any) => toast.error(e.message),
  });

  const deleteModule = useMutation({
    mutationFn: async (moduleId: string) => {
      await supabase.from("course_chapters").delete().eq("module_id", moduleId);
      const { error } = await supabase.from("modules").delete().eq("id", moduleId);
      if (error) throw error;
      await supabase
        .from("courses")
        .update({ total_modules: Math.max(0, modules.length - 1) })
        .eq("id", courseId);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["builder-modules", courseId] });
      setSelected(null);
    },
    onError: (e: any) => toast.error(e.message),
  });

  const addChapter = useMutation({
    mutationFn: async ({
      moduleId,
      moduleChapterCount,
    }: {
      moduleId: string;
      moduleChapterCount: number;
    }) => {
      const { data, error } = await supabase
        .from("course_chapters")
        .insert({
          course_id: courseId,
          module_id: moduleId,
          title: "New Chapter",
          chapter_order: moduleChapterCount,
          is_preview: false,
          is_published: true,
        })
        .select()
        .single();
      if (error) throw error;
      return data;
    },
    onSuccess: (data: any) => {
      queryClient.invalidateQueries({ queryKey: ["builder-modules", courseId] });
      setExpandedModules((prev) => new Set([...prev, data.module_id]));
      selectAndShow({ type: "chapter", id: data.id, moduleId: data.module_id });
    },
    onError: (e: any) => toast.error(e.message),
  });

  const deleteChapter = useMutation({
    mutationFn: async (chapterId: string) => {
      const { error } = await supabase
        .from("course_chapters")
        .delete()
        .eq("id", chapterId);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["builder-modules", courseId] });
      setSelected(null);
    },
    onError: (e: any) => toast.error(e.message),
  });

  const selectedModule =
    selected?.type === "module" ? modules.find((m) => m.id === selected.id) : null;
  const selectedChapter =
    selected?.type === "chapter"
      ? modules.flatMap((m) => m.chapters || []).find((c) => c.id === selected.id) || null
      : null;

  if (isNew) {
    return (
      <div className="rounded-xl border border-dashed border-border p-10 text-center space-y-4">
        <p className="text-sm text-muted-foreground">
          Save your course details first before adding content.
        </p>
        <Button onClick={onSaveFirst}>Save Course Details First</Button>
      </div>
    );
  }

  if (isLoading) {
    return (
      <div className="flex items-center justify-center py-16">
        <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
      </div>
    );
  }

  const totalChapters = modules.reduce((a, m) => a + (m.chapters?.length || 0), 0);

  return (
    <div className="space-y-4">
      <CourseVideoSettings courseId={courseId} />
      <div className="rounded-xl border border-border bg-card overflow-hidden">
      {/* Mobile view toggle */}
      <div className="flex md:hidden items-center gap-2 p-3 border-b border-border">
        <button
          onClick={() => setMobileView("outline")}
          className={cn(
            "flex-1 px-3 py-1.5 rounded-lg text-sm font-medium transition-colors",
            mobileView === "outline"
              ? "bg-primary text-primary-foreground"
              : "text-muted-foreground hover:bg-muted",
          )}
        >
          Course Outline
        </button>
        <button
          onClick={() => setMobileView("editor")}
          className={cn(
            "flex-1 px-3 py-1.5 rounded-lg text-sm font-medium transition-colors",
            mobileView === "editor"
              ? "bg-primary text-primary-foreground"
              : "text-muted-foreground hover:bg-muted",
          )}
        >
          {selected ? "Edit Selected" : "Editor"}
        </button>
      </div>

      <div className="flex flex-col md:flex-row md:min-h-[600px]">
        {/* LEFT — Outline */}
        <div
          className={cn(
            "md:w-72 md:shrink-0 md:border-r md:border-border md:max-h-[calc(100vh-180px)] md:overflow-y-auto p-4 space-y-3",
            mobileView === "outline" ? "block" : "hidden md:block",
          )}
        >
          <div>
            <h3 className="font-heading font-700 text-base">Course Outline</h3>
            <p className="text-xs text-muted-foreground">
              {modules.length} module{modules.length === 1 ? "" : "s"} · {totalChapters} chapter
              {totalChapters === 1 ? "" : "s"}
            </p>
          </div>

          <div className="space-y-2">
            {modules.map((mod, modIdx) => {
              const isExpanded = expandedModules.has(mod.id);
              const isModuleSelected = selected?.type === "module" && selected.id === mod.id;
              return (
                <div key={mod.id} className="group">
                  <div
                    className={cn(
                      "flex items-center gap-1.5 px-2 py-2 rounded-md cursor-pointer transition-colors",
                      isModuleSelected
                        ? "bg-primary/10 text-primary"
                        : "hover:bg-muted",
                    )}
                    onClick={() => selectAndShow({ type: "module", id: mod.id })}
                  >
                    <span title="Drag to reorder" className="shrink-0 cursor-grab">
                      <GripVertical className="h-3.5 w-3.5 text-muted-foreground/40" />
                    </span>
                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        setExpandedModules((prev) => {
                          const next = new Set(prev);
                          next.has(mod.id) ? next.delete(mod.id) : next.add(mod.id);
                          return next;
                        });
                      }}
                      className="shrink-0"
                    >
                      {isExpanded ? (
                        <ChevronDown className="h-3.5 w-3.5" />
                      ) : (
                        <ChevronRight className="h-3.5 w-3.5" />
                      )}
                    </button>
                    <span
                      className="text-sm font-medium line-clamp-2 flex-1 break-words"
                      title={mod.title}
                    >
                      M{modIdx + 1}: {mod.title}
                    </span>
                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        addChapter.mutate({
                          moduleId: mod.id,
                          moduleChapterCount: mod.chapters?.length || 0,
                        });
                      }}
                      className="opacity-0 group-hover:opacity-100 transition-opacity shrink-0 p-1 rounded hover:bg-background"
                      title="Add chapter"
                    >
                      <Plus className="h-3 w-3" />
                    </button>
                  </div>

                  {isExpanded && (
                    <div className="ml-6 mt-1 space-y-1">
                      {(mod.chapters || []).map((ch, chIdx) => {
                        const isChSelected =
                          selected?.type === "chapter" && selected.id === ch.id;
                        const hasVideo = !!(ch.video_url || ch.video_asset_id);
                        return (
                          <div
                            key={ch.id}
                            onClick={() =>
                              selectAndShow({ type: "chapter", id: ch.id, moduleId: mod.id })
                            }
                            className={cn(
                              "flex items-center gap-2 px-2 py-1.5 rounded-md cursor-pointer text-xs transition-colors",
                              isChSelected
                                ? "bg-primary/10 text-primary"
                                : "hover:bg-muted text-muted-foreground hover:text-foreground",
                            )}
                          >
                            <span className="text-[10px] font-bold w-4 text-center shrink-0">
                              {chIdx + 1}
                            </span>
                            <span className="flex-1 truncate" title={ch.title}>{ch.title}</span>
                            {ch.is_preview && (
                              <Badge variant="outline" className="h-4 px-1 text-[9px]">
                                Preview
                              </Badge>
                            )}
                            {ch.pdf_url && <FileText className="h-3 w-3 text-primary shrink-0" />}
                            {hasVideo ? (
                              <Eye className="h-3 w-3 text-primary shrink-0" />
                            ) : (
                              <EyeOff className="h-3 w-3 text-muted-foreground/40 shrink-0" />
                            )}
                          </div>
                        );
                      })}
                      <button
                        onClick={() =>
                          addChapter.mutate({
                            moduleId: mod.id,
                            moduleChapterCount: mod.chapters?.length || 0,
                          })
                        }
                        className="flex items-center gap-1 px-2 py-1 text-xs text-muted-foreground hover:text-foreground"
                      >
                        <Plus className="h-3 w-3" /> Add chapter
                      </button>
                    </div>
                  )}
                </div>
              );
            })}

            {addingModule ? (
              <div className="space-y-2 p-2 border border-border rounded-md">
                <Input
                  autoFocus
                  placeholder="Module title"
                  value={newModuleTitle}
                  onChange={(e) => setNewModuleTitle(e.target.value)}
                  onKeyDown={(e) => {
                    if (e.key === "Enter" && newModuleTitle.trim()) {
                      addModule.mutate(newModuleTitle.trim());
                    }
                    if (e.key === "Escape") {
                      setAddingModule(false);
                      setNewModuleTitle("");
                    }
                  }}
                  className="text-xs h-8"
                />
                <div className="flex gap-2">
                  <Button
                    size="sm"
                    className="flex-1 h-7 text-xs"
                    onClick={() =>
                      newModuleTitle.trim() && addModule.mutate(newModuleTitle.trim())
                    }
                    disabled={addModule.isPending}
                  >
                    Add
                  </Button>
                  <Button
                    size="sm"
                    variant="ghost"
                    className="h-7 text-xs"
                    onClick={() => {
                      setAddingModule(false);
                      setNewModuleTitle("");
                    }}
                  >
                    Cancel
                  </Button>
                </div>
              </div>
            ) : (
              <Button
                variant="outline"
                size="sm"
                className="w-full"
                onClick={() => setAddingModule(true)}
              >
                <Plus className="h-3.5 w-3.5 mr-1" /> Add Module
              </Button>
            )}
          </div>

          <div className="text-[10px] text-muted-foreground border-t border-border pt-2 flex items-center gap-3">
            <span className="flex items-center gap-1">
              <Eye className="h-3 w-3 text-primary" /> Has video
            </span>
            <span className="flex items-center gap-1">
              <EyeOff className="h-3 w-3" /> No video
            </span>
          </div>
        </div>

        {/* RIGHT — Editor */}
        <div
          className={cn(
            "flex-1 min-w-0 p-6 md:overflow-y-auto md:max-h-[calc(100vh-180px)]",
            mobileView === "editor" ? "block" : "hidden md:block",
          )}
        >
          {!selected && <GettingStartedGuide />}

          {selected?.type === "module" && selectedModule && (
            <ModuleEditor
              key={selectedModule.id}
              module={selectedModule}
              chapterCount={selectedModule.chapters?.length || 0}
              onAddChapter={() =>
                addChapter.mutate({
                  moduleId: selectedModule.id,
                  moduleChapterCount: selectedModule.chapters?.length || 0,
                })
              }
              onSelectChapter={(chId) =>
                selectAndShow({ type: "chapter", id: chId, moduleId: selectedModule.id })
              }
              onDelete={() => deleteModule.mutate(selectedModule.id)}
              onSaved={() =>
                queryClient.invalidateQueries({ queryKey: ["builder-modules", courseId] })
              }
            />
          )}

          {selected?.type === "chapter" && selectedChapter && (
            <ChapterEditor
              key={selectedChapter.id}
              chapter={selectedChapter}
              courseId={courseId}
              onSaved={() =>
                queryClient.invalidateQueries({ queryKey: ["builder-modules", courseId] })
              }
              onDelete={() => {
                if (window.confirm(`Delete chapter "${selectedChapter.title}"?`)) {
                  deleteChapter.mutate(selectedChapter.id);
                }
              }}
            />
          )}
        </div>
      </div>
      </div>
    </div>
  );
};

const GettingStartedGuide = () => {
  const steps = [
    {
      step: "1",
      color: "bg-primary",
      title: "Add a Module",
      desc: 'Click "+ Add Module" on the left. A module is a section, like "Module 1: Canva Basics".',
      icon: FolderPlus,
    },
    {
      step: "2",
      color: "bg-emerald-500",
      title: "Add Chapters inside the Module",
      desc: 'Expand the module and click "+ Add chapter". Each chapter is one video lesson.',
      icon: Plus,
    },
    {
      step: "3",
      color: "bg-blue-500",
      title: "Upload a Video to each Chapter",
      desc: "Click the chapter, then upload your video (MP4, MOV, up to 500MB) or paste a YouTube link.",
      icon: Upload,
    },
    {
      step: "4",
      color: "bg-accent",
      title: "Optionally add a PDF worksheet",
      desc: "Each chapter can have a PDF download for students. Great for exercises and notes.",
      icon: FileText,
    },
  ];

  return (
    <div className="flex flex-col h-full">
      <div className="max-w-md space-y-6">
        <div>
          <h3 className="font-heading text-lg font-semibold mb-1">Build Your Course</h3>
          <p className="text-sm text-muted-foreground">
            Follow these steps to add content to your course.
          </p>
        </div>

        <div className="space-y-4">
          {steps.map(({ step, color, title, desc }) => (
            <div key={step} className="flex gap-3">
              <div
                className={cn(
                  "w-8 h-8 rounded-full text-white flex items-center justify-center text-sm font-bold shrink-0 mt-0.5",
                  color,
                )}
              >
                {step}
              </div>
              <div>
                <p className="text-sm font-medium">{title}</p>
                <p className="text-xs text-muted-foreground mt-0.5">{desc}</p>
              </div>
            </div>
          ))}
        </div>

        <div className="p-3 bg-muted/50 rounded-lg">
          <p className="text-xs text-muted-foreground">
            💡 <strong>Tip:</strong> Your course structure mirrors a real classroom.
            Modules = topics. Chapters = individual class sessions with one video each.
          </p>
        </div>
      </div>
    </div>
  );
};

interface ModuleEditorProps {
  module: ModuleRow;
  chapterCount: number;
  onAddChapter: () => void;
  onSelectChapter: (chapterId: string) => void;
  onDelete: () => void;
  onSaved: () => void;
}

const ModuleEditor = ({
  module,
  chapterCount,
  onAddChapter,
  onSelectChapter,
  onDelete,
  onSaved,
}: ModuleEditorProps) => {
  const [title, setTitle] = useState(module.title);
  const [description, setDescription] = useState(module.description || "");
  const [saving, setSaving] = useState(false);
  const [confirmDelete, setConfirmDelete] = useState(false);
  const [showVideoOverrides, setShowVideoOverrides] = useState(false);

  // Per-module video override state. `null` = inherit from course/creator default.
  const [allowSeek, setAllowSeek] = useState<boolean | null>(module.allow_seek ?? null);
  const [allowSpeed, setAllowSpeed] = useState<boolean | null>(module.allow_speed_change ?? null);
  const [showWatermark, setShowWatermark] = useState<boolean | null>(module.show_watermark ?? null);
  const [minWatchPercent, setMinWatchPercent] = useState<number | null>(module.min_watch_percent ?? null);

  const chapters = module.chapters || [];

  const save = async (overrides: Partial<ModuleRow> = {}) => {
    setSaving(true);
    const payload: any = { title, description, ...overrides };
    const { error } = await supabase
      .from("modules")
      .update(payload)
      .eq("id", module.id);
    setSaving(false);
    if (error) {
      toast.error(error.message);
      return;
    }
    onSaved();
  };

  // Tri-state pill: Inherit / On / Off. Writing immediately keeps the UX
  // snappy and matches the existing onBlur autosave pattern.
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
            <TooltipContent className="max-w-[240px] text-xs">{hint}</TooltipContent>
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
    <div className="space-y-5">
      <div className="flex items-start justify-between gap-3">
        <h3 className="font-heading text-lg font-700">Edit Module</h3>
        {!confirmDelete ? (
          <Button
            variant="ghost"
            size="sm"
            onClick={() => setConfirmDelete(true)}
            className="text-destructive hover:text-destructive"
          >
            <Trash2 className="h-4 w-4 mr-1" /> Delete Module
          </Button>
        ) : (
          <div className="flex items-center gap-2 rounded-lg border border-destructive/30 bg-destructive/5 p-2">
            <AlertCircle className="h-4 w-4 text-destructive shrink-0" />
            <span className="text-xs">
              Delete module + all {chapters.length} chapter{chapters.length === 1 ? "" : "s"}?
            </span>
            <Button size="sm" variant="destructive" className="h-7 text-xs" onClick={onDelete}>
              Yes, delete
            </Button>
            <Button size="sm" variant="ghost" className="h-7 text-xs" onClick={() => setConfirmDelete(false)}>
              Cancel
            </Button>
          </div>
        )}
      </div>

      <div className="space-y-1.5">
        <Label>Module Title *</Label>
        <Input
          value={title}
          onChange={(e) => setTitle(e.target.value)}
          onBlur={() => save()}
          placeholder="e.g. Canva Basics"
        />
        <p className="text-xs text-muted-foreground">
          This is a section header. Chapters inside it are the actual video lessons.
        </p>
      </div>

      <div className="space-y-1.5">
        <Label>
          Module Description{" "}
          <span className="text-muted-foreground font-normal">(optional)</span>
        </Label>
        <Textarea
          value={description}
          onChange={(e) => setDescription(e.target.value)}
          onBlur={() => save()}
          placeholder="What will students learn in this module?"
          rows={3}
        />
      </div>

      {/* Per-module video player overrides */}
      <div className="rounded-lg border border-border overflow-hidden">
        <button
          type="button"
          onClick={() => setShowVideoOverrides((v) => !v)}
          className="w-full flex items-center justify-between p-3 text-sm font-medium hover:bg-muted/50 transition-colors"
        >
          <span className="flex items-center gap-2">
            <Film className="h-4 w-4 text-primary" />
            Video Player Overrides
            <Badge variant="outline" className="h-4 px-1.5 text-[9px] text-muted-foreground">
              Per-module
            </Badge>
          </span>
          {showVideoOverrides ? (
            <ChevronUp className="h-4 w-4 text-muted-foreground" />
          ) : (
            <ChevronDown className="h-4 w-4 text-muted-foreground" />
          )}
        </button>
        {showVideoOverrides && (
          <div className="border-t border-border p-4 space-y-4">
            <p className="text-xs text-muted-foreground">
              These settings only affect this module. Leave on <strong>Inherit</strong> to use
              the course / creator defaults from your <em>Settings</em> page.
            </p>
            <div className="grid sm:grid-cols-2 gap-4">
              <TriState
                label="Forward Seeking"
                hint="Allow students to skip ahead in this module's video. Block = students must watch from start without skipping."
                value={allowSeek}
                onChange={(v) => { setAllowSeek(v); save({ allow_seek: v }); }}
              />
              <TriState
                label="Speed Control"
                hint="Allow students to change playback speed (0.5x – 2x) on this module."
                value={allowSpeed}
                onChange={(v) => { setAllowSpeed(v); save({ allow_speed_change: v }); }}
              />
              <TriState
                label="Watermark"
                hint="Show student name + Backupshala watermark over this module's video."
                value={showWatermark}
                onChange={(v) => { setShowWatermark(v); save({ show_watermark: v }); }}
              />
            </div>

            <div className="space-y-2">
              <div className="flex items-center justify-between">
                <Label className="text-sm flex items-center gap-1.5">
                  Completion Threshold
                  <Tooltip>
                    <TooltipTrigger asChild>
                      <Info className="h-3 w-3 text-muted-foreground cursor-help" />
                    </TooltipTrigger>
                    <TooltipContent className="max-w-[240px] text-xs">
                      How much of the video a student must watch before this module is marked complete.
                      Leave inherit to use the course default.
                    </TooltipContent>
                  </Tooltip>
                </Label>
                <span className="text-xs text-muted-foreground">
                  {minWatchPercent === null ? "Inherit" : `${minWatchPercent}%`}
                </span>
              </div>
              <Slider
                value={[minWatchPercent ?? 80]}
                min={50}
                max={100}
                step={5}
                onValueChange={([v]) => setMinWatchPercent(v)}
                onValueCommit={([v]) => save({ min_watch_percent: v })}
                disabled={minWatchPercent === null}
              />
              <button
                type="button"
                onClick={() => { setMinWatchPercent(null); save({ min_watch_percent: null }); }}
                className="text-xs text-muted-foreground hover:text-foreground underline-offset-2 hover:underline"
              >
                {minWatchPercent === null ? "Click slider to override" : "Reset to inherit"}
              </button>
            </div>
          </div>
        )}
      </div>

      {/* Chapters list */}
      <div className="space-y-2">
        <div className="flex items-center justify-between">
          <Label>Chapters in this module</Label>
          <span className="text-xs text-muted-foreground">
            {chapters.length} chapter{chapters.length === 1 ? "" : "s"}
          </span>
        </div>
        {chapters.length === 0 ? (
          <div className="rounded-lg border border-dashed border-border p-4 text-center">
            <p className="text-xs text-muted-foreground">
              No chapters yet. Click "+ Add chapter" below or in the outline.
            </p>
          </div>
        ) : (
          <div className="rounded-lg border border-border divide-y divide-border">
            {chapters.map((ch, i) => {
              const hasVideo = !!(ch.video_url || ch.video_asset_id);
              return (
                <button
                  key={ch.id}
                  onClick={() => onSelectChapter(ch.id)}
                  className="w-full flex items-center gap-3 p-3 text-left hover:bg-muted/50 transition-colors"
                >
                  <span className="flex h-6 w-6 items-center justify-center rounded bg-primary/10 text-xs font-bold text-primary shrink-0">
                    {i + 1}
                  </span>
                  <span className="flex-1 text-sm truncate">{ch.title}</span>
                  {hasVideo ? (
                    <CheckCircle2 className="h-4 w-4 text-primary shrink-0" />
                  ) : (
                    <EyeOff className="h-4 w-4 text-muted-foreground/40 shrink-0" />
                  )}
                </button>
              );
            })}
          </div>
        )}
        <Button variant="outline" size="sm" onClick={onAddChapter} className="w-full">
          <Plus className="h-3.5 w-3.5 mr-1.5" /> Add chapter
        </Button>
      </div>

      <Button onClick={() => save()} disabled={saving}>
        {saving ? <Loader2 className="h-4 w-4 mr-2 animate-spin" /> : null}
        Save Module
      </Button>
    </div>
  );
};

export default CourseContentStep;
