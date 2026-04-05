import { useState } from 'react';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import CreatorDashboardLayout from '@/components/dashboard/CreatorDashboardLayout';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Label } from '@/components/ui/label';
import VideoCard from '@/components/video/VideoCard';
import VideoRequestForm from '@/components/video/VideoRequestForm';
import BackupshalaVideoPlayer from '@/components/video/BackupshalaVideoPlayer';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { VIDEO_CATEGORIES, VIDEO_LANGUAGES } from '@/lib/videoTypes';
import { Search, Film, ExternalLink, FolderOpen } from 'lucide-react';
import { toast } from 'sonner';
import CreatorSharedFolders from '@/components/creator/CreatorSharedFolders';

const statusColors: Record<string, string> = {
  pending: 'bg-yellow-500/10 text-yellow-500',
  processing: 'bg-blue-500/10 text-blue-500',
  completed: 'bg-primary/10 text-primary',
  rejected: 'bg-destructive/10 text-destructive',
};

const CreatorVideos = () => {
  const { user } = useAuth();
  const qc = useQueryClient();
  const [search, setSearch] = useState('');
  const [categoryFilter, setCategoryFilter] = useState('all');
  const [langFilter, setLangFilter] = useState('all');
  const [previewAsset, setPreviewAsset] = useState<string | null>(null);

  // Use in course modal
  const [useInCourseAsset, setUseInCourseAsset] = useState<any>(null);
  const [selectedCourseId, setSelectedCourseId] = useState('');
  const [selectedModuleId, setSelectedModuleId] = useState('');

  const { data: assets } = useQuery({
    queryKey: ['creator-video-assets', search, categoryFilter, langFilter],
    queryFn: async () => {
      let q = supabase.from('video_assets').select('*').eq('status', 'ready').eq('is_active', true).order('created_at', { ascending: false });
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

  // Creator's courses for "Use in Course"
  const { data: myCourses } = useQuery({
    queryKey: ['creator-courses-for-picker', user?.id],
    queryFn: async () => {
      if (!user) return [];
      const { data } = await supabase.from('courses').select('id, title').eq('creator_id', user.id).order('created_at', { ascending: false });
      return data || [];
    },
    enabled: !!useInCourseAsset && !!user,
  });

  const { data: courseModules } = useQuery({
    queryKey: ['course-modules-for-picker', selectedCourseId],
    queryFn: async () => {
      if (!selectedCourseId) return [];
      const { data } = await supabase.from('modules').select('id, title, module_type').eq('course_id', selectedCourseId).order('order_index');
      return data?.filter(m => !m.module_type || m.module_type === 'video') || [];
    },
    enabled: !!selectedCourseId,
  });

  const handleAddToCourse = async () => {
    if (!selectedModuleId || !useInCourseAsset || !user) return;
    try {
      await supabase.from('modules').update({ video_asset_id: useInCourseAsset.id, bsv_code: useInCourseAsset.bsv_code }).eq('id', selectedModuleId);
      await supabase.from('video_asset_usage').insert({
        video_asset_id: useInCourseAsset.id,
        module_id: selectedModuleId,
        course_id: selectedCourseId,
        creator_id: user.id,
      });
      await supabase.from('video_assets').update({ used_in_courses_count: (useInCourseAsset.used_in_courses_count || 0) + 1 }).eq('id', useInCourseAsset.id);
      toast.success('Video added to module!');
      setUseInCourseAsset(null);
      setSelectedCourseId('');
      setSelectedModuleId('');
    } catch (err: any) {
      toast.error(err.message || 'Failed to add video');
    }
  };

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
                <SelectTrigger className="w-[160px] bg-secondary border-border"><SelectValue placeholder="Category" /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Categories</SelectItem>
                  {VIDEO_CATEGORIES.map(c => <SelectItem key={c} value={c}>{c}</SelectItem>)}
                </SelectContent>
              </Select>
              <Select value={langFilter} onValueChange={setLangFilter}>
                <SelectTrigger className="w-[130px] bg-secondary border-border"><SelectValue placeholder="Language" /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Languages</SelectItem>
                  {VIDEO_LANGUAGES.map(l => <SelectItem key={l} value={l}>{l}</SelectItem>)}
                </SelectContent>
              </Select>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
              {assets?.map(a => (
                <VideoCard
                  key={a.id}
                  asset={a}
                  variant="creator"
                  onPreview={id => setPreviewAsset(id)}
                  onUseInCourse={id => {
                    const asset = assets.find(x => x.id === id);
                    setUseInCourseAsset(asset);
                    setSelectedCourseId('');
                    setSelectedModuleId('');
                  }}
                />
              ))}
            </div>
            {assets?.length === 0 && (
              <div className="text-center py-12 space-y-2">
                <p className="text-muted-foreground">No videos in the library yet</p>
                <p className="text-xs text-muted-foreground">Admin is working on adding content. Request a specific video below.</p>
              </div>
            )}
          </TabsContent>

          <TabsContent value="request" className="space-y-6 mt-4">
            <VideoRequestForm onSuccess={() => refetchRequests()} />

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
                              <Badge className={`text-[10px] ${statusColors[req.status || 'pending']}`}>{req.status}</Badge>
                            </TableCell>
                            <TableCell className="text-xs text-muted-foreground">{new Date(req.requested_at || '').toLocaleDateString('en-IN')}</TableCell>
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
        <Dialog open={!!previewAsset} onOpenChange={() => setPreviewAsset(null)}>
          <DialogContent className="sm:max-w-2xl bg-card border-border p-0">
            {previewAsset && (
              <div className="p-4">
                <BackupshalaVideoPlayer assetId={previewAsset} isPublicWatch />
              </div>
            )}
          </DialogContent>
        </Dialog>

        {/* Use in Course drawer */}
        <Dialog open={!!useInCourseAsset} onOpenChange={() => setUseInCourseAsset(null)}>
          <DialogContent className="bg-card border-border sm:max-w-md">
            <DialogHeader>
              <DialogTitle>Use "{useInCourseAsset?.title}" in your course</DialogTitle>
            </DialogHeader>
            <div className="space-y-4">
              <div className="space-y-1.5">
                <Label className="text-sm">Select Course</Label>
                <Select value={selectedCourseId} onValueChange={v => { setSelectedCourseId(v); setSelectedModuleId(''); }}>
                  <SelectTrigger className="bg-secondary border-border"><SelectValue placeholder="Choose course" /></SelectTrigger>
                  <SelectContent>
                    {myCourses?.map(c => <SelectItem key={c.id} value={c.id}>{c.title}</SelectItem>)}
                  </SelectContent>
                </Select>
              </div>
              {selectedCourseId && (
                <div className="space-y-1.5">
                  <Label className="text-sm">Select Module</Label>
                  <Select value={selectedModuleId} onValueChange={setSelectedModuleId}>
                    <SelectTrigger className="bg-secondary border-border"><SelectValue placeholder="Choose module" /></SelectTrigger>
                    <SelectContent>
                      {courseModules?.map(m => <SelectItem key={m.id} value={m.id}>{m.title}</SelectItem>)}
                    </SelectContent>
                  </Select>
                </div>
              )}
              <Button onClick={handleAddToCourse} disabled={!selectedModuleId} className="w-full bg-primary hover:bg-primary/90">
                Add to Module ✓
              </Button>
            </div>
          </DialogContent>
        </Dialog>
      </div>
    </CreatorDashboardLayout>
  );
};

export default CreatorVideos;
