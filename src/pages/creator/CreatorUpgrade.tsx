import { useState } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import CreatorDashboardLayout from '@/components/dashboard/CreatorDashboardLayout';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { Button } from '@/components/ui/button';
import { useToast } from '@/hooks/use-toast';
import { usePlatformSettings } from '@/hooks/usePlatformSettings';
import { useCreatorPro } from '@/hooks/useCreatorPro';
import { Lock, Mic, Users, BarChart3, Bell, Unlock, Star, Check, Tag, Megaphone, MessageSquare, Calendar, Zap } from 'lucide-react';
import { Switch } from '@/components/ui/switch';

const FREE_FEATURES = [
  { label: 'Up to 3 published courses', included: true },
  { label: 'Basic analytics', included: true },
  { label: 'Student management', included: true },
  { label: 'Platform fee: 20%', included: true },
  { label: 'Standard payout (7 days)', included: true },
];

const PRO_FEATURES = [
  { icon: Zap, label: 'Unlimited published courses', desc: 'No limits on how many courses you can publish' },
  { icon: BarChart3, label: 'Platform fee reduced to 10%', desc: 'Keep more of every sale' },
  { icon: Tag, label: 'Coupon codes', desc: 'Create up to 10 active discount codes' },
  { icon: Calendar, label: 'Drip content scheduling', desc: 'Release modules on a schedule' },
  { icon: Megaphone, label: 'Student announcements', desc: 'Send messages to enrolled students' },
  { icon: MessageSquare, label: 'Course discussion boards', desc: 'Enable Q&A on your courses' },
  { icon: Unlock, label: 'Priority payout (3 days)', desc: 'Get paid faster' },
  { icon: BarChart3, label: 'Full analytics', desc: 'Completion rate, dropout module, avg watch time' },
  { icon: Lock, label: 'Sequential module locking', desc: 'Control the order students learn' },
  { icon: Mic, label: 'Audio notes between modules', desc: 'Add personal voice messages' },
  { icon: Users, label: 'Mentor approval gates', desc: 'Require student contact before proceeding' },
];

const CreatorUpgrade = () => {
  const { user, profile } = useAuth();
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const { getSetting } = usePlatformSettings();
  const { isPro, isAdmin, plan, daysRemaining, expiresAt, subscription } = useCreatorPro();

  const monthlyPrice = Number(getSetting('creator_pro_monthly_price', '499'));
  const annualPrice = Number(getSetting('creator_pro_annual_price', '3999'));
  const proEnabled = getSetting('creator_pro_enabled', 'true') === 'true';
  const [isAnnual, setIsAnnual] = useState(false);

  const selectedPrice = isAnnual ? annualPrice : monthlyPrice;
  const savingsPercent = Math.round((1 - annualPrice / (monthlyPrice * 12)) * 100);

  const startProMutation = useMutation({
    mutationFn: async () => {
      const now = new Date();
      const duration = isAnnual ? 365 : 30;
      const expiresAt = new Date(now.getTime() + duration * 24 * 60 * 60 * 1000);

      const { error } = await supabase.from('creator_pro_subscriptions').upsert({
        creator_id: user!.id,
        plan: 'pro',
        status: 'active',
        pro_started_at: now.toISOString(),
        pro_ends_at: expiresAt.toISOString(),
        amount_per_month: isAnnual ? Math.round(annualPrice / 12) : monthlyPrice,
        updated_at: now.toISOString(),
      }, { onConflict: 'creator_id' });
      if (error) throw error;
      await supabase.from('profiles').update({ is_creator_pro: true }).eq('id', user!.id);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['creator-pro-subscription'] });
      queryClient.invalidateQueries({ queryKey: ['creator-pro-sub'] });
      toast({ title: 'You are now a Creator Pro member 🎉', description: 'All Pro features are now unlocked!' });
    },
    onError: () => toast({ title: 'Failed to upgrade', variant: 'destructive' }),
  });

  if (isAdmin) {
    return (
      <CreatorDashboardLayout>
        <div className="max-w-lg mx-auto py-12 text-center space-y-6">
          <div className="flex h-16 w-16 items-center justify-center rounded-2xl bg-primary/10 mx-auto">
            <Star className="h-8 w-8 text-primary" />
          </div>
          <h1 className="font-heading text-2xl font-bold">Creator Pro — Admin Access ⭐</h1>
          <p className="text-sm text-muted-foreground">As an admin, you have full Creator Pro access by default.</p>
        </div>
      </CreatorDashboardLayout>
    );
  }

  if (isPro) {
    return (
      <CreatorDashboardLayout>
        <div className="max-w-lg mx-auto py-12 text-center space-y-6">
          <div className="flex h-16 w-16 items-center justify-center rounded-2xl bg-primary/10 mx-auto">
            <Star className="h-8 w-8 text-primary" />
          </div>
          <h1 className="font-heading text-2xl font-bold">You're on Creator Pro! ⭐</h1>
          <p className="text-sm text-muted-foreground">
            Plan: <span className="font-semibold text-foreground capitalize">{plan}</span>
            {daysRemaining !== null && <> · {daysRemaining} days remaining</>}
            {expiresAt && <> · Expires {new Date(expiresAt).toLocaleDateString()}</>}
          </p>
          <div className="grid gap-3 text-left">
            {PRO_FEATURES.map(f => (
              <div key={f.label} className="flex items-center gap-3 rounded-lg border border-primary/20 bg-primary/5 p-3">
                <Check className="h-4 w-4 text-primary shrink-0" />
                <div>
                  <p className="text-sm font-medium">{f.label}</p>
                  <p className="text-xs text-muted-foreground">{f.desc}</p>
                </div>
              </div>
            ))}
          </div>
        </div>
      </CreatorDashboardLayout>
    );
  }

  if (!proEnabled) {
    return (
      <CreatorDashboardLayout>
        <div className="max-w-lg mx-auto py-12 text-center space-y-4">
          <Star className="h-12 w-12 text-muted-foreground/30 mx-auto" />
          <h1 className="font-heading text-xl font-bold">Creator Pro Coming Soon</h1>
          <p className="text-sm text-muted-foreground">Creator Pro is not available right now. Check back later!</p>
        </div>
      </CreatorDashboardLayout>
    );
  }

  return (
    <CreatorDashboardLayout>
      <div className="max-w-3xl mx-auto py-8 space-y-8">
        {/* Header */}
        <div className="text-center space-y-3">
          <div className="flex h-16 w-16 items-center justify-center rounded-2xl bg-accent/10 mx-auto">
            <Star className="h-8 w-8 text-accent" />
          </div>
          <h1 className="font-heading text-2xl font-bold">Upgrade to Creator Pro</h1>
          <p className="text-sm text-muted-foreground">Unlock powerful tools to grow your course business</p>
        </div>

        {/* Pricing Toggle */}
        <div className="flex items-center justify-center gap-3">
          <span className={`text-sm font-medium ${!isAnnual ? 'text-foreground' : 'text-muted-foreground'}`}>Monthly</span>
          <Switch checked={isAnnual} onCheckedChange={setIsAnnual} />
          <span className={`text-sm font-medium ${isAnnual ? 'text-foreground' : 'text-muted-foreground'}`}>
            Annual
            <span className="ml-1.5 inline-block rounded-full bg-primary/10 px-2 py-0.5 text-[10px] font-bold text-primary">Save {savingsPercent}%</span>
          </span>
        </div>

        <div className="text-center">
          <span className="font-heading text-4xl font-extrabold">₹{selectedPrice.toLocaleString()}</span>
          <span className="text-muted-foreground text-sm">/{isAnnual ? 'year' : 'month'}</span>
        </div>

        {/* Side-by-side comparison */}
        <div className="grid md:grid-cols-2 gap-6">
          {/* Free */}
          <div className="rounded-xl border border-border bg-card p-6 space-y-4">
            <h3 className="font-heading text-lg font-semibold">Free</h3>
            <p className="text-xs text-muted-foreground">Get started with the basics</p>
            <div className="space-y-2">
              {FREE_FEATURES.map(f => (
                <div key={f.label} className="flex items-center gap-2 text-sm">
                  <Check className="h-4 w-4 text-muted-foreground shrink-0" />
                  <span className="text-muted-foreground">{f.label}</span>
                </div>
              ))}
            </div>
            <p className="text-center text-xs text-muted-foreground pt-2">Your current plan</p>
          </div>

          {/* Pro */}
          <div className="rounded-xl border-2 border-accent bg-accent/5 p-6 space-y-4 relative">
            <div className="absolute -top-3 left-1/2 -translate-x-1/2 rounded-full bg-accent px-3 py-0.5 text-[10px] font-bold text-accent-foreground">RECOMMENDED</div>
            <h3 className="font-heading text-lg font-semibold flex items-center gap-2">
              <Star className="h-5 w-5 text-accent" /> Creator Pro
            </h3>
            <p className="text-xs text-muted-foreground">Everything in Free, plus:</p>
            <div className="space-y-2">
              {PRO_FEATURES.map(f => (
                <div key={f.label} className="flex items-center gap-2 text-sm">
                  <Check className="h-4 w-4 text-accent shrink-0" />
                  <span>{f.label}</span>
                </div>
              ))}
            </div>
          </div>
        </div>

        {/* CTA */}
        <div className="text-center">
          <Button
            onClick={() => startProMutation.mutate()}
            disabled={startProMutation.isPending}
            className="w-full max-w-sm rounded-xl bg-accent hover:bg-accent/90 text-accent-foreground font-semibold py-6 text-base"
          >
            {startProMutation.isPending ? 'Processing...' : `Start Creator Pro — ₹${selectedPrice.toLocaleString()}/${isAnnual ? 'year' : 'month'}`}
          </Button>
          <p className="text-xs text-muted-foreground mt-2">Cancel anytime. Payment via Razorpay.</p>
        </div>
      </div>
    </CreatorDashboardLayout>
  );
};

export default CreatorUpgrade;
