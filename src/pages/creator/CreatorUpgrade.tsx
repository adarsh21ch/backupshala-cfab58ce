import { useAuth } from '@/contexts/AuthContext';
import CreatorDashboardLayout from '@/components/dashboard/CreatorDashboardLayout';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { Button } from '@/components/ui/button';
import { useToast } from '@/hooks/use-toast';
import { usePlatformSettings } from '@/hooks/usePlatformSettings';
import { Lock, Mic, Users, BarChart3, Bell, Unlock, Star, Check } from 'lucide-react';

const features = [
  { icon: Lock, label: 'Sequential Module Locking', desc: 'Control the order students learn' },
  { icon: Mic, label: 'Audio Notes Between Modules', desc: 'Add personal voice messages for students' },
  { icon: Users, label: 'Mentor Approval Gates', desc: 'Require students to contact you before proceeding' },
  { icon: BarChart3, label: 'Advanced Student Progress Dashboard', desc: 'See exactly where every student is in your course' },
  { icon: Bell, label: 'Push Notifications', desc: 'Get notified instantly when students need approval' },
  { icon: Unlock, label: 'Unlock Request Management', desc: 'Approve or reject student progress with one tap' },
];

const CreatorUpgrade = () => {
  const { user, profile } = useAuth();
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const { getSetting } = usePlatformSettings();

  const proPrice = Number(getSetting('creator_pro_price', '999'));
  const trialDays = Number(getSetting('creator_pro_trial_days', '14'));
  const proEnabled = getSetting('creator_pro_enabled', 'true') === 'true';

  const { data: subscription } = useQuery({
    queryKey: ['pro-subscription', user?.id],
    queryFn: async () => {
      const { data } = await supabase
        .from('creator_pro_subscriptions')
        .select('*')
        .eq('creator_id', user!.id)
        .maybeSingle();
      return data;
    },
    enabled: !!user,
  });

  const startTrial = useMutation({
    mutationFn: async () => {
      const now = new Date();
      const trialEnd = new Date(now.getTime() + trialDays * 24 * 60 * 60 * 1000);

      const { error } = await supabase.from('creator_pro_subscriptions').upsert({
        creator_id: user!.id,
        plan: 'trial',
        status: 'active',
        trial_started_at: now.toISOString(),
        trial_ends_at: trialEnd.toISOString(),
        amount_per_month: proPrice,
        updated_at: now.toISOString(),
      }, { onConflict: 'creator_id' });

      if (error) throw error;

      // Update profile
      await supabase.from('profiles').update({ is_creator_pro: true }).eq('id', user!.id);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['pro-subscription'] });
      toast({ title: '⭐ Pro Trial Active!', description: `Your ${trialDays}-day Creator Pro trial is now active. Enjoy all Pro features!` });
    },
    onError: () => toast({ title: 'Failed to start trial', variant: 'destructive' }),
  });

  const isPro = subscription && (subscription.plan === 'pro' || subscription.plan === 'trial') && subscription.status === 'active';

  // Admin always has Pro
  if (profile?.is_admin) {
    return (
      <CreatorDashboardLayout>
        <div className="max-w-lg mx-auto py-12 text-center space-y-6">
          <div className="flex h-16 w-16 items-center justify-center rounded-2xl bg-primary/10 mx-auto">
            <Star className="h-8 w-8 text-primary" />
          </div>
          <h1 className="font-heading text-2xl font-bold">Creator Pro — Admin Access ⭐</h1>
          <p className="text-sm text-muted-foreground">As an admin, you have full Creator Pro access by default.</p>
          <div className="grid gap-3 text-left">
            {features.map(f => (
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

  if (isPro) {
    return (
      <CreatorDashboardLayout>
        <div className="max-w-lg mx-auto py-12 text-center space-y-6">
          <div className="flex h-16 w-16 items-center justify-center rounded-2xl bg-primary/10 mx-auto">
            <Star className="h-8 w-8 text-primary" />
          </div>
          <h1 className="font-heading text-2xl font-bold">You're on Creator Pro! ⭐</h1>
          <p className="text-sm text-muted-foreground">
            Plan: <span className="font-semibold text-foreground capitalize">{subscription.plan}</span>
            {subscription.plan === 'trial' && subscription.trial_ends_at && (
              <> · Trial ends {new Date(subscription.trial_ends_at).toLocaleDateString()}</>
            )}
          </p>
          <div className="grid gap-3 text-left">
            {features.map(f => (
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
      <div className="max-w-lg mx-auto py-8 space-y-8">
        <div className="text-center space-y-3">
          <div className="flex h-16 w-16 items-center justify-center rounded-2xl bg-accent/10 mx-auto">
            <Star className="h-8 w-8 text-accent" />
          </div>
          <h1 className="font-heading text-2xl font-bold">⭐ Creator Pro Plan</h1>
          <p className="text-sm text-muted-foreground">Take your courses to the next level</p>
          <div className="flex items-baseline justify-center gap-1">
            <span className="font-heading text-4xl font-extrabold">₹{proPrice.toLocaleString()}</span>
            <span className="text-muted-foreground text-sm">/ month</span>
          </div>
          <p className="text-xs text-muted-foreground">Billed monthly — cancel anytime</p>
        </div>

        <div className="border-t border-border" />

        <div className="space-y-3">
          <p className="text-sm font-semibold">Everything in Free, plus:</p>
          {features.map(f => (
            <div key={f.label} className="flex items-start gap-3 rounded-lg border border-border bg-card p-3">
              <f.icon className="h-5 w-5 text-accent shrink-0 mt-0.5" />
              <div>
                <p className="text-sm font-medium">{f.label}</p>
                <p className="text-xs text-muted-foreground">{f.desc}</p>
              </div>
            </div>
          ))}
        </div>

        <div className="border-t border-border" />

        <div className="text-center space-y-3">
          {trialDays > 0 ? (
            <>
              <Button
                onClick={() => startTrial.mutate()}
                disabled={startTrial.isPending}
                className="w-full rounded-xl bg-accent hover:bg-accent/90 text-accent-foreground font-semibold py-6 text-base"
              >
                {startTrial.isPending ? 'Starting...' : `Start ${trialDays}-Day Free Trial →`}
              </Button>
              <p className="text-xs text-muted-foreground">No credit card needed</p>
            </>
          ) : (
            <>
              <Button
                disabled
                className="w-full rounded-xl font-semibold py-6 text-base"
              >
                Contact Admin to Activate Pro
              </Button>
              <p className="text-xs text-muted-foreground">Pro activation is managed by the admin team</p>
            </>
          )}
        </div>
      </div>
    </CreatorDashboardLayout>
  );
};

export default CreatorUpgrade;
