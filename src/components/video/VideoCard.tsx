import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { Copy, Play, Eye, BookOpen, Share2, Trash2 } from 'lucide-react';
import { toast } from 'sonner';
import { formatDuration, getR2ThumbnailUrl } from '@/lib/videoTypes';

interface VideoCardProps {
  asset: {
    id: string;
    title: string;
    description?: string | null;
    duration_seconds: number;
    category: string;
    language?: string;
    bsv_code: string;
    thumbnail_key?: string | null;
    used_in_courses_count?: number;
    total_views?: number;
    is_active?: boolean;
    is_featured?: boolean;
    uploaded_by?: string | null;
  };
  variant?: 'admin' | 'creator' | 'student';
  /** Whether the current user owns this asset (only used in creator variant). */
  isOwner?: boolean;
  onPreview?: (assetId: string) => void;
  onUseInCourse?: (assetId: string) => void;
  onDeactivate?: (assetId: string) => void;
  onDelete?: (assetId: string) => void;
}

const VideoCard = ({ asset, variant = 'student', isOwner = false, onPreview, onUseInCourse, onDeactivate, onDelete }: VideoCardProps) => {
  const thumbnail = getR2ThumbnailUrl(asset.thumbnail_key) || '/placeholder.svg';

  const copyShareLink = () => {
    const shareText = `Watch '${asset.title}' on Backupshala: ${window.location.origin}/watch/${asset.bsv_code}`;
    navigator.clipboard.writeText(shareText);
    toast.success('Link copied to clipboard!');
  };

  const copyBsvCode = () => {
    navigator.clipboard.writeText(asset.bsv_code);
    toast.success('BSV code copied!');
  };

  return (
    <Card className="relative bg-card border-border overflow-hidden group hover:border-primary/30 transition-colors isolate">
      <div className="relative aspect-video bg-secondary cursor-pointer overflow-hidden z-0" onClick={() => onPreview?.(asset.id)} style={{ contain: 'paint' }}>
        <img src={thumbnail} alt={asset.title} loading="lazy" className="absolute inset-0 w-full h-full object-cover" />
        <div className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center">
          <div className="w-10 h-10 rounded-full bg-primary/90 flex items-center justify-center">
            <Play className="h-5 w-5 text-white ml-0.5" />
          </div>
        </div>
        <Badge className="absolute top-2 right-2 bg-black/70 text-white text-[10px]">
          {formatDuration(asset.duration_seconds)}
        </Badge>
        <Badge variant="secondary" className="absolute top-2 left-2 text-[10px]">
          {asset.category}
        </Badge>
        {asset.is_featured && <Badge className="absolute bottom-2 left-2 bg-accent text-accent-foreground text-[10px]">Featured</Badge>}
      </div>
      <CardContent className="p-3 space-y-2">
        <h3 className="font-medium text-sm line-clamp-2">{asset.title}</h3>

        <div className="flex items-center gap-2 text-[11px] text-muted-foreground">
          <button onClick={copyBsvCode} className="flex items-center gap-1 hover:text-primary transition-colors font-mono">
            <Copy className="h-3 w-3" /> {asset.bsv_code}
          </button>
          {asset.language && <span>• {asset.language}</span>}
        </div>

        {variant === 'admin' && (
          <div className="flex items-center gap-3 text-[11px] text-muted-foreground">
            <span className="flex items-center gap-1"><BookOpen className="h-3 w-3" /> {asset.used_in_courses_count || 0} courses</span>
            <span className="flex items-center gap-1"><Eye className="h-3 w-3" /> {asset.total_views || 0} views</span>
          </div>
        )}

        <div className="flex items-center gap-1.5 pt-1">
          <Button size="sm" variant="outline" className="h-7 text-xs flex-1 gap-1" onClick={copyShareLink}>
            <Share2 className="h-3 w-3" /> Share
          </Button>
          {variant === 'creator' && onUseInCourse && (
            <Button size="sm" className="h-7 text-xs flex-1 gap-1 bg-primary hover:bg-primary/90" onClick={() => onUseInCourse(asset.id)}>
              <BookOpen className="h-3 w-3" /> Use
            </Button>
          )}
          {variant === 'student' && (
            <Button size="sm" className="h-7 text-xs flex-1 gap-1 bg-primary hover:bg-primary/90" onClick={() => onPreview?.(asset.id)}>
              <Play className="h-3 w-3" /> Watch
            </Button>
          )}
          {variant === 'creator' && isOwner && onDelete && (
            <Button
              size="sm"
              variant="ghost"
              className="h-7 w-7 p-0 shrink-0 text-destructive hover:text-destructive hover:bg-destructive/10"
              onClick={() => onDelete(asset.id)}
              title="Delete video"
              aria-label="Delete video"
            >
              <Trash2 className="h-3.5 w-3.5" />
            </Button>
          )}
        </div>

        {variant === 'admin' && (
          <div className="flex items-center gap-1.5">
            {onDeactivate && (
              <Button size="sm" variant="ghost" className="h-6 text-[10px] text-yellow-500" onClick={() => onDeactivate(asset.id)}>
                {asset.is_active ? 'Suspend' : 'Activate'}
              </Button>
            )}
            {onDelete && (
              <Button size="sm" variant="ghost" className="h-6 text-[10px] text-destructive" onClick={() => onDelete(asset.id)}>
                Delete
              </Button>
            )}
          </div>
        )}
      </CardContent>
    </Card>
  );
};

export default VideoCard;
