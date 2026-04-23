import AdminDashboardLayout from '@/components/dashboard/AdminDashboardLayout';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { usePlatformSettings } from '@/hooks/usePlatformSettings';
import { toast } from 'sonner';
import { useState, useEffect } from 'react';
import { Trophy, ExternalLink, Users, IndianRupee, BookOpen, Loader2, Save } from 'lucide-react';
import { formatPrice } from '@/lib/format';
import { Link } from 'react-router-dom';

const BUNDLE_SLUG = 'backupshala-standard-bundle';

const AdminStandardBundle = () => {
  const { user } = useAuth();
  const qc = useQueryClient();
  const { data: platformSettings } = usePlatformSettings();
  const [telegramLink, setTelegramLink] = useState('');
  const [whatsappLink, setWhatsappLink] = useState('');

  const { data: bundle, isLoading } = useQuery({
    queryKey: ['standard-bundle'],
    queryFn: async () => {
      const { data } = await supabase.from('courses').select('*').eq('slug', BUNDLE_SLUG).maybeSingle();
      return data;
    },
  });

  const { data: stats } = useQuery({
    queryKey: ['bundle-stats', bundle?.id],
    queryFn: async () => {
      const [{ count: enrolled }, { data: payments }] = await Promise.all([
        supabase.from('enrollments').select('id', { count: 'exact', head: true }).eq('course_id', bundle!.id),
        supabase.from('payments').select('amount_total, commission_amount').eq('course_id', bundle!.id).eq('status', 'success'),
      ]);
      const revenue = payments?.reduce((s, p) => s + Number(p.amount_total), 0) || 0;
      const commissions = payments?.reduce((s, p) => s + Number(p.commission_amount), 0) || 0;
      return { enrolled: enrolled || 0, revenue, commissions };
    },
    enabled: !!bundle?.id,
  });

  const { data: communityLinks } = useQuery({
    queryKey: ['community-links-admin'],
    queryFn: async () => {
      const { data } = await supabase.from('platform_settings').select('key, value')
        .in('key', ['telegram_community_link', 'whatsapp_community_link']);
      const map: Record<string, string> = {};
      data?.forEach(s => { map[s.key] = s.value; });
      return map;
    },
  });

  useEffect(() => {
    if (communityLinks) {
      setTelegramLink(communityLinks.telegram_community_link || '');
      setWhatsappLink(communityLinks.whatsapp_community_link || '');
    }
  }, [communityLinks]);

  const createBundle = useMutation({
    mutationFn: async () => {
      const { error } = await supabase.from('courses').insert({
        creator_id: user!.id,
        title: 'Backupshala Standard Bundle',
        slug: BUNDLE_SLUG,
        short_description: 'Your complete digital skills starter pack — curated resources, expert guidance, and community access for ₹249.',
        full_description: "The Backupshala Standard Bundle is your all-in-one digital skills starter pack. For just ₹249, get access to our curated collection of the best learning resources on video editing, content creation, personal branding, sales, communication, and freelancing — hand-picked from across YouTube, top podcasts, and expert guides. Plus get exclusive access to our private Telegram community where you can connect with fellow learners, ask questions, and stay updated with the latest digital skills content. Complete all modules and earn your Backupshala Certificate of Completion.",
        category: 'Digital Skills',
        language: 'English',
        level: 'Beginner',
        price: 249,
        commission_percent: platformSettings?.default_commission_percent || 30,
        platform_fee_percent: platformSettings?.platform_fee_percent || 15,
        is_featured: true,
        status: 'published',
      });
      if (error) throw error;

      // Create placeholder modules
      const { data: course } = await supabase.from('courses').select('id').eq('slug', BUNDLE_SLUG).single();
      if (!course) return;

      const mods = [
        { title: 'Welcome to Backupshala — Start Here', description: "A quick introduction to what you'll learn.", video_url: 'https://www.youtube.com/embed/placeholder', module_type: 'video', order_index: 0, is_preview: true, duration_minutes: 5 },
        { title: 'Video Editing Masterlist', description: 'The best free YouTube tutorials and tools to learn video editing.', video_url: '', module_type: 'resource', order_index: 1, resources: [] },
        { title: 'Instagram & Content Creation Resources', description: 'Curated YouTube videos, podcast episodes, and guides on creating viral content.', video_url: '', module_type: 'resource', order_index: 2, resources: [] },
        { title: 'Personal Branding Toolkit', description: 'Everything you need to build a powerful personal brand online.', video_url: '', module_type: 'resource', order_index: 3, resources: [] },
        { title: 'Sales & Communication Skills', description: 'Learn the fundamentals of selling, persuasion, and confident communication.', video_url: '', module_type: 'resource', order_index: 4, resources: [] },
        { title: 'Freelancing & Earning Online', description: 'Step-by-step guides on finding clients and earning from your digital skills.', video_url: '', module_type: 'resource', order_index: 5, resources: [] },
        { title: 'Join the Backupshala Community', description: "You've earned exclusive access to our private community.", video_url: '', module_type: 'community', order_index: 6, resources: [] },
      ];

      for (const m of mods) {
        await supabase.from('modules').insert({
          course_id: course.id,
          title: m.title,
          description: m.description,
          video_url: m.video_url || 'placeholder',
          module_type: m.module_type,
          order_index: m.order_index,
          is_preview: m.is_preview || false,
          duration_minutes: m.duration_minutes || 0,
          resources: m.resources || [],
        } as any);
      }

      await supabase.from('courses').update({ total_modules: 7 }).eq('id', course.id);
    },
    onSuccess: () => {
      toast.success('Standard Bundle created with 7 placeholder modules!');
      qc.invalidateQueries({ queryKey: ['standard-bundle'] });
    },
    onError: (e: any) => toast.error(e.message),
  });

  const saveCommunityLinks = useMutation({
    mutationFn: async () => {
      for (const [key, value] of [['telegram_community_link', telegramLink], ['whatsapp_community_link', whatsappLink]] as const) {
        await supabase.from('platform_settings').update({ value, updated_at: new Date().toISOString() }).eq('key', key);
      }
    },
    onSuccess: () => {
      toast.success('Community links updated');
      qc.invalidateQueries({ queryKey: ['community-links'] });
    },
  });

  return (
    <AdminDashboardLayout>
      <div className="space-y-6">
        <h1 className="font-heading text-2xl font-bold flex items-center gap-2">
          <Trophy className="h-6 w-6 text-accent" /> Standard Bundle
        </h1>

        {isLoading ? (
          <div className="animate-pulse h-40 rounded-xl bg-card" />
        ) : !bundle ? (
          <Card className="bg-card border-border max-w-2xl">
            <CardContent className="p-6 text-center space-y-4">
              <Trophy className="h-12 w-12 text-accent mx-auto" />
              <h2 className="font-heading text-lg font-600">Create the Backupshala Standard Bundle</h2>
              <p className="text-sm text-muted-foreground">This will create a ₹249 flagship course with 7 placeholder modules (1 video + 5 resource + 1 community).</p>
              <Button onClick={() => createBundle.mutate()} disabled={createBundle.isPending} className="rounded-md bg-accent hover:bg-accent/90 text-accent-foreground">
                {createBundle.isPending ? <Loader2 className="h-4 w-4 animate-spin mr-2" /> : <Trophy className="h-4 w-4 mr-2" />}
                Create Standard Bundle
              </Button>
            </CardContent>
          </Card>
        ) : (
          <>
            {/* Stats */}
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
              <Card className="bg-card border-border">
                <CardContent className="p-4">
                  <p className="text-xs text-muted-foreground">Status</p>
                  <p className="font-heading text-lg font-700 text-primary">{bundle.status}</p>
                </CardContent>
              </Card>
              <Card className="bg-card border-border">
                <CardContent className="p-4">
                  <Users className="h-4 w-4 text-primary mb-1" />
                  <p className="font-heading text-lg font-700">{stats?.enrolled || 0}</p>
                  <p className="text-xs text-muted-foreground">Enrolled</p>
                </CardContent>
              </Card>
              <Card className="bg-card border-border">
                <CardContent className="p-4">
                  <IndianRupee className="h-4 w-4 text-accent mb-1" />
                  <p className="font-heading text-lg font-700">{formatPrice(stats?.revenue || 0)}</p>
                  <p className="text-xs text-muted-foreground">Revenue</p>
                </CardContent>
              </Card>
              <Card className="bg-card border-border">
                <CardContent className="p-4">
                  <IndianRupee className="h-4 w-4 text-primary mb-1" />
                  <p className="font-heading text-lg font-700">{formatPrice(stats?.commissions || 0)}</p>
                  <p className="text-xs text-muted-foreground">Commissions</p>
                </CardContent>
              </Card>
            </div>

            {/* Quick actions */}
            <Card className="bg-card border-border max-w-2xl">
              <CardHeader><CardTitle className="text-base">Manage Bundle</CardTitle></CardHeader>
              <CardContent className="space-y-3">
                <p className="text-xs text-muted-foreground">Current price: <span className="font-semibold text-accent">{formatPrice(bundle.price)}</span> · <span className="font-semibold text-primary">Platform Course — 100% revenue retained · No creator commission</span></p>
                <div className="flex gap-2 flex-wrap">
                  <Button asChild size="sm" variant="outline" className="rounded-md">
                    <Link to={`/creator/courses/${bundle.id}/edit`}><BookOpen className="h-4 w-4 mr-1" /> Edit Course Content</Link>
                  </Button>
                  <Button asChild size="sm" variant="outline" className="rounded-md">
                    <Link to={`/c/backupshala/${BUNDLE_SLUG}`} target="_blank"><ExternalLink className="h-4 w-4 mr-1" /> View Enrollment Page</Link>
                  </Button>
                </div>
                <p className="text-[10px] text-muted-foreground">You can update YouTube links, podcast links, and community links anytime without affecting enrolled students' certificates.</p>
              </CardContent>
            </Card>

            {/* Community Links */}
            <Card className="bg-card border-border max-w-2xl">
              <CardHeader><CardTitle className="text-base">Community Links</CardTitle></CardHeader>
              <CardContent className="space-y-3">
                <div>
                  <Label className="text-sm">Telegram Link</Label>
                  <Input value={telegramLink} onChange={e => setTelegramLink(e.target.value)} className="mt-1 bg-secondary border-border" placeholder="https://t.me/..." />
                </div>
                <div>
                  <Label className="text-sm">WhatsApp Community Link</Label>
                  <Input value={whatsappLink} onChange={e => setWhatsappLink(e.target.value)} className="mt-1 bg-secondary border-border" placeholder="https://chat.whatsapp.com/..." />
                </div>
                <Button onClick={() => saveCommunityLinks.mutate()} disabled={saveCommunityLinks.isPending} size="sm" className="rounded-md">
                  <Save className="h-4 w-4 mr-1" /> Save Links
                </Button>
              </CardContent>
            </Card>
          </>
        )}
      </div>
    </AdminDashboardLayout>
  );
};

export default AdminStandardBundle;
