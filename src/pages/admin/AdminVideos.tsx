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
import BackupshalaVideoPlayer from '@/components/video/BackupshalaVideoPlayer';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';
import { VIDEO_CATEGORIES, VIDEO_LANGUAGES } from '@/lib/videoTypes';
import { Search, Upload, Film, Clock, CheckCircle, XCircle, Loader2, ExternalLink, FolderOpen } from 'lucide-react';
import AdminFoldersTab from '@/components/admin/AdminFoldersTab';

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
  const [previewAsset, setPreviewAsset] = useState<string | null>(null);

  const [rejectModal, setRejectModal] = useState<{ open: boolean; requestId: string }>({ open: false, requestId: '' });
  const [completeModal, setCompleteModal] = useState<{ open: boolean; requestId: string }>({ open: false, requestId: '' });
  const [rejectNote, setRejectNote] = useState('');
  const [completeVideoAssetId, setCompleteVideoAssetId] = useState('');
  const [videoSearchForComplete, setVideoSearchForComplete] = useState('');

  // Fetch video_assets
  const { data: assets } = useQuery({
    queryKey: ['admin-video-assets', search, categoryFilter, langFilter, sortBy],
    queryFn: async () => {
      let q = supabase.from('video_assets').select('*');
      if (search) q = q.ilike('title', `%${search}%`);
      if (categoryFilter !== 'all') q = q.eq('category', categoryFilter);
      if (langFilter !== 'all') q = q.eq('language', langFilter);
      if (sortBy === 'newest') q = q.order('created_at', { ascending: false });
      else if (sortBy === 'most_used') q = q.order('used_in_courses_count', { ascending: false });
      else if (sortBy === 'most_viewed') q = q.order('total_views', { ascending: false });
      else if (sortBy === 'longest') q = q.order('duration_seconds', { ascending: false });
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

  // Video options for complete modal
  const { data: assetOptions } = useQuery({
    queryKey: ['asset-options-search', videoSearchForComplete],
    queryFn: async () => {
      let q = supabase.from('video_assets').select('id, title, bsv_code').eq('status', 'ready').eq('is_active', true).order('created_at', { ascending: false }).limit(20);
      if (videoSearchForComplete) q = q.ilike('title', `%${videoSearchForComplete}%`);
      const { data } = await q;
      return data || [];
    },
    enabled: completeModal.open,
  });

  const processRequest = useMutation({
    mutationFn: async ({ requestId, action, admin_note, video_asset_id }: { requestId: string; action: string; admin_note?: string; video_asset_id?: string }) => {
      const { data, error } = await supabase.functions.invoke('process-video-request', {
        body: { request_id: requestId, action, admin_note, video_asset_id },
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

  const handleDeactivate = async (assetId: string) => {
    const asset = assets?.find(a => a.id === assetId);
    await supabase.from('video_assets').update({ is_active: !asset?.is_active }).eq('id', assetId);
    qc.invalidateQueries({ queryKey: ['admin-video-assets'] });
    toast.success(asset?.is_active ? 'Video suspended' : 'Video activated');
  };

  const handleDelete = async (assetId: string) => {
    const asset = assets?.find(a => a.id === assetId);
    if (asset && asset.used_in_courses_count > 0) {
      toast.error('Cannot delete a video used in courses');
      return;
    }
    if (!confirm('Delete this video permanently?')) return;
    await supabase.from('video_assets').delete().eq('id', assetId);
    qc.invalidateQueries({ queryKey: ['admin-video-assets'] });
    toast.success('Video deleted');
  };

  const requestStats = {
    total: requests?.length || 0,
    pending: requests?.filter(r => r.status === 'pending').length || 0,
    processing: requests?.filter(r => r.status === 'processing').length || 0,
    completed: requests?.filter(r => r.status === 'completed').length || 0,
  };

  return (
    <AdminDashboardLayout>
      <div className="space-y-6">
        <div className="flex items-center justify-between">
          <h1 className="text-2xl font-heading font-bold flex items-center gap-2">
            <Film className="h-6 w-6 text-primary" /> Video Library
          </h1>
          <Button onClick={() => setUploadOpen(true)} className="bg-accent hover:bg-accent/90 gap-2">
            <Upload className="h-4 w-4" /> Upload Video
          </Button>
        </div>

        <Tabs defaultValue="library">
          <TabsList className="bg-secondary">
            <TabsTrigger value="library">Video Library ({assets?.length || 0})</TabsTrigger>
            <TabsTrigger value="requests">Video Requests ({requestStats.pending} pending)</TabsTrigger>
          </TabsList>

          <TabsContent value="library" className="space-y-4 mt-4">
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
              <Select value={sortBy} onValueChange={setSortBy}>
                <SelectTrigger className="w-[140px] bg-secondary border-border"><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="newest">Newest</SelectItem>
                  <SelectItem value="most_used">Most Used</SelectItem>
                  <SelectItem value="most_viewed">Most Viewed</SelectItem>
                  <SelectItem value="longest">Longest</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
              {assets?.map(a => (
                <VideoCard
                  key={a.id}
                  asset={a}
                  variant="admin"
                  onPreview={id => setPreviewAsset(id)}
                  onDeactivate={handleDeactivate}
                  onDelete={handleDelete}
                />
              ))}
            </div>
            {assets?.length === 0 && (
              <div className="text-center py-16 space-y-3">
                <Upload className="h-12 w-12 mx-auto text-muted-foreground" />
                <p className="text-muted-foreground">No videos uploaded yet</p>
                <Button onClick={() => setUploadOpen(true)} className="bg-accent hover:bg-accent/90">Upload Video</Button>
              </div>
            )}
          </TabsContent>

          <TabsContent value="requests" className="space-y-4 mt-4">
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

            <div className="flex gap-2 flex-wrap">
              {['all', 'pending', 'processing', 'completed', 'rejected'].map(f => (
                <Button key={f} size="sm" variant={requestFilter === f ? 'default' : 'outline'} onClick={() => setRequestFilter(f)} className="text-xs capitalize">
                  {f}
                </Button>
              ))}
            </div>

            <div className="space-y-3">
              {requests?.map(req => (
                <Card key={req.id} className="bg-card border-border">
                  <CardContent className="p-4">
                    <div className="flex flex-col md:flex-row md:items-center justify-between gap-3">
                      <div className="space-y-1 flex-1">
                        <div className="flex items-center gap-2">
                          <h3 className="font-medium text-sm">{req.video_title}</h3>
                          <Badge className={`text-[10px] ${statusColors[req.status || 'pending']}`}>{req.status}</Badge>
                        </div>
                        <p className="text-xs text-muted-foreground">
                          By: {(req.profiles as any)?.full_name || 'Unknown'} ({(req.profiles as any)?.email})
                        </p>
                        <a href={req.youtube_url} target="_blank" rel="noopener noreferrer" className="text-xs text-primary hover:underline flex items-center gap-1">
                          <ExternalLink className="h-3 w-3" /> {req.youtube_url}
                        </a>
                        {req.category && <p className="text-xs text-muted-foreground">Category: {req.category} • {req.language}</p>}
                        {req.reason && <p className="text-xs text-muted-foreground">Reason: {req.reason}</p>}
                        {req.admin_note && <p className="text-xs text-muted-foreground italic">Admin: {req.admin_note}</p>}
                        <p className="text-[10px] text-muted-foreground">{new Date(req.requested_at || '').toLocaleString('en-IN')}</p>
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
                            onClick={() => { setCompleteModal({ open: true, requestId: req.id }); setCompleteVideoAssetId(''); }}>
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
        <VideoUploadModal open={uploadOpen} onOpenChange={setUploadOpen} onSuccess={() => qc.invalidateQueries({ queryKey: ['admin-video-assets'] })} />

        {/* Preview Modal */}
        <Dialog open={!!previewAsset} onOpenChange={() => setPreviewAsset(null)}>
          <DialogContent className="sm:max-w-2xl bg-card border-border p-0">
            {previewAsset && (
              <div className="p-4">
                <BackupshalaVideoPlayer assetId={previewAsset} isPublicWatch />
              </div>
            )}
          </DialogContent>
        </Dialog>

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
                {assetOptions?.map(a => (
                  <button key={a.id} onClick={() => setCompleteVideoAssetId(a.id)}
                    className={`w-full text-left rounded-lg border p-2 text-sm transition-colors ${completeVideoAssetId === a.id ? 'border-primary bg-primary/5' : 'border-border hover:border-primary/50'}`}>
                    {a.title} <span className="text-xs text-muted-foreground ml-1">({a.bsv_code})</span>
                  </button>
                ))}
              </div>
              <Button className="w-full bg-primary hover:bg-primary/90" disabled={!completeVideoAssetId} onClick={() => {
                processRequest.mutate({ requestId: completeModal.requestId, action: 'complete', video_asset_id: completeVideoAssetId });
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
