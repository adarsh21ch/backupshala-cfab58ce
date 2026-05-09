import { useState, useRef } from "react";
import { supabase } from "@/integrations/supabase/client";
import { uploadVideoToR2 } from "@/hooks/useVideoUpload";
import { toast } from "sonner";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import { Switch } from "@/components/ui/switch";
import { Progress } from "@/components/ui/progress";
import {
  Upload,
  Youtube,
  Link as LinkIcon,
  FileText,
  Trash2,
  Loader2,
  CheckCircle2,
  X,
  ChevronDown,
  ChevronUp,
  Sparkles,
} from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";
import { useAuth } from "@/contexts/AuthContext";

type VideoSource = "upload" | "youtube" | "url";

export interface ChapterRow {
  id: string;
  module_id: string;
  course_id: string;
  title: string;
  video_url: string | null;
  video_asset_id: string | null;
  pdf_url: string | null;
  pdf_filename: string | null;
  is_preview: boolean;
  chapter_order: number;
  duration_minutes: number | null;
}

interface Props {
  chapter: ChapterRow;
  courseId: string;
  onSaved: () => void;
  onDelete: () => void;
}

const PDF_MAX_BYTES = 50 * 1024 * 1024;

const ChapterEditor = ({ chapter, courseId, onSaved, onDelete }: Props) => {
  const { user } = useAuth();
  const [title, setTitle] = useState(chapter.title || "");
  const initialSource: VideoSource = chapter.video_url?.includes("youtube")
    ? "youtube"
    : chapter.video_url
      ? "url"
      : "upload";
  const [videoSource, setVideoSource] = useState<VideoSource>(initialSource);
  const [videoUrl, setVideoUrl] = useState(chapter.video_url || "");
  const [duration, setDuration] = useState(String(chapter.duration_minutes || 0));
  const [isPreview, setIsPreview] = useState(chapter.is_preview || false);
  const [showAdvanced, setShowAdvanced] = useState(false);
  const [saving, setSaving] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [uploadProgress, setUploadProgress] = useState(0);
  const [uploadedFile, setUploadedFile] = useState<string | null>(
    chapter.video_url && !chapter.video_url.includes("youtube")
      ? chapter.video_url.split("/").pop() || "video"
      : null,
  );
  const [pdfUrl, setPdfUrl] = useState(chapter.pdf_url || "");
  const [pdfFile, setPdfFile] = useState<string | null>(chapter.pdf_filename || null);
  const [pdfUploading, setPdfUploading] = useState(false);
  const videoInputRef = useRef<HTMLInputElement>(null);
  const pdfInputRef = useRef<HTMLInputElement>(null);

  const save = async (overrides: Partial<ChapterRow> = {}) => {
    setSaving(true);
    try {
      // Auto-convert YouTube watch URLs to embed
      let normalizedVideo: string | null =
        overrides.video_url !== undefined ? overrides.video_url : videoUrl.trim() || null;
      if (normalizedVideo) {
        const yt = normalizedVideo.match(
          /(?:youtube\.com\/(?:watch\?v=|embed\/|shorts\/)|youtu\.be\/)([\w-]{6,})/,
        );
        if (yt) normalizedVideo = `https://www.youtube.com/embed/${yt[1]}`;
      }

      const payload: any = {
        title: title.trim() || "Untitled chapter",
        video_url: normalizedVideo,
        is_preview: isPreview,
        duration_minutes: Math.max(0, parseInt(duration) || 0),
        pdf_url: overrides.pdf_url !== undefined ? overrides.pdf_url : pdfUrl || null,
        pdf_filename: overrides.pdf_filename !== undefined ? overrides.pdf_filename : pdfFile || null,
        ...overrides,
      };

      const { error } = await supabase
        .from("course_chapters")
        .update(payload)
        .eq("id", chapter.id);
      if (error) throw error;

      // Sync module.has_pdf_resources
      const { data: rows } = await supabase
        .from("course_chapters")
        .select("pdf_url")
        .eq("module_id", chapter.module_id);
      await supabase
        .from("modules")
        .update({ has_pdf_resources: !!rows?.some((r) => r.pdf_url) })
        .eq("id", chapter.module_id);

      onSaved();
    } catch (err: any) {
      toast.error(err.message || "Save failed");
    } finally {
      setSaving(false);
    }
  };

  const [autoDetectedDuration, setAutoDetectedDuration] = useState(false);

  const detectDuration = (file: File) =>
    new Promise<number>((resolve) => {
      try {
        const video = document.createElement("video");
        video.preload = "metadata";
        video.onloadedmetadata = () => {
          const minutes = Math.max(1, Math.round(video.duration / 60));
          URL.revokeObjectURL(video.src);
          resolve(minutes);
        };
        video.onerror = () => resolve(0);
        video.src = URL.createObjectURL(file);
      } catch {
        resolve(0);
      }
    });

  const handleVideoFile = async (file: File) => {
    if (!file) return;
    setUploading(true);
    setUploadProgress(0);
    try {
      // Auto-detect duration before upload
      const detected = await detectDuration(file);
      let detectedStr = duration;
      if (detected > 0) {
        detectedStr = String(detected);
        setDuration(detectedStr);
        setAutoDetectedDuration(true);
      }

      const { objectKey, publicUrl } = await uploadVideoToR2(file, setUploadProgress, courseId);
      const finalUrl = publicUrl || objectKey;
      setVideoUrl(finalUrl);
      setUploadedFile(file.name);
      await save({ video_url: finalUrl, duration_minutes: Number(detectedStr) || 0 });
      toast.success("Video uploaded");
    } catch (err: any) {
      toast.error(err.message || "Upload failed");
    } finally {
      setUploading(false);
      setUploadProgress(0);
    }
  };

  const handlePdfFile = async (file: File) => {
    if (!file) return;
    if (file.type !== "application/pdf") {
      toast.error("Please select a PDF file");
      return;
    }
    if (file.size > PDF_MAX_BYTES) {
      toast.error("PDF must be under 50MB");
      return;
    }
    if (!user?.id) {
      toast.error("Not signed in");
      return;
    }
    setPdfUploading(true);
    try {
      const safeName = file.name.replace(/[^a-zA-Z0-9._-]/g, "_");
      const path = `${user.id}/chapters/${Date.now()}_${safeName}`;
      const { error } = await supabase.storage
        .from("course-resources")
        .upload(path, file, { contentType: "application/pdf", upsert: false });
      if (error) throw error;
      const { data: pub } = supabase.storage.from("course-resources").getPublicUrl(path);
      setPdfUrl(pub.publicUrl);
      setPdfFile(file.name);
      await save({ pdf_url: pub.publicUrl, pdf_filename: file.name });
      toast.success("PDF uploaded");
    } catch (err: any) {
      toast.error(err.message || "PDF upload failed");
    } finally {
      setPdfUploading(false);
    }
  };

  const VIDEO_SOURCE_OPTIONS: { id: VideoSource; icon: any; label: string; sub: string }[] = [
    { id: "upload", icon: Upload, label: "Upload Video", sub: "From your device" },
    { id: "youtube", icon: Youtube, label: "YouTube", sub: "Paste YouTube URL" },
    { id: "url", icon: LinkIcon, label: "Direct URL", sub: "Self-hosted MP4" },
  ];

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h3 className="font-heading text-lg font-700">Edit Chapter</h3>
        <Button variant="ghost" size="sm" onClick={onDelete} className="text-destructive hover:text-destructive">
          <Trash2 className="h-4 w-4 mr-1" /> Delete
        </Button>
      </div>

      {/* Title */}
      <div className="space-y-1.5">
        <Label>Chapter Title *</Label>
        <Input
          value={title}
          onChange={(e) => setTitle(e.target.value.slice(0, 120))}
          onBlur={() => save()}
          placeholder='e.g. "Introduction to Canva Interface"'
        />
      </div>

      {/* Video */}
      <div className="space-y-3">
        <Label>Video</Label>

        <div className="grid grid-cols-3 gap-2">
          {VIDEO_SOURCE_OPTIONS.map((opt) => {
            const Icon = opt.icon;
            const active = videoSource === opt.id;
            return (
              <button
                key={opt.id}
                type="button"
                onClick={() => setVideoSource(opt.id)}
                className={cn(
                  "flex flex-col items-center gap-1 p-3 rounded-lg border-2 text-center transition-colors",
                  active
                    ? "border-primary bg-primary/5 text-primary"
                    : "border-border hover:border-muted-foreground/40",
                )}
              >
                <Icon className="h-5 w-5" />
                <span className="text-xs font-medium">{opt.label}</span>
                <span className="text-[10px] text-muted-foreground">{opt.sub}</span>
              </button>
            );
          })}
        </div>

        {videoSource === "upload" && (
          <div className="rounded-lg border-2 border-dashed border-border p-4">
            <input
              ref={videoInputRef}
              type="file"
              accept="video/mp4,video/webm,video/quicktime,video/x-matroska"
              className="hidden"
              onChange={(e) => {
                const f = e.target.files?.[0];
                if (f) handleVideoFile(f);
              }}
            />
            {uploading ? (
              <div className="space-y-2">
                <div className="flex items-center gap-2 text-sm">
                  <Loader2 className="h-4 w-4 animate-spin" />
                  Uploading… {uploadProgress}%
                </div>
                <Progress value={uploadProgress} />
              </div>
            ) : uploadedFile ? (
              <div className="flex items-center gap-3">
                <CheckCircle2 className="h-5 w-5 text-primary shrink-0" />
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-medium truncate">{uploadedFile}</p>
                  <p className="text-xs text-muted-foreground">Uploaded</p>
                </div>
                <Button
                  size="sm"
                  variant="outline"
                  onClick={() => videoInputRef.current?.click()}
                >
                  Replace
                </Button>
              </div>
            ) : (
              <button
                type="button"
                onClick={() => videoInputRef.current?.click()}
                className="w-full flex flex-col items-center gap-2 py-6 text-muted-foreground hover:text-foreground"
              >
                <Upload className="h-6 w-6" />
                <span className="text-sm font-medium">Click to choose video</span>
                <span className="text-xs">MP4, WebM, MOV, MKV · max 500MB</span>
              </button>
            )}
          </div>
        )}

        {videoSource === "youtube" && (
          <Input
            placeholder="https://www.youtube.com/watch?v=..."
            value={videoUrl}
            onChange={(e) => setVideoUrl(e.target.value)}
            onBlur={() => save()}
          />
        )}

        {videoSource === "url" && (
          <Input
            placeholder="https://example.com/video.mp4"
            value={videoUrl}
            onChange={(e) => setVideoUrl(e.target.value)}
            onBlur={() => save()}
          />
        )}
      </div>

      {/* Duration */}
      <div className="space-y-1.5">
        <Label className="flex items-center gap-2">
          Duration (minutes)
          {autoDetectedDuration && (
            <span className="text-[10px] font-normal text-primary">✓ Auto-detected · click to override</span>
          )}
        </Label>
        <Input
          type="number"
          min={0}
          value={duration}
          onChange={(e) => { setDuration(e.target.value); setAutoDetectedDuration(false); }}
          onBlur={() => save()}
          className="w-32"
        />
      </div>

      {/* PDF */}
      <div className="space-y-1.5">
        <Label>Chapter PDF (optional, max 50MB)</Label>
        <input
          ref={pdfInputRef}
          type="file"
          accept="application/pdf"
          className="hidden"
          onChange={(e) => {
            const f = e.target.files?.[0];
            if (f) handlePdfFile(f);
            if (pdfInputRef.current) pdfInputRef.current.value = "";
          }}
        />
        {pdfFile ? (
          <div className="flex items-center gap-2 rounded-md border border-border p-2">
            <FileText className="h-4 w-4 text-primary shrink-0" />
            <span className="flex-1 truncate text-sm">{pdfFile}</span>
            <Button
              size="sm"
              variant="ghost"
              onClick={() => pdfInputRef.current?.click()}
              disabled={pdfUploading}
            >
              {pdfUploading ? <Loader2 className="h-3 w-3 animate-spin" /> : "Replace"}
            </Button>
            <Button
              size="sm"
              variant="ghost"
              className="text-muted-foreground hover:text-destructive"
              onClick={() => {
                setPdfUrl("");
                setPdfFile(null);
                save({ pdf_url: null, pdf_filename: null });
              }}
            >
              <X className="h-3.5 w-3.5" />
            </Button>
          </div>
        ) : (
          <Button
            variant="outline"
            size="sm"
            className="w-full"
            onClick={() => pdfInputRef.current?.click()}
            disabled={pdfUploading}
          >
            {pdfUploading ? (
              <>
                <Loader2 className="h-3 w-3 mr-2 animate-spin" /> Uploading…
              </>
            ) : (
              <>
                <Upload className="h-3.5 w-3.5 mr-2" /> Upload PDF
              </>
            )}
          </Button>
        )}
      </div>

      {/* Preview toggle */}
      <div className="flex items-center justify-between rounded-lg border border-border p-3">
        <div>
          <p className="text-sm font-medium">Preview Chapter</p>
          <p className="text-xs text-muted-foreground">Visible to non-enrolled visitors</p>
        </div>
        <Switch
          checked={isPreview}
          onCheckedChange={(v) => {
            setIsPreview(v);
            save({ is_preview: v });
          }}
        />
      </div>

      <Button onClick={() => save()} disabled={saving} className="w-full sm:w-auto">
        {saving ? <Loader2 className="h-4 w-4 mr-2 animate-spin" /> : null}
        Save Chapter
      </Button>
    </div>
  );
};

export default ChapterEditor;
