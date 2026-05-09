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

      <div className="flex items-center gap-3">
        {/* Compact preview tile (16:9, ~112x64) */}
        <div className="relative shrink-0 w-28 h-16 rounded-md overflow-hidden border border-border bg-secondary">
          {displayUrl ? (
            <img src={displayUrl} alt="Course thumbnail" className="w-full h-full object-cover" />
          ) : (
            <div className="w-full h-full flex items-center justify-center">
              <ImageIcon className="h-5 w-5 text-muted-foreground/50" />
            </div>
          )}
          {uploading && (
            <div className="absolute inset-0 bg-background/70 flex items-center justify-center">
              <Loader2 className="h-4 w-4 text-primary animate-spin" />
            </div>
          )}
        </div>

        {/* Right side: actions + hint */}
        <div className="flex-1 min-w-0 space-y-1.5">
          <div className="flex items-center gap-1.5 flex-wrap">
            <Button
              type="button"
              variant="outline"
              size="sm"
              className="h-8 text-xs"
              onClick={() => fileInputRef.current?.click()}
              disabled={uploading}
            >
              {uploading ? (
                <>
                  <Loader2 className="h-3 w-3 mr-1 animate-spin" /> {progress}%
                </>
              ) : (
                <>
                  <Upload className="h-3 w-3 mr-1" /> {displayUrl ? 'Change' : 'Upload thumbnail'}
                </>
              )}
            </Button>
            {displayUrl && !uploading && (
              <Button
                type="button"
                variant="ghost"
                size="sm"
                className="h-8 text-xs text-muted-foreground hover:text-destructive"
                onClick={() => { setPreviewLocal(null); onChange(''); }}
              >
                <X className="h-3 w-3 mr-1" /> Remove
              </Button>
            )}
          </div>
          <p className="text-[11px] text-muted-foreground leading-tight">
            JPG, PNG, WebP · 1280×720 recommended · Max 5MB
          </p>
        </div>
      </div>
    </div>
  );
};

export default ThumbnailUpload;
