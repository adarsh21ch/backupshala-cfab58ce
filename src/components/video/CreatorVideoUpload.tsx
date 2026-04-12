import { useState, useRef } from 'react';
import { Button } from '@/components/ui/button';
import { Progress } from '@/components/ui/progress';
import { Upload, X, CheckCircle, Film } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';

interface CreatorVideoUploadProps {
  courseId: string;
  moduleTitle: string;
  onUploadComplete: (videoUrl: string, objectKey: string) => void;
  currentVideoUrl?: string;
}

const MAX_SIZE = 500 * 1024 * 1024; // 500MB
const VALID_TYPES = ['video/mp4', 'video/webm', 'video/quicktime', 'video/x-msvideo', 'video/x-matroska'];

const CreatorVideoUpload = ({ courseId, moduleTitle, onUploadComplete, currentVideoUrl }: CreatorVideoUploadProps) => {
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [file, setFile] = useState<File | null>(null);
  const [uploading, setUploading] = useState(false);
  const [progress, setProgress] = useState(0);
  const [uploadedUrl, setUploadedUrl] = useState(currentVideoUrl || '');
  const [uploadSpeed, setUploadSpeed] = useState('');

  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const f = e.target.files?.[0];
    if (!f) return;
    if (f.size > MAX_SIZE) { toast.error('File exceeds 500MB limit'); return; }
    const isValid = VALID_TYPES.includes(f.type) || f.name.match(/\.(mp4|mov|webm|avi|mkv)$/i);
    if (!isValid) { toast.error('Invalid format. Accepted: MP4, MOV, WebM, MKV'); return; }
    setFile(f);
  };

  const handleUpload = async () => {
    if (!file) return;
    setUploading(true);
    setProgress(5);

    try {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) throw new Error('Not authenticated');

      // Get presigned URL
      const { data: urlData, error: urlError } = await supabase.functions.invoke('creator-upload-url', {
        body: {
          filename: file.name,
          content_type: file.type || 'video/mp4',
          file_size_bytes: file.size,
          course_id: courseId,
          module_title: moduleTitle,
        },
      });
      if (urlError) throw urlError;
      if (urlData?.error) throw new Error(urlData.error);

      setProgress(10);
      const { upload_url, public_url, object_key } = urlData;

      // Upload directly to R2 via presigned URL
      const startTime = Date.now();
      const xhr = new XMLHttpRequest();
      xhr.upload.onprogress = (e) => {
        if (e.lengthComputable) {
          const pct = 10 + Math.round((e.loaded / e.total) * 85);
          setProgress(pct);
          const elapsed = (Date.now() - startTime) / 1000;
          if (elapsed > 0) {
            const speed = e.loaded / elapsed / (1024 * 1024);
            setUploadSpeed(`${speed.toFixed(1)} MB/s`);
          }
        }
      };

      await new Promise<void>((resolve, reject) => {
        xhr.onload = () => {
          if (xhr.status >= 200 && xhr.status < 300) { resolve(); return; }
          reject(new Error(`Upload failed (HTTP ${xhr.status})`));
        };
        xhr.onerror = () => reject(new Error('Network error during upload'));
        xhr.open('PUT', upload_url);
        xhr.setRequestHeader('Content-Type', file.type || 'video/mp4');
        xhr.send(file);
      });

      setProgress(100);
      const videoUrl = public_url || object_key;
      setUploadedUrl(videoUrl);
      onUploadComplete(videoUrl, object_key);
      toast.success('Video uploaded!');
      setFile(null);
    } catch (err: any) {
      toast.error(err.message || 'Upload failed');
    }
    setUploading(false);
    setUploadSpeed('');
  };

  return (
    <div className="space-y-3">
      {uploadedUrl && !uploading && (
        <div className="flex items-center gap-2 rounded-lg border border-primary/30 bg-primary/5 p-3">
          <CheckCircle className="h-4 w-4 text-primary shrink-0" />
          <p className="text-xs text-primary font-medium truncate">Video uploaded</p>
          <Button size="sm" variant="ghost" onClick={() => { setUploadedUrl(''); fileInputRef.current?.click(); }} className="ml-auto text-xs">
            Replace
          </Button>
        </div>
      )}

      {!uploadedUrl && !uploading && (
        <div
          className="border-2 border-dashed rounded-xl p-6 text-center cursor-pointer transition-colors border-border hover:border-primary/50"
          onClick={() => fileInputRef.current?.click()}
        >
          <input ref={fileInputRef} type="file" accept=".mp4,.mov,.webm,.avi,.mkv" className="hidden" onChange={handleFileSelect} />
          {file ? (
            <div className="flex items-center justify-between">
              <div className="text-left min-w-0">
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
              <p className="text-xs text-muted-foreground">Click to select video</p>
              <p className="text-[10px] text-muted-foreground mt-1">MP4, MOV, WebM, MKV — Max 500MB</p>
            </>
          )}
        </div>
      )}

      {file && !uploading && !uploadedUrl && (
        <Button onClick={handleUpload} className="w-full rounded-lg bg-accent hover:bg-accent/90 text-accent-foreground gap-2" size="sm">
          <Upload className="h-4 w-4" /> Upload Video
        </Button>
      )}

      {uploading && (
        <div className="space-y-2">
          <Progress value={progress} className="h-2" />
          <div className="flex justify-between text-xs text-muted-foreground">
            <span>{progress}%</span>
            {uploadSpeed && <span>{uploadSpeed}</span>}
          </div>
          <p className="text-[10px] text-muted-foreground text-center">Uploading... don't close this dialog</p>
        </div>
      )}
    </div>
  );
};

export default CreatorVideoUpload;
