import { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { Button } from '@/components/ui/button';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Label } from '@/components/ui/label';
import BackupshalaVideoPlayer from '@/components/video/BackupshalaVideoPlayer';
import { FolderOpen, ArrowLeft, Copy } from 'lucide-react';
import { toast } from 'sonner';

const CreatorSharedFolders = () => {
  const { user } = useAuth();
  const [viewFolderId, setViewFolderId] = useState<string | null>(null);
  const [previewAsset, setPreviewAsset] = useState<string | null>(null);
  const [useInCourseAsset, setUseInCourseAsset] = useState<any>(null);
  const [selectedCourseId, setSelectedCourseId] = useState('');
  const [selectedModuleId, setSelectedModuleId] = useState('');

  const { data: sharedFolders } = useQuery({
    queryKey: ['creator-shared-folders', user?.id],
    queryFn: async () => {
      if (!user) return [];
      const { data } = await supabase
        .from('folder_shares')
        .select('*, video_folders(*)')
        .eq('shared_with', user.id)
        .eq('is_active', true)
        .order('shared_at', { ascending: false });
      return data || [];
    },
    enabled: !!user,
  });

  const { data: folderItems } = useQuery({
    queryKey: ['creator-folder-items', viewFolderId],
    queryFn: async () => {
      if (!viewFolderId) return [];
      const { data } = await supabase
        .from('video_folder_items')
        .select('*, video_assets(*)')
        .eq('folder_id', viewFolderId)
        .order('order_index');
      return data || [];
    },
    enabled: !!viewFolderId,
  });

  const { data: myCourses } = useQuery({
    queryKey: ['creator-courses-for-folder', user?.id],
    queryFn: async () => {
      if (!user) return [];
      const { data } = await supabase.from('courses').select('id, title').eq('creator_id', user.id);
      return data || [];
    },
    enabled: !!useInCourseAsset && !!user,
  });

  const { data: courseModules } = useQuery({
    queryKey: ['course-modules-folder', selectedCourseId],
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
      toast.success('Video added to module!');
      setUseInCourseAsset(null);
      setSelectedCourseId('');
      setSelectedModuleId('');
    } catch (err: any) {
      toast.error(err.message || 'Failed');
    }
  };

  const formatDuration = (s: number) => `${Math.floor(s / 60)}:${String(s % 60).padStart(2, '0')}`;

  // Folder detail view
  if (viewFolderId) {
    const share = sharedFolders?.find(s => (s.video_folders as any)?.id === viewFolderId);
    const folder = share?.video_folders as any;
    return (
      <div className="space-y-4">
        <button onClick={() => setViewFolderId(null)} className="flex items-center gap-1 text-sm text-muted-foreground hover:text-foreground">
          <ArrowLeft className="h-4 w-4" /> Back to Folders
        </button>

        <div className="flex items-center gap-3">
          <div className="h-4 w-4 rounded-full" style={{ backgroundColor: folder?.color || '#f97316' }} />
          <div>
            <h2 className="font-heading text-lg font-bold">{folder?.name}</h2>
            <p className="text-xs text-muted-foreground">{folderItems?.length || 0} videos shared by Admin</p>
          </div>
        </div>
        {share?.message && (
          <div className="rounded-lg bg-accent/5 border border-accent/20 p-3 text-xs text-muted-foreground">
            💬 {share.message}
          </div>
        )}

        <div className="space-y-2">
          {folderItems && folderItems.length > 0 ? folderItems.map((item: any) => (
            <div key={item.id} className="flex items-center gap-3 rounded-xl border border-border bg-secondary/20 p-3">
              <div className="h-12 w-16 rounded-lg bg-muted flex items-center justify-center text-xl">▶️</div>
              <div className="flex-1 min-w-0">
                <p className="text-sm font-medium truncate">{item.video_assets?.title}</p>
                <p className="text-xs text-muted-foreground">{item.video_assets?.category}</p>
                {item.video_assets?.bsv_code && (
                  <button onClick={() => { navigator.clipboard.writeText(`bsv://${item.video_assets.bsv_code}`); toast.success('BSV link copied'); }}
                    className="text-[10px] text-accent hover:underline flex items-center gap-0.5 mt-0.5">
                    <Copy className="h-2.5 w-2.5" /> Copy BSV Link
                  </button>
                )}
              </div>
              <span className="text-xs text-muted-foreground">{item.video_assets?.duration_seconds ? formatDuration(item.video_assets.duration_seconds) : ''}</span>
              <Button size="sm" variant="outline" className="text-xs" onClick={() => setUseInCourseAsset(item.video_assets)}>
                Use in Course →
              </Button>
            </div>
          )) : (
            <p className="text-sm text-muted-foreground text-center py-8">No videos in this folder.</p>
          )}
        </div>

        {/* Preview */}
        <Dialog open={!!previewAsset} onOpenChange={() => setPreviewAsset(null)}>
          <DialogContent className="sm:max-w-2xl bg-card border-border p-0">
            {previewAsset && <div className="p-4"><BackupshalaVideoPlayer assetId={previewAsset} isPublicWatch /></div>}
          </DialogContent>
        </Dialog>

        {/* Use in Course */}
        <Dialog open={!!useInCourseAsset} onOpenChange={() => setUseInCourseAsset(null)}>
          <DialogContent className="bg-card border-border sm:max-w-md">
            <DialogHeader><DialogTitle>Use "{useInCourseAsset?.title}" in your course</DialogTitle></DialogHeader>
            <div className="space-y-4">
              <div className="space-y-1.5">
                <Label className="text-sm">Select Course</Label>
                <Select value={selectedCourseId} onValueChange={v => { setSelectedCourseId(v); setSelectedModuleId(''); }}>
                  <SelectTrigger><SelectValue placeholder="Choose course" /></SelectTrigger>
                  <SelectContent>
                    {myCourses?.map(c => <SelectItem key={c.id} value={c.id}>{c.title}</SelectItem>)}
                  </SelectContent>
                </Select>
              </div>
              {selectedCourseId && (
                <div className="space-y-1.5">
                  <Label className="text-sm">Select Module</Label>
                  <Select value={selectedModuleId} onValueChange={setSelectedModuleId}>
                    <SelectTrigger><SelectValue placeholder="Choose module" /></SelectTrigger>
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
    );
  }

  // Folders list
  return (
    <div className="space-y-4">
      <h3 className="font-heading text-sm font-semibold text-muted-foreground">📁 Folders Shared With You ({sharedFolders?.length || 0})</h3>

      {sharedFolders && sharedFolders.length > 0 ? (
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          {sharedFolders.map(share => {
            const folder = share.video_folders as any;
            if (!folder) return null;
            return (
              <div key={share.id} className="rounded-xl border border-border bg-card p-5 space-y-2 hover:border-accent/20 transition-colors">
                <div className="flex items-center gap-2">
                  <div className="h-3 w-3 rounded-full" style={{ backgroundColor: folder.color || '#f97316' }} />
                  <h3 className="font-heading text-sm font-semibold flex-1 truncate">{folder.name}</h3>
                </div>
                <p className="text-xs text-muted-foreground">{folder.video_count || 0} videos · Shared by Admin</p>
                {share.message && <p className="text-xs text-muted-foreground italic line-clamp-2">"{share.message}"</p>}
                <p className="text-[10px] text-muted-foreground">Received: {new Date(share.shared_at).toLocaleDateString('en-IN')}</p>
                <Button size="sm" variant="outline" className="w-full text-xs mt-1" onClick={() => setViewFolderId(folder.id)}>
                  Open Folder →
                </Button>
              </div>
            );
          })}
        </div>
      ) : (
        <div className="rounded-xl border border-dashed border-border p-8 text-center">
          <FolderOpen className="h-10 w-10 mx-auto text-muted-foreground/30 mb-2" />
          <p className="text-sm font-medium text-muted-foreground">No folders shared yet</p>
          <p className="text-xs text-muted-foreground mt-1">Admin will share video collections with you here.</p>
        </div>
      )}
    </div>
  );
};

export default CreatorSharedFolders;
