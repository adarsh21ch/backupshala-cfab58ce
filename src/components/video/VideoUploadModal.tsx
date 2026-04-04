import { useState, useRef } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Progress } from '@/components/ui/progress';
import { Upload, Copy, CheckCircle, X, ArrowRight, ArrowLeft } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';
import { VIDEO_CATEGORIES, VIDEO_LANGUAGES } from '@/lib/videoTypes';

interface VideoUploadModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSuccess?: () => void;
}

const VALID_TYPES = ['video/mp4', 'video/webm', 'video/quicktime', 'video/x-msvideo', 'video/x-matroska'];
const MAX_SIZE = 2 * 1024 * 1024 * 1024;

const VideoUploadModal = ({ open, onOpenChange, onSuccess }: VideoUploadModalProps) => {
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [step, setStep] = useState(1);
  const [file, setFile] = useState<File | null>(null);
  const [fileDuration, setFileDuration] = useState(0);
  const [thumbnailBase64, setThumbnailBase64] = useState<string | null>(null);
  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [category, setCategory] = useState('General');
  const [tags, setTags] = useState('');
  const [language, setLanguage] = useState('English');
  const [uploading, setUploading] = useState(false);
  const [progress, setProgress] = useState(0);
  const [bsvCode, setBsvCode] = useState('');
  const [completed, setCompleted] = useState(false);
  const [uploadSpeed, setUploadSpeed] = useState('');

  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const f = e.target.files?.[0];
    if (!f) return;
    if (f.size > MAX_SIZE) { toast.error('File exceeds 2GB limit'); return; }
    const isValid = VALID_TYPES.includes(f.type) || f.name.match(/\.(mp4|mov|webm|avi|mkv)$/i);
    if (!isValid) { toast.error('Invalid format. Accepted: MP4, MOV, WebM, MKV'); return; }
    setFile(f);
    setTitle(f.name.replace(/\.[^/.]+$/, '').replace(/[-_]/g, ' '));

    // Extract duration + thumbnail
    const video = document.createElement('video');
    video.preload = 'metadata';
    video.src = URL.createObjectURL(f);
    video.onloadedmetadata = () => {
      setFileDuration(Math.floor(video.duration));
      video.currentTime = Math.floor(video.duration * 0.25);
    };
    video.onseeked = () => {
      const canvas = document.createElement('canvas');
      canvas.width = 640;
      canvas.height = 360;
      const ctx = canvas.getContext('2d');
      if (ctx) {
        ctx.drawImage(video, 0, 0, canvas.width, canvas.height);
        setThumbnailBase64(canvas.toDataURL('image/jpeg', 0.8).split(',')[1]);
      }
      URL.revokeObjectURL(video.src);
    };
  };

  const handleUpload = async () => {
    if (!file || !title.trim()) { toast.error('Title and file required'); return; }
    setUploading(true);
    setStep(3);
    setProgress(5);

    try {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) throw new Error('Not authenticated');

      // Step 1: Get presigned upload URL
      const { data: urlData, error: urlError } = await supabase.functions.invoke('r2-get-upload-url', {
        body: {
          filename: file.name,
          content_type: file.type || 'video/mp4',
          file_size_bytes: file.size,
          title: title.trim(),
          description: description.trim(),
          category,
          tags: tags.split(',').map(t => t.trim()).filter(Boolean),
          language,
        },
      });
      if (urlError) throw urlError;
      if (urlData?.error) throw new Error(urlData.error);

      setProgress(15);
      const { upload_url, asset_id, bsv_code: code } = urlData;

      // Step 2: Upload directly to R2
      const startTime = Date.now();
      const xhr = new XMLHttpRequest();
      xhr.upload.onprogress = (e) => {
        if (e.lengthComputable) {
          const pct = 15 + Math.round((e.loaded / e.total) * 70);
          setProgress(pct);
          const elapsed = (Date.now() - startTime) / 1000;
          if (elapsed > 0) {
            const speed = e.loaded / elapsed / (1024 * 1024);
            setUploadSpeed(`${speed.toFixed(1)} MB/s`);
          }
        }
      };

      await new Promise<void>((resolve, reject) => {
        xhr.onload = () => (xhr.status >= 200 && xhr.status < 300) ? resolve() : reject(new Error(`Upload failed: ${xhr.status}`));
        xhr.onerror = () => reject(new Error('Upload failed'));
        xhr.open('PUT', upload_url);
        xhr.setRequestHeader('Content-Type', file.type || 'video/mp4');
        xhr.send(file);
      });

      setProgress(90);

      // Step 3: Confirm upload
      const { data: confirmData, error: confirmError } = await supabase.functions.invoke('r2-confirm-upload', {
        body: { asset_id, duration_seconds: fileDuration, thumbnail_base64: thumbnailBase64 },
      });
      if (confirmError) throw confirmError;
      if (confirmData?.error) throw new Error(confirmData.error);

      setProgress(100);
      setBsvCode(code);
      setCompleted(true);
      setStep(4);
      toast.success('Video uploaded successfully!');
      onSuccess?.();
    } catch (err: any) {
      toast.error(err.message || 'Upload failed');
      setStep(2);
    }
    setUploading(false);
  };

  const resetForm = () => {
    setStep(1); setFile(null); setTitle(''); setDescription(''); setCategory('General');
    setTags(''); setLanguage('English'); setProgress(0); setBsvCode('');
    setCompleted(false); setFileDuration(0); setThumbnailBase64(null); setUploadSpeed('');
  };

  const handleClose = (v: boolean) => { if (!v && !uploading) { resetForm(); onOpenChange(false); } };

  return (
    <Dialog open={open} onOpenChange={handleClose}>
      <DialogContent className="sm:max-w-lg bg-card border-border">
        <DialogHeader>
          <DialogTitle>
            {step === 1 && 'Select Video File'}
            {step === 2 && 'Video Details'}
            {step === 3 && 'Uploading...'}
            {step === 4 && 'Upload Complete!'}
          </DialogTitle>
        </DialogHeader>

        {/* Step indicators */}
        <div className="flex items-center gap-1 text-xs text-muted-foreground">
          {['Select File', 'Details', 'Upload', 'Done'].map((s, i) => (
            <span key={s} className={`${step > i ? 'text-primary' : step === i + 1 ? 'text-foreground font-medium' : ''}`}>
              {i > 0 && ' → '}{s}
            </span>
          ))}
        </div>

        {step === 1 && (
          <div className="space-y-4">
            <div
              className={`border-2 border-dashed rounded-xl p-8 text-center cursor-pointer transition-colors ${file ? 'border-primary bg-primary/5' : 'border-border hover:border-primary/50'}`}
              onClick={() => fileInputRef.current?.click()}
            >
              <input ref={fileInputRef} type="file" accept=".mp4,.mov,.webm,.avi,.mkv" className="hidden" onChange={handleFileSelect} />
              {file ? (
                <div className="flex items-center justify-between">
                  <div className="text-left">
                    <p className="text-sm font-medium truncate">{file.name}</p>
                    <p className="text-xs text-muted-foreground">{(file.size / (1024 * 1024)).toFixed(1)} MB • Duration: {fileDuration > 0 ? `${Math.floor(fileDuration / 60)}:${(fileDuration % 60).toString().padStart(2, '0')}` : 'detecting...'}</p>
                  </div>
                  <Button size="sm" variant="ghost" onClick={e => { e.stopPropagation(); setFile(null); setFileDuration(0); setThumbnailBase64(null); }}>
                    <X className="h-4 w-4" />
                  </Button>
                </div>
              ) : (
                <>
                  <Upload className="h-10 w-10 mx-auto text-muted-foreground mb-3" />
                  <p className="text-sm text-muted-foreground">Drag and drop your video here</p>
                  <p className="text-xs text-muted-foreground mt-1">MP4, MOV, WebM, MKV — Max 2GB</p>
                </>
              )}
            </div>
            {thumbnailBase64 && (
              <div className="space-y-1">
                <Label className="text-xs text-muted-foreground">Auto-generated thumbnail</Label>
                <img src={`data:image/jpeg;base64,${thumbnailBase64}`} alt="Thumbnail" className="rounded-lg w-full max-w-[200px] aspect-video object-cover" />
              </div>
            )}
            <Button onClick={() => setStep(2)} disabled={!file} className="w-full bg-primary hover:bg-primary/90 gap-2">
              Next <ArrowRight className="h-4 w-4" />
            </Button>
          </div>
        )}

        {step === 2 && (
          <div className="space-y-4">
            <div className="space-y-1.5">
              <Label className="text-sm">Title *</Label>
              <Input value={title} onChange={e => setTitle(e.target.value)} maxLength={200} className="bg-secondary border-border" />
            </div>
            <div className="space-y-1.5">
              <Label className="text-sm">Description</Label>
              <Textarea value={description} onChange={e => setDescription(e.target.value)} maxLength={1000} className="bg-secondary border-border" rows={2} />
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1.5">
                <Label className="text-sm">Category *</Label>
                <Select value={category} onValueChange={setCategory}>
                  <SelectTrigger className="bg-secondary border-border"><SelectValue /></SelectTrigger>
                  <SelectContent>{VIDEO_CATEGORIES.map(c => <SelectItem key={c} value={c}>{c}</SelectItem>)}</SelectContent>
                </Select>
              </div>
              <div className="space-y-1.5">
                <Label className="text-sm">Language *</Label>
                <Select value={language} onValueChange={setLanguage}>
                  <SelectTrigger className="bg-secondary border-border"><SelectValue /></SelectTrigger>
                  <SelectContent>{VIDEO_LANGUAGES.map(l => <SelectItem key={l} value={l}>{l}</SelectItem>)}</SelectContent>
                </Select>
              </div>
            </div>
            <div className="space-y-1.5">
              <Label className="text-sm">Tags (comma separated)</Label>
              <Input value={tags} onChange={e => setTags(e.target.value)} placeholder="e.g. editing, instagram, growth" className="bg-secondary border-border" />
            </div>
            <div className="flex gap-2">
              <Button variant="outline" onClick={() => setStep(1)} className="gap-1"><ArrowLeft className="h-4 w-4" /> Back</Button>
              <Button onClick={handleUpload} disabled={!title.trim()} className="flex-1 bg-accent hover:bg-accent/90 gap-2">
                <Upload className="h-4 w-4" /> Start Upload
              </Button>
            </div>
          </div>
        )}

        {step === 3 && (
          <div className="space-y-4 py-4">
            <Progress value={progress} className="h-3" />
            <div className="text-center space-y-1">
              <p className="text-lg font-medium">{progress}%</p>
              {uploadSpeed && <p className="text-xs text-muted-foreground">Speed: {uploadSpeed}</p>}
              <p className="text-xs text-muted-foreground">{(file?.size || 0) > 0 ? `${((file!.size * progress / 100) / (1024 * 1024)).toFixed(0)} MB of ${(file!.size / (1024 * 1024)).toFixed(0)} MB` : ''}</p>
            </div>
            <p className="text-xs text-center text-muted-foreground">Do not close this window during upload.</p>
          </div>
        )}

        {step === 4 && (
          <div className="space-y-4 py-4">
            <div className="flex items-center justify-center">
              <CheckCircle className="h-16 w-16 text-primary" />
            </div>
            <p className="text-center font-medium">Video uploaded successfully!</p>
            <div className="flex items-center justify-center gap-2 bg-secondary rounded-lg p-3">
              <code className="text-primary font-mono text-sm">{bsvCode}</code>
              <Button size="sm" variant="ghost" onClick={() => { navigator.clipboard.writeText(bsvCode); toast.success('Copied!'); }}>
                <Copy className="h-4 w-4" />
              </Button>
            </div>
            <div className="flex items-center justify-center gap-2 bg-secondary rounded-lg p-2">
              <span className="text-xs text-muted-foreground">Watch link:</span>
              <button className="text-xs text-primary hover:underline" onClick={() => {
                navigator.clipboard.writeText(`${window.location.origin}/watch/${bsvCode}`);
                toast.success('Watch link copied!');
              }}>
                {window.location.origin}/watch/{bsvCode}
              </button>
            </div>
            <div className="flex gap-2">
              <Button variant="outline" className="flex-1" onClick={() => resetForm()}>Upload Another</Button>
              <Button className="flex-1 bg-primary hover:bg-primary/90" onClick={() => handleClose(false)}>Done</Button>
            </div>
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
};

export default VideoUploadModal;
