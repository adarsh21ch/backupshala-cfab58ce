import { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Search, Check, ExternalLink } from 'lucide-react';
import { Link } from 'react-router-dom';
import VideoRequestForm from './VideoRequestForm';

interface VideoPickerProps {
  selectedVideoId?: string;
  onSelect: (video: { id: string; title: string; backupshala_video_link: string; cloudflare_thumbnail_url?: string }) => void;
}

const VideoPicker = ({ selectedVideoId, onSelect }: VideoPickerProps) => {
  const [search, setSearch] = useState('');

  const { data: videos } = useQuery({
    queryKey: ['video-picker-list', search],
    queryFn: async () => {
      let q = supabase.from('videos').select('id, title, backupshala_video_link, cloudflare_thumbnail_url, duration_seconds, category').eq('is_active', true).order('created_at', { ascending: false }).limit(50);
      if (search) q = q.ilike('title', `%${search}%`);
      const { data } = await q;
      return data || [];
    },
  });

  const formatDuration = (s: number) => `${Math.floor(s / 60)}:${(s % 60).toString().padStart(2, '0')}`;

  return (
    <Tabs defaultValue="gallery" className="w-full">
      <TabsList className="bg-secondary">
        <TabsTrigger value="gallery">Pick from Gallery</TabsTrigger>
        <TabsTrigger value="request">Request Video</TabsTrigger>
      </TabsList>

      <TabsContent value="gallery" className="space-y-3 mt-3">
        <div className="relative">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input value={search} onChange={e => setSearch(e.target.value)} placeholder="Search videos..." className="pl-9 bg-secondary border-border" />
        </div>

        <div className="grid grid-cols-2 md:grid-cols-3 gap-2 max-h-[300px] overflow-y-auto">
          {videos?.map(v => (
            <button
              key={v.id}
              onClick={() => onSelect(v)}
              className={`relative text-left rounded-lg border p-1.5 transition-colors ${selectedVideoId === v.id ? 'border-primary bg-primary/5' : 'border-border hover:border-primary/50'}`}
            >
              <div className="aspect-video bg-secondary rounded overflow-hidden mb-1">
                {v.cloudflare_thumbnail_url && <img src={v.cloudflare_thumbnail_url} alt="" className="w-full h-full object-cover" />}
              </div>
              <p className="text-xs font-medium line-clamp-1">{v.title}</p>
              <p className="text-[10px] text-muted-foreground">{formatDuration(v.duration_seconds)}</p>
              {selectedVideoId === v.id && (
                <div className="absolute top-2 right-2 bg-primary rounded-full p-0.5">
                  <Check className="h-3 w-3 text-primary-foreground" />
                </div>
              )}
            </button>
          ))}
        </div>

        {videos?.length === 0 && (
          <p className="text-sm text-muted-foreground text-center py-4">No videos found.</p>
        )}

        <Link to="/creator/videos" className="flex items-center gap-1 text-xs text-primary hover:underline">
          Can't find what you need? Request a video <ExternalLink className="h-3 w-3" />
        </Link>
      </TabsContent>

      <TabsContent value="request" className="mt-3">
        <VideoRequestForm />
      </TabsContent>
    </Tabs>
  );
};

export default VideoPicker;
