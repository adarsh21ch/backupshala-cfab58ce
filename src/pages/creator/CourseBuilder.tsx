import { useAuth } from '@/contexts/AuthContext';
import CreatorDashboardLayout from '@/components/dashboard/CreatorDashboardLayout';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useParams, useNavigate, Link } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Switch } from '@/components/ui/switch';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { useToast } from '@/hooks/use-toast';
import { usePlatformSettings } from '@/hooks/usePlatformSettings';
import PriceBreakdown from '@/components/PriceBreakdown';
import { useState, useEffect } from 'react';
import { Loader2, Plus, Trash2, GripVertical, Check, Copy, ChevronLeft, AlertTriangle } from 'lucide-react';
import { formatPrice } from '@/lib/format';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger, DialogFooter } from '@/components/ui/dialog';

const CATEGORIES = ['Video Editing', 'Content Creation', 'Personal Branding', 'Sales & Communication', 'Freelancing', 'Business Skills', 'Digital Marketing', 'Other'];
const LEVELS = ['Beginner', 'Intermediate', 'Advanced'];
const LANGUAGES = ['English', 'Hindi', 'Hinglish'];

const CourseBuilder = () => {
  const { id } = useParams<{ id: string }>();
  const isNew = !id || id === 'new';
  const { user, profile } = useAuth();
  const { toast } = useToast();
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const { data: platformSettings } = usePlatformSettings();
  const [saving, setSaving] = useState(false);
  const [linkCopied, setLinkCopied] = useState(false);

  const [title, setTitle] = useState('');
  const [slug, setSlug] = useState('');
  const [shortDesc, setShortDesc] = useState('');
  const [fullDesc, setFullDesc] = useState('');
  const [category, setCategory] = useState('Other');
  const [language, setLanguage] = useState('English');
  const [level, setLevel] = useState('Beginner');
  const [thumbnailUrl, setThumbnailUrl] = useState('');
  const [previewVideoUrl, setPreviewVideoUrl] = useState('');
  const [whatYouLearn, setWhatYouLearn] = useState<string[]>(['']);
  const [requirements, setRequirements] = useState<string[]>(['']);
  const [tags, setTags] = useState('');
  const [price, setPrice] = useState('249');
  const [commissionPercent, setCommissionPercent] = useState(30);
  const [status, setStatus] = useState('draft');

  const [modules, setModules] = useState<any[]>([]);
  const [moduleDialogOpen, setModuleDialogOpen] = useState(false);
  const [editingModule, setEditingModule] = useState<any>(null);
  const [mTitle, setMTitle] = useState('');
  const [mDesc, setMDesc] = useState('');
  const [mVideoUrl, setMVideoUrl] = useState('');
  const [mDuration, setMDuration] = useState('');
  const [mIsPreview, setMIsPreview] = useState(false);
  const [mModuleType, setMModuleType] = useState<'video' | 'resource' | 'community'>('video');
  const [mResources, setMResources] = useState<any[]>([]);

  const platformFeePercent = platformSettings?.platform_fee_percent ?? 15;
  const maxCommission = 100 - platformFeePercent;

  const { data: course } = useQuery({
    queryKey: ['creator-course-edit', id],
    queryFn: async () => {
      const { data } = await supabase.from('courses').select('*, modules(*)').eq('id', id!).eq('creator_id', user!.id).single();
      return data;
    },
    enabled: !isNew && !!id && !!user,
  });

  useEffect(() => {
    if (course) {
      setTitle(course.title);
      setSlug(course.slug);
      setShortDesc(course.short_description);
      setFullDesc(course.full_description || '');
      setCategory(course.category);
      setLanguage(course.language || 'English');
      setLevel(course.level || 'Beginner');
      setThumbnailUrl(course.thumbnail_url || '');
      setPreviewVideoUrl(course.preview_video_url || '');
      setWhatYouLearn(course.what_you_learn?.length ? course.what_you_learn : ['']);
      setRequirements(course.requirements?.length ? course.requirements : ['']);
      setTags(course.tags?.join(', ') || '');
      setPrice(String(course.price));
      setCommissionPercent(course.commission_percent);
      setStatus(course.status);
      if (course.modules) {
        setModules([...course.modules].sort((a: any, b: any) => (a.order_index || 0) - (b.order_index || 0)));
      }
    }
  }, [course]);

  useEffect(() => {
    if (commissionPercent > maxCommission) setCommissionPercent(maxCommission);
  }, [maxCommission]);

  const generateSlug = (t: string) => t.toLowerCase().replace(/[^a-z0-9\s-]/g, '').replace(/\s+/g, '-').replace(/-+/g, '-').trim();

  useEffect(() => {
    if (isNew && title) setSlug(generateSlug(title));
  }, [title, isNew]);

  const priceNum = Number(price) || 0;

  const saveCourse = async () => {
    if (!title.trim() || !shortDesc.trim() || !slug.trim()) {
      toast({ title: 'Title, description, and slug are required', variant: 'destructive' });
      return null;
    }
    setSaving(true);
    try {
      const courseData: any = {
        title: title.trim(),
        slug: slug.trim(),
        short_description: shortDesc.trim(),
        full_description: fullDesc.trim() || null,
        category, language, level,
        thumbnail_url: thumbnailUrl.trim() || null,
        preview_video_url: previewVideoUrl.trim() || null,
        what_you_learn: whatYouLearn.filter(w => w.trim()),
        requirements: requirements.filter(r => r.trim()),
        tags: tags.split(',').map(t => t.trim()).filter(Boolean),
        price: priceNum,
        commission_percent: commissionPercent,
        total_modules: modules.length,
      };

      // Lock in platform fee for new courses
      if (isNew) {
        courseData.platform_fee_percent = platformFeePercent;
      }

      if (isNew) {
        const { data, error } = await supabase.from('courses').insert({ ...courseData, creator_id: user!.id }).select().single();
        if (error) throw error;
        toast({ title: 'Course created ✓' });
        navigate(`/creator/courses/${data.id}/edit`, { replace: true });
        return data.id;
      } else {
        // For published courses changing price/commission -> trigger review
        if (status === 'published' && course) {
          const priceChanged = priceNum !== course.price;
          const commChanged = commissionPercent !== course.commission_percent;
          if (priceChanged || commChanged) {
            courseData.status = 'pending_review';
            courseData.rejection_reason = 'Price/commission updated by creator — please review';
          }
        }
        const { error } = await supabase.from('courses').update(courseData).eq('id', id!);
        if (error) throw error;
        toast({ title: 'Course saved ✓' });
        queryClient.invalidateQueries({ queryKey: ['creator-course-edit', id] });
        return id;
      }
    } catch (err: any) {
      toast({ title: 'Failed to save', description: err.message, variant: 'destructive' });
      return null;
    } finally {
      setSaving(false);
    }
  };

  const saveModule = async () => {
    if (!mTitle.trim()) {
      toast({ title: 'Title required', variant: 'destructive' });
      return;
    }
    if (mModuleType === 'video' && !mVideoUrl.trim()) {
      toast({ title: 'Video URL required for video modules', variant: 'destructive' });
      return;
    }
    const courseId = isNew ? await saveCourse() : id;
    if (!courseId) return;

    try {
      const moduleData: any = {
        title: mTitle.trim(),
        description: mDesc.trim() || null,
        video_url: mModuleType === 'video' ? mVideoUrl.trim() : 'placeholder',
        duration_minutes: Number(mDuration) || 0,
        is_preview: mIsPreview,
        module_type: mModuleType,
        resources: mModuleType !== 'video' ? mResources : [],
      };

      if (editingModule) {
        await supabase.from('modules').update(moduleData).eq('id', editingModule.id);
      } else {
        await supabase.from('modules').insert({
          ...moduleData,
          course_id: courseId,
          order_index: modules.length,
        });
      }
      queryClient.invalidateQueries({ queryKey: ['creator-course-edit'] });
      setModuleDialogOpen(false);
      resetModuleForm();
      toast({ title: editingModule ? 'Module updated ✓' : 'Module added ✓' });
    } catch (err: any) {
      toast({ title: 'Failed', description: err.message, variant: 'destructive' });
    }
  };

  const deleteModule = async (moduleId: string) => {
    await supabase.from('modules').delete().eq('id', moduleId);
    queryClient.invalidateQueries({ queryKey: ['creator-course-edit'] });
    toast({ title: 'Module deleted' });
  };

  const resetModuleForm = () => {
    setEditingModule(null);
    setMTitle(''); setMDesc(''); setMVideoUrl(''); setMDuration(''); setMIsPreview(false);
  };

  const openEditModule = (m: any) => {
    setEditingModule(m);
    setMTitle(m.title); setMDesc(m.description || ''); setMVideoUrl(m.video_url);
    setMDuration(String(m.duration_minutes || '')); setMIsPreview(m.is_preview || false);
    setModuleDialogOpen(true);
  };

  const submitForReview = async () => {
    const previewModules = modules.filter(m => m.is_preview);
    if (modules.length < 3) { toast({ title: 'Add at least 3 modules', variant: 'destructive' }); return; }
    if (previewModules.length === 0) { toast({ title: 'Add at least 1 preview module', variant: 'destructive' }); return; }
    if (!thumbnailUrl.trim()) { toast({ title: 'Add a thumbnail URL', variant: 'destructive' }); return; }
    if (priceNum < 99) { toast({ title: 'Price must be at least ₹99', variant: 'destructive' }); return; }

    await saveCourse();
    const { error } = await supabase.from('courses').update({ status: 'pending_review' }).eq('id', id!);
    if (error) { toast({ title: 'Failed', variant: 'destructive' }); return; }
    queryClient.invalidateQueries({ queryKey: ['creator-course-edit'] });
    toast({ title: 'Submitted for review! ✓' });
  };

  const checks = [
    { label: 'Title and description added', ok: !!title.trim() && !!shortDesc.trim() },
    { label: 'Thumbnail added', ok: !!thumbnailUrl.trim() },
    { label: 'At least 1 preview module', ok: modules.some(m => m.is_preview) },
    { label: 'At least 3 modules total', ok: modules.length >= 3 },
    { label: 'Price set (₹99+)', ok: priceNum >= 99 },
  ];
  const allChecked = checks.every(c => c.ok);

  const enrollmentUrl = `${window.location.origin}/c/${profile?.creator_slug}/${slug}`;

  return (
    <CreatorDashboardLayout>
      <div className="space-y-6">
        <div className="flex items-center gap-2">
          <Link to="/creator/courses" className="text-muted-foreground hover:text-foreground">
            <ChevronLeft className="h-5 w-5" />
          </Link>
          <h1 className="font-heading text-2xl font-700">{isNew ? 'Create Course' : 'Edit Course'}</h1>
        </div>

        <Tabs defaultValue="basic" className="w-full">
          <TabsList className="w-full justify-start bg-card border border-border rounded-lg p-1 flex-wrap">
            <TabsTrigger value="basic" className="rounded-md text-xs">Basic Info</TabsTrigger>
            <TabsTrigger value="modules" className="rounded-md text-xs">Modules ({modules.length})</TabsTrigger>
            <TabsTrigger value="pricing" className="rounded-md text-xs">Pricing</TabsTrigger>
            <TabsTrigger value="publish" className="rounded-md text-xs">Publish</TabsTrigger>
          </TabsList>

          {/* Basic Info */}
          <TabsContent value="basic" className="mt-4 space-y-4">
            <div className="rounded-xl border border-border bg-card p-6 space-y-4">
              <div>
                <Label>Title *</Label>
                <Input value={title} onChange={e => setTitle(e.target.value)} className="mt-1 rounded-lg" />
              </div>
              <div>
                <Label>Slug *</Label>
                <Input value={slug} onChange={e => setSlug(e.target.value)} className="mt-1 rounded-lg font-mono text-xs" />
              </div>
              <div>
                <Label>Short Description * (max 150)</Label>
                <Textarea value={shortDesc} onChange={e => setShortDesc(e.target.value.slice(0, 150))} className="mt-1 rounded-lg" />
                <p className="mt-1 text-xs text-muted-foreground">{shortDesc.length}/150</p>
              </div>
              <div>
                <Label>Full Description</Label>
                <Textarea value={fullDesc} onChange={e => setFullDesc(e.target.value)} className="mt-1 rounded-lg min-h-[120px]" />
              </div>
              <div className="grid grid-cols-3 gap-3">
                <div>
                  <Label>Category</Label>
                  <Select value={category} onValueChange={setCategory}>
                    <SelectTrigger className="mt-1 rounded-lg"><SelectValue /></SelectTrigger>
                    <SelectContent>{CATEGORIES.map(c => <SelectItem key={c} value={c}>{c}</SelectItem>)}</SelectContent>
                  </Select>
                </div>
                <div>
                  <Label>Language</Label>
                  <Select value={language} onValueChange={setLanguage}>
                    <SelectTrigger className="mt-1 rounded-lg"><SelectValue /></SelectTrigger>
                    <SelectContent>{LANGUAGES.map(l => <SelectItem key={l} value={l}>{l}</SelectItem>)}</SelectContent>
                  </Select>
                </div>
                <div>
                  <Label>Level</Label>
                  <Select value={level} onValueChange={setLevel}>
                    <SelectTrigger className="mt-1 rounded-lg"><SelectValue /></SelectTrigger>
                    <SelectContent>{LEVELS.map(l => <SelectItem key={l} value={l}>{l}</SelectItem>)}</SelectContent>
                  </Select>
                </div>
              </div>
              <div>
                <Label>Thumbnail URL</Label>
                <Input value={thumbnailUrl} onChange={e => setThumbnailUrl(e.target.value)} placeholder="https://..." className="mt-1 rounded-lg" />
              </div>
              <div>
                <Label>Preview Video URL (YouTube embed)</Label>
                <Input value={previewVideoUrl} onChange={e => setPreviewVideoUrl(e.target.value)} placeholder="https://www.youtube.com/embed/..." className="mt-1 rounded-lg" />
              </div>
              <div>
                <Label>What You'll Learn</Label>
                {whatYouLearn.map((item, i) => (
                  <div key={i} className="flex gap-2 mt-1">
                    <Input value={item} onChange={e => { const a = [...whatYouLearn]; a[i] = e.target.value; setWhatYouLearn(a); }} className="rounded-lg" />
                    {whatYouLearn.length > 1 && <Button variant="ghost" size="sm" onClick={() => setWhatYouLearn(whatYouLearn.filter((_, j) => j !== i))}>×</Button>}
                  </div>
                ))}
                {whatYouLearn.length < 8 && <Button variant="ghost" size="sm" onClick={() => setWhatYouLearn([...whatYouLearn, ''])} className="mt-1 text-xs">+ Add</Button>}
              </div>
              <div>
                <Label>Requirements</Label>
                {requirements.map((item, i) => (
                  <div key={i} className="flex gap-2 mt-1">
                    <Input value={item} onChange={e => { const a = [...requirements]; a[i] = e.target.value; setRequirements(a); }} className="rounded-lg" />
                    {requirements.length > 1 && <Button variant="ghost" size="sm" onClick={() => setRequirements(requirements.filter((_, j) => j !== i))}>×</Button>}
                  </div>
                ))}
                {requirements.length < 5 && <Button variant="ghost" size="sm" onClick={() => setRequirements([...requirements, ''])} className="mt-1 text-xs">+ Add</Button>}
              </div>
              <div>
                <Label>Tags (comma separated)</Label>
                <Input value={tags} onChange={e => setTags(e.target.value)} placeholder="editing, capcut, reels" className="mt-1 rounded-lg" />
              </div>
              <Button onClick={saveCourse} disabled={saving} className="rounded-md bg-primary hover:bg-primary/90">
                {saving ? <Loader2 className="h-4 w-4 animate-spin" /> : 'Save'}
              </Button>
            </div>
          </TabsContent>

          {/* Modules */}
          <TabsContent value="modules" className="mt-4 space-y-4">
            <div className="rounded-xl border border-border bg-card p-6">
              <div className="flex items-center justify-between mb-4">
                <h2 className="font-heading text-base font-600">Modules</h2>
                <Dialog open={moduleDialogOpen} onOpenChange={(open) => { setModuleDialogOpen(open); if (!open) resetModuleForm(); }}>
                  <DialogTrigger asChild>
                    <Button size="sm" className="rounded-md" disabled={isNew && !id}><Plus className="h-4 w-4 mr-1" /> Add Module</Button>
                  </DialogTrigger>
                  <DialogContent className="dark bg-card border-border">
                    <DialogHeader><DialogTitle>{editingModule ? 'Edit Module' : 'Add Module'}</DialogTitle></DialogHeader>
                    <div className="space-y-3">
                      <div><Label>Title *</Label><Input value={mTitle} onChange={e => setMTitle(e.target.value)} className="mt-1 rounded-lg" /></div>
                      <div><Label>Description</Label><Textarea value={mDesc} onChange={e => setMDesc(e.target.value)} className="mt-1 rounded-lg" /></div>
                      <div><Label>YouTube Embed URL *</Label><Input value={mVideoUrl} onChange={e => setMVideoUrl(e.target.value)} placeholder="https://www.youtube.com/embed/..." className="mt-1 rounded-lg" /></div>
                      <div><Label>Duration (minutes)</Label><Input type="number" value={mDuration} onChange={e => setMDuration(e.target.value)} className="mt-1 rounded-lg" /></div>
                      <div className="flex items-center gap-2">
                        <Switch checked={mIsPreview} onCheckedChange={setMIsPreview} />
                        <Label>Preview module (watchable without enrollment)</Label>
                      </div>
                      <Button onClick={saveModule} className="w-full rounded-md">{editingModule ? 'Update Module' : 'Add Module'}</Button>
                    </div>
                  </DialogContent>
                </Dialog>
              </div>

              {isNew && !id ? (
                <p className="text-sm text-muted-foreground">Save the course first, then add modules.</p>
              ) : modules.length > 0 ? (
                <div className="space-y-2">
                  {modules.map((m: any, i: number) => (
                    <div key={m.id} className="flex items-center gap-3 rounded-lg border border-border p-3">
                      <GripVertical className="h-4 w-4 shrink-0 text-muted-foreground" />
                      <div className="flex h-7 w-7 shrink-0 items-center justify-center rounded-md bg-primary/10 text-xs font-semibold text-primary">{i + 1}</div>
                      <div className="flex-1 min-w-0">
                        <p className="text-sm font-medium truncate">{m.title}</p>
                        <div className="flex gap-2 text-xs text-muted-foreground">
                          <span>{m.duration_minutes || 0}m</span>
                          {m.is_preview && <span className="text-accent">Preview</span>}
                        </div>
                      </div>
                      <Button variant="ghost" size="sm" onClick={() => openEditModule(m)}>Edit</Button>
                      <Button variant="ghost" size="sm" onClick={() => deleteModule(m.id)} className="text-destructive hover:text-destructive"><Trash2 className="h-4 w-4" /></Button>
                    </div>
                  ))}
                </div>
              ) : (
                <p className="text-sm text-muted-foreground">No modules yet. Add your first module.</p>
              )}
            </div>
          </TabsContent>

          {/* Pricing */}
          <TabsContent value="pricing" className="mt-4 space-y-4">
            <div className="rounded-xl border border-border bg-card p-6 space-y-4">
              {status === 'published' && (
                <div className="flex items-start gap-2 rounded-lg border border-yellow-500/30 bg-yellow-500/5 p-3">
                  <AlertTriangle className="h-4 w-4 text-yellow-500 shrink-0 mt-0.5" />
                  <p className="text-xs text-yellow-400">This course is live. Changing the price or commission will set status back to pending review for admin approval.</p>
                </div>
              )}

              <div className="rounded-lg border border-border bg-secondary/30 p-3">
                <p className="text-xs text-muted-foreground">Platform Fee: <span className="font-semibold text-foreground">{platformFeePercent}%</span> (set by Backupshala)</p>
              </div>

              <div>
                <Label>Price (₹)</Label>
                <Input type="number" value={price} onChange={e => setPrice(e.target.value)} min={99} max={9999} className="mt-1 rounded-lg" />
                {(priceNum < 99 || priceNum > 9999) && priceNum > 0 && (
                  <p className="mt-1 text-xs text-destructive">Price must be ₹99–₹9,999</p>
                )}
              </div>
              <div>
                <div className="flex items-center justify-between">
                  <Label>Referral Commission: {commissionPercent}%</Label>
                  <span className="text-xs text-muted-foreground">Referrer earns {formatPrice(Math.round(priceNum * (commissionPercent / 100)))} per enrollment</span>
                </div>
                <input type="range" min={0} max={maxCommission} value={commissionPercent} onChange={e => setCommissionPercent(Number(e.target.value))} className="mt-2 w-full accent-primary" />
                <div className="flex justify-between text-xs text-muted-foreground"><span>0%</span><span>{maxCommission}%</span></div>
              </div>
              {priceNum >= 99 && priceNum <= 9999 && (
                <PriceBreakdown price={priceNum} platformFeePercent={platformFeePercent} commissionPercent={commissionPercent} />
              )}
              <Button onClick={saveCourse} disabled={saving} className="rounded-md bg-primary hover:bg-primary/90">
                {saving ? <Loader2 className="h-4 w-4 animate-spin" /> : 'Save'}
              </Button>
            </div>
          </TabsContent>

          {/* Publish */}
          <TabsContent value="publish" className="mt-4 space-y-4">
            <div className="rounded-xl border border-border bg-card p-6 space-y-4">
              <h2 className="font-heading text-base font-600">Publish Checklist</h2>
              <div className="space-y-2">
                {checks.map((c, i) => (
                  <div key={i} className="flex items-center gap-2">
                    <div className={`flex h-5 w-5 items-center justify-center rounded-full ${c.ok ? 'bg-primary/20 text-primary' : 'bg-secondary text-muted-foreground'}`}>
                      {c.ok ? <Check className="h-3 w-3" /> : <span className="text-[10px]">✗</span>}
                    </div>
                    <span className={`text-sm ${c.ok ? '' : 'text-muted-foreground'}`}>{c.label}</span>
                  </div>
                ))}
              </div>

              <div className="border-t border-border pt-4">
                <p className="text-sm">Status: <span className="font-semibold">{status.replace('_', ' ')}</span></p>
              </div>

              {status === 'draft' && (
                <Button onClick={submitForReview} disabled={!allChecked} className="rounded-md bg-accent hover:bg-accent/90 text-accent-foreground font-semibold">
                  Submit for Review
                </Button>
              )}

              {status === 'published' && (
                <div className="space-y-2">
                  <p className="text-xs text-muted-foreground">Enrollment Link:</p>
                  <div className="flex items-center gap-2">
                    <div className="flex-1 rounded-lg border border-primary/30 bg-primary/5 px-3 py-2 font-mono text-xs text-primary truncate">{enrollmentUrl}</div>
                    <Button variant="outline" size="sm" onClick={() => { navigator.clipboard.writeText(enrollmentUrl); setLinkCopied(true); setTimeout(() => setLinkCopied(false), 2000); }}>
                      {linkCopied ? <Check className="h-4 w-4 text-primary" /> : <Copy className="h-4 w-4" />}
                    </Button>
                  </div>
                </div>
              )}
            </div>
          </TabsContent>
        </Tabs>
      </div>
    </CreatorDashboardLayout>
  );
};

export default CourseBuilder;
