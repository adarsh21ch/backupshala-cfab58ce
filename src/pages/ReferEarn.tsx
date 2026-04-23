import { useAuth } from '@/contexts/AuthContext';
import DashboardLayout from '@/components/dashboard/DashboardLayout';
import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { Button } from '@/components/ui/button';
import { Copy, Check, IndianRupee, TrendingUp, Users, ArrowUpRight, Wallet, Share2, MessageCircle } from 'lucide-react';
import { useState, useMemo } from 'react';
import { formatPrice } from '@/lib/format';
import { Link } from 'react-router-dom';
import BackButton from '@/components/BackButton';
import { usePlatformSettings } from '@/hooks/usePlatformSettings';
import { toast } from 'sonner';

const ReferEarn = () => {
  const { user, profile } = useAuth();
  const [copied, setCopied] = useState<string | null>(null);
  const { data: settings } = usePlatformSettings();

  const { data: wallet } = useQuery({
    queryKey: ['my-wallet', user?.id],
    queryFn: async () => {
      const { data } = await supabase.from('wallets').select('*').eq('user_id', user!.id).maybeSingle();
      return data;
    },
    enabled: !!user,
  });

  const { data: commissions } = useQuery({
    queryKey: ['my-commissions', user?.id],
    queryFn: async () => {
      const { data } = await supabase
        .from('commissions')
        .select('*, courses(title)')
        .eq('referrer_email', profile!.email)
        .order('created_at', { ascending: false });
      return data || [];
    },
    enabled: !!user && !!profile,
  });

  const { data: publishedCourses } = useQuery({
    queryKey: ['published-courses-refer'],
    queryFn: async () => {
      const { data } = await supabase
        .from('courses')
        .select('id, title, slug, price, profiles!courses_creator_id_fkey(creator_slug)')
        .eq('status', 'published')
        .order('created_at', { ascending: false });
      return data || [];
    },
  });

  const { data: referralCount } = useQuery({
    queryKey: ['referral-count', profile?.email],
    queryFn: async () => {
      const { count } = await supabase
        .from('profiles')
        .select('id', { count: 'exact', head: true })
        .eq('referrer_email', profile!.email);
      return count || 0;
    },
    enabled: !!profile,
  });

  // Per-course earnings — group commissions by course
  const courseEarnings = useMemo(() => {
    if (!commissions) return [];
    const map = new Map<string, { title: string; sales: number; total: number }>();
    commissions.forEach((c: any) => {
      const id = c.course_id;
      const title = c.courses?.title || 'Unknown course';
      const cur = map.get(id) || { title, sales: 0, total: 0 };
      cur.sales += 1;
      cur.total += Number(c.amount);
      map.set(id, cur);
    });
    return Array.from(map.values()).sort((a, b) => b.total - a.total);
  }, [commissions]);

  const totalCommissionEarned = commissions?.reduce((sum, c) => sum + Number(c.amount), 0) || 0;
  const enrolledReferrals = commissions?.length || 0;
  const availableBalance = wallet?.balance || 0;

  // Referrer earns = platform_fee * referral_pct
  const platformFeePct = settings?.platform_fee_percent ?? 10;
  const referralPct = Number((settings as any)?.default_commission_percent ?? 70);

  const computeReferrerEarn = (price: number) => {
    const gateway = Math.round(price * 0.02);
    const net = price - gateway;
    const platformFee = Math.round(net * (platformFeePct / 100));
    return Math.round(platformFee * (referralPct / 100));
  };

  const refKey = profile?.creator_slug || (profile?.email ? encodeURIComponent(profile.email) : '');
  const baseLink = profile?.creator_slug
    ? `${window.location.origin}/ref/${profile.creator_slug}`
    : `${window.location.origin}/signup?ref=${refKey}`;

  const courseLink = (path: string) => `${window.location.origin}${path}?ref=${refKey}`;

  const copyToClipboard = async (text: string, key: string) => {
    await navigator.clipboard.writeText(text);
    setCopied(key);
    toast.success('Link copied!');
    setTimeout(() => setCopied(null), 2000);
  };

  const shareWA = (title: string, link: string) => {
    const msg = `I found a great course on Backupshala! Check it out:\n\n"${title}"\n${link}`;
    window.open(`https://wa.me/?text=${encodeURIComponent(msg)}`, '_blank');
  };

  return (
    <DashboardLayout>
      <div className="space-y-6 max-w-3xl">
        <BackButton fallback="/dashboard" />
        <h1 className="font-heading text-2xl font-700">Refer & Earn</h1>

        {/* KPI Stats */}
        <div className="grid grid-cols-2 gap-4">
          <div className="rounded-xl border border-border bg-card p-4 text-center">
            <Users className="mx-auto h-5 w-5 text-primary mb-1" />
            <p className="font-heading text-xl font-700">{referralCount || 0}</p>
            <p className="text-xs text-muted-foreground">People Referred</p>
          </div>
          <div className="rounded-xl border border-border bg-card p-4 text-center">
            <ArrowUpRight className="mx-auto h-5 w-5 text-accent mb-1" />
            <p className="font-heading text-xl font-700">{enrolledReferrals}</p>
            <p className="text-xs text-muted-foreground">Enrollments</p>
          </div>
          <div className="rounded-xl border border-border bg-card p-4 text-center">
            <TrendingUp className="mx-auto h-5 w-5 text-primary mb-1" />
            <p className="font-heading text-xl font-700">{formatPrice(totalCommissionEarned)}</p>
            <p className="text-xs text-muted-foreground">Total Earned</p>
          </div>
          <div className="rounded-xl border border-border bg-card p-4 text-center">
            <Wallet className="mx-auto h-5 w-5 text-accent mb-1" />
            <p className="font-heading text-xl font-700">{formatPrice(availableBalance)}</p>
            <p className="text-xs text-muted-foreground">Available to Withdraw</p>
          </div>
        </div>

        {/* Generic Referral Link */}
        <div className="rounded-xl border border-border bg-card p-6 space-y-4">
          <h2 className="font-heading text-base font-600">Your Sign-up Link</h2>
          <p className="text-xs text-muted-foreground">Share this link to invite anyone to Backupshala. You earn when they buy any course.</p>
          <div className="rounded-lg border border-primary/30 bg-primary/5 px-4 py-3 font-mono text-sm text-primary break-all">
            {baseLink}
          </div>
          <div className="flex flex-col sm:flex-row gap-2">
            <Button onClick={() => copyToClipboard(baseLink, 'base')} variant={copied === 'base' ? 'default' : 'outline'} className="flex-1">
              {copied === 'base' ? <><Check className="h-4 w-4 mr-1" /> Copied!</> : <><Copy className="h-4 w-4 mr-1" /> Copy Link</>}
            </Button>
            <Button onClick={() => shareWA('Backupshala — learn digital skills', baseLink)} className="flex-1 bg-[#25D366] hover:bg-[#25D366]/90 text-white">
              <MessageCircle className="h-4 w-4 mr-1" /> Share on WhatsApp
            </Button>
          </div>
        </div>

        {/* Per-Course Sharing */}
        {publishedCourses && publishedCourses.length > 0 && (
          <div>
            <h2 className="font-heading text-base font-600 mb-3">Share a specific course</h2>
            <p className="text-xs text-muted-foreground mb-4">Pick a course and copy a link tagged with your referral. Your commission comes from the platform fee — never from the creator.</p>
            <div className="space-y-3">
              {publishedCourses.map((c: any) => {
                const path = `/c/${c.profiles?.creator_slug || 'creator'}/${c.slug}`;
                const link = courseLink(path);
                const earn = computeReferrerEarn(Number(c.price) || 0);
                return (
                  <div key={c.id} className="rounded-xl border border-border bg-card p-4 space-y-3">
                    <div className="flex items-start justify-between gap-3">
                      <div className="min-w-0">
                        <p className="text-sm font-medium truncate">{c.title}</p>
                        <p className="text-xs text-muted-foreground mt-0.5">
                          Price {formatPrice(c.price)} · You earn up to <span className="text-primary font-semibold">{formatPrice(earn)}</span> per sale
                        </p>
                      </div>
                    </div>
                    <div className="flex flex-col sm:flex-row gap-2">
                      <Button size="sm" variant="outline" onClick={() => copyToClipboard(link, c.id)} className="flex-1 text-xs">
                        {copied === c.id ? <><Check className="h-3 w-3 mr-1" /> Copied</> : <><Copy className="h-3 w-3 mr-1" /> Copy my link</>}
                      </Button>
                      <Button size="sm" onClick={() => shareWA(c.title, link)} className="flex-1 text-xs bg-[#25D366] hover:bg-[#25D366]/90 text-white">
                        <Share2 className="h-3 w-3 mr-1" /> WhatsApp
                      </Button>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        )}

        {/* Earnings by course */}
        {courseEarnings.length > 0 && (
          <div>
            <h2 className="font-heading text-base font-600 mb-3">Your referral earnings by course</h2>
            <div className="rounded-xl border border-border bg-card overflow-hidden">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b border-border text-left">
                    <th className="px-4 py-3 font-medium text-muted-foreground">Course</th>
                    <th className="px-4 py-3 font-medium text-muted-foreground text-right">Sales</th>
                    <th className="px-4 py-3 font-medium text-muted-foreground text-right">Earned</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-border">
                  {courseEarnings.map((row, i) => (
                    <tr key={i}>
                      <td className="px-4 py-3 text-xs">{row.title}</td>
                      <td className="px-4 py-3 text-xs text-right">{row.sales}</td>
                      <td className="px-4 py-3 text-xs text-right font-semibold text-primary">{formatPrice(row.total)}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        )}

        {/* Wallet link */}
        <div className="rounded-xl border border-primary/20 bg-primary/5 p-6 flex flex-col sm:flex-row items-center justify-between gap-4">
          <div>
            <p className="text-xs text-muted-foreground">Wallet Balance</p>
            <p className="font-heading text-3xl font-800 text-primary">{formatPrice(availableBalance)}</p>
          </div>
          <Button asChild className="rounded-md bg-accent hover:bg-accent/90 text-accent-foreground">
            <Link to="/dashboard/wallet">View Wallet →</Link>
          </Button>
        </div>

        {/* Recent Activity */}
        <div>
          <h2 className="font-heading text-base font-600 mb-4">Recent Referral Activity</h2>
          {commissions && commissions.length > 0 ? (
            <div className="rounded-xl border border-border bg-card divide-y divide-border">
              {commissions.slice(0, 10).map((c: any) => (
                <div key={c.id} className="flex items-center justify-between p-4">
                  <div className="min-w-0">
                    <p className="text-sm font-medium truncate">{c.courses?.title || '—'}</p>
                    <p className="text-xs text-muted-foreground">{new Date(c.created_at).toLocaleDateString('en-IN')}</p>
                  </div>
                  <span className="text-sm font-semibold text-primary">+{formatPrice(c.amount)}</span>
                </div>
              ))}
            </div>
          ) : (
            <div className="rounded-xl border border-border bg-card p-8 text-center">
              <IndianRupee className="mx-auto h-10 w-10 text-muted-foreground/30 mb-3" />
              <p className="text-sm text-muted-foreground">You haven't referred anyone yet. Share your link to start earning!</p>
            </div>
          )}
        </div>
      </div>
    </DashboardLayout>
  );
};

export default ReferEarn;
