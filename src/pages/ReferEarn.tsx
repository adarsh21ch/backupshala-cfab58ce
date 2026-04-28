import { useAuth } from '@/contexts/AuthContext';
import DashboardLayout from '@/components/dashboard/DashboardLayout';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Copy, Check, IndianRupee, TrendingUp, Users, ArrowUpRight, Wallet, MessageCircle, Lock, BookOpen, Share2 } from 'lucide-react';
import { useState, useMemo } from 'react';
import { formatPrice } from '@/lib/format';
import { Link } from 'react-router-dom';
import BackButton from '@/components/BackButton';
import { usePlatformSettings } from '@/hooks/usePlatformSettings';
import { toast } from 'sonner';
import { Badge } from '@/components/ui/badge';
import { useReferableCourses } from '@/hooks/useReferralEligibility';
import { buildGenericRefLink, buildCourseRefLink } from '@/lib/referralTracking';
import { computeCommission, inputsFromSettings } from '@/lib/commissionModel';

const ReferEarn = () => {
  const { user, profile, refreshProfile } = useAuth();
  const qc = useQueryClient();
  const [copied, setCopied] = useState<string | null>(null);
  const [usernameInput, setUsernameInput] = useState('');
  const { data: settings, raw: settingsRaw } = usePlatformSettings();

  const { data: wallet } = useQuery({
    queryKey: ['my-wallet', user?.id],
    enabled: !!user,
    queryFn: async () => {
      const { data } = await supabase.from('wallets').select('*').eq('user_id', user!.id).maybeSingle();
      return data;
    },
  });

  const { data: commissions } = useQuery({
    queryKey: ['my-commissions', user?.id, profile?.email],
    enabled: !!user && !!profile,
    queryFn: async () => {
      // We support both legacy email-based and new user_id-based commissions
      const { data } = await supabase
        .from('commissions')
        .select('*, courses(title, slug), profiles:student_id(full_name)')
        .or(`referrer_user_id.eq.${user!.id},referrer_email.eq.${profile!.email}`)
        .order('created_at', { ascending: false });
      return data || [];
    },
  });

  const { data: referableCourses } = useReferableCourses();
  const hasEnrollments = (profile?.total_enrolled || 0) > 0 || profile?.is_creator;

  const { data: referralCount } = useQuery({
    queryKey: ['referral-count', profile?.email],
    enabled: !!profile,
    queryFn: async () => {
      const { count } = await supabase
        .from('profiles')
        .select('id', { count: 'exact', head: true })
        .eq('referrer_email', profile!.email);
      return count || 0;
    },
  });

  const setUsernameMutation = useMutation({
    mutationFn: async (uname: string) => {
      const clean = uname.trim().toLowerCase().replace(/[^a-z0-9_]/g, '');
      if (clean.length < 3 || clean.length > 20) throw new Error('Username must be 3-20 chars (letters, numbers, _)');
      const { data: existing } = await supabase
        .from('profiles').select('id').ilike('username', clean).neq('id', user!.id).maybeSingle();
      if (existing) throw new Error('That username is taken — try another');
      const { error } = await supabase.from('profiles').update({ username: clean }).eq('id', user!.id);
      if (error) throw error;
      return clean;
    },
    onSuccess: async () => {
      toast.success('Your referral link is ready! 🎉');
      await refreshProfile();
      qc.invalidateQueries();
    },
    onError: (e: any) => toast.error(e.message),
  });

  // Stats
  const now = Date.now();
  const totalEarned = commissions?.reduce((s, c: any) => s + Number(c.amount), 0) || 0;
  const availableNow = commissions?.reduce((s, c: any) => {
    const avail = c.available_after ? new Date(c.available_after).getTime() : new Date(c.created_at).getTime();
    return avail <= now ? s + Number(c.amount) : s;
  }, 0) || 0;
  const successfulSales = commissions?.length || 0;

  const computeEarn = (price: number, isPlatformCourse?: boolean) =>
    computeCommission(inputsFromSettings(price, !!isPlatformCourse, settingsRaw)).affiliateEarning;

  const username = profile?.username;
  const baseLink = username ? buildGenericRefLink(username) : '';

  const copyToClipboard = async (text: string, key: string) => {
    await navigator.clipboard.writeText(text);
    setCopied(key);
    toast.success('Link copied!');
    setTimeout(() => setCopied(null), 2000);
  };

  const shareWA = (title: string, link: string, isCourse = false) => {
    const msg = isCourse
      ? `Hey! Check out this course on Backupshala: ${title}\n\nBuy it here: ${link}\n\n(I earn a small commission if you buy through my link)`
      : `Hey! I found some really good digital skill courses on Backupshala. Use my link to check them out:\n\n${link}\n\nThe courses are actually useful — check it out!`;
    window.open(`https://wa.me/?text=${encodeURIComponent(msg)}`, '_blank');
  };

  // ─────────────────────────────────────────────────────────
  // LOCKED STATE — no enrollments + not a creator
  // ─────────────────────────────────────────────────────────
  if (!hasEnrollments) {
    return (
      <DashboardLayout>
        <div className="max-w-2xl mx-auto space-y-6">
          <BackButton fallback="/dashboard" />
          <h1 className="font-heading text-2xl font-700">Refer & Earn</h1>

          <div className="rounded-2xl border border-border bg-card p-10 text-center">
            <div className="mx-auto mb-5 flex h-20 w-20 items-center justify-center rounded-2xl bg-muted/50">
              <Lock className="h-10 w-10 text-muted-foreground/60" />
            </div>
            <h2 className="font-heading text-xl font-700">Enroll in a course to start referring</h2>
            <p className="mt-3 text-sm text-muted-foreground max-w-md mx-auto">
              You can only refer courses you have personally purchased and experienced.
              Buy a course first, then share it with confidence and earn commission on every sale.
            </p>
            <Button asChild className="mt-6 rounded-md bg-primary hover:bg-primary/90">
              <Link to="/explore">Browse Courses</Link>
            </Button>
          </div>

          {/* How it works */}
          <div className="rounded-xl border border-border bg-card p-6">
            <h3 className="font-heading text-base font-600 mb-4">How it works</h3>
            <ol className="space-y-3 text-sm">
              <li className="flex gap-3">
                <span className="flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-primary/10 text-xs font-bold text-primary">1</span>
                <span>Buy any course on Backupshala</span>
              </li>
              <li className="flex gap-3">
                <span className="flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-primary/10 text-xs font-bold text-primary">2</span>
                <span>Get a personal referral link for that course</span>
              </li>
              <li className="flex gap-3">
                <span className="flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-primary/10 text-xs font-bold text-primary">3</span>
                <span>Share with friends — earn commission on every sale, automatically</span>
              </li>
            </ol>
          </div>
        </div>
      </DashboardLayout>
    );
  }

  // ─────────────────────────────────────────────────────────
  // FULL REFER & EARN PAGE
  // ─────────────────────────────────────────────────────────
  return (
    <DashboardLayout>
      <div className="space-y-6 max-w-3xl">
        <BackButton fallback="/dashboard" />
        <h1 className="font-heading text-2xl font-700">Refer & Earn</h1>

        {/* KPI Stats */}
        <div className="grid grid-cols-2 gap-3 sm:gap-4">
          <div className="rounded-xl border border-border bg-card p-4 text-center">
            <Users className="mx-auto h-5 w-5 text-primary mb-1" />
            <p className="font-heading text-xl font-700">{referralCount || 0}</p>
            <p className="text-[11px] text-muted-foreground">Total Referrals</p>
          </div>
          <div className="rounded-xl border border-border bg-card p-4 text-center">
            <ArrowUpRight className="mx-auto h-5 w-5 text-accent mb-1" />
            <p className="font-heading text-xl font-700">{successfulSales}</p>
            <p className="text-[11px] text-muted-foreground">Successful Sales</p>
          </div>
          <div className="rounded-xl border border-border bg-card p-4 text-center">
            <TrendingUp className="mx-auto h-5 w-5 text-primary mb-1" />
            <p className="font-heading text-xl font-700">{formatPrice(totalEarned)}</p>
            <p className="text-[11px] text-muted-foreground">Total Earned</p>
          </div>
          <div className="rounded-xl border border-border bg-card p-4 text-center">
            <Wallet className="mx-auto h-5 w-5 text-accent mb-1" />
            <p className="font-heading text-xl font-700">{formatPrice(availableNow)}</p>
            <p className="text-[11px] text-muted-foreground">Available Now</p>
          </div>
        </div>

        {/* Username setup OR referral link */}
        {!username ? (
          <div className="rounded-xl border border-warning/30 bg-warning/5 p-5 space-y-3">
            <div>
              <p className="font-heading text-base font-600">Set your username to get your referral link</p>
              <p className="text-xs text-muted-foreground mt-0.5">3-20 chars · letters, numbers, underscore</p>
            </div>
            <div className="flex gap-2">
              <Input value={usernameInput} onChange={e => setUsernameInput(e.target.value)} placeholder="e.g. adarsh_k" />
              <Button
                onClick={() => setUsernameMutation.mutate(usernameInput)}
                disabled={setUsernameMutation.isPending || usernameInput.length < 3}
              >Save</Button>
            </div>
          </div>
        ) : (
          <div className="rounded-xl border border-border bg-card p-5 space-y-4">
            <div>
              <p className="font-heading text-base font-600">Your referral link</p>
              <p className="text-xs text-muted-foreground mt-0.5">Works for any course. Commission applies based on what they buy.</p>
            </div>
            <div className="rounded-lg border border-primary/30 bg-primary/5 px-4 py-3 font-mono text-sm text-primary break-all">
              {baseLink}
            </div>
            <div className="flex flex-col sm:flex-row gap-2">
              <Button onClick={() => copyToClipboard(baseLink, 'base')} variant={copied === 'base' ? 'default' : 'outline'} className="flex-1">
                {copied === 'base' ? <><Check className="h-4 w-4 mr-1" /> Copied!</> : <><Copy className="h-4 w-4 mr-1" /> Copy Link</>}
              </Button>
              <Button onClick={() => shareWA('Backupshala', baseLink)} className="flex-1 bg-[#25D366] hover:bg-[#25D366]/90 text-white">
                <MessageCircle className="h-4 w-4 mr-1" /> Share on WhatsApp
              </Button>
            </div>
          </div>
        )}

        {/* Referable courses */}
        {username && referableCourses && referableCourses.length > 0 && (
          <div>
            <h2 className="font-heading text-base font-600 mb-1">Courses you can refer</h2>
            <p className="text-xs text-muted-foreground mb-4">You can only refer courses you have purchased and experienced</p>
            <div className="space-y-3">
              {referableCourses.map((c: any) => {
                const cs = c.profiles?.creator_slug || 'creator';
                const link = buildCourseRefLink(cs, c.slug, username);
                const earn = computeEarn(Number(c.price) || 0);
                return (
                  <div key={c.id} className="rounded-xl border border-border bg-card p-4 space-y-3">
                    <div className="flex items-start gap-3">
                      {c.thumbnail_url ? (
                        <img src={c.thumbnail_url} alt="" className="h-14 w-20 rounded-md object-cover shrink-0" />
                      ) : (
                        <div className="h-14 w-20 rounded-md bg-muted shrink-0 flex items-center justify-center">
                          <BookOpen className="h-5 w-5 text-muted-foreground" />
                        </div>
                      )}
                      <div className="min-w-0 flex-1">
                        <p className="text-sm font-medium truncate">{c.title}</p>
                        <p className="text-xs text-muted-foreground mt-0.5">
                          {formatPrice(c.price)} · You earn <span className="text-primary font-semibold">{formatPrice(earn)}</span>
                        </p>
                      </div>
                    </div>
                    <div className="flex gap-2">
                      <Button size="sm" variant="outline" onClick={() => copyToClipboard(link, c.id)} className="flex-1 text-xs">
                        {copied === c.id ? <><Check className="h-3 w-3 mr-1" /> Copied</> : <><Copy className="h-3 w-3 mr-1" /> Copy</>}
                      </Button>
                      <Button size="sm" onClick={() => shareWA(c.title, link, true)} className="flex-1 text-xs bg-[#25D366] hover:bg-[#25D366]/90 text-white">
                        <Share2 className="h-3 w-3 mr-1" /> WhatsApp
                      </Button>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        )}

        {/* Activity */}
        <div>
          <h2 className="font-heading text-base font-600 mb-3">Recent Activity</h2>
          {commissions && commissions.length > 0 ? (
            <div className="rounded-xl border border-border bg-card divide-y divide-border">
              {commissions.slice(0, 20).map((c: any) => {
                const avail = c.available_after ? new Date(c.available_after) : new Date(c.created_at);
                const isAvailable = avail.getTime() <= now;
                return (
                  <div key={c.id} className="flex items-center justify-between p-4 gap-3">
                    <div className="min-w-0 flex-1">
                      <p className="text-sm font-medium truncate">{c.courses?.title || '—'}</p>
                      <p className="text-xs text-muted-foreground">
                        {new Date(c.created_at).toLocaleDateString('en-IN')}
                        {!isAvailable && ` · Available ${avail.toLocaleDateString('en-IN')}`}
                      </p>
                    </div>
                    <div className="text-right shrink-0">
                      <p className="text-sm font-semibold text-primary">+{formatPrice(c.amount)}</p>
                      <Badge variant="outline" className={`mt-0.5 text-[10px] ${isAvailable ? 'border-primary/30 text-primary' : 'border-muted-foreground/30 text-muted-foreground'}`}>
                        {isAvailable ? 'Available' : 'Pending'}
                      </Badge>
                    </div>
                  </div>
                );
              })}
            </div>
          ) : (
            <div className="rounded-xl border border-border bg-card p-8 text-center">
              <IndianRupee className="mx-auto h-10 w-10 text-muted-foreground/30 mb-3" />
              <p className="text-sm text-muted-foreground">No referrals yet. Share your link to start earning!</p>
            </div>
          )}
        </div>

        {/* Wallet link */}
        <div className="rounded-xl border border-primary/20 bg-primary/5 p-5 flex flex-col sm:flex-row items-center justify-between gap-4">
          <div>
            <p className="text-xs text-muted-foreground">Wallet Balance</p>
            <p className="font-heading text-2xl font-800 text-primary">{formatPrice(wallet?.balance || 0)}</p>
          </div>
          <Button asChild className="rounded-md bg-accent hover:bg-accent/90 text-accent-foreground">
            <Link to="/dashboard/wallet">View Wallet →</Link>
          </Button>
        </div>
      </div>
    </DashboardLayout>
  );
};

export default ReferEarn;
