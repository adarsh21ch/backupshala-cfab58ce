import { useAuth } from '@/contexts/AuthContext';
import DashboardLayout from '@/components/dashboard/DashboardLayout';
import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { Button } from '@/components/ui/button';
import { Copy, Check, IndianRupee, TrendingUp, Users, ArrowUpRight, Trophy } from 'lucide-react';
import { useState } from 'react';
import { formatPrice, timeAgo } from '@/lib/format';
import { Link } from 'react-router-dom';

const BUNDLE_SLUG = 'backupshala-standard-bundle';

const ReferEarn = () => {
  const { user, profile } = useAuth();
  const [copied, setCopied] = useState<'email' | 'whatsapp' | 'general' | null>(null);

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
  const conversionRate = referralCount && referralCount > 0
    ? Math.round((enrolledReferrals / referralCount) * 100)
    : 0;

  const whatsappMsg = `Hey! I'm learning on Backupshala — a platform where you learn from expert creators and earn by referring friends. Sign up at ${window.location.origin}/signup?ref=${encodeURIComponent(profile?.email || '')} and start your journey! 🚀`;
  const generalMsg = `Check out Backupshala — learn from expert creators, earn certificates, and earn commissions by referring friends. Sign up here: ${window.location.origin}/signup?ref=${encodeURIComponent(profile?.email || '')}`;

  const copyToClipboard = async (text: string, type: 'email' | 'whatsapp' | 'general') => {
    await navigator.clipboard.writeText(text);
    setCopied(type);
    setTimeout(() => setCopied(null), 2000);
  };

  return (
    <DashboardLayout>
      <div className="space-y-6 max-w-3xl">
        <h1 className="font-heading text-2xl font-700">Refer & Earn</h1>

        {/* Referral email box */}
        <div className="rounded-xl border border-border bg-card p-6 space-y-4">
          <h2 className="font-heading text-base font-600">Your Referral Email</h2>
          <p className="text-sm text-muted-foreground">
            Share your email with friends. When they sign up and enter YOUR email as their referrer, you earn commission on every course they enroll in.
          </p>
          <div className="flex items-center gap-2">
            <div className="flex-1 rounded-lg border border-primary/30 bg-primary/5 px-4 py-3 font-mono text-sm text-primary">
              {profile?.email}
            </div>
            <Button variant="outline" size="sm" onClick={() => copyToClipboard(profile?.email || '', 'email')} className="rounded-md shrink-0">
              {copied === 'email' ? <Check className="h-4 w-4 text-primary" /> : <Copy className="h-4 w-4" />}
            </Button>
          </div>
        </div>

        {/* Stats */}
        <div className="grid grid-cols-2 gap-4 md:grid-cols-4">
          <div className="rounded-xl border border-border bg-card p-4 text-center">
            <Users className="mx-auto h-5 w-5 text-primary mb-1" />
            <p className="font-heading text-xl font-700">{referralCount || 0}</p>
            <p className="text-xs text-muted-foreground">Total Referrals</p>
          </div>
          <div className="rounded-xl border border-border bg-card p-4 text-center">
            <ArrowUpRight className="mx-auto h-5 w-5 text-accent mb-1" />
            <p className="font-heading text-xl font-700">{enrolledReferrals}</p>
            <p className="text-xs text-muted-foreground">Enrolled</p>
          </div>
          <div className="rounded-xl border border-border bg-card p-4 text-center">
            <TrendingUp className="mx-auto h-5 w-5 text-primary mb-1" />
            <p className="font-heading text-xl font-700">{conversionRate}%</p>
            <p className="text-xs text-muted-foreground">Conversion</p>
          </div>
          <div className="rounded-xl border border-border bg-card p-4 text-center">
            <IndianRupee className="mx-auto h-5 w-5 text-accent mb-1" />
            <p className="font-heading text-xl font-700">{formatPrice(totalCommissionEarned)}</p>
            <p className="text-xs text-muted-foreground">Total Earned</p>
          </div>
        </div>

        {/* Wallet */}
        <div className="rounded-xl border border-primary/20 bg-primary/5 p-6 flex flex-col sm:flex-row items-center justify-between gap-4">
          <div>
            <p className="text-xs text-muted-foreground">Current Wallet Balance</p>
            <p className="font-heading text-3xl font-800 text-primary">{formatPrice(profile?.wallet_balance || 0)}</p>
          </div>
          <div className="flex flex-col items-center gap-2">
            {(profile?.wallet_balance || 0) >= 500 ? (
              <Button asChild className="rounded-md bg-primary hover:bg-primary/90">
                <Link to="/dashboard/payouts">Request Payout →</Link>
              </Button>
            ) : (
              <div className="text-center">
                <Button disabled className="rounded-md">Request Payout</Button>
                <p className="mt-1 text-xs text-muted-foreground">
                  Need {formatPrice(500 - (profile?.wallet_balance || 0))} more
                </p>
              </div>
            )}
          </div>
        </div>

        {/* Share messages */}
        <div className="rounded-xl border border-border bg-card p-6 space-y-4">
          <h2 className="font-heading text-base font-600">Share Messages</h2>
          <div>
            <p className="text-xs text-muted-foreground mb-1">WhatsApp Message</p>
            <div className="rounded-lg border border-border bg-secondary/50 p-3 text-xs text-muted-foreground">{whatsappMsg}</div>
            <div className="flex gap-2 mt-2">
              <Button variant="outline" size="sm" onClick={() => copyToClipboard(whatsappMsg, 'whatsapp')} className="rounded-md">
                {copied === 'whatsapp' ? <><Check className="h-4 w-4 text-primary mr-1" /> Copied!</> : <><Copy className="h-4 w-4 mr-1" /> Copy</>}
              </Button>
              <Button size="sm" variant="outline" className="rounded-md" onClick={() => window.open(`https://wa.me/?text=${encodeURIComponent(whatsappMsg)}`, '_blank')}>
                Share on WhatsApp
              </Button>
            </div>
          </div>
          <div>
            <p className="text-xs text-muted-foreground mb-1">General Message</p>
            <div className="rounded-lg border border-border bg-secondary/50 p-3 text-xs text-muted-foreground">{generalMsg}</div>
            <Button variant="outline" size="sm" onClick={() => copyToClipboard(generalMsg, 'general')} className="mt-2 rounded-md">
              {copied === 'general' ? <><Check className="h-4 w-4 text-primary mr-1" /> Copied!</> : <><Copy className="h-4 w-4 mr-1" /> Copy</>}
            </Button>
          </div>
        </div>

        {/* Commission History */}
        <div>
          <h2 className="font-heading text-base font-600 mb-4">Commission History</h2>
          {commissions && commissions.length > 0 ? (
            <div className="rounded-xl border border-border bg-card overflow-hidden">
              {/* Desktop table */}
              <div className="hidden md:block overflow-x-auto">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="border-b border-border text-left">
                      <th className="px-4 py-3 font-medium text-muted-foreground">Date</th>
                      <th className="px-4 py-3 font-medium text-muted-foreground">Course</th>
                      <th className="px-4 py-3 font-medium text-muted-foreground">Amount</th>
                      <th className="px-4 py-3 font-medium text-muted-foreground">Status</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-border">
                    {commissions.map(c => (
                      <tr key={c.id}>
                        <td className="px-4 py-3 text-xs">{new Date(c.created_at).toLocaleDateString('en-IN')}</td>
                        <td className="px-4 py-3 text-xs">{(c as any).courses?.title || '—'}</td>
                        <td className="px-4 py-3 text-xs font-semibold text-primary">{formatPrice(c.amount)}</td>
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
              {/* Mobile cards */}
              <div className="md:hidden divide-y divide-border">
                {commissions.map(c => (
                  <div key={c.id} className="p-4 space-y-1">
                    <div className="flex items-center justify-between">
                      <p className="text-sm font-medium">{(c as any).courses?.title || '—'}</p>
                      <span className="font-semibold text-primary text-sm">{formatPrice(c.amount)}</span>
                    </div>
                    <div className="flex items-center justify-between">
                      <p className="text-xs text-muted-foreground">{new Date(c.created_at).toLocaleDateString('en-IN')}</p>
                      <span className={`rounded-full px-2 py-0.5 text-[10px] font-semibold ${c.status === 'credited' ? 'bg-primary/10 text-primary' : 'bg-accent/10 text-accent'}`}>
                        {c.status}
                      </span>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          ) : (
            <div className="rounded-xl border border-border bg-card p-8 text-center">
              <IndianRupee className="mx-auto h-10 w-10 text-muted-foreground/30 mb-3" />
              <p className="text-sm text-muted-foreground">No commissions yet. Start sharing!</p>
            </div>
          )}
        </div>
      </div>
    </DashboardLayout>
  );
};

export default ReferEarn;
