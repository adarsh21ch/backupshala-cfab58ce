import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { toast } from 'sonner';
import { Plus, FolderOpen, Search, Trash2, Share2, ArrowLeft, Check, Users } from 'lucide-react';

const FOLDER_COLORS = ['#f97316', '#16a34a', '#3b82f6', '#8b5cf6', '#ef4444', '#f59e0b', '#374151'];

const AdminFoldersTab = () => {
  const { user } = useAuth();
  const qc = useQueryClient();
  const [search, setSearch] = useState('');
  const [createOpen, setCreateOpen] = useState(false);
  const [name, setName] = useState('');
  const [description, setDescription] = useState('');
  const [color, setColor] = useState('#f97316');

  // View states
  const [viewFolderId, setViewFolderId] = useState<string | null>(null);
  const [addVideosOpen, setAddVideosOpen] = useState(false);
  const [shareOpen, setShareOpen] = useState(false);
  const [videoSearch, setVideoSearch] = useState('');
  const [selectedVideos, setSelectedVideos] = useState<string[]>([]);
  const [creatorSearch, setCreatorSearch] = useState('');
  const [selectedCreators, setSelectedCreators] = useState<{ id: string; name: string; email: string }[]>([]);
  const [shareMessage, setShareMessage] = useState('');

  const { data: folders } = useQuery({
    queryKey: ['admin-folders', search],
    queryFn: async () => {
      let q = supabase.from('video_folders').select('*').order('created_at', { ascending: false });
      if (search) q = q.ilike('name', `%${search}%`);
      const { data } = await q;
      return data || [];
    },
  });

  const { data: folderDetail } = useQuery({
    queryKey: ['admin-folder-detail', viewFolderId],
    queryFn: async () => {
      if (!viewFolderId) return null;
      const [folderRes, itemsRes, sharesRes] = await Promise.all([
        supabase.from('video_folders').select('*').eq('id', viewFolderId).single(),
        supabase.from('video_folder_items').select('*, video_assets(*)').eq('folder_id', viewFolderId).order('order_index'),
        supabase.from('folder_shares').select('*, profiles:shared_with(full_name, email)').eq('folder_id', viewFolderId),
      ]);
      return { folder: folderRes.data, items: itemsRes.data || [], shares: sharesRes.data || [] };
    },
    enabled: !!viewFolderId,
  });

  const { data: availableVideos } = useQuery({
    queryKey: ['folder-available-videos', videoSearch],
    queryFn: async () => {
      let q = supabase.from('video_assets').select('id, title, bsv_code, duration_seconds, category').eq('status', 'ready').eq('is_active', true).order('created_at', { ascending: false }).limit(50);
      if (videoSearch) q = q.ilike('title', `%${videoSearch}%`);
      const { data } = await q;
      return data || [];
    },
    enabled: addVideosOpen,
  });

  const { data: creators } = useQuery({
    queryKey: ['folder-creators-search', creatorSearch],
    queryFn: async () => {
      let q = supabase.from('profiles').select('id, full_name, email').eq('is_creator', true).eq('creator_approved', true).limit(20);
      if (creatorSearch) q = q.or(`full_name.ilike.%${creatorSearch}%,email.ilike.%${creatorSearch}%`);
      const { data } = await q;
      return data || [];
    },
    enabled: shareOpen,
  });

  const createFolder = useMutation({
    mutationFn: async () => {
      const { error } = await supabase.from('video_folders').insert({ name, description, color, created_by: user!.id });
      if (error) throw error;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['admin-folders'] });
      setCreateOpen(false);
      setName(''); setDescription(''); setColor('#f97316');
      toast.success('Folder created');
    },
    onError: (e: any) => toast.error(e.message),
  });

  const addVideosToFolder = useMutation({
    mutationFn: async () => {
      const existingIds = folderDetail?.items?.map(i => i.video_asset_id) || [];
      const newVideos = selectedVideos.filter(id => !existingIds.includes(id));
      if (newVideos.length === 0) { toast.info('All selected videos already in folder'); return; }
      const rows = newVideos.map((vid, i) => ({
        folder_id: viewFolderId!,
        video_asset_id: vid,
        added_by: user!.id,
        order_index: (folderDetail?.items?.length || 0) + i,
      }));
      const { error } = await supabase.from('video_folder_items').insert(rows);
      if (error) throw error;
      await supabase.from('video_folders').update({ video_count: (folderDetail?.items?.length || 0) + newVideos.length }).eq('id', viewFolderId!);
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['admin-folder-detail', viewFolderId] });
      qc.invalidateQueries({ queryKey: ['admin-folders'] });
      setAddVideosOpen(false);
      setSelectedVideos([]);
      toast.success('Videos added');
    },
    onError: (e: any) => toast.error(e.message),
  });

  const removeVideoFromFolder = async (itemId: string) => {
    await supabase.from('video_folder_items').delete().eq('id', itemId);
    if (viewFolderId) {
      const newCount = Math.max(0, (folderDetail?.items?.length || 1) - 1);
      await supabase.from('video_folders').update({ video_count: newCount }).eq('id', viewFolderId);
    }
    qc.invalidateQueries({ queryKey: ['admin-folder-detail', viewFolderId] });
    qc.invalidateQueries({ queryKey: ['admin-folders'] });
    toast.success('Video removed');
  };

  const shareFolder = useMutation({
    mutationFn: async () => {
      const rows = selectedCreators.map(c => ({
        folder_id: viewFolderId!,
        shared_with: c.id,
        shared_with_email: c.email,
        shared_by: user!.id,
        message: shareMessage,
      }));
      const { error } = await supabase.from('folder_shares').upsert(rows, { onConflict: 'folder_id,shared_with' });
      if (error) throw error;

      // Send notifications
      const notifications = selectedCreators.map(c => ({
        user_id: c.id,
        title: '📁 New video folder shared!',
        message: `Admin shared "${folderDetail?.folder?.name}" with ${folderDetail?.items?.length || 0} videos`,
        type: 'folder_share',
        action_url: '/creator/videos',
      }));
      await supabase.from('notifications').insert(notifications);
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['admin-folder-detail', viewFolderId] });
      setShareOpen(false);
      setSelectedCreators([]);
      setShareMessage('');
      toast.success('Folder shared');
    },
    onError: (e: any) => toast.error(e.message),
  });

  const formatDuration = (s: number) => {
    const m = Math.floor(s / 60);
    const sec = s % 60;
    return `${m}:${String(sec).padStart(2, '0')}`;
  };

  // Folder detail view
  if (viewFolderId && folderDetail) {
    const { folder, items, shares } = folderDetail;
    return (
      <div className="space-y-6">
        <button onClick={() => setViewFolderId(null)} className="flex items-center gap-1 text-sm text-muted-foreground hover:text-foreground">
          <ArrowLeft className="h-4 w-4" /> Back to Folders
        </button>

        <div className="flex items-start justify-between gap-4">
          <div className="flex items-center gap-3">
            <div className="h-4 w-4 rounded-full" style={{ backgroundColor: folder?.color || '#f97316' }} />
            <div>
              <h2 className="font-heading text-xl font-bold">{folder?.name}</h2>
              {folder?.description && <p className="text-sm text-muted-foreground mt-0.5">{folder.description}</p>}
              <p className="text-xs text-muted-foreground mt-1">{items.length} videos · Shared with {shares.length} creators</p>
            </div>
          </div>
          <div className="flex gap-2">
            <Button size="sm" className="bg-accent hover:bg-accent/90 text-xs" onClick={() => { setAddVideosOpen(true); setVideoSearch(''); setSelectedVideos([]); }}>
              <Plus className="h-3 w-3 mr-1" /> Add Videos
            </Button>
            <Button size="sm" variant="outline" className="text-xs" onClick={() => { setShareOpen(true); setCreatorSearch(''); setSelectedCreators([]); setShareMessage(''); }}>
              <Share2 className="h-3 w-3 mr-1" /> Share
            </Button>
          </div>
        </div>

        {/* Videos list */}
        <div className="space-y-2">
          <h3 className="text-sm font-semibold text-muted-foreground">Videos in this folder</h3>
          {items.length > 0 ? items.map((item: any) => (
            <div key={item.id} className="flex items-center gap-3 rounded-xl border border-border bg-secondary/20 p-3">
              <div className="h-12 w-16 rounded-lg bg-muted flex items-center justify-center text-muted-foreground text-xs">▶️</div>
              <div className="flex-1 min-w-0">
                <p className="text-sm font-medium truncate">{item.video_assets?.title}</p>
                <p className="text-xs text-muted-foreground">{item.video_assets?.category} · {item.video_assets?.language || 'English'}</p>
                {item.video_assets?.bsv_code && (
                  <button onClick={() => { navigator.clipboard.writeText(item.video_assets.bsv_code); toast.success('BSV copied'); }}
                    className="text-[10px] text-accent hover:underline mt-0.5">BSV: {item.video_assets.bsv_code} 📋</button>
                )}
              </div>
              <span className="text-xs text-muted-foreground">{item.video_assets?.duration_seconds ? formatDuration(item.video_assets.duration_seconds) : '-'}</span>
              <Button variant="ghost" size="sm" onClick={() => removeVideoFromFolder(item.id)} className="text-destructive h-8 w-8 p-0">
                <Trash2 className="h-3.5 w-3.5" />
              </Button>
            </div>
          )) : (
            <div className="rounded-xl border border-dashed border-border p-8 text-center">
              <p className="text-sm text-muted-foreground">No videos in this folder yet.</p>
            </div>
          )}
        </div>

        {/* Shared with */}
        <div className="space-y-2">
          <h3 className="text-sm font-semibold text-muted-foreground">Shared with ({shares.length} creators)</h3>
          {shares.length > 0 ? shares.map((s: any) => (
            <div key={s.id} className="flex items-center gap-3 rounded-lg border border-border p-2.5">
              <div className="h-7 w-7 rounded-full bg-accent/20 flex items-center justify-center text-xs font-semibold text-accent">
                {(s.profiles as any)?.full_name?.[0]?.toUpperCase() || '?'}
              </div>
              <div className="flex-1 min-w-0">
                <p className="text-sm font-medium truncate">{(s.profiles as any)?.full_name}</p>
                <p className="text-xs text-muted-foreground">{s.shared_with_email}</p>
              </div>
              <span className="text-[10px] text-muted-foreground">{new Date(s.shared_at).toLocaleDateString('en-IN')}</span>
            </div>
          )) : (
            <p className="text-xs text-muted-foreground">Not shared with anyone yet.</p>
          )}
        </div>

        {/* Add Videos Modal */}
        <Dialog open={addVideosOpen} onOpenChange={setAddVideosOpen}>
          <DialogContent className="bg-card border-border max-w-lg max-h-[80vh] overflow-y-auto">
            <DialogHeader><DialogTitle>Add Videos to Folder</DialogTitle></DialogHeader>
            <div className="space-y-3">
              <div className="relative">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                <Input value={videoSearch} onChange={e => setVideoSearch(e.target.value)} placeholder="Search by title..." className="pl-9" />
              </div>
              <div className="max-h-[300px] overflow-y-auto space-y-1">
                {availableVideos?.map(v => {
                  const alreadyIn = folderDetail?.items?.some(i => i.video_asset_id === v.id);
                  const selected = selectedVideos.includes(v.id);
                  return (
                    <button key={v.id} disabled={alreadyIn}
                      onClick={() => setSelectedVideos(prev => selected ? prev.filter(x => x !== v.id) : [...prev, v.id])}
                      className={`w-full text-left rounded-lg border p-2.5 text-sm flex items-center gap-2 transition-colors ${
                        alreadyIn ? 'opacity-40 cursor-not-allowed border-border' :
                        selected ? 'border-accent bg-accent/5' : 'border-border hover:border-accent/30'
                      }`}>
                      <div className={`h-4 w-4 rounded border flex items-center justify-center ${selected || alreadyIn ? 'bg-accent border-accent' : 'border-muted-foreground'}`}>
                        {(selected || alreadyIn) && <Check className="h-3 w-3 text-white" />}
                      </div>
                      <span className="flex-1 truncate">{v.title}</span>
                      <span className="text-xs text-muted-foreground">{v.duration_seconds ? formatDuration(v.duration_seconds) : ''}</span>
                    </button>
                  );
                })}
              </div>
              <p className="text-xs text-muted-foreground">Selected: {selectedVideos.length} videos</p>
              <Button className="w-full bg-accent hover:bg-accent/90" disabled={selectedVideos.length === 0} onClick={() => addVideosToFolder.mutate()}>
                Add Selected Videos →
              </Button>
            </div>
          </DialogContent>
        </Dialog>

        {/* Share Modal */}
        <Dialog open={shareOpen} onOpenChange={setShareOpen}>
          <DialogContent className="bg-card border-border max-w-lg">
            <DialogHeader><DialogTitle>Share "{folder?.name}"</DialogTitle></DialogHeader>
            <div className="space-y-4">
              <div>
                <p className="text-xs font-semibold text-muted-foreground mb-1.5">Search Creator</p>
                <div className="relative">
                  <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                  <Input value={creatorSearch} onChange={e => setCreatorSearch(e.target.value)} placeholder="Search by name or email..." className="pl-9" />
                </div>
                <div className="max-h-[150px] overflow-y-auto mt-2 space-y-1">
                  {creators?.filter(c => !selectedCreators.some(sc => sc.id === c.id)).map(c => (
                    <button key={c.id} onClick={() => setSelectedCreators(prev => [...prev, { id: c.id, name: c.full_name, email: c.email }])}
                      className="w-full text-left rounded-lg border border-border p-2 text-sm hover:border-accent/30 transition-colors">
                      {c.full_name} <span className="text-xs text-muted-foreground">({c.email})</span>
                    </button>
                  ))}
                </div>
              </div>

              {selectedCreators.length > 0 && (
                <div className="flex flex-wrap gap-1.5">
                  {selectedCreators.map(c => (
                    <span key={c.id} className="inline-flex items-center gap-1 rounded-full bg-accent/10 px-2.5 py-1 text-xs text-accent">
                      {c.name}
                      <button onClick={() => setSelectedCreators(prev => prev.filter(x => x.id !== c.id))} className="hover:text-destructive">×</button>
                    </span>
                  ))}
                </div>
              )}

              <div>
                <p className="text-xs font-semibold text-muted-foreground mb-1.5">Personal Message (optional)</p>
                <Textarea value={shareMessage} onChange={e => setShareMessage(e.target.value)} placeholder="Hi! Here are the videos for your course..." className="min-h-[60px]" />
              </div>

              <div className="rounded-lg bg-secondary/30 p-3 text-xs text-muted-foreground space-y-0.5">
                <p>📧 They will receive:</p>
                <p>• In-app notification</p>
                <p>• Access to all videos in this folder</p>
              </div>

              <Button className="w-full bg-accent hover:bg-accent/90" disabled={selectedCreators.length === 0} onClick={() => shareFolder.mutate()}>
                <Share2 className="h-4 w-4 mr-1" /> Share Folder →
              </Button>
            </div>
          </DialogContent>
        </Dialog>
      </div>
    );
  }

  // Folder list view
  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <div className="relative flex-1 max-w-sm">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input value={search} onChange={e => setSearch(e.target.value)} placeholder="Search folders..." className="pl-9" />
        </div>
        <Button className="bg-accent hover:bg-accent/90" onClick={() => setCreateOpen(true)}>
          <Plus className="h-4 w-4 mr-1" /> Create Folder
        </Button>
      </div>

      {folders && folders.length > 0 ? (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {folders.map(f => (
            <div key={f.id} className="rounded-xl border border-border bg-card p-5 space-y-3 hover:border-accent/20 transition-colors">
              <div className="flex items-center gap-2">
                <div className="h-3 w-3 rounded-full" style={{ backgroundColor: f.color || '#f97316' }} />
                <h3 className="font-heading text-sm font-semibold flex-1 truncate">{f.name}</h3>
              </div>
              <p className="text-xs text-muted-foreground">{f.video_count || 0} videos</p>
              {f.description && <p className="text-xs text-muted-foreground line-clamp-2">{f.description}</p>}
              <p className="text-[10px] text-muted-foreground">{new Date(f.created_at).toLocaleDateString('en-IN')}</p>
              <div className="flex gap-2 pt-1">
                <Button size="sm" variant="outline" className="flex-1 text-xs" onClick={() => setViewFolderId(f.id)}>Open</Button>
                <Button size="sm" variant="ghost" className="text-xs" onClick={() => { setViewFolderId(f.id); setTimeout(() => setShareOpen(true), 300); }}>
                  <Share2 className="h-3 w-3" />
                </Button>
              </div>
            </div>
          ))}
        </div>
      ) : (
        <div className="rounded-xl border border-dashed border-border p-12 text-center">
          <FolderOpen className="h-12 w-12 mx-auto text-muted-foreground/30 mb-3" />
          <p className="text-sm font-medium text-muted-foreground">No folders yet</p>
          <p className="text-xs text-muted-foreground mt-1">Create folders to organize and share videos with creators.</p>
        </div>
      )}

      {/* Create Folder Modal */}
      <Dialog open={createOpen} onOpenChange={setCreateOpen}>
        <DialogContent className="bg-card border-border max-w-md">
          <DialogHeader><DialogTitle>Create Video Folder</DialogTitle></DialogHeader>
          <div className="space-y-4">
            <div>
              <p className="text-xs font-semibold uppercase tracking-wider text-muted-foreground mb-1.5">Folder Name *</p>
              <Input value={name} onChange={e => setName(e.target.value)} placeholder="Content Creation Starter Pack" />
            </div>
            <div>
              <p className="text-xs font-semibold uppercase tracking-wider text-muted-foreground mb-1.5">Description</p>
              <Textarea value={description} onChange={e => setDescription(e.target.value)} placeholder="What's in this folder?" className="min-h-[60px]" />
            </div>
            <div>
              <p className="text-xs font-semibold uppercase tracking-wider text-muted-foreground mb-1.5">Folder Color</p>
              <div className="flex gap-2">
                {FOLDER_COLORS.map(c => (
                  <button key={c} onClick={() => setColor(c)}
                    className={`h-8 w-8 rounded-full transition-all ${color === c ? 'ring-2 ring-offset-2 ring-offset-card ring-accent scale-110' : 'hover:scale-105'}`}
                    style={{ backgroundColor: c }} />
                ))}
              </div>
            </div>
            <div className="flex gap-3">
              <Button variant="outline" className="flex-1" onClick={() => setCreateOpen(false)}>Cancel</Button>
              <Button className="flex-1 bg-accent hover:bg-accent/90" disabled={!name.trim()} onClick={() => createFolder.mutate()}>
                Create Folder →
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default AdminFoldersTab;
