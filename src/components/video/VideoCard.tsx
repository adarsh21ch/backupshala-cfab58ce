import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { Copy, Play, Eye, BookOpen, Share2 } from 'lucide-react';
import { toast } from 'sonner';

interface VideoCardProps {
  video: {
    id: string;
    title: string;
    description?: string;
    thumbnail_url?: string;
    cloudflare_thumbnail_url?: string;
    duration_seconds: number;
    category?: string;
    backupshala_video_link: string;
    used_in_courses?: number;
    total_views?: number;
    created_at: string;
    language?: string;
    is_active?: boolean;
  };
  variant?: 'admin' | 'creator' | 'student';
  onPreview?: (videoId: string) => void;
  onUseInCourse?: (videoId: string) => void;
  onEdit?: (videoId: string) => void;
  onDeactivate?: (videoId: string) => void;
  onDelete?: (videoId: string) => void;
}

const formatDuration = (seconds: number) => {
  const m = Math.floor(seconds / 60);
  const s = seconds % 60;
  return `${m}:${s.toString().padStart(2, '0')}`;
};

const VideoCard = ({ video, variant = 'student', onPreview, onUseInCourse, onEdit, onDeactivate, onDelete }: VideoCardProps) => {
  const thumbnail = video.cloudflare_thumbnail_url || video.thumbnail_url || '/placeholder.svg';

  const copyLink = () => {
    const shareText = `Watch '${video.title}' on Backupshala: ${window.location.origin}/watch/${video.backupshala_video_link}`;
    navigator.clipboard.writeText(shareText);
    toast.success('Link copied to clipboard!');
  };

  const copyBsvCode = () => {
    navigator.clipboard.writeText(video.backupshala_video_link);
    toast.success('Video code copied!');
  };

  return (
    <Card className="bg-card border-border overflow-hidden group hover:border-primary/30 transition-colors">
      <div className="relative aspect-video bg-secondary">
        <img src={thumbnail} alt={video.title} className="w-full h-full object-cover" />
        <div className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center">
          <Button size="sm" variant="secondary" onClick={() => onPreview?.(video.id)} className="gap-2">
            <Play className="h-4 w-4" /> Preview
          </Button>
        </div>
        <Badge className="absolute top-2 right-2 bg-black/70 text-white text-[10px]">
          {formatDuration(video.duration_seconds)}
        </Badge>
        {video.category && (
          <Badge variant="secondary" className="absolute top-2 left-2 text-[10px]">
            {video.category}
          </Badge>
        )}
      </div>
      <CardContent className="p-3 space-y-2">
        <h3 className="font-medium text-sm line-clamp-2">{video.title}</h3>
        
        <div className="flex items-center gap-2 text-[11px] text-muted-foreground">
          <button onClick={copyBsvCode} className="flex items-center gap-1 hover:text-primary transition-colors font-mono">
            <Copy className="h-3 w-3" /> {video.backupshala_video_link}
          </button>
        </div>

        {variant === 'admin' && (
          <div className="flex items-center gap-3 text-[11px] text-muted-foreground">
            <span className="flex items-center gap-1"><BookOpen className="h-3 w-3" /> {video.used_in_courses || 0} courses</span>
            <span className="flex items-center gap-1"><Eye className="h-3 w-3" /> {video.total_views || 0} views</span>
          </div>
        )}

        <div className="flex items-center gap-1.5 pt-1">
          <Button size="sm" variant="outline" className="h-7 text-xs flex-1 gap-1" onClick={copyLink}>
            <Share2 className="h-3 w-3" /> Share
          </Button>
          {variant === 'creator' && onUseInCourse && (
            <Button size="sm" className="h-7 text-xs flex-1 gap-1 bg-primary hover:bg-primary/90" onClick={() => onUseInCourse(video.id)}>
              <BookOpen className="h-3 w-3" /> Use
            </Button>
          )}
          {variant === 'student' && (
            <Button size="sm" className="h-7 text-xs flex-1 gap-1 bg-primary hover:bg-primary/90" onClick={() => onPreview?.(video.id)}>
              <Play className="h-3 w-3" /> Watch
            </Button>
          )}
        </div>

        {variant === 'admin' && (
          <div className="flex items-center gap-1.5">
            {onEdit && <Button size="sm" variant="ghost" className="h-6 text-[10px]" onClick={() => onEdit(video.id)}>Edit</Button>}
            {onDeactivate && (
              <Button size="sm" variant="ghost" className="h-6 text-[10px] text-yellow-500" onClick={() => onDeactivate(video.id)}>
                {video.is_active ? 'Deactivate' : 'Activate'}
              </Button>
            )}
            {onDelete && <Button size="sm" variant="ghost" className="h-6 text-[10px] text-destructive" onClick={() => onDelete(video.id)}>Delete</Button>}
          </div>
        )}
      </CardContent>
    </Card>
  );
};

export default VideoCard;
