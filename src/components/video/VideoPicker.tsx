import { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Search, Check, ExternalLink } from 'lucide-react';
import { Link } from 'react-router-dom';
import { formatDuration, getR2ThumbnailUrl } from '@/lib/videoTypes';
import VideoRequestForm from './VideoRequestForm';

interface VideoPickerProps {
  selectedVideoAssetId?: string;
  onSelect: (asset: { id: string; title: string; bsv_code: string; thumbnail_key?: string | null; duration_seconds: number }) => void;
}

const VideoPicker = ({ selectedVideoAssetId, onSelect }: VideoPickerProps) => {
  const [search, setSearch] = useState('');

  const { data: assets } = useQuery({
    queryKey: ['video-picker-assets', search],
    queryFn: async () => {
      let q = supabase.from('video_assets').select('id, title, bsv_code, thumbnail_key, duration_seconds, category').eq('status', 'ready').eq('is_active', true).order('created_at', { ascending: false }).limit(50);
      if (search) q = q.ilike('title', `%${search}%`);
      const { data } = await q;
      return data || [];
    },
  });

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
          {assets?.map(a => (
            <button
              key={a.id}
              onClick={() => onSelect(a)}
              className={`relative text-left rounded-lg border p-1.5 transition-colors ${selectedVideoAssetId === a.id ? 'border-primary bg-primary/5' : 'border-border hover:border-primary/50'}`}
            >
              <div className="aspect-video bg-secondary rounded overflow-hidden mb-1">
                {a.thumbnail_key && <img src={getR2ThumbnailUrl(a.thumbnail_key) || ''} alt="" className="w-full h-full object-cover" />}
              </div>
              <p className="text-xs font-medium line-clamp-1">{a.title}</p>
              <p className="text-[10px] text-muted-foreground">{formatDuration(a.duration_seconds)}</p>
              {selectedVideoAssetId === a.id && (
                <div className="absolute top-2 right-2 bg-primary rounded-full p-0.5">
                  <Check className="h-3 w-3 text-primary-foreground" />
                </div>
              )}
            </button>
          ))}
        </div>

        {assets?.length === 0 && (
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
