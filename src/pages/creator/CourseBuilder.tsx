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
import TierSelector from '@/components/course/TierSelector';
import { getCommissionConfig, type CourseTier } from '@/lib/tierPricing';
import { useState, useEffect } from 'react';
import { Loader2, Plus, Trash2, GripVertical, Check, Copy, ChevronLeft, AlertTriangle, Play, BookOpen, Users2, Link2, FolderOpen, Info, Lock, Star, Zap } from 'lucide-react';
import { formatPrice } from '@/lib/format';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger, DialogFooter } from '@/components/ui/dialog';
import GateSettingsForm from '@/components/module/GateSettingsForm';

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
  const { data: platformSettings, getSetting: getPlatSetting } = usePlatformSettings();
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
  const [courseTier, setCourseTier] = useState<CourseTier | null>(null);
  const [price, setPrice] = useState('249');
  const [originalPrice, setOriginalPrice] = useState('');
  const [showOriginalPrice, setShowOriginalPrice] = useState(false);
  const [commissionPercent, setCommissionPercent] = useState(70);
  const [status, setStatus] = useState('draft');

  // Video settings kept in DB but hidden from UI — managed by platform
  const [vsSpeedControl] = useState<boolean | null>(null);
  const [vsForwardSeeking] = useState<boolean | null>(null);
  const [vsWatermark] = useState<boolean | null>(null);
  const [vsWatchPercent] = useState<number | null>(null);

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
  const [mVideoSource, setMVideoSource] = useState<'youtube' | 'gallery'>('youtube');

  // Gate settings state (per-module, edited in gate tab)
  const [gateModuleId, setGateModuleId] = useState<string | null>(null);
  const [gsSequential, setGsSequential] = useState(false);
  const [gsAudioNote, setGsAudioNote] = useState(false);
  const [gsAudioLabel, setGsAudioLabel] = useState('Message from your mentor');
  const [gsAudioPosition, setGsAudioPosition] = useState('before');
  const [gsMentorGate, setGsMentorGate] = useState(false);
  const [gsMentorMessage, setGsMentorMessage] = useState('');
  const [gsContactType, setGsContactType] = useState('whatsapp');
  const [gsZoomLink, setGsZoomLink] = useState('');
  const [savingGate, setSavingGate] = useState(false);

  const { data: proSub } = useQuery({
    queryKey: ['creator-pro-sub', user?.id],
    queryFn: async () => {
      const { data } = await supabase
        .from('creator_pro_subscriptions')
        .select('plan, status')
        .eq('creator_id', user!.id)
        .maybeSingle();
      return data;
    },
    enabled: !!user,
    staleTime: 5 * 60 * 1000,
  });

  const isPro = profile?.is_admin || (!!proSub && (proSub.plan === 'pro' || proSub.plan === 'trial') && proSub.status === 'active');

  const { data: gateSettings } = useQuery({
    queryKey: ['gate-settings', id],
    queryFn: async () => {
      const { data } = await supabase
        .from('module_gate_settings')
        .select('*')
        .eq('course_id', id!);
      return data || [];
    },
    enabled: !!id && isPro,
  });

  const loadGateForModule = (moduleId: string) => {
    setGateModuleId(moduleId);
    const existing = gateSettings?.find((g: any) => g.module_id === moduleId);
    if (existing) {
      setGsSequential(existing.is_sequential);
      setGsAudioNote(existing.has_audio_note);
      setGsAudioLabel(existing.audio_note_label || 'Message from your mentor');
      setGsAudioPosition(existing.audio_note_position || 'before');
      setGsMentorGate(existing.has_mentor_gate);
      setGsMentorMessage(existing.mentor_gate_message || '');
      setGsContactType(existing.mentor_contact_type || 'whatsapp');
      setGsZoomLink(existing.zoom_link || '');
    } else {
      setGsSequential(false); setGsAudioNote(false); setGsAudioLabel('Message from your mentor');
      setGsAudioPosition('before'); setGsMentorGate(false); setGsMentorMessage('');
      setGsContactType('whatsapp'); setGsZoomLink('');
    }
  };

  const saveGateSettings = async () => {
    if (!gateModuleId || !id) return;
    setSavingGate(true);
    try {
      const gateData = {
        module_id: gateModuleId,
        course_id: id,
        creator_id: user!.id,
        is_sequential: gsSequential,
        has_audio_note: gsAudioNote,
        audio_note_label: gsAudioLabel,
        audio_note_position: gsAudioPosition,
        has_mentor_gate: gsMentorGate,
        mentor_gate_message: gsMentorMessage,
        mentor_contact_type: gsContactType,
        zoom_link: gsContactType === 'zoom' ? gsZoomLink : null,
        updated_at: new Date().toISOString(),
      };

      await supabase.from('module_gate_settings').upsert(gateData, { onConflict: 'module_id' });

      // Update module is_gated flag
      const gateType = gsMentorGate && gsSequential ? 'both' : gsMentorGate ? 'mentor' : gsSequential ? 'sequential' : null;
      await supabase.from('modules').update({
        is_gated: gsSequential || gsMentorGate,
        gate_type: gateType,
      }).eq('id', gateModuleId);

      queryClient.invalidateQueries({ queryKey: ['gate-settings', id] });
      queryClient.invalidateQueries({ queryKey: ['creator-course-edit', id] });
      toast({ title: 'Gate settings saved ✓' });
    } catch (err: any) {
      toast({ title: 'Failed to save gate settings', variant: 'destructive' });
    } finally {
      setSavingGate(false);
    }
  };

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
      setCourseTier((course as any).course_tier ?? null);
      setPrice(String(course.price));
      const op = (course as any).original_price;
      if (op != null) {
        setShowOriginalPrice(true);
        setOriginalPrice(String(op));
      }
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
        allow_speed_control: vsSpeedControl,
        allow_forward_seeking: vsForwardSeeking,
        video_watermark_enabled: vsWatermark,
        min_watch_percentage_to_complete: vsWatchPercent,
      };

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
    setMModuleType('video'); setMResources([]); setMVideoSource('youtube');
  };

  const openEditModule = (m: any) => {
    setEditingModule(m);
    setMTitle(m.title); setMDesc(m.description || ''); setMVideoUrl(m.video_url || '');
    setMDuration(String(m.duration_minutes || '')); setMIsPreview(m.is_preview || false);
    setMModuleType(m.module_type || 'video'); setMResources(m.resources || []);
    setMVideoSource(m.video_url?.includes('youtube') ? 'youtube' : 'youtube');
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

  const moduleTypeCards = [
    { value: 'video' as const, label: 'Video Lesson', desc: 'Add a video for students to watch', icon: Play, emoji: '▶️' },
    { value: 'resource' as const, label: 'Resource Library', desc: 'Curated links & YouTube resources', icon: BookOpen, emoji: '📚' },
    { value: 'community' as const, label: 'Community Module', desc: 'Community & Telegram access', icon: Users2, emoji: '👥' },
  ];

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
            <TabsTrigger value="video-settings" className="rounded-md text-xs">Playback</TabsTrigger>
            <TabsTrigger value="gate-settings" className="rounded-md text-xs">🔒 Gate Settings</TabsTrigger>
            <TabsTrigger value="publish" className="rounded-md text-xs">Publish</TabsTrigger>
          </TabsList>

          {/* Basic Info */}
          <TabsContent value="basic" className="mt-4 space-y-4">
            <div className="rounded-xl border border-border bg-card p-6 space-y-4">
              <div>
                <Label>Title * <span className="text-muted-foreground font-normal">({title.length}/100)</span></Label>
                <Input value={title} onChange={e => setTitle(e.target.value.slice(0, 100))} className="mt-1 rounded-lg" />
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
                <Label>Full Description <span className="text-muted-foreground font-normal">({fullDesc.length}/500)</span></Label>
                <Textarea value={fullDesc} onChange={e => setFullDesc(e.target.value.slice(0, 500))} className="mt-1 rounded-lg min-h-[120px]" />
              </div>
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
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

          {/* Modules — Redesigned */}
          <TabsContent value="modules" className="mt-4 space-y-4">
            <div className="rounded-xl border border-border bg-card p-6">
              <div className="flex items-center justify-between mb-6">
                <h2 className="font-heading text-lg font-600">Modules ({modules.length})</h2>
                <Dialog open={moduleDialogOpen} onOpenChange={(open) => { setModuleDialogOpen(open); if (!open) resetModuleForm(); }}>
                  <DialogTrigger asChild>
                    <Button size="sm" className="rounded-lg bg-accent hover:bg-accent/90 text-accent-foreground" disabled={isNew && !id}>
                      <Plus className="h-4 w-4 mr-1" /> Add Module
                    </Button>
                  </DialogTrigger>
                  <DialogContent className="bg-card border-border max-w-xl max-h-[90vh] overflow-y-auto">
                    <DialogHeader>
                      <DialogTitle className="font-heading text-lg">{editingModule ? 'Edit Module' : 'Add Module'}</DialogTitle>
                    </DialogHeader>

                    <div className="space-y-5">
                      {/* Module Type — Visual Cards */}
                      <div>
                        <p className="text-xs font-semibold uppercase tracking-wider text-muted-foreground mb-3">What type of module is this?</p>
                        <div className="grid grid-cols-3 gap-3">
                          {moduleTypeCards.map(t => (
                            <button key={t.value} onClick={() => setMModuleType(t.value)}
                              className={`group flex flex-col items-center gap-2 rounded-xl border-2 p-4 text-center transition-all ${
                                mModuleType === t.value
                                  ? 'border-accent bg-accent/5 shadow-sm shadow-accent/10'
                                  : 'border-border hover:border-muted-foreground/30'
                              }`}>
                              <span className="text-2xl">{t.emoji}</span>
                              <span className={`text-xs font-semibold font-heading ${mModuleType === t.value ? 'text-accent' : 'text-foreground'}`}>{t.label}</span>
                              <span className="text-[10px] text-muted-foreground leading-tight">{t.desc}</span>
                            </button>
                          ))}
                        </div>
                      </div>

                      {/* Title */}
                      <div>
                        <p className="text-xs font-semibold uppercase tracking-wider text-muted-foreground mb-1.5">📝 Module Title</p>
                        <Input
                          value={mTitle} onChange={e => setMTitle(e.target.value)}
                          placeholder={mModuleType === 'video' ? 'e.g. "How Instagram Algorithm Works"' : mModuleType === 'resource' ? 'e.g. "Best Video Editing Resources"' : 'e.g. "Join Our Community"'}
                          className="rounded-lg"
                        />
                      </div>

                      {/* Video Lesson Fields */}
                      {mModuleType === 'video' && (
                        <>
                          <div>
                            <p className="text-xs font-semibold uppercase tracking-wider text-muted-foreground mb-1.5">🎬 Video Source</p>
                            <p className="text-xs text-muted-foreground mb-3">How do you want to add the video?</p>
                            <div className="grid grid-cols-2 gap-3">
                              <button onClick={() => setMVideoSource('gallery')}
                                className={`flex flex-col items-center gap-1.5 rounded-xl border-2 p-4 transition-all ${mVideoSource === 'gallery' ? 'border-accent bg-accent/5' : 'border-border hover:border-muted-foreground/30'}`}>
                                <FolderOpen className={`h-5 w-5 ${mVideoSource === 'gallery' ? 'text-accent' : 'text-muted-foreground'}`} />
                                <span className="text-xs font-semibold">From Video Gallery</span>
                                <span className="text-[10px] text-muted-foreground">Pick an uploaded video</span>
                              </button>
                              <button onClick={() => setMVideoSource('youtube')}
                                className={`flex flex-col items-center gap-1.5 rounded-xl border-2 p-4 transition-all ${mVideoSource === 'youtube' ? 'border-accent bg-accent/5' : 'border-border hover:border-muted-foreground/30'}`}>
                                <Link2 className={`h-5 w-5 ${mVideoSource === 'youtube' ? 'text-accent' : 'text-muted-foreground'}`} />
                                <span className="text-xs font-semibold">YouTube Embed URL</span>
                                <span className="text-[10px] text-muted-foreground">Paste a YouTube embed URL</span>
                              </button>
                            </div>
                          </div>

                          {mVideoSource === 'youtube' && (
                            <div>
                              <p className="text-xs font-semibold uppercase tracking-wider text-muted-foreground mb-1.5">🔗 YouTube Embed URL</p>
                              <Input
                                value={mVideoUrl} onChange={e => setMVideoUrl(e.target.value)}
                                placeholder="https://www.youtube.com/embed/VIDEO_ID_HERE"
                                className="rounded-lg font-mono text-xs"
                              />
                              <div className="mt-3 rounded-lg bg-secondary/50 border border-border p-3 space-y-1.5">
                                <p className="text-xs font-semibold text-muted-foreground flex items-center gap-1.5">
                                  <Info className="h-3 w-3" /> How to get this URL:
                                </p>
                                <ol className="text-[11px] text-muted-foreground space-y-0.5 pl-4 list-decimal">
                                  <li>Open your YouTube video</li>
                                  <li>Click <span className="font-medium text-foreground">Share → Embed</span></li>
                                  <li>Copy the URL from <code className="text-[10px] bg-secondary px-1 rounded">src="..."</code> — starts with <code className="text-[10px] bg-secondary px-1 rounded">https://www.youtube.com/embed/</code></li>
                                  <li>Paste it above</li>
                                </ol>
                                <p className="text-[11px] text-accent flex items-center gap-1 mt-1">
                                  <AlertTriangle className="h-3 w-3" /> Make sure your video is set to <span className="font-semibold">Unlisted</span> on YouTube
                                </p>
                              </div>
                            </div>
                          )}

                          {mVideoSource === 'gallery' && (
                            <div className="rounded-lg border border-dashed border-border p-6 text-center">
                              <FolderOpen className="h-8 w-8 mx-auto text-muted-foreground/40 mb-2" />
                              <p className="text-xs text-muted-foreground">Video gallery picker coming soon.</p>
                              <p className="text-[10px] text-muted-foreground mt-1">For now, use YouTube Embed URL.</p>
                            </div>
                          )}
                        </>
                      )}

                      {/* Resource Library Fields */}
                      {mModuleType === 'resource' && (
                        <div className="space-y-3">
                          <div className="flex items-center justify-between">
                            <p className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">🔗 Resources ({mResources.length}/20)</p>
                            {mResources.length < 20 && (
                              <Button variant="ghost" size="sm" className="text-accent hover:text-accent text-xs"
                                onClick={() => setMResources([...mResources, { id: crypto.randomUUID(), title: '', url: '', type: 'youtube', description: '' }])}>
                                <Plus className="h-3 w-3 mr-1" /> Add Resource
                              </Button>
                            )}
                          </div>
                          <p className="text-[11px] text-muted-foreground -mt-1">Add YouTube videos, podcasts, articles, or tools</p>
                          {mResources.map((r: any, i: number) => (
                            <div key={r.id} className="rounded-lg border border-border p-3 space-y-2">
                              <div className="flex items-center justify-between mb-1">
                                <span className="text-[10px] font-semibold text-muted-foreground">Resource {i + 1}</span>
                                <Button variant="ghost" size="sm" onClick={() => setMResources(mResources.filter((_: any, j: number) => j !== i))} className="text-destructive h-6 w-6 p-0">
                                  <Trash2 className="h-3 w-3" />
                                </Button>
                              </div>
                              <Input value={r.title} onChange={e => { const a = [...mResources]; a[i] = { ...a[i], title: e.target.value }; setMResources(a); }} placeholder="Title" className="rounded-lg text-xs" />
                              <Input value={r.url} onChange={e => { const a = [...mResources]; a[i] = { ...a[i], url: e.target.value }; setMResources(a); }} placeholder="URL" className="rounded-lg text-xs" />
                              <div className="flex gap-2">
                                {['youtube', 'podcast', 'article', 'tool'].map(type => (
                                  <button key={type} onClick={() => { const a = [...mResources]; a[i] = { ...a[i], type }; setMResources(a); }}
                                    className={`rounded-full px-3 py-1 text-[10px] font-medium transition-colors ${r.type === type ? 'bg-accent/10 text-accent' : 'bg-secondary text-muted-foreground hover:text-foreground'}`}>
                                    {type.charAt(0).toUpperCase() + type.slice(1)}
                                  </button>
                                ))}
                              </div>
                            </div>
                          ))}
                          {mResources.length === 0 && (
                            <div className="rounded-lg border border-dashed border-border p-4 text-center">
                              <p className="text-xs text-muted-foreground">No resources yet. Click "Add Resource" above.</p>
                            </div>
                          )}
                        </div>
                      )}

                      {/* Community Module Fields */}
                      {mModuleType === 'community' && (
                        <div className="space-y-3">
                          <p className="text-[11px] text-muted-foreground">Leave empty to use platform default community links</p>
                          {[
                            { label: '📱 Telegram Group Link', key: 'telegram', placeholder: 'https://t.me/...' },
                            { label: '💬 WhatsApp Community Link', key: 'whatsapp', placeholder: 'https://chat.whatsapp.com/...' },
                            { label: '🎮 Discord Link', key: 'discord', placeholder: 'https://discord.gg/...' },
                          ].map(cl => {
                            const existing = mResources.find((r: any) => r.title?.toLowerCase().includes(cl.key));
                            return (
                              <div key={cl.key}>
                                <p className="text-xs font-semibold text-muted-foreground mb-1">{cl.label} <span className="font-normal">(optional)</span></p>
                                <Input
                                  value={existing?.url || ''}
                                  onChange={e => {
                                    const filtered = mResources.filter((r: any) => !r.title?.toLowerCase().includes(cl.key));
                                    if (e.target.value) {
                                      filtered.push({ id: crypto.randomUUID(), title: `${cl.label}`, url: e.target.value, type: 'community_link', description: '' });
                                    }
                                    setMResources(filtered);
                                  }}
                                  placeholder={cl.placeholder}
                                  className="rounded-lg text-xs"
                                />
                              </div>
                            );
                          })}
                          <div>
                            <p className="text-xs font-semibold text-muted-foreground mb-1">📝 Custom Message <span className="font-normal">(optional)</span></p>
                            <Textarea
                              value={mDesc} onChange={e => setMDesc(e.target.value)}
                              placeholder="Tell students what they'll find in this community..."
                              className="rounded-lg text-xs min-h-[60px]"
                            />
                          </div>
                        </div>
                      )}

                      {/* Description — for video & resource only */}
                      {mModuleType !== 'community' && (
                        <div>
                          <p className="text-xs font-semibold uppercase tracking-wider text-muted-foreground mb-1.5">📝 Description <span className="font-normal normal-case">(optional)</span></p>
                          <Textarea
                            value={mDesc} onChange={e => setMDesc(e.target.value)}
                            placeholder="What will students learn in this module?"
                            className="rounded-lg text-xs min-h-[60px]"
                          />
                        </div>
                      )}

                      {/* Duration — for video only */}
                      {mModuleType === 'video' && (
                        <div>
                          <p className="text-xs font-semibold uppercase tracking-wider text-muted-foreground mb-1.5">⏱️ Duration (minutes)</p>
                          <Input type="number" value={mDuration} onChange={e => setMDuration(e.target.value)} placeholder="0" className="rounded-lg w-32" />
                        </div>
                      )}

                      {/* Preview Toggle */}
                      <div className="flex items-center gap-3 rounded-lg bg-secondary/30 p-3">
                        <Switch checked={mIsPreview} onCheckedChange={setMIsPreview} />
                        <div>
                          <p className="text-xs font-semibold">👁️ Preview Module</p>
                          <p className="text-[10px] text-muted-foreground">Allow non-enrolled users to view this module</p>
                        </div>
                      </div>

                      {/* Action Buttons */}
                      <div className="flex gap-3 pt-2">
                        <Button variant="outline" className="flex-1 rounded-lg" onClick={() => { setModuleDialogOpen(false); resetModuleForm(); }}>
                          Cancel
                        </Button>
                        <Button onClick={saveModule} className="flex-1 rounded-lg bg-accent hover:bg-accent/90 text-accent-foreground font-semibold">
                          {editingModule ? 'Update Module' : 'Add Module'} ✓
                        </Button>
                      </div>
                    </div>
                  </DialogContent>
                </Dialog>
              </div>

              {isNew && !id ? (
                <div className="rounded-xl border border-dashed border-border p-8 text-center">
                  <BookOpen className="h-10 w-10 mx-auto text-muted-foreground/30 mb-3" />
                  <p className="text-sm font-medium text-muted-foreground">Save the course first</p>
                  <p className="text-xs text-muted-foreground mt-1">Then add modules here.</p>
                </div>
              ) : modules.length > 0 ? (
                <div className="space-y-2">
                  {modules.map((m: any, i: number) => (
                    <div key={m.id} className="flex items-center gap-3 rounded-xl border border-border bg-secondary/20 p-3 hover:border-accent/20 transition-colors">
                      <GripVertical className="h-4 w-4 shrink-0 text-muted-foreground/40 cursor-grab" />
                      <div className="flex h-7 w-7 shrink-0 items-center justify-center rounded-lg bg-accent/10 text-xs font-bold text-accent">{i + 1}</div>
                      <span className="text-base">
                        {m.module_type === 'resource' ? '📚' : m.module_type === 'community' ? '👥' : '▶️'}
                      </span>
                      <div className="flex-1 min-w-0">
                        <p className="text-sm font-medium truncate">{m.title}</p>
                        <div className="flex gap-2 text-xs text-muted-foreground">
                          <span>{m.module_type === 'resource' ? 'Resource Library' : m.module_type === 'community' ? 'Community Module' : `Video Lesson`}</span>
                          {m.module_type === 'video' && m.duration_minutes > 0 && <span>· {m.duration_minutes}m</span>}
                          {m.is_preview && <span className="text-accent font-medium">· 👁 Preview</span>}
                        </div>
                      </div>
                      <Button variant="ghost" size="sm" onClick={() => openEditModule(m)} className="text-xs">✏️</Button>
                      <Button variant="ghost" size="sm" onClick={() => deleteModule(m.id)} className="text-destructive hover:text-destructive text-xs">🗑</Button>
                    </div>
                  ))}
                </div>
              ) : (
                <div className="rounded-xl border border-dashed border-border p-8 text-center">
                  <Play className="h-10 w-10 mx-auto text-muted-foreground/30 mb-3" />
                  <p className="text-sm font-medium text-muted-foreground">No modules yet</p>
                  <p className="text-xs text-muted-foreground mt-1">Add your first module to get started.</p>
                </div>
              )}
            </div>
          </TabsContent>

          {/* Pricing */}
          <TabsContent value="pricing" className="mt-4 space-y-4">
            <div className="rounded-xl border border-border bg-card p-6 space-y-4">
              {status === 'published' && (
                <div className="flex items-start gap-2 rounded-lg border border-accent/30 bg-accent/5 p-3">
                  <AlertTriangle className="h-4 w-4 text-accent shrink-0 mt-0.5" />
                  <p className="text-xs text-accent">This course is live. Changing the price or commission will set status back to pending review for admin approval.</p>
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
                <input type="range" min={0} max={maxCommission} value={commissionPercent} onChange={e => setCommissionPercent(Number(e.target.value))} className="mt-2 w-full accent-accent" />
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

          {/* Video Playback Info */}
          <TabsContent value="video-settings" className="mt-4 space-y-4">
            <div className="rounded-xl border border-border/60 bg-card p-6 shadow-warm space-y-4">
              <div>
                <h2 className="font-heading text-base font-600 flex items-center gap-2">
                  <Play className="h-4 w-4 text-primary" /> Video Playback
                </h2>
                <p className="text-sm text-muted-foreground mt-2">
                  Video playback is managed by our secure player. All videos are streamed through Backupshala's protected infrastructure to prevent unauthorized downloads and sharing.
                </p>
              </div>
              <div className="rounded-lg bg-secondary/50 p-4 space-y-2">
                <div className="flex items-start gap-2">
                  <Info className="h-4 w-4 text-primary mt-0.5 shrink-0" />
                  <p className="text-sm text-muted-foreground">Videos are served through our secure CDN with encryption in transit.</p>
                </div>
                <div className="flex items-start gap-2">
                  <Info className="h-4 w-4 text-primary mt-0.5 shrink-0" />
                  <p className="text-sm text-muted-foreground">Student progress is tracked automatically based on watch time.</p>
                </div>
                <div className="flex items-start gap-2">
                  <Info className="h-4 w-4 text-primary mt-0.5 shrink-0" />
                  <p className="text-sm text-muted-foreground">Use Gate Settings (Creator Pro) for sequential locking and mentor approval flows.</p>
                </div>
              </div>
            </div>
          </TabsContent>

          {/* Gate Settings */}
          <TabsContent value="gate-settings" className="mt-4 space-y-4">
            {!isNew && modules.length > 0 ? (
              <div className="space-y-4">
                <div className="rounded-xl border border-border bg-card p-4">
                  <p className="text-xs font-semibold uppercase tracking-wider text-muted-foreground mb-3">Select a module to configure gates</p>
                  <div className="space-y-2">
                    {modules.map((m: any, i: number) => {
                      const hasGate = gateSettings?.some((g: any) => g.module_id === m.id);
                      return (
                        <button
                          key={m.id}
                          onClick={() => loadGateForModule(m.id)}
                          className={`w-full flex items-center gap-3 rounded-lg border p-3 text-left transition-all ${
                            gateModuleId === m.id
                              ? 'border-accent bg-accent/5'
                              : 'border-border hover:border-muted-foreground/30'
                          }`}
                        >
                          <span className="flex h-7 w-7 shrink-0 items-center justify-center rounded-lg bg-accent/10 text-xs font-bold text-accent">{i + 1}</span>
                          <div className="flex-1 min-w-0">
                            <p className="text-sm font-medium truncate">{m.title}</p>
                            <p className="text-xs text-muted-foreground">
                              {i === 0 ? 'First module (always unlocked)' : hasGate ? '🔒 Has gate settings' : 'No gate'}
                            </p>
                          </div>
                          {hasGate && <Lock className="h-4 w-4 text-accent shrink-0" />}
                        </button>
                      );
                    })}
                  </div>
                </div>

                {gateModuleId && modules.findIndex((m: any) => m.id === gateModuleId) === 0 ? (
                  <div className="rounded-xl border border-border bg-card p-6 text-center">
                    <p className="text-sm text-muted-foreground">The first module is always accessible — no gate settings needed.</p>
                  </div>
                ) : gateModuleId ? (
                  <div className="space-y-4">
                    <GateSettingsForm
                      isPro={isPro}
                      isSequential={gsSequential} setIsSequential={setGsSequential}
                      hasAudioNote={gsAudioNote} setHasAudioNote={setGsAudioNote}
                      audioNoteLabel={gsAudioLabel} setAudioNoteLabel={setGsAudioLabel}
                      audioNotePosition={gsAudioPosition} setAudioNotePosition={setGsAudioPosition}
                      hasMentorGate={gsMentorGate} setHasMentorGate={setGsMentorGate}
                      mentorGateMessage={gsMentorMessage} setMentorGateMessage={setGsMentorMessage}
                      mentorContactType={gsContactType} setMentorContactType={setGsContactType}
                      zoomLink={gsZoomLink} setZoomLink={setGsZoomLink}
                    />
                    {isPro && (
                      <Button onClick={saveGateSettings} disabled={savingGate} className="rounded-md bg-primary hover:bg-primary/90">
                        {savingGate ? <Loader2 className="h-4 w-4 animate-spin" /> : 'Save Gate Settings'}
                      </Button>
                    )}
                  </div>
                ) : null}
              </div>
            ) : (
              <div className="rounded-xl border border-dashed border-border p-8 text-center">
                <Lock className="h-10 w-10 mx-auto text-muted-foreground/30 mb-3" />
                <p className="text-sm font-medium text-muted-foreground">Save the course and add modules first</p>
                <p className="text-xs text-muted-foreground mt-1">Then configure gate settings per module.</p>
              </div>
            )}
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
                <p className="text-sm">Status: <span className="font-semibold">{(status || 'draft').replace('_', ' ')}</span></p>
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
                    <div className="flex-1 rounded-lg border border-accent/30 bg-accent/5 px-3 py-2 font-mono text-xs text-accent truncate">{enrollmentUrl}</div>
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
