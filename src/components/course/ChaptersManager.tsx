import { useEffect, useRef, useState } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Switch } from '@/components/ui/switch';
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter,
} from '@/components/ui/dialog';
import { Loader2, Plus, FileText, Upload, Trash2, Pencil, Eye, GripVertical, X } from 'lucide-react';
import { toast } from 'sonner';

interface Chapter {
  id: string;
  module_id: string;
  course_id: string;
  title: string;
  description: string | null;
  chapter_order: number;
  video_url: string | null;
  duration_minutes: number;
  pdf_url: string | null;
  pdf_filename: string | null;
  is_preview: boolean;
  is_published: boolean;
}

interface Props {
  moduleId: string;
  courseId: string;
}

const PDF_MAX_BYTES = 10 * 1024 * 1024; // 10MB

const ChaptersManager = ({ moduleId, courseId }: Props) => {
  const { user } = useAuth();
  const [chapters, setChapters] = useState<Chapter[]>([]);
  const [loading, setLoading] = useState(true);
  const [open, setOpen] = useState(false);
  const [saving, setSaving] = useState(false);
  const [editing, setEditing] = useState<Chapter | null>(null);
  const pdfInputRef = useRef<HTMLInputElement>(null);
  const [uploadingPdf, setUploadingPdf] = useState(false);

  // Form state
  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [videoUrl, setVideoUrl] = useState('');
  const [duration, setDuration] = useState('0');
  const [pdfUrl, setPdfUrl] = useState('');
  const [pdfFilename, setPdfFilename] = useState('');
  const [isPreview, setIsPreview] = useState(false);
  const [isPublished, setIsPublished] = useState(true);

  const load = async () => {
    setLoading(true);
    const { data, error } = await supabase
      .from('course_chapters')
      .select('*')
      .eq('module_id', moduleId)
      .order('chapter_order', { ascending: true });
    if (error) {
      toast.error('Failed to load chapters');
    } else {
      setChapters((data || []) as Chapter[]);
    }
    setLoading(false);
  };

  useEffect(() => {
    if (moduleId) load();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [moduleId]);

  const resetForm = () => {
    setTitle('');
    setDescription('');
    setVideoUrl('');
    setDuration('0');
    setPdfUrl('');
    setPdfFilename('');
    setIsPreview(false);
    setIsPublished(true);
    setEditing(null);
  };

  const openNew = () => {
    resetForm();
    setOpen(true);
  };

  const openEdit = (c: Chapter) => {
    setEditing(c);
    setTitle(c.title);
    setDescription(c.description || '');
    setVideoUrl(c.video_url || '');
    setDuration(String(c.duration_minutes || 0));
    setPdfUrl(c.pdf_url || '');
    setPdfFilename(c.pdf_filename || '');
    setIsPreview(c.is_preview);
    setIsPublished(c.is_published);
    setOpen(true);
  };

  const handlePdf = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    if (file.type !== 'application/pdf') {
      toast.error('Only PDF files allowed');
      return;
    }
    if (file.size > PDF_MAX_BYTES) {
      toast.error('Max 10MB');
      return;
    }
    if (!user?.id) {
      toast.error('Not signed in');
      return;
    }
    setUploadingPdf(true);
    try {
      const safeName = file.name.replace(/[^a-zA-Z0-9._-]/g, '_');
      const path = `${user.id}/chapters/${Date.now()}_${safeName}`;
      const { error } = await supabase.storage
        .from('course-resources')
        .upload(path, file, { contentType: 'application/pdf', upsert: false });
      if (error) throw error;
      const { data: pub } = supabase.storage.from('course-resources').getPublicUrl(path);
      setPdfUrl(pub.publicUrl);
      setPdfFilename(file.name);
      toast.success('PDF uploaded');
    } catch (err: any) {
      toast.error(err.message || 'PDF upload failed');
    } finally {
      setUploadingPdf(false);
      if (pdfInputRef.current) pdfInputRef.current.value = '';
    }
  };

  const save = async () => {
    if (!title.trim()) {
      toast.error('Chapter title required');
      return;
    }
    setSaving(true);
    try {
      // Auto-convert YouTube to embed URL
      let normalizedVideo: string | null = videoUrl.trim() || null;
      if (normalizedVideo) {
        const yt = normalizedVideo.match(/(?:youtube\.com\/(?:watch\?v=|embed\/|shorts\/)|youtu\.be\/)([\w-]{6,})/);
        if (yt) normalizedVideo = `https://www.youtube.com/embed/${yt[1]}`;
      }

      const payload = {
        module_id: moduleId,
        course_id: courseId,
        title: title.trim(),
        description: description.trim() || null,
        video_url: normalizedVideo,
        duration_minutes: Math.max(0, parseInt(duration) || 0),
        pdf_url: pdfUrl || null,
        pdf_filename: pdfFilename || null,
        is_preview: isPreview,
        is_published: isPublished,
      };

      if (editing) {
        const { error } = await supabase
          .from('course_chapters')
          .update(payload)
          .eq('id', editing.id);
        if (error) throw error;
        toast.success('Chapter updated');
      } else {
        const { error } = await supabase.from('course_chapters').insert({
          ...payload,
          chapter_order: chapters.length,
        });
        if (error) throw error;
        toast.success('Chapter added');
      }

      // Sync module.has_pdf_resources flag
      const willHavePdf = !!payload.pdf_url || chapters.some(c => c.pdf_url && c.id !== editing?.id);
      await supabase
        .from('modules')
        .update({ has_pdf_resources: willHavePdf })
        .eq('id', moduleId);

      setOpen(false);
      resetForm();
      await load();
    } catch (err: any) {
      toast.error(err.message || 'Save failed');
    } finally {
      setSaving(false);
    }
  };

  const remove = async (c: Chapter) => {
    if (!confirm(`Delete chapter "${c.title}"?`)) return;
    const { error } = await supabase.from('course_chapters').delete().eq('id', c.id);
    if (error) {
      toast.error(error.message);
      return;
    }
    toast.success('Chapter deleted');
    // Recheck pdf flag
    const remaining = chapters.filter(x => x.id !== c.id);
    await supabase
      .from('modules')
      .update({ has_pdf_resources: remaining.some(x => x.pdf_url) })
      .eq('id', moduleId);
    await load();
  };

  return (
    <div className="space-y-2">
      <div className="flex items-center justify-between">
        <p className="text-xs font-medium text-muted-foreground uppercase tracking-wide">
          Chapters {chapters.length > 0 && <span className="text-foreground/70">({chapters.length})</span>}
        </p>
        <Button type="button" size="sm" variant="outline" onClick={openNew} className="h-7 text-xs">
          <Plus className="h-3 w-3 mr-1" /> Add chapter
        </Button>
      </div>

      {loading ? (
        <div className="text-xs text-muted-foreground py-2">Loading…</div>
      ) : chapters.length === 0 ? (
        <div className="rounded-lg border border-dashed border-border/60 p-3 text-center text-xs text-muted-foreground">
          No chapters yet. Add one above to break this module into smaller lessons.
        </div>
      ) : (
        <ul className="space-y-1.5">
          {chapters.map((c, i) => (
            <li
              key={c.id}
              className="flex items-center gap-2 rounded-lg border border-border bg-background p-2 text-sm"
            >
              <GripVertical className="h-3.5 w-3.5 text-muted-foreground/40 shrink-0" />
              <span className="flex h-5 w-5 shrink-0 items-center justify-center rounded bg-secondary text-[10px] font-bold">
                {i + 1}
              </span>
              <div className="flex-1 min-w-0">
                <p className="truncate font-medium">{c.title}</p>
                <div className="flex flex-wrap items-center gap-x-2 gap-y-0.5 text-[10px] text-muted-foreground">
                  {c.duration_minutes > 0 && <span>{c.duration_minutes}m</span>}
                  {c.pdf_url && (
                    <span className="inline-flex items-center gap-0.5 text-primary">
                      <FileText className="h-3 w-3" /> PDF
                    </span>
                  )}
                  {c.is_preview && <span className="text-accent font-medium">👁 Preview</span>}
                  {!c.is_published && <span className="text-destructive">Draft</span>}
                </div>
              </div>
              <Button type="button" size="sm" variant="ghost" className="h-7 w-7 p-0" onClick={() => openEdit(c)}>
                <Pencil className="h-3.5 w-3.5" />
              </Button>
              <Button
                type="button"
                size="sm"
                variant="ghost"
                className="h-7 w-7 p-0 text-destructive hover:text-destructive"
                onClick={() => remove(c)}
              >
                <Trash2 className="h-3.5 w-3.5" />
              </Button>
            </li>
          ))}
        </ul>
      )}

      <Dialog open={open} onOpenChange={(o) => { if (!o) { setOpen(false); resetForm(); } }}>
        <DialogContent className="max-w-lg">
          <DialogHeader>
            <DialogTitle>{editing ? 'Edit chapter' : 'New chapter'}</DialogTitle>
          </DialogHeader>

          <div className="space-y-4">
            <div>
              <Label>Title *</Label>
              <Input
                value={title}
                onChange={(e) => setTitle(e.target.value.slice(0, 120))}
                placeholder="Lesson 1 — Introduction"
                className="mt-1"
              />
            </div>

            <div>
              <Label>Description</Label>
              <Textarea
                value={description}
                onChange={(e) => setDescription(e.target.value.slice(0, 500))}
                rows={2}
                className="mt-1"
                placeholder="What does this chapter cover?"
              />
            </div>

            <div className="grid grid-cols-3 gap-3">
              <div className="col-span-2">
                <Label>Video URL (YouTube or direct .mp4)</Label>
                <Input
                  value={videoUrl}
                  onChange={(e) => setVideoUrl(e.target.value)}
                  placeholder="https://www.youtube.com/watch?v=..."
                  className="mt-1"
                />
              </div>
              <div>
                <Label>Duration (min)</Label>
                <Input
                  type="number"
                  min={0}
                  value={duration}
                  onChange={(e) => setDuration(e.target.value)}
                  className="mt-1"
                />
              </div>
            </div>

            <div>
              <Label>Chapter PDF (optional, max 10MB)</Label>
              <input
                ref={pdfInputRef}
                type="file"
                accept="application/pdf"
                className="hidden"
                onChange={handlePdf}
              />
              {pdfUrl ? (
                <div className="mt-1 flex items-center gap-2 rounded-md border border-border p-2">
                  <FileText className="h-4 w-4 text-primary shrink-0" />
                  <span className="flex-1 truncate text-xs">{pdfFilename || 'document.pdf'}</span>
                  <Button
                    type="button"
                    size="sm"
                    variant="ghost"
                    className="h-7 text-xs"
                    onClick={() => pdfInputRef.current?.click()}
                    disabled={uploadingPdf}
                  >
                    {uploadingPdf ? <Loader2 className="h-3 w-3 animate-spin" /> : 'Replace'}
                  </Button>
                  <Button
                    type="button"
                    size="sm"
                    variant="ghost"
                    className="h-7 w-7 p-0 text-muted-foreground hover:text-destructive"
                    onClick={() => { setPdfUrl(''); setPdfFilename(''); }}
                  >
                    <X className="h-3.5 w-3.5" />
                  </Button>
                </div>
              ) : (
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  className="mt-1 h-9 w-full"
                  onClick={() => pdfInputRef.current?.click()}
                  disabled={uploadingPdf}
                >
                  {uploadingPdf ? (
                    <><Loader2 className="h-3 w-3 mr-2 animate-spin" /> Uploading…</>
                  ) : (
                    <><Upload className="h-3.5 w-3.5 mr-2" /> Upload PDF</>
                  )}
                </Button>
              )}
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div className="flex items-center justify-between rounded-lg border border-border p-3">
                <div>
                  <Label className="text-xs">Preview</Label>
                  <p className="text-[10px] text-muted-foreground">Visible without enrolling</p>
                </div>
                <Switch checked={isPreview} onCheckedChange={setIsPreview} />
              </div>
              <div className="flex items-center justify-between rounded-lg border border-border p-3">
                <div>
                  <Label className="text-xs">Published</Label>
                  <p className="text-[10px] text-muted-foreground">Hide while drafting</p>
                </div>
                <Switch checked={isPublished} onCheckedChange={setIsPublished} />
              </div>
            </div>
          </div>

          <DialogFooter>
            <Button variant="ghost" onClick={() => { setOpen(false); resetForm(); }}>Cancel</Button>
            <Button onClick={save} disabled={saving}>
              {saving ? <Loader2 className="h-4 w-4 animate-spin mr-2" /> : null}
              {editing ? 'Save changes' : 'Add chapter'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default ChaptersManager;
