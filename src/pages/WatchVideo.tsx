import { useParams, Link } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import BackupshalaVideoPlayer from '@/components/video/BackupshalaVideoPlayer';
import VideoCard from '@/components/video/VideoCard';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { ArrowRight } from 'lucide-react';
import { formatDuration, getR2ThumbnailUrl } from '@/lib/videoTypes';

const WatchVideo = () => {
  const { bsvCode } = useParams<{ bsvCode: string }>();

  const { data: asset, isLoading } = useQuery({
    queryKey: ['watch-video-asset', bsvCode],
    queryFn: async () => {
      const { data } = await supabase.from('video_assets').select('*').eq('bsv_code', bsvCode).eq('status', 'ready').eq('is_active', true).single();
      return data;
    },
    enabled: !!bsvCode,
  });

  const { data: related } = useQuery({
    queryKey: ['related-video-assets', asset?.category, asset?.id],
    queryFn: async () => {
      if (!asset) return [];
      const { data } = await supabase.from('video_assets').select('*').eq('status', 'ready').eq('is_active', true).eq('category', asset.category).neq('id', asset.id).limit(4);
      return data || [];
    },
    enabled: !!asset,
  });

  if (isLoading) {
    return (
      <div className="min-h-screen bg-background text-foreground flex items-center justify-center">
        <p className="text-muted-foreground">Loading video...</p>
      </div>
    );
  }

  if (!asset) {
    return (
      <div className="min-h-screen bg-background text-foreground">
        <nav className="border-b border-border bg-card px-6 py-4">
          <Link to="/" className="font-heading text-xl font-800">
            <span className="text-primary">Backup</span><span className="text-accent">shala</span>
          </Link>
        </nav>
        <div className="flex items-center justify-center h-[60vh]">
          <div className="text-center">
            <h1 className="text-2xl font-bold mb-2">Video Not Found</h1>
            <p className="text-muted-foreground mb-4">This video may have been removed or the link is incorrect.</p>
            <Link to="/explore"><Button className="bg-primary hover:bg-primary/90">Explore Courses</Button></Link>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background text-foreground">
      <nav className="border-b border-border bg-card px-6 py-4 flex items-center justify-between">
        <Link to="/" className="font-heading text-xl font-800">
          <span className="text-primary">Backup</span><span className="text-accent">shala</span>
        </Link>
        <div className="flex items-center gap-3">
          <Link to="/login"><Button variant="outline" size="sm">Login</Button></Link>
          <Link to="/signup"><Button size="sm" className="bg-primary hover:bg-primary/90">Get Started</Button></Link>
        </div>
      </nav>

      <div className="max-w-4xl mx-auto px-4 py-8">
        <BackupshalaVideoPlayer bsvCode={bsvCode} isPublicWatch />

        <div className="mt-6 space-y-3">
          <h1 className="text-2xl font-heading font-bold">{asset.title}</h1>
          {asset.description && <p className="text-sm text-muted-foreground">{asset.description}</p>}
          <div className="flex items-center gap-2 text-xs">
            <Badge variant="secondary">{asset.category}</Badge>
            <Badge variant="secondary">{asset.language}</Badge>
            <span className="text-muted-foreground">{formatDuration(asset.duration_seconds)}</span>
          </div>
        </div>

        <div className="mt-8 bg-primary/10 border border-primary/30 rounded-xl p-6 text-center">
          <h2 className="text-lg font-heading font-bold mb-2">Want to learn more?</h2>
          <p className="text-sm text-muted-foreground mb-4">Enroll in full courses on Backupshala and start your learning journey.</p>
          <Link to="/explore">
            <Button className="bg-primary hover:bg-primary/90 gap-2">
              Explore Courses <ArrowRight className="h-4 w-4" />
            </Button>
          </Link>
        </div>

        {related && related.length > 0 && (
          <div className="mt-12 space-y-4">
            <h2 className="text-lg font-heading font-semibold">Related Videos</h2>
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
              {related.map(r => (
                <Link key={r.id} to={`/watch/${r.bsv_code}`}>
                  <VideoCard asset={r} variant="student" />
                </Link>
              ))}
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

export default WatchVideo;
