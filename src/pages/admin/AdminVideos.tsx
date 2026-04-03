import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import AdminDashboardLayout from '@/components/dashboard/AdminDashboardLayout';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import { Card, CardContent } from '@/components/ui/card';
import VideoCard from '@/components/video/VideoCard';
import VideoUploadModal from '@/components/video/VideoUploadModal';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';
import { Search, Upload, Film, Clock, CheckCircle, XCircle, Loader2, ExternalLink } from 'lucide-react';

const statusColors: Record<string, string> = {
  pending: 'bg-yellow-500/10 text-yellow-500',
  processing: 'bg-blue-500/10 text-blue-500',
  completed: 'bg-primary/10 text-primary',
  rejected: 'bg-destructive/10 text-destructive',
};

const AdminVideos = () => {
  const qc = useQueryClient();
  const [search, setSearch] = useState('');
  const [categoryFilter, setCategoryFilter] = useState('all');
  const [langFilter, setLangFilter] = useState('all');
  const [sortBy, setSortBy] = useState('newest');
  const [uploadOpen, setUploadOpen] = useState(false);
  const [requestFilter, setRequestFilter] = useState('all');

  // Action modals
  const [rejectModal, setRejectModal] = useState<{ open: boolean; requestId: string }>({ open: false, requestId: '' });
  const [completeModal, setCompleteModal] = useState<{ open: boolean; requestId: string }>({ open: false, requestId: '' });
  const [rejectNote, setRejectNote] = useState('');
  const [completeVideoId, setCompleteVideoId] = useState('');
  const [videoSearchForComplete, setVideoSearchForComplete] = useState('');

  // Fetch videos
  const { data: videos } = useQuery({
    queryKey: ['admin-videos', search, categoryFilter, langFilter, sortBy],
    queryFn: async () => {
      let q = supabase.from('videos').select('*');
      if (search) q = q.ilike('title', `%${search}%`);
      if (categoryFilter !== 'all') q = q.eq('category', categoryFilter);
      if (langFilter !== 'all') q = q.eq('language', langFilter);
      if (sortBy === 'newest') q = q.order('created_at', { ascending: false });
      else if (sortBy === 'most_used') q = q.order('used_in_courses', { ascending: false });
      else if (sortBy === 'most_viewed') q = q.order('total_views', { ascending: false });
      const { data } = await q;
      return data || [];
    },
  });

  // Fetch requests
  const { data: requests } = useQuery({
    queryKey: ['admin-video-requests', requestFilter],
    queryFn: async () => {
      let q = supabase.from('video_requests').select('*, profiles:requested_by(full_name, email)').order('requested_at', { ascending: false });
      if (requestFilter !== 'all') q = q.eq('status', requestFilter);
      const { data } = await q;
      return data || [];
    },
  });

  // Fetch videos for complete modal
  const { data: videoOptions } = useQuery({
    queryKey: ['video-options-search', videoSearchForComplete],
    queryFn: async () => {
      let q = supabase.from('videos').select('id, title, backupshala_video_link').eq('is_active', true).order('created_at', { ascending: false }).limit(20);
      if (videoSearchForComplete) q = q.ilike('title', `%${videoSearchForComplete}%`);
      const { data } = await q;
      return data || [];
    },
    enabled: completeModal.open,
  });

  const processRequest = useMutation({
    mutationFn: async ({ requestId, action, admin_note, video_id }: { requestId: string; action: string; admin_note?: string; video_id?: string }) => {
      const { data, error } = await supabase.functions.invoke('process-video-request', {
        body: { request_id: requestId, action, admin_note, video_id },
      });
      if (error) throw error;
      if (data?.error) throw new Error(data.error);
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['admin-video-requests'] });
      toast.success('Request updated');
    },
    onError: (err: any) => toast.error(err.message),
  });

  const handleDeactivate = async (videoId: string) => {
    const video = videos?.find(v => v.id === videoId);
    await supabase.from('videos').update({ is_active: !video?.is_active }).eq('id', videoId);
    qc.invalidateQueries({ queryKey: ['admin-videos'] });
    toast.success(video?.is_active ? 'Video deactivated' : 'Video activated');
  };

  const handleDelete = async (videoId: string) => {
    if (!confirm('Delete this video permanently?')) return;
    await supabase.from('videos').delete().eq('id', videoId);
    qc.invalidateQueries({ queryKey: ['admin-videos'] });
    toast.success('Video deleted');
  };

  const requestStats = {
    total: requests?.length || 0,
    pending: requests?.filter(r => r.status === 'pending').length || 0,
    processing: requests?.filter(r => r.status === 'processing').length || 0,
    completed: requests?.filter(r => r.status === 'completed').length || 0,
  };

  const categories = [...new Set(videos?.map(v => v.category).filter(Boolean) || [])];
  const langs = [...new Set(videos?.map(v => v.language).filter(Boolean) || [])];

  return (
    <AdminDashboardLayout>
      <div className="space-y-6">
        <div className="flex items-center justify-between">
          <h1 className="text-2xl font-heading font-bold flex items-center gap-2">
            <Film className="h-6 w-6 text-primary" /> Video Library
          </h1>
          <Button onClick={() => setUploadOpen(true)} className="bg-primary hover:bg-primary/90 gap-2">
            <Upload className="h-4 w-4" /> Upload New Video
          </Button>
        </div>

        <Tabs defaultValue="library">
          <TabsList className="bg-secondary">
            <TabsTrigger value="library">Video Library ({videos?.length || 0})</TabsTrigger>
            <TabsTrigger value="requests">Video Requests ({requestStats.pending} pending)</TabsTrigger>
          </TabsList>

          <TabsContent value="library" className="space-y-4 mt-4">
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
              <Select value={sortBy} onValueChange={setSortBy}>
                <SelectTrigger className="w-[130px] bg-secondary border-border"><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="newest">Newest</SelectItem>
                  <SelectItem value="most_used">Most Used</SelectItem>
                  <SelectItem value="most_viewed">Most Viewed</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
              {videos?.map(v => (
                <VideoCard
                  key={v.id}
                  video={v}
                  variant="admin"
                  onDeactivate={handleDeactivate}
                  onDelete={handleDelete}
                />
              ))}
            </div>
            {videos?.length === 0 && (
              <p className="text-center text-muted-foreground py-12">No videos uploaded yet. Click "Upload New Video" to get started.</p>
            )}
          </TabsContent>

          <TabsContent value="requests" className="space-y-4 mt-4">
            {/* Stats */}
            <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
              {[
                { label: 'Total', value: requestStats.total, icon: Film },
                { label: 'Pending', value: requestStats.pending, icon: Clock },
                { label: 'Processing', value: requestStats.processing, icon: Loader2 },
                { label: 'Completed', value: requestStats.completed, icon: CheckCircle },
              ].map(s => (
                <Card key={s.label} className="bg-card border-border">
                  <CardContent className="p-4 flex items-center gap-3">
                    <s.icon className="h-5 w-5 text-primary" />
                    <div>
                      <p className="text-xl font-bold">{s.value}</p>
                      <p className="text-xs text-muted-foreground">{s.label}</p>
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>

            {/* Filter tabs */}
            <div className="flex gap-2 flex-wrap">
              {['all', 'pending', 'processing', 'completed', 'rejected'].map(f => (
                <Button
                  key={f}
                  size="sm"
                  variant={requestFilter === f ? 'default' : 'outline'}
                  onClick={() => setRequestFilter(f)}
                  className="text-xs capitalize"
                >
                  {f}
                </Button>
              ))}
            </div>

            {/* Request list */}
            <div className="space-y-3">
              {requests?.map(req => (
                <Card key={req.id} className="bg-card border-border">
                  <CardContent className="p-4">
                    <div className="flex flex-col md:flex-row md:items-center justify-between gap-3">
                      <div className="space-y-1 flex-1">
                        <div className="flex items-center gap-2">
                          <h3 className="font-medium text-sm">{req.video_title}</h3>
                          <Badge className={`text-[10px] ${statusColors[req.status] || ''}`}>{req.status}</Badge>
                        </div>
                        <p className="text-xs text-muted-foreground">
                          By: {(req.profiles as any)?.full_name || 'Unknown'} ({(req.profiles as any)?.email})
                        </p>
                        <a href={req.youtube_url} target="_blank" rel="noopener noreferrer" className="text-xs text-primary hover:underline flex items-center gap-1">
                          <ExternalLink className="h-3 w-3" /> {req.youtube_url}
                        </a>
                        {req.reason && <p className="text-xs text-muted-foreground">Reason: {req.reason}</p>}
                        {req.admin_note && <p className="text-xs text-muted-foreground italic">Admin: {req.admin_note}</p>}
                        <p className="text-[10px] text-muted-foreground">
                          {new Date(req.requested_at).toLocaleString('en-IN')}
                        </p>
                      </div>
                      <div className="flex items-center gap-2">
                        {req.status === 'pending' && (
                          <>
                            <Button size="sm" className="text-xs bg-primary hover:bg-primary/90"
                              onClick={() => processRequest.mutate({ requestId: req.id, action: 'start_processing' })}>
                              Start Processing
                            </Button>
                            <Button size="sm" variant="destructive" className="text-xs"
                              onClick={() => { setRejectModal({ open: true, requestId: req.id }); setRejectNote(''); }}>
                              Reject
                            </Button>
                          </>
                        )}
                        {req.status === 'processing' && (
                          <Button size="sm" className="text-xs bg-primary hover:bg-primary/90"
                            onClick={() => { setCompleteModal({ open: true, requestId: req.id }); setCompleteVideoId(''); }}>
                            <CheckCircle className="h-3 w-3 mr-1" /> Mark Completed
                          </Button>
                        )}
                      </div>
                    </div>
                  </CardContent>
                </Card>
              ))}
              {requests?.length === 0 && <p className="text-center text-muted-foreground py-8">No requests found.</p>}
            </div>
          </TabsContent>
        </Tabs>

        {/* Upload Modal */}
        <VideoUploadModal open={uploadOpen} onOpenChange={setUploadOpen} onSuccess={() => qc.invalidateQueries({ queryKey: ['admin-videos'] })} />

        {/* Reject Modal */}
        <Dialog open={rejectModal.open} onOpenChange={open => setRejectModal({ ...rejectModal, open })}>
          <DialogContent className="bg-card border-border sm:max-w-md">
            <DialogHeader><DialogTitle>Reject Request</DialogTitle></DialogHeader>
            <div className="space-y-3">
              <div className="space-y-1.5">
                <Label className="text-sm">Rejection Reason</Label>
                <Textarea value={rejectNote} onChange={e => setRejectNote(e.target.value)} placeholder="Why is this request being rejected?" className="bg-secondary border-border" />
              </div>
              <Button className="w-full" variant="destructive" onClick={() => {
                processRequest.mutate({ requestId: rejectModal.requestId, action: 'reject', admin_note: rejectNote });
                setRejectModal({ open: false, requestId: '' });
              }}>
                <XCircle className="h-4 w-4 mr-2" /> Reject
              </Button>
            </div>
          </DialogContent>
        </Dialog>

        {/* Complete Modal */}
        <Dialog open={completeModal.open} onOpenChange={open => setCompleteModal({ ...completeModal, open })}>
          <DialogContent className="bg-card border-border sm:max-w-md">
            <DialogHeader><DialogTitle>Link Video to Request</DialogTitle></DialogHeader>
            <div className="space-y-3">
              <div className="relative">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                <Input value={videoSearchForComplete} onChange={e => setVideoSearchForComplete(e.target.value)} placeholder="Search videos..." className="pl-9 bg-secondary border-border" />
              </div>
              <div className="max-h-[200px] overflow-y-auto space-y-1.5">
                {videoOptions?.map(v => (
                  <button key={v.id} onClick={() => setCompleteVideoId(v.id)}
                    className={`w-full text-left rounded-lg border p-2 text-sm transition-colors ${completeVideoId === v.id ? 'border-primary bg-primary/5' : 'border-border hover:border-primary/50'}`}>
                    {v.title} <span className="text-xs text-muted-foreground ml-1">({v.backupshala_video_link})</span>
                  </button>
                ))}
              </div>
              <Button className="w-full bg-primary hover:bg-primary/90" disabled={!completeVideoId} onClick={() => {
                processRequest.mutate({ requestId: completeModal.requestId, action: 'complete', video_id: completeVideoId });
                setCompleteModal({ open: false, requestId: '' });
              }}>
                <CheckCircle className="h-4 w-4 mr-2" /> Complete Request
              </Button>
            </div>
          </DialogContent>
        </Dialog>
      </div>
    </AdminDashboardLayout>
  );
};

export default AdminVideos;
