import { useState } from "react";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import ThumbnailUpload from "@/components/course/ThumbnailUpload";
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from "@/components/ui/collapsible";
import { ChevronDown, ChevronRight, Settings2 } from "lucide-react";

const CATEGORIES = [
  "Video Editing",
  "Content Creation",
  "Personal Branding",
  "Sales & Communication",
  "Freelancing",
  "Business Skills",
  "Digital Marketing",
  "Other",
];
const LANGUAGES = ["English", "Hindi", "Hinglish"];
const LEVELS = ["Beginner", "Intermediate", "Advanced"];

export interface DetailsForm {
  title: string;
  slug: string;
  short_description: string;
  full_description: string;
  category: string;
  language: string;
  level: string;
  thumbnail_url: string;
  preview_video_url: string;
  what_you_learn: string[];
  requirements: string[];
  tags: string[];
}

interface Props {
  form: DetailsForm;
  onChange: (updates: Partial<DetailsForm>) => void;
  onSave: () => void | Promise<void>;
  onNext: () => void;
}

const CourseDetailsStep = ({ form, onChange, onSave, onNext }: Props) => {
  const [showSlug, setShowSlug] = useState(false);
  const [showAdvanced, setShowAdvanced] = useState(false);
  const [learnItem, setLearnItem] = useState("");
  const [reqItem, setReqItem] = useState("");
  const [tagItem, setTagItem] = useState("");

  return (
    <div className="space-y-6">
      <div>
        <h2 className="font-heading text-xl font-700">Course Details</h2>
        <p className="text-sm text-muted-foreground mt-1">
          Basic information about your course. Saves when you click outside any field.
        </p>
      </div>

      {/* Title */}
      <div className="space-y-1.5">
        <Label>Course Title *</Label>
        <Input
          placeholder='e.g. "Master Reels Editing in CapCut"'
          value={form.title}
          onChange={(e) => onChange({ title: e.target.value.slice(0, 100) })}
          onBlur={() => onSave()}
          maxLength={100}
        />
        <div className="flex items-center justify-between">
          <span className="text-xs text-muted-foreground">{form.title.length}/100</span>
          <button
            type="button"
            onClick={() => setShowSlug((v) => !v)}
            className="text-xs text-muted-foreground flex items-center gap-1 hover:text-foreground"
          >
            Edit URL slug {showSlug ? <ChevronDown className="h-3 w-3" /> : <ChevronRight className="h-3 w-3" />}
          </button>
        </div>
        {showSlug && (
          <div className="pt-2">
            <Label className="text-xs">URL Slug</Label>
            <div className="mt-1 flex items-center gap-2 rounded-md border border-border bg-muted/30 px-3 py-1.5">
              <span className="text-xs text-muted-foreground font-mono">backupshala.com/c/you/</span>
              <Input
                value={form.slug}
                onChange={(e) =>
                  onChange({
                    slug: e.target.value.toLowerCase().replace(/[^a-z0-9-]/g, ""),
                  })
                }
                onBlur={() => onSave()}
                className="text-sm border-0 bg-transparent p-0 h-auto focus-visible:ring-0"
              />
            </div>
          </div>
        )}
      </div>

      {/* Short description */}
      <div className="space-y-1.5">
        <Label>Short Description *</Label>
        <Textarea
          placeholder="One-liner that appears on course cards (50-150 characters)"
          value={form.short_description}
          onChange={(e) => onChange({ short_description: e.target.value.slice(0, 150) })}
          onBlur={() => onSave()}
          rows={3}
          maxLength={150}
        />
        <span className="text-xs text-muted-foreground">
          {form.short_description.length}/150 (min 50)
        </span>
      </div>

      {/* Category / Language / Level */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <div className="space-y-1.5">
          <Label>Category</Label>
          <Select
            value={form.category}
            onValueChange={(v) => {
              onChange({ category: v });
              onSave();
            }}
          >
            <SelectTrigger>
              <SelectValue placeholder="Select" />
            </SelectTrigger>
            <SelectContent>
              {CATEGORIES.map((c) => (
                <SelectItem key={c} value={c}>
                  {c}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
        <div className="space-y-1.5">
          <Label>Language</Label>
          <Select
            value={form.language}
            onValueChange={(v) => {
              onChange({ language: v });
              onSave();
            }}
          >
            <SelectTrigger>
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {LANGUAGES.map((l) => (
                <SelectItem key={l} value={l}>
                  {l}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
        <div className="space-y-1.5">
          <Label>Level</Label>
          <Select
            value={form.level}
            onValueChange={(v) => {
              onChange({ level: v });
              onSave();
            }}
          >
            <SelectTrigger>
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {LEVELS.map((l) => (
                <SelectItem key={l} value={l}>
                  {l}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
      </div>

      {/* Thumbnail */}
      <div className="space-y-1.5">
        <Label>Course Thumbnail</Label>
        <p className="text-xs text-muted-foreground">JPG, PNG, WebP · 1280×720 recommended · Max 5MB</p>
        <ThumbnailUpload
          value={form.thumbnail_url}
          onChange={(url) => {
            onChange({ thumbnail_url: url });
            onSave();
          }}
        />
      </div>

      {/* Advanced (optional) options */}
      <Collapsible open={showAdvanced} onOpenChange={setShowAdvanced}>
        <CollapsibleTrigger asChild>
          <button
            type="button"
            className="w-full flex items-center justify-between rounded-md border border-border bg-muted/30 px-4 py-3 hover:bg-muted/50 transition-colors"
          >
            <span className="flex items-center gap-2 text-sm font-medium">
              <Settings2 className="h-4 w-4 text-muted-foreground" />
              Advanced Options
              <span className="text-xs text-muted-foreground font-normal">
                (full description, preview video, learning outcomes, requirements, tags)
              </span>
            </span>
            {showAdvanced ? (
              <ChevronDown className="h-4 w-4 text-muted-foreground" />
            ) : (
              <ChevronRight className="h-4 w-4 text-muted-foreground" />
            )}
          </button>
        </CollapsibleTrigger>
        <CollapsibleContent className="space-y-6 pt-4">
          {/* Full description */}
          <div className="space-y-1.5">
            <Label>
              Full Description{" "}
              <span className="text-muted-foreground font-normal">(optional)</span>
            </Label>
            <Textarea
              placeholder="Describe what students will learn, who this is for, and what makes it special."
              value={form.full_description}
              onChange={(e) => onChange({ full_description: e.target.value.slice(0, 2000) })}
              onBlur={() => onSave()}
              rows={5}
              maxLength={2000}
            />
          </div>

          {/* Preview video */}
          <div className="space-y-1.5">
            <Label>
              Preview Video URL{" "}
              <span className="text-muted-foreground font-normal">(optional, YouTube)</span>
            </Label>
            <Input
              placeholder="https://www.youtube.com/watch?v=..."
              value={form.preview_video_url}
              onChange={(e) => onChange({ preview_video_url: e.target.value })}
              onBlur={() => onSave()}
            />
            <p className="text-xs text-muted-foreground">
              Paste a YouTube link — we'll auto-convert it to an embed.
            </p>
          </div>

          <ListEditor
            label="What Students Will Learn"
            helper="Add concrete outcomes (e.g. How to edit Reels in CapCut)"
            items={form.what_you_learn}
            onChange={(arr) => onChange({ what_you_learn: arr })}
            onSave={onSave}
            draft={learnItem}
            setDraft={setLearnItem}
            placeholder="e.g. How to create Reels using CapCut"
          />

          <ListEditor
            label="Requirements"
            helper="What students need before starting"
            items={form.requirements}
            onChange={(arr) => onChange({ requirements: arr })}
            onSave={onSave}
            draft={reqItem}
            setDraft={setReqItem}
            placeholder="e.g. A smartphone with CapCut installed"
          />

          <ListEditor
            label="Tags"
            helper="Help students find this course"
            items={form.tags}
            onChange={(arr) => onChange({ tags: arr })}
            onSave={onSave}
            draft={tagItem}
            setDraft={setTagItem}
            placeholder="e.g. capcut"
          />
        </CollapsibleContent>
      </Collapsible>

      <div className="pt-4 border-t border-border">
        <Button onClick={onNext} className="w-full sm:w-auto">
          Save & Continue to Build Course →
        </Button>
      </div>
    </div>
  );
};

interface ListEditorProps {
  label: string;
  helper?: string;
  items: string[];
  onChange: (next: string[]) => void;
  onSave: () => void | Promise<void>;
  draft: string;
  setDraft: (v: string) => void;
  placeholder: string;
}

const ListEditor = ({
  label,
  helper,
  items,
  onChange,
  onSave,
  draft,
  setDraft,
  placeholder,
}: ListEditorProps) => {
  const add = () => {
    const v = draft.trim();
    if (!v) return;
    onChange([...items, v]);
    setDraft("");
    onSave();
  };
  return (
    <div className="space-y-1.5">
      <Label>
        {label}{" "}
        <span className="text-muted-foreground font-normal">(optional)</span>
      </Label>
      {helper && <p className="text-xs text-muted-foreground">{helper}</p>}
      <div className="space-y-2">
        {items.map((item, i) => (
          <div key={i} className="flex items-center gap-2">
            <Input
              value={item}
              onChange={(e) => {
                const arr = [...items];
                arr[i] = e.target.value;
                onChange(arr);
              }}
              onBlur={() => onSave()}
            />
            <Button
              variant="ghost"
              size="sm"
              onClick={() => {
                onChange(items.filter((_, j) => j !== i));
                onSave();
              }}
            >
              ✕
            </Button>
          </div>
        ))}
        <div className="flex gap-2">
          <Input
            placeholder={placeholder}
            value={draft}
            onChange={(e) => setDraft(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === "Enter") {
                e.preventDefault();
                add();
              }
            }}
          />
          <Button variant="outline" onClick={add}>
            + Add
          </Button>
        </div>
      </div>
    </div>
  );
};

export default CourseDetailsStep;
