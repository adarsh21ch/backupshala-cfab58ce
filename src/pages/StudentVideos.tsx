import { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import DashboardLayout from '@/components/dashboard/DashboardLayout';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Dialog, DialogContent } from '@/components/ui/dialog';
import VideoCard from '@/components/video/VideoCard';
import VideoPlayer from '@/components/video/VideoPlayer';
import { supabase } from '@/integrations/supabase/client';
import { Search, Film, Info } from 'lucide-react';

const StudentVideos = () => {
  const [search, setSearch] = useState('');
  const [categoryFilter, setCategoryFilter] = useState('all');
  const [langFilter, setLangFilter] = useState('all');
  const [watchVideo, setWatchVideo] = useState<string | null>(null);

  const { data: videos } = useQuery({
    queryKey: ['student-video-gallery', search, categoryFilter, langFilter],
    queryFn: async () => {
      let q = supabase.from('videos').select('*').eq('is_active', true).order('created_at', { ascending: false });
      if (search) q = q.ilike('title', `%${search}%`);
      if (categoryFilter !== 'all') q = q.eq('category', categoryFilter);
      if (langFilter !== 'all') q = q.eq('language', langFilter);
      const { data } = await q;
      return data || [];
    },
  });

  const categories = [...new Set(videos?.map(v => v.category).filter(Boolean) || [])];
  const langs = [...new Set(videos?.map(v => v.language).filter(Boolean) || [])];

  return (
    <DashboardLayout>
      <div className="space-y-6">
        <h1 className="text-2xl font-heading font-bold flex items-center gap-2">
          <Film className="h-6 w-6 text-primary" /> Video Gallery
        </h1>

        <div className="flex items-start gap-2 rounded-xl border border-primary/20 bg-primary/5 p-3">
          <Info className="h-4 w-4 text-primary shrink-0 mt-0.5" />
          <p className="text-xs text-muted-foreground">Browse our video library. Share any video with your network using the Backupshala Video Link.</p>
        </div>

        <div className="flex flex-wrap gap-3">
          <div className="relative flex-1 min-w-[200px]">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <Input value={search} onChange={e => setSearch(e.target.value)} placeholder="Search videos..." className="pl-9 bg-secondary border-border" />
          </div>
          <Select value={categoryFilter} onValueChange={setCategoryFilter}>
            <SelectTrigger className="w-[140px] bg-secondary border-border"><SelectValue placeholder="Category" /></SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All Categories</SelectItem>
              {categories.map(c => <SelectItem key={c} value={c!}>{c}</SelectItem>)}
            </SelectContent>
          </Select>
          <Select value={langFilter} onValueChange={setLangFilter}>
            <SelectTrigger className="w-[130px] bg-secondary border-border"><SelectValue placeholder="Language" /></SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All Languages</SelectItem>
              {langs.map(l => <SelectItem key={l} value={l!}>{l}</SelectItem>)}
            </SelectContent>
          </Select>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
          {videos?.map(v => (
            <VideoCard key={v.id} video={v} variant="student" onPreview={id => setWatchVideo(id)} />
          ))}
        </div>
        {videos?.length === 0 && <p className="text-center text-muted-foreground py-12">No videos available yet.</p>}

        {/* Watch modal */}
        <Dialog open={!!watchVideo} onOpenChange={() => setWatchVideo(null)}>
          <DialogContent className="sm:max-w-2xl bg-card border-border p-0">
            {watchVideo && (
              <div className="p-4">
                <VideoPlayer videoId={watchVideo} isPublic allowSeeking allowSpeedControl />
              </div>
            )}
          </DialogContent>
        </Dialog>
      </div>
    </DashboardLayout>
  );
};

export default StudentVideos;
