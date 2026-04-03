import { useState, useRef } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Progress } from '@/components/ui/progress';
import { Upload, Copy, CheckCircle, X } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';

interface VideoUploadModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSuccess?: () => void;
}

const categories = ['Technology', 'Business', 'Design', 'Marketing', 'Finance', 'Health', 'Education', 'Lifestyle', 'Other'];
const languages = ['English', 'Hindi', 'Tamil', 'Telugu', 'Bengali', 'Marathi', 'Gujarati', 'Kannada', 'Malayalam', 'Punjabi'];

const VideoUploadModal = ({ open, onOpenChange, onSuccess }: VideoUploadModalProps) => {
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [file, setFile] = useState<File | null>(null);
  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [category, setCategory] = useState('');
  const [tags, setTags] = useState('');
  const [language, setLanguage] = useState('English');
  const [uploading, setUploading] = useState(false);
  const [progress, setProgress] = useState(0);
  const [bsvLink, setBsvLink] = useState('');
  const [completed, setCompleted] = useState(false);

  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const f = e.target.files?.[0];
    if (!f) return;
    const maxSize = 2 * 1024 * 1024 * 1024; // 2GB
    if (f.size > maxSize) {
      toast.error('File size exceeds 2GB limit');
      return;
    }
    const validTypes = ['video/mp4', 'video/quicktime', 'video/x-msvideo', 'video/x-matroska'];
    if (!validTypes.includes(f.type) && !f.name.match(/\.(mp4|mov|avi|mkv)$/i)) {
      toast.error('Invalid file type. Accepted: MP4, MOV, AVI, MKV');
      return;
    }
    setFile(f);
  };

  const handleUpload = async () => {
    if (!file || !title.trim()) {
      toast.error('Title and video file are required');
      return;
    }

    setUploading(true);
    setProgress(10);

    try {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) throw new Error('Not authenticated');

      const formData = new FormData();
      formData.append('file', file);
      formData.append('title', title.trim());
      formData.append('description', description);
      formData.append('category', category);
      formData.append('tags', JSON.stringify(tags.split(',').map(t => t.trim()).filter(Boolean)));
      formData.append('language', language);

      setProgress(30);

      const projectId = import.meta.env.VITE_SUPABASE_PROJECT_ID;
      const res = await fetch(
        `https://${projectId}.supabase.co/functions/v1/upload-video-to-cloudflare`,
        {
          method: 'POST',
          headers: {
            'Authorization': `Bearer ${session.access_token}`,
          },
          body: formData,
        }
      );

      setProgress(80);
      const data = await res.json();

      if (data.error) throw new Error(data.error);

      setProgress(100);
      setBsvLink(data.backupshala_video_link);
      setCompleted(true);
      toast.success('Video uploaded successfully!');
      onSuccess?.();
    } catch (err: any) {
      toast.error(err.message || 'Upload failed');
    }
    setUploading(false);
  };

  const resetForm = () => {
    setFile(null);
    setTitle('');
    setDescription('');
    setCategory('');
    setTags('');
    setLanguage('English');
    setProgress(0);
    setBsvLink('');
    setCompleted(false);
  };

  const handleClose = (open: boolean) => {
    if (!open) resetForm();
    onOpenChange(open);
  };

  return (
    <Dialog open={open} onOpenChange={handleClose}>
      <DialogContent className="sm:max-w-lg bg-card border-border">
        <DialogHeader>
          <DialogTitle>{completed ? 'Upload Complete!' : 'Upload New Video'}</DialogTitle>
        </DialogHeader>

        {completed ? (
          <div className="space-y-4 py-4">
            <div className="flex items-center justify-center">
              <CheckCircle className="h-16 w-16 text-primary" />
            </div>
            <p className="text-center text-sm text-muted-foreground">Video uploaded to Cloudflare Stream</p>
            <div className="flex items-center justify-center gap-2 bg-secondary rounded-lg p-3">
              <code className="text-primary font-mono text-sm">{bsvLink}</code>
              <Button size="sm" variant="ghost" onClick={() => { navigator.clipboard.writeText(bsvLink); toast.success('Copied!'); }}>
                <Copy className="h-4 w-4" />
              </Button>
            </div>
            <Button onClick={() => handleClose(false)} className="w-full bg-primary hover:bg-primary/90">Done</Button>
          </div>
        ) : (
          <div className="space-y-4">
            {/* Drop zone */}
            <div
              className={`border-2 border-dashed rounded-xl p-6 text-center cursor-pointer transition-colors ${file ? 'border-primary bg-primary/5' : 'border-border hover:border-primary/50'}`}
              onClick={() => fileInputRef.current?.click()}
            >
              <input ref={fileInputRef} type="file" accept=".mp4,.mov,.avi,.mkv" className="hidden" onChange={handleFileSelect} />
              {file ? (
                <div className="flex items-center justify-between">
                  <div className="text-left">
                    <p className="text-sm font-medium truncate">{file.name}</p>
                    <p className="text-xs text-muted-foreground">{(file.size / (1024 * 1024)).toFixed(1)} MB</p>
                  </div>
                  <Button size="sm" variant="ghost" onClick={e => { e.stopPropagation(); setFile(null); }}>
                    <X className="h-4 w-4" />
                  </Button>
                </div>
              ) : (
                <>
                  <Upload className="h-8 w-8 mx-auto text-muted-foreground mb-2" />
                  <p className="text-sm text-muted-foreground">Click to browse or drag and drop</p>
                  <p className="text-xs text-muted-foreground mt-1">MP4, MOV, AVI, MKV — Max 2GB</p>
                </>
              )}
            </div>

            <div className="space-y-1.5">
              <Label className="text-sm">Title *</Label>
              <Input value={title} onChange={e => setTitle(e.target.value)} placeholder="Video title" className="bg-secondary border-border" />
            </div>

            <div className="space-y-1.5">
              <Label className="text-sm">Description</Label>
              <Textarea value={description} onChange={e => setDescription(e.target.value)} placeholder="Optional description" className="bg-secondary border-border" rows={2} />
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1.5">
                <Label className="text-sm">Category</Label>
                <Select value={category} onValueChange={setCategory}>
                  <SelectTrigger className="bg-secondary border-border"><SelectValue placeholder="Select" /></SelectTrigger>
                  <SelectContent>{categories.map(c => <SelectItem key={c} value={c}>{c}</SelectItem>)}</SelectContent>
                </Select>
              </div>
              <div className="space-y-1.5">
                <Label className="text-sm">Language</Label>
                <Select value={language} onValueChange={setLanguage}>
                  <SelectTrigger className="bg-secondary border-border"><SelectValue /></SelectTrigger>
                  <SelectContent>{languages.map(l => <SelectItem key={l} value={l}>{l}</SelectItem>)}</SelectContent>
                </Select>
              </div>
            </div>

            <div className="space-y-1.5">
              <Label className="text-sm">Tags (comma separated)</Label>
              <Input value={tags} onChange={e => setTags(e.target.value)} placeholder="e.g. react, javascript, tutorial" className="bg-secondary border-border" />
            </div>

            {uploading && (
              <div className="space-y-1">
                <Progress value={progress} className="h-2" />
                <p className="text-xs text-muted-foreground text-center">{progress}% uploading...</p>
              </div>
            )}

            <Button onClick={handleUpload} disabled={uploading || !file || !title.trim()} className="w-full bg-primary hover:bg-primary/90">
              <Upload className="h-4 w-4 mr-2" /> {uploading ? 'Uploading...' : 'Upload Video'}
            </Button>
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
};

export default VideoUploadModal;
