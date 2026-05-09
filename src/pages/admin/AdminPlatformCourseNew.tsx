import AdminDashboardLayout from '@/components/dashboard/AdminDashboardLayout';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { useState } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { toast } from 'sonner';
import { Trophy, Loader2 } from 'lucide-react';

const CATEGORIES = ['Digital Skills', 'Video Editing', 'Content Creation', 'Personal Branding', 'Sales & Communication', 'Freelancing', 'Business Skills', 'Digital Marketing', 'Other'];
const LEVELS = ['Beginner', 'Intermediate', 'Advanced'];

const slugify = (t: string) =>
  t.toLowerCase().replace(/[^a-z0-9\s-]/g, '').replace(/\s+/g, '-').replace(/-+/g, '-').replace(/^-+|-+$/g, '').trim();

import { usePlatformSettings } from '@/hooks/usePlatformSettings';

type CourseLevel = 'basic' | 'advanced' | 'premium' | 'creator';

const AdminPlatformCourseNew = () => {
  const { user } = useAuth();
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const presetTier = (searchParams.get('tier') as CourseLevel | null) ?? null;
  const { data: settings, getSetting } = usePlatformSettings();
  const [title, setTitle] = useState('');
  const [slug, setSlug] = useState('');
  const [shortDesc, setShortDesc] = useState('');
  const [category, setCategory] = useState('Digital Skills');
  const [level, setLevel] = useState('Beginner');
  const initialTier: CourseLevel = presetTier && ['basic', 'advanced', 'premium', 'creator'].includes(presetTier) ? presetTier : 'basic';
  const tierPriceMap: Record<string, number> = {
    basic: settings?.basic_price ?? 449,
    advanced: settings?.advanced_price ?? 4449,
    premium: Number(getSetting('premium_price', '9999')) || 9999,
    creator: 449,
  };
  const [price, setPrice] = useState(String(tierPriceMap[initialTier]));
  const [courseLevel, setCourseLevel] = useState<CourseLevel>(initialTier);
  const [saving, setSaving] = useState(false);

  const onTitleChange = (v: string) => {
    setTitle(v);
    if (!slug) setSlug(slugify(v));
  };

  const create = async () => {
    if (!title.trim() || !shortDesc.trim() || !slug.trim()) {
      toast.error('Fill in title, slug, and description');
      return;
    }
    const priceNum = Number(price);
    if (!Number.isFinite(priceNum) || priceNum < 1) {
      toast.error('Enter a valid price');
      return;
    }
    setSaving(true);
    try {
      const { data, error } = await supabase.from('courses').insert({
        creator_id: user!.id,
        title: title.trim(),
        slug: slug.trim(),
        short_description: shortDesc.trim(),
        category,
        level,
        language: 'English',
        price: priceNum,
        base_price: priceNum,
        display_price: priceNum,
        commission_percent: 0,
        platform_fee_percent: 0,
        is_platform_course: true,
        course_level: courseLevel,
        status: 'draft',
      }).select('id').single();
      if (error) throw error;

      // Wire to platform_settings so the rest of the platform finds this course
      const settingKeyMap: Record<string, string> = {
        basic: 'basic_course_id',
        advanced: 'advanced_course_id',
        premium: 'premium_course_id',
      };
      const settingKey = settingKeyMap[courseLevel];
      if (settingKey) {
        await supabase.from('platform_settings').upsert(
          { key: settingKey, value: data.id },
          { onConflict: 'key' }
        );
      }

      toast.success('Platform course created — add modules next');
      navigate(`/creator/courses/${data.id}/edit`);
    } catch (e: any) {
      toast.error(e.message || 'Failed to create');
    } finally {
      setSaving(false);
    }
  };

  return (
    <AdminDashboardLayout>
      <div className="max-w-2xl space-y-6">
        <div>
          <h1 className="font-heading text-2xl font-bold flex items-center gap-2">
            <Trophy className="h-6 w-6 text-accent" /> Create Platform Course
          </h1>
          <p className="text-sm text-muted-foreground mt-1">
            Backupshala-owned course. 100% revenue retained — no creator commission, no referral commission.
          </p>
        </div>

        <Card className="bg-card border-border">
          <CardHeader><CardTitle className="text-base">Basic Info</CardTitle></CardHeader>
          <CardContent className="space-y-4">
            <div>
              <Label>Title *</Label>
              <Input value={title} onChange={e => onTitleChange(e.target.value)} placeholder="e.g. Backupshala Pro Bundle" className="mt-1" />
            </div>
            <div>
              <Label>Slug *</Label>
              <Input value={slug} onChange={e => setSlug(e.target.value)} className="mt-1 font-mono text-xs" />
            </div>
            <div>
              <Label>Short Description *</Label>
              <Textarea value={shortDesc} onChange={e => setShortDesc(e.target.value.slice(0, 150))} className="mt-1" />
              <p className="text-xs text-muted-foreground mt-1">{shortDesc.length}/150</p>
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div>
                <Label>Category</Label>
                <Select value={category} onValueChange={setCategory}>
                  <SelectTrigger className="mt-1"><SelectValue /></SelectTrigger>
                  <SelectContent>{CATEGORIES.map(c => <SelectItem key={c} value={c}>{c}</SelectItem>)}</SelectContent>
                </Select>
              </div>
              <div>
                <Label>Level</Label>
                <Select value={level} onValueChange={setLevel}>
                  <SelectTrigger className="mt-1"><SelectValue /></SelectTrigger>
                  <SelectContent>{LEVELS.map(l => <SelectItem key={l} value={l}>{l}</SelectItem>)}</SelectContent>
                </Select>
              </div>
            </div>
            <div>
              <Label>Course Level *</Label>
              {presetTier ? (
                <div className="mt-1 flex items-center gap-2">
                  <span className="inline-flex items-center rounded-md border border-border bg-muted px-2.5 py-1 text-sm capitalize">
                    {courseLevel} Tier
                  </span>
                  <span className="text-xs text-muted-foreground">(set from tier card)</span>
                </div>
              ) : (
                <Select value={courseLevel} onValueChange={(v: CourseLevel) => setCourseLevel(v)}>
                  <SelectTrigger className="mt-1"><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="basic">Basic (Standard Bundle)</SelectItem>
                    <SelectItem value="advanced">Advanced</SelectItem>
                    <SelectItem value="premium">Premium</SelectItem>
                    <SelectItem value="creator">Creator (other platform course)</SelectItem>
                  </SelectContent>
                </Select>
              )}
              <p className="text-xs text-muted-foreground mt-1">
                Selecting Basic, Advanced or Premium registers this course as the platform default for that tier.
              </p>
            </div>
            <div>
              <Label>Course Price ₹ *</Label>
              <Input type="number" value={price} onChange={e => setPrice(e.target.value)} min={1} max={49999} className="mt-1" />
              <p className="text-xs text-muted-foreground mt-1">Admin sets any price freely. Platform keeps 100% of revenue.</p>
            </div>
          </CardContent>
        </Card>

        <div className="flex gap-2">
          <Button variant="outline" onClick={() => navigate('/admin/courses')}>Cancel</Button>
          <Button onClick={create} disabled={saving} className="bg-accent hover:bg-accent/90 text-accent-foreground">
            {saving ? <Loader2 className="h-4 w-4 animate-spin mr-2" /> : null}
            Create & Continue to Modules
          </Button>
        </div>
      </div>
    </AdminDashboardLayout>
  );
};

export default AdminPlatformCourseNew;
