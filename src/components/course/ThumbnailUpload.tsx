import { useRef, useState } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { Button } from '@/components/ui/button';
import { Loader2, Upload, X, Image as ImageIcon } from 'lucide-react';
import { toast } from 'sonner';

interface ThumbnailUploadProps {
  value: string;
  onChange: (url: string) => void;
}

const MAX_BYTES = 5 * 1024 * 1024; // 5MB
const VALID_TYPES = ['image/jpeg', 'image/png', 'image/webp'];

const ThumbnailUpload = ({ value, onChange }: ThumbnailUploadProps) => {
  const { user } = useAuth();
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [uploading, setUploading] = useState(false);
  const [progress, setProgress] = useState(0);
  const [previewLocal, setPreviewLocal] = useState<string | null>(null);

  const handleFile = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    if (!VALID_TYPES.includes(file.type)) {
      toast.error('Invalid format — JPG, PNG, or WebP only');
      return;
    }
    if (file.size > MAX_BYTES) {
      toast.error('Max 5MB');
      return;
    }
    if (!user?.id) {
      toast.error('Not signed in');
      return;
    }

    // Local preview immediately
    const localUrl = URL.createObjectURL(file);
    setPreviewLocal(localUrl);
    setUploading(true);
    setProgress(20);

    try {
      const ext = file.name.split('.').pop()?.toLowerCase() || 'jpg';
      const path = `${user.id}/${Date.now()}.${ext}`;

      const { error } = await supabase.storage
        .from('course-thumbnails')
        .upload(path, file, { contentType: file.type, upsert: false });
      if (error) throw error;
      setProgress(80);

      const { data: pub } = supabase.storage.from('course-thumbnails').getPublicUrl(path);
      setProgress(100);
      onChange(pub.publicUrl);
      toast.success('Thumbnail uploaded');
    } catch (err: any) {
      toast.error(err.message || 'Upload failed');
      setPreviewLocal(null);
    } finally {
      setUploading(false);
      if (fileInputRef.current) fileInputRef.current.value = '';
    }
  };

  const displayUrl = previewLocal || value;

  return (
    <div className="space-y-2">
      <input
        ref={fileInputRef}
        type="file"
        accept="image/jpeg,image/png,image/webp"
        className="hidden"
        onChange={handleFile}
      />

      {displayUrl ? (
        <div className="relative group rounded-lg overflow-hidden border border-border aspect-video bg-secondary">
          <img src={displayUrl} alt="Course thumbnail" className="w-full h-full object-cover" />
          {uploading && (
            <div className="absolute inset-0 bg-background/70 flex items-center justify-center">
              <div className="text-center space-y-2">
                <Loader2 className="h-6 w-6 text-primary animate-spin mx-auto" />
                <p className="text-xs text-muted-foreground">Uploading… {progress}%</p>
              </div>
            </div>
          )}
          {!uploading && (
            <div className="absolute bottom-2 right-2 flex gap-1.5">
              <Button
                type="button"
                variant="secondary"
                size="sm"
                className="rounded-md text-xs h-8 shadow-sm"
                onClick={() => fileInputRef.current?.click()}
              >
                <Upload className="h-3 w-3 mr-1" /> Change
              </Button>
              <Button
                type="button"
                variant="secondary"
                size="sm"
                className="rounded-md text-xs h-8 shadow-sm"
                onClick={() => { setPreviewLocal(null); onChange(''); }}
              >
                <X className="h-3 w-3" />
              </Button>
            </div>
          )}
        </div>
      ) : (
        <button
          type="button"
          onClick={() => fileInputRef.current?.click()}
          disabled={uploading}
          className="w-full aspect-video rounded-lg border-2 border-dashed border-border hover:border-primary/50 transition-colors flex flex-col items-center justify-center text-center gap-2 bg-secondary/30"
        >
          {uploading ? (
            <>
              <Loader2 className="h-8 w-8 text-primary animate-spin" />
              <p className="text-xs text-muted-foreground">Uploading… {progress}%</p>
            </>
          ) : (
            <>
              <ImageIcon className="h-8 w-8 text-muted-foreground/40" />
              <div>
                <p className="text-sm font-medium">Upload course thumbnail</p>
                <p className="text-[11px] text-muted-foreground mt-0.5">JPG, PNG, or WebP · Recommended 1280×720 · Max 5MB</p>
              </div>
            </>
          )}
        </button>
      )}
    </div>
  );
};

export default ThumbnailUpload;
