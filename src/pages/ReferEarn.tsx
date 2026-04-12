import { useAuth } from '@/contexts/AuthContext';
import DashboardLayout from '@/components/dashboard/DashboardLayout';
import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { Button } from '@/components/ui/button';
import { Copy, Check, IndianRupee, TrendingUp, Users, ArrowUpRight, Trophy, Wallet } from 'lucide-react';
import { useState } from 'react';
import { formatPrice, timeAgo } from '@/lib/format';
import { Link } from 'react-router-dom';
import BackButton from '@/components/BackButton';

const BUNDLE_SLUG = 'backupshala-standard-bundle';

const ReferEarn = () => {
  const { user, profile } = useAuth();
  const [copied, setCopied] = useState<string | null>(null);

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
      const { data } = await supabase.from('courses').select('id, title, slug, price, commission_percent').eq('status', 'published');
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

  const totalCommissionEarned = commissions?.reduce((sum, c) => sum + Number(c.amount), 0) || 0;
  const enrolledReferrals = commissions?.length || 0;
  const availableBalance = wallet?.balance || 0;

  const referralLink = profile?.creator_slug
    ? `${window.location.origin}/ref/${profile.creator_slug}`
    : `${window.location.origin}/signup?ref=${encodeURIComponent(profile?.email || '')}`;

  const whatsappMsg = `Hey! I'm learning digital skills on Backupshala — a platform with expert-led courses and verified certificates. Sign up using my link: ${referralLink} 📚`;

  const copyToClipboard = async (text: string, key: string) => {
    await navigator.clipboard.writeText(text);
    setCopied(key);
    setTimeout(() => setCopied(null), 2000);
  };

  const bundleCourse = publishedCourses?.find(c => c.slug === BUNDLE_SLUG);
  const bundleCommission = bundleCourse ? Math.round(bundleCourse.price * (bundleCourse.commission_percent / 100)) : 75;

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

        {/* Referral Link */}
        <div className="rounded-xl border border-border bg-card p-6 space-y-4">
          <h2 className="font-heading text-base font-600">Your Referral Link</h2>
          <div className="rounded-lg border border-primary/30 bg-primary/5 px-4 py-3 font-mono text-sm text-primary break-all">
            {referralLink}
          </div>
          <div className="flex flex-col sm:flex-row gap-2">
            <Button
              onClick={() => copyToClipboard(referralLink, 'link')}
              className="flex-1 rounded-md"
              variant={copied === 'link' ? 'default' : 'outline'}
            >
              {copied === 'link' ? <><Check className="h-4 w-4 mr-1" /> Copied!</> : <><Copy className="h-4 w-4 mr-1" /> Copy Link</>}
            </Button>
            <Button
              onClick={() => window.open(`https://wa.me/?text=${encodeURIComponent(whatsappMsg)}`, '_blank')}
              className="flex-1 rounded-md bg-[#25D366] hover:bg-[#25D366]/90 text-white"
            >
              Share on WhatsApp
            </Button>
          </div>
        </div>

        {/* Best to Refer */}
        {bundleCourse && (
          <div className="rounded-xl border border-accent/30 bg-accent/5 p-5 space-y-3">
            <div className="flex items-center gap-2">
              <Trophy className="h-5 w-5 text-accent" />
              <h2 className="font-heading text-sm font-600 text-accent">Best Course to Refer</h2>
            </div>
            <div>
              <p className="text-sm font-medium">{bundleCourse.title}</p>
              <p className="text-xs text-muted-foreground">Price: {formatPrice(bundleCourse.price)} | You earn: <span className="text-primary font-semibold">{formatPrice(bundleCommission)}</span></p>
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

        {/* Referral Activity */}
        <div>
          <h2 className="font-heading text-base font-600 mb-4">Recent Referral Activity</h2>
          {commissions && commissions.length > 0 ? (
            <div className="rounded-xl border border-border bg-card overflow-hidden">
              <div className="hidden md:block overflow-x-auto">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="border-b border-border text-left">
                      <th className="px-4 py-3 font-medium text-muted-foreground">Date</th>
                      <th className="px-4 py-3 font-medium text-muted-foreground">Course</th>
                      <th className="px-4 py-3 font-medium text-muted-foreground">Commission</th>
                      <th className="px-4 py-3 font-medium text-muted-foreground">Status</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-border">
                    {commissions.map(c => (
                      <tr key={c.id}>
                        <td className="px-4 py-3 text-xs">{new Date(c.created_at).toLocaleDateString('en-IN')}</td>
                        <td className="px-4 py-3 text-xs">{(c as any).courses?.title || '—'}</td>
                        <td className="px-4 py-3 text-xs font-semibold text-primary">+{formatPrice(c.amount)}</td>
                        <td className="px-4 py-3">
                          <span className={`rounded-full px-2 py-0.5 text-[10px] font-semibold ${c.status === 'credited' ? 'bg-primary/10 text-primary' : 'bg-accent/10 text-accent'}`}>
                            {c.status}
                          </span>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
              <div className="md:hidden divide-y divide-border">
                {commissions.map(c => (
                  <div key={c.id} className="p-4 space-y-1">
                    <div className="flex items-center justify-between">
                      <p className="text-sm font-medium">{(c as any).courses?.title || '—'}</p>
                      <span className="font-semibold text-primary text-sm">+{formatPrice(c.amount)}</span>
                    </div>
                    <div className="flex items-center justify-between">
                      <p className="text-xs text-muted-foreground">{new Date(c.created_at).toLocaleDateString('en-IN')}</p>
                      <span className={`rounded-full px-2 py-0.5 text-[10px] font-semibold ${c.status === 'credited' ? 'bg-primary/10 text-primary' : 'bg-accent/10 text-accent'}`}>{c.status}</span>
                    </div>
                  </div>
                ))}
              </div>
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
