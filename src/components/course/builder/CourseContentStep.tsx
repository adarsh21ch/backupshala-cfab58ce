import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import {
  Plus,
  GripVertical,
  Trash2,
  ChevronRight,
  ChevronDown,
  Eye,
  EyeOff,
  Loader2,
  FileText,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import ChapterEditor, { ChapterRow } from "./ChapterEditor";
import { cn } from "@/lib/utils";

interface ModuleRow {
  id: string;
  title: string;
  description?: string | null;
  order_index: number;
  course_id: string;
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
      // Bump course total_modules
      await supabase
        .from("courses")
        .update({ total_modules: modules.length + 1 })
        .eq("id", courseId);
      return data;
    },
    onSuccess: (data: any) => {
      queryClient.invalidateQueries({ queryKey: ["builder-modules", courseId] });
      setExpandedModules((prev) => new Set([...prev, data.id]));
      setSelected({ type: "module", id: data.id });
      setAddingModule(false);
      setNewModuleTitle("");
    },
    onError: (e: any) => toast.error(e.message),
  });

  const deleteModule = useMutation({
    mutationFn: async (moduleId: string) => {
      // Manually delete chapters first since no FK cascade
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
      setSelected({ type: "chapter", id: data.id, moduleId: data.module_id });
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
    <div className="grid grid-cols-1 lg:grid-cols-[320px_1fr] gap-6">
      {/* LEFT — Outline */}
      <div className="rounded-xl border border-border bg-card p-4 space-y-3 lg:max-h-[calc(100vh-180px)] lg:overflow-y-auto">
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
              <div key={mod.id}>
                <div
                  className={cn(
                    "flex items-center gap-1.5 px-2 py-2 rounded-md cursor-pointer transition-colors",
                    isModuleSelected
                      ? "bg-primary/10 text-primary"
                      : "hover:bg-muted",
                  )}
                  onClick={() => setSelected({ type: "module", id: mod.id })}
                >
                  <GripVertical className="h-3.5 w-3.5 text-muted-foreground/40 shrink-0" />
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
                  <span className="text-sm font-medium truncate flex-1">
                    M{modIdx + 1}: {mod.title}
                  </span>
                </div>

                {isExpanded && (
                  <div className="ml-6 mt-1 space-y-1">
                    {(mod.chapters || []).map((ch, chIdx) => {
                      const isChSelected =
                        selected?.type === "chapter" && selected.id === ch.id;
                      const hasVideo = !!ch.video_url;
                      return (
                        <div
                          key={ch.id}
                          onClick={() =>
                            setSelected({ type: "chapter", id: ch.id, moduleId: mod.id })
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
                          <span className="flex-1 truncate">{ch.title}</span>
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
      <div className="rounded-xl border border-border bg-card p-6">
        {!selected && (
          <div className="flex flex-col items-center justify-center py-16 text-center space-y-3">
            <div className="h-16 w-16 rounded-full bg-muted flex items-center justify-center">
              <Plus className="h-7 w-7 text-muted-foreground" />
            </div>
            <h3 className="font-heading font-700 text-base">
              Select a module or chapter
            </h3>
            <p className="text-sm text-muted-foreground max-w-sm">
              Click anything in the outline to edit it, or add a new module to get started.
            </p>
          </div>
        )}

        {selected?.type === "module" && selectedModule && (
          <ModuleEditor
            key={selectedModule.id}
            module={selectedModule}
            onDelete={() => {
              if (window.confirm(`Delete module "${selectedModule.title}"?`)) {
                deleteModule.mutate(selectedModule.id);
              }
            }}
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
  );
};

interface ModuleEditorProps {
  module: ModuleRow;
  onDelete: () => void;
  onSaved: () => void;
}

const ModuleEditor = ({ module, onDelete, onSaved }: ModuleEditorProps) => {
  const [title, setTitle] = useState(module.title);
  const [description, setDescription] = useState(module.description || "");
  const [saving, setSaving] = useState(false);

  const save = async () => {
    setSaving(true);
    const { error } = await supabase
      .from("modules")
      .update({ title, description })
      .eq("id", module.id);
    setSaving(false);
    if (error) {
      toast.error(error.message);
      return;
    }
    onSaved();
  };

  return (
    <div className="space-y-5">
      <div className="flex items-center justify-between">
        <h3 className="font-heading text-lg font-700">Edit Module</h3>
        <Button
          variant="ghost"
          size="sm"
          onClick={onDelete}
          className="text-destructive hover:text-destructive"
        >
          <Trash2 className="h-4 w-4 mr-1" /> Delete Module
        </Button>
      </div>

      <div className="space-y-1.5">
        <Label>Module Title *</Label>
        <Input
          value={title}
          onChange={(e) => setTitle(e.target.value)}
          onBlur={save}
          placeholder="e.g. Canva Basics"
        />
        <p className="text-xs text-muted-foreground">
          A module is a section header. Add chapters inside it for actual lessons.
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
          onBlur={save}
          placeholder="What will students learn in this module?"
          rows={3}
        />
      </div>

      <Button onClick={save} disabled={saving}>
        {saving ? <Loader2 className="h-4 w-4 mr-2 animate-spin" /> : null}
        Save Module
      </Button>
    </div>
  );
};

export default CourseContentStep;
