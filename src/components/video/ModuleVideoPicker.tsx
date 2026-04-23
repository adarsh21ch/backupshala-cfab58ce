import { useState } from 'react';
import { Input } from '@/components/ui/input';
import CreatorVideoUpload from '@/components/video/CreatorVideoUpload';
import { Upload, Youtube, Link2, ChevronDown, ChevronUp, AlertTriangle, Info } from 'lucide-react';

type Source = 'upload' | 'youtube' | 'url';

interface ModuleVideoPickerProps {
  courseId: string;
  moduleTitle: string;
  videoUrl: string;
  onChange: (url: string) => void;
}

const isYoutubeUrl = (u: string) =>
  /(?:youtube\.com\/(?:watch\?v=|embed\/|shorts\/)|youtu\.be\/)/i.test(u);

const toYoutubeEmbed = (raw: string): string | null => {
  if (!raw) return null;
  try {
    const trimmed = raw.trim();
    if (/youtube\.com\/embed\//i.test(trimmed)) return trimmed;
    const watchMatch = trimmed.match(/youtube\.com\/watch\?v=([^&]+)/i);
    if (watchMatch) return `https://www.youtube.com/embed/${watchMatch[1]}`;
    const shortMatch = trimmed.match(/youtu\.be\/([^?&]+)/i);
    if (shortMatch) return `https://www.youtube.com/embed/${shortMatch[1]}`;
    const shortsMatch = trimmed.match(/youtube\.com\/shorts\/([^?&]+)/i);
    if (shortsMatch) return `https://www.youtube.com/embed/${shortsMatch[1]}`;
    return null;
  } catch {
    return null;
  }
};

const ModuleVideoPicker = ({ courseId, moduleTitle, videoUrl, onChange }: ModuleVideoPickerProps) => {
  // Default to upload if nothing set yet, infer otherwise
  const initialSource: Source = !videoUrl
    ? 'upload'
    : isYoutubeUrl(videoUrl) ? 'youtube' : 'url';

  const [source, setSource] = useState<Source>(initialSource);
  const [showUrlAdvanced, setShowUrlAdvanced] = useState(initialSource === 'url');
  const [ytInput, setYtInput] = useState(initialSource === 'youtube' ? videoUrl : '');

  const handleYoutube = (raw: string) => {
    setYtInput(raw);
    const embed = toYoutubeEmbed(raw);
    onChange(embed || raw);
  };

  return (
    <div className="space-y-3">
      {/* Source picker */}
      <div className="grid grid-cols-3 gap-2">
        <button
          type="button"
          onClick={() => setSource('upload')}
          className={`rounded-lg border-2 p-3 text-left transition-all ${
            source === 'upload' ? 'border-accent bg-accent/5' : 'border-border hover:border-muted-foreground/30'
          }`}
        >
          <Upload className={`h-4 w-4 mb-1 ${source === 'upload' ? 'text-accent' : 'text-muted-foreground'}`} />
          <p className="text-xs font-semibold">Upload Video</p>
          <p className="text-[10px] text-muted-foreground mt-0.5">From your device</p>
        </button>

        <button
          type="button"
          onClick={() => setSource('youtube')}
          className={`rounded-lg border-2 p-3 text-left transition-all ${
            source === 'youtube' ? 'border-accent bg-accent/5' : 'border-border hover:border-muted-foreground/30'
          }`}
        >
          <Youtube className={`h-4 w-4 mb-1 ${source === 'youtube' ? 'text-accent' : 'text-muted-foreground'}`} />
          <p className="text-xs font-semibold">YouTube</p>
          <p className="text-[10px] text-muted-foreground mt-0.5">Paste any YouTube URL</p>
        </button>

        <button
          type="button"
          onClick={() => { setSource('url'); setShowUrlAdvanced(true); }}
          className={`rounded-lg border-2 p-3 text-left transition-all ${
            source === 'url' ? 'border-accent bg-accent/5' : 'border-border hover:border-muted-foreground/30'
          }`}
        >
          <Link2 className={`h-4 w-4 mb-1 ${source === 'url' ? 'text-accent' : 'text-muted-foreground'}`} />
          <p className="text-xs font-semibold">Direct URL</p>
          <p className="text-[10px] text-muted-foreground mt-0.5">Self-hosted MP4</p>
        </button>
      </div>

      {/* Upload */}
      {source === 'upload' && (
        courseId ? (
          <CreatorVideoUpload
            courseId={courseId}
            moduleTitle={moduleTitle || 'Untitled module'}
            currentVideoUrl={videoUrl && !isYoutubeUrl(videoUrl) ? videoUrl : ''}
            onUploadComplete={(url) => onChange(url)}
          />
        ) : (
          <div className="rounded-lg border border-dashed border-border p-4 text-center">
            <p className="text-xs text-muted-foreground">Save the course first, then upload your video.</p>
          </div>
        )
      )}

      {/* YouTube */}
      {source === 'youtube' && (
        <div className="space-y-2">
          <Input
            value={ytInput}
            onChange={e => handleYoutube(e.target.value)}
            placeholder="Paste any YouTube link (watch, embed, youtu.be, shorts)"
            className="rounded-lg text-xs"
          />
          {videoUrl && isYoutubeUrl(videoUrl) && (
            <div className="aspect-video rounded-lg overflow-hidden border border-border bg-black">
              <iframe
                src={videoUrl}
                title="YouTube preview"
                className="w-full h-full"
                allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
                allowFullScreen
              />
            </div>
          )}
          <div className="rounded-md bg-secondary/40 border border-border p-2.5 flex items-start gap-2">
            <Info className="h-3 w-3 text-muted-foreground mt-0.5 shrink-0" />
            <p className="text-[11px] text-muted-foreground">
              We'll auto-convert any YouTube URL into a player-friendly embed. Set your video to <span className="font-medium text-foreground">Unlisted</span> for best results.
            </p>
          </div>
        </div>
      )}

      {/* Direct URL */}
      {source === 'url' && (
        <div className="space-y-2">
          <Input
            value={!isYoutubeUrl(videoUrl) ? videoUrl : ''}
            onChange={e => onChange(e.target.value)}
            placeholder="https://your-cdn.example/video.mp4"
            className="rounded-lg text-xs font-mono"
          />
          <p className="text-[11px] text-muted-foreground flex items-center gap-1">
            <AlertTriangle className="h-3 w-3" /> Use this only if you host MP4s elsewhere. Upload is recommended.
          </p>
        </div>
      )}

      {/* Collapsed quick switch to URL when not selected */}
      {source !== 'url' && !showUrlAdvanced && (
        <button
          type="button"
          onClick={() => setShowUrlAdvanced(true)}
          className="text-[11px] text-muted-foreground hover:text-foreground flex items-center gap-1"
        >
          <ChevronDown className="h-3 w-3" /> Or paste a direct video URL instead
        </button>
      )}
      {source !== 'url' && showUrlAdvanced && (
        <div className="space-y-2">
          <button
            type="button"
            onClick={() => setShowUrlAdvanced(false)}
            className="text-[11px] text-muted-foreground hover:text-foreground flex items-center gap-1"
          >
            <ChevronUp className="h-3 w-3" /> Hide direct URL option
          </button>
          <Input
            value={!isYoutubeUrl(videoUrl) && source !== 'upload' ? videoUrl : ''}
            onChange={e => { setSource('url'); onChange(e.target.value); }}
            placeholder="https://your-cdn.example/video.mp4"
            className="rounded-lg text-xs font-mono"
          />
        </div>
      )}
    </div>
  );
};

export default ModuleVideoPicker;
