import { useParams, Link } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import VideoPlayer from '@/components/video/VideoPlayer';
import VideoCard from '@/components/video/VideoCard';
import { Button } from '@/components/ui/button';
import { ArrowRight } from 'lucide-react';

const WatchVideo = () => {
  const { bsvCode } = useParams<{ bsvCode: string }>();

  const { data: video, isLoading } = useQuery({
    queryKey: ['watch-video', bsvCode],
    queryFn: async () => {
      const { data } = await supabase.from('videos').select('*').eq('backupshala_video_link', bsvCode).eq('is_active', true).single();
      return data;
    },
    enabled: !!bsvCode,
  });

  const { data: related } = useQuery({
    queryKey: ['related-videos', video?.category],
    queryFn: async () => {
      if (!video?.category) return [];
      const { data } = await supabase.from('videos').select('*').eq('is_active', true).eq('category', video.category).neq('id', video.id).limit(4);
      return data || [];
    },
    enabled: !!video?.category,
  });

  if (isLoading) {
    return (
      <div className="min-h-screen bg-background text-foreground flex items-center justify-center">
        <p className="text-muted-foreground">Loading video...</p>
      </div>
    );
  }

  if (!video) {
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
    <div className="dark min-h-screen bg-background text-foreground">
      {/* Navbar */}
      <nav className="border-b border-border bg-card px-6 py-4 flex items-center justify-between">
        <Link to="/" className="font-heading text-xl font-800">
          <span className="text-primary">Backup</span><span className="text-accent">shala</span>
        </Link>
        <div className="flex items-center gap-3">
          <Link to="/login"><Button variant="outline" size="sm">Login</Button></Link>
          <Link to="/signup"><Button size="sm" className="bg-primary hover:bg-primary/90">Get Started</Button></Link>
        </div>
      </nav>

      {/* Video */}
      <div className="max-w-4xl mx-auto px-4 py-8">
        <VideoPlayer videoId={video.id} isPublic allowSeeking allowSpeedControl />

        <div className="mt-6 space-y-3">
          <h1 className="text-2xl font-heading font-bold">{video.title}</h1>
          {video.description && <p className="text-sm text-muted-foreground">{video.description}</p>}
          <div className="flex items-center gap-2 text-xs text-muted-foreground">
            {video.category && <span className="bg-secondary px-2 py-1 rounded">{video.category}</span>}
            {video.language && <span className="bg-secondary px-2 py-1 rounded">{video.language}</span>}
          </div>
        </div>

        {/* CTA */}
        <div className="mt-8 bg-primary/10 border border-primary/30 rounded-xl p-6 text-center">
          <h2 className="text-lg font-heading font-bold mb-2">Want to learn more?</h2>
          <p className="text-sm text-muted-foreground mb-4">Enroll in full courses on Backupshala and start your learning journey.</p>
          <Link to="/explore">
            <Button className="bg-primary hover:bg-primary/90 gap-2">
              Explore Courses <ArrowRight className="h-4 w-4" />
            </Button>
          </Link>
        </div>

        {/* Related videos */}
        {related && related.length > 0 && (
          <div className="mt-12 space-y-4">
            <h2 className="text-lg font-heading font-semibold">Related Videos</h2>
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
              {related.map(v => (
                <Link key={v.id} to={`/watch/${v.backupshala_video_link}`}>
                  <VideoCard video={v} variant="student" />
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
