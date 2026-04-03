import { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import CreatorDashboardLayout from '@/components/dashboard/CreatorDashboardLayout';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Dialog, DialogContent } from '@/components/ui/dialog';
import VideoCard from '@/components/video/VideoCard';
import VideoRequestForm from '@/components/video/VideoRequestForm';
import VideoPlayer from '@/components/video/VideoPlayer';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { Search, Film, ExternalLink, Eye } from 'lucide-react';

const statusColors: Record<string, string> = {
  pending: 'bg-yellow-500/10 text-yellow-500',
  processing: 'bg-blue-500/10 text-blue-500',
  completed: 'bg-primary/10 text-primary',
  rejected: 'bg-destructive/10 text-destructive',
};

const CreatorVideos = () => {
  const { user } = useAuth();
  const [search, setSearch] = useState('');
  const [categoryFilter, setCategoryFilter] = useState('all');
  const [langFilter, setLangFilter] = useState('all');
  const [previewVideo, setPreviewVideo] = useState<string | null>(null);

  const { data: videos } = useQuery({
    queryKey: ['creator-video-gallery', search, categoryFilter, langFilter],
    queryFn: async () => {
      let q = supabase.from('videos').select('*').eq('is_active', true).order('created_at', { ascending: false });
      if (search) q = q.ilike('title', `%${search}%`);
      if (categoryFilter !== 'all') q = q.eq('category', categoryFilter);
      if (langFilter !== 'all') q = q.eq('language', langFilter);
      const { data } = await q;
      return data || [];
    },
  });

  const { data: myRequests, refetch: refetchRequests } = useQuery({
    queryKey: ['my-video-requests', user?.id],
    queryFn: async () => {
      if (!user) return [];
      const { data } = await supabase.from('video_requests').select('*').eq('requested_by', user.id).order('requested_at', { ascending: false });
      return data || [];
    },
    enabled: !!user,
  });

  const categories = [...new Set(videos?.map(v => v.category).filter(Boolean) || [])];
  const langs = [...new Set(videos?.map(v => v.language).filter(Boolean) || [])];

  return (
    <CreatorDashboardLayout>
      <div className="space-y-6">
        <h1 className="text-2xl font-heading font-bold flex items-center gap-2">
          <Film className="h-6 w-6 text-primary" /> Video Gallery
        </h1>

        <Tabs defaultValue="browse">
          <TabsList className="bg-secondary">
            <TabsTrigger value="browse">Browse Library</TabsTrigger>
            <TabsTrigger value="request">Request a Video</TabsTrigger>
          </TabsList>

          <TabsContent value="browse" className="space-y-4 mt-4">
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
                <VideoCard key={v.id} video={v} variant="creator" onPreview={id => setPreviewVideo(id)} />
              ))}
            </div>
            {videos?.length === 0 && <p className="text-center text-muted-foreground py-12">No videos available yet.</p>}
          </TabsContent>

          <TabsContent value="request" className="space-y-6 mt-4">
            <VideoRequestForm onSuccess={() => refetchRequests()} />

            {/* My requests */}
            {myRequests && myRequests.length > 0 && (
              <div className="space-y-3">
                <h2 className="text-lg font-heading font-semibold">My Requests</h2>
                <Card className="bg-card border-border">
                  <CardContent className="p-0">
                    <Table>
                      <TableHeader>
                        <TableRow className="border-border">
                          <TableHead className="text-xs">Video Title</TableHead>
                          <TableHead className="text-xs">YouTube URL</TableHead>
                          <TableHead className="text-xs">Status</TableHead>
                          <TableHead className="text-xs">Date</TableHead>
                          <TableHead className="text-xs">Note</TableHead>
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        {myRequests.map(req => (
                          <TableRow key={req.id} className="border-border">
                            <TableCell className="text-sm font-medium">{req.video_title}</TableCell>
                            <TableCell>
                              <a href={req.youtube_url} target="_blank" rel="noopener noreferrer" className="text-xs text-primary hover:underline flex items-center gap-1">
                                <ExternalLink className="h-3 w-3" /> Link
                              </a>
                            </TableCell>
                            <TableCell>
                              <Badge className={`text-[10px] ${statusColors[req.status] || ''}`}>{req.status}</Badge>
                            </TableCell>
                            <TableCell className="text-xs text-muted-foreground">{new Date(req.requested_at).toLocaleDateString('en-IN')}</TableCell>
                            <TableCell className="text-xs text-muted-foreground">{req.admin_note || '-'}</TableCell>
                          </TableRow>
                        ))}
                      </TableBody>
                    </Table>
                  </CardContent>
                </Card>
              </div>
            )}
          </TabsContent>
        </Tabs>

        {/* Preview modal */}
        <Dialog open={!!previewVideo} onOpenChange={() => setPreviewVideo(null)}>
          <DialogContent className="sm:max-w-2xl bg-card border-border p-0">
            {previewVideo && (
              <div className="p-4">
                <VideoPlayer videoId={previewVideo} isPublic allowSeeking allowSpeedControl />
              </div>
            )}
          </DialogContent>
        </Dialog>
      </div>
    </CreatorDashboardLayout>
  );
};

export default CreatorVideos;
