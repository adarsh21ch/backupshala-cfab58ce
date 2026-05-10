import AdminDashboardLayout from '@/components/dashboard/AdminDashboardLayout';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { useToast } from '@/hooks/use-toast';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Badge } from '@/components/ui/badge';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Star, Settings, Users, UserPlus, Crown, Check, X, Search, IndianRupee, Clock, Shield } from 'lucide-react';
import { useState, useEffect } from 'react';

const AdminCreatorPro = () => {
  const { toast } = useToast();
  const queryClient = useQueryClient();

  // Pro settings from platform_settings
  const { data: settings = [] } = useQuery({
    queryKey: ['admin-settings'],
    queryFn: async () => {
      const { data } = await supabase.from('platform_settings').select('*');
      return data || [];
    },
  });

  const getSetting = (key: string, fallback: string) => {
    const s = settings.find((s: any) => s.key === key);
    return s ? s.value : fallback;
  };

  const [proPrice, setProPrice] = useState('499');
  const [annualPrice, setAnnualPrice] = useState('3999');
  const [trialDays, setTrialDays] = useState('14');
  const [proEnabled, setProEnabled] = useState('true');
  // Creator signup requirements
  const [signupPaymentRequired, setSignupPaymentRequired] = useState('false');
  const [signupFee, setSignupFee] = useState('0');
  const [signupKycRequired, setSignupKycRequired] = useState('true');

  useEffect(() => {
    if (settings.length > 0) {
      setProPrice(getSetting('creator_pro_monthly_price', '499'));
      setAnnualPrice(getSetting('creator_pro_annual_price', '3999'));
      setTrialDays(getSetting('creator_pro_trial_days', '14'));
      setProEnabled(getSetting('creator_pro_enabled', 'true'));
      setSignupPaymentRequired(getSetting('creator_signup_payment_required', 'false'));
      setSignupFee(getSetting('creator_signup_fee', '0'));
      setSignupKycRequired(getSetting('creator_signup_kyc_required', 'true'));
    }
  }, [settings]);

  const saveSettings = useMutation({
    mutationFn: async () => {
      const entries = [
        { key: 'creator_pro_monthly_price', value: proPrice },
        { key: 'creator_pro_annual_price', value: annualPrice },
        { key: 'creator_pro_trial_days', value: trialDays },
        { key: 'creator_pro_enabled', value: proEnabled },
        { key: 'creator_signup_payment_required', value: signupPaymentRequired },
        { key: 'creator_signup_fee', value: signupFee },
        { key: 'creator_signup_kyc_required', value: signupKycRequired },
      ];
      for (const { key, value } of entries) {
        const existing = settings.find((s: any) => s.key === key);
        if (existing) {
          await supabase.from('platform_settings').update({ value, updated_at: new Date().toISOString() }).eq('id', existing.id);
        } else {
          await supabase.from('platform_settings').insert({ key, value });
        }
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['admin-settings'] });
      queryClient.invalidateQueries({ queryKey: ['platform-settings'] });
      toast({ title: 'Pro settings saved ✓' });
    },
    onError: () => toast({ title: 'Failed to save', variant: 'destructive' }),
  });

  // Subscriptions
  const { data: subs = [], isLoading } = useQuery({
    queryKey: ['admin-pro-subs'],
    queryFn: async () => {
      const { data } = await supabase
        .from('creator_pro_subscriptions')
        .select('*, creator:profiles!creator_pro_subscriptions_creator_id_fkey(full_name, email, creator_display_name, avatar_url)')
        .order('created_at', { ascending: false });
      return data || [];
    },
  });

  // All creators for grant dialog
  const { data: creators = [] } = useQuery({
    queryKey: ['all-creators-for-pro'],
    queryFn: async () => {
      const { data } = await supabase
        .from('profiles')
        .select('id, full_name, email, creator_display_name, is_creator, creator_approved')
        .eq('is_creator', true)
        .eq('creator_approved', true)
        .order('full_name');
      return data || [];
    },
  });

  const updatePlan = useMutation({
    mutationFn: async ({ subId, updates }: { subId: string; updates: any }) => {
      const { error } = await supabase
        .from('creator_pro_subscriptions')
        .update({ ...updates, updated_at: new Date().toISOString() })
        .eq('id', subId);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['admin-pro-subs'] });
      toast({ title: 'Plan updated ✓' });
    },
    onError: () => toast({ title: 'Failed to update', variant: 'destructive' }),
  });

  // Grant Pro manually
  const [grantCreatorId, setGrantCreatorId] = useState('');
  const [grantPlan, setGrantPlan] = useState<'pro' | 'trial'>('pro');
  const [grantDialogOpen, setGrantDialogOpen] = useState(false);

  const grantPro = useMutation({
    mutationFn: async () => {
      if (!grantCreatorId) throw new Error('Select a creator');
      const now = new Date();
      const trialEnd = new Date(now.getTime() + Number(trialDays) * 24 * 60 * 60 * 1000);

      const payload: any = {
        creator_id: grantCreatorId,
        plan: grantPlan,
        status: 'active',
        amount_per_month: Number(proPrice),
        updated_at: now.toISOString(),
      };

      if (grantPlan === 'trial') {
        payload.trial_started_at = now.toISOString();
        payload.trial_ends_at = trialEnd.toISOString();
      } else {
        payload.pro_started_at = now.toISOString();
      }

      const { error } = await supabase
        .from('creator_pro_subscriptions')
        .upsert(payload, { onConflict: 'creator_id' });
      if (error) throw error;

      // Also update profiles.is_creator_pro
      await supabase.from('profiles').update({ is_creator_pro: true }).eq('id', grantCreatorId);

      // Send notification
      const creator = creators.find((c: any) => c.id === grantCreatorId);
      await supabase.from('notifications').insert({
        user_id: grantCreatorId,
        title: grantPlan === 'pro' ? '⭐ Creator Pro Activated!' : '⭐ Pro Trial Started!',
        message: grantPlan === 'pro'
          ? 'Your Creator Pro plan has been activated by admin. Enjoy all Pro features!'
          : `Your ${trialDays}-day Creator Pro trial has been activated. Enjoy all Pro features!`,
        type: 'info',
      });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['admin-pro-subs'] });
      setGrantDialogOpen(false);
      setGrantCreatorId('');
      toast({ title: 'Pro granted successfully ✓' });
    },
    onError: (e: any) => toast({ title: e.message || 'Failed to grant', variant: 'destructive' }),
  });

  const [searchTerm, setSearchTerm] = useState('');

  const filteredSubs = subs.filter((s: any) => {
    if (!searchTerm) return true;
    const name = (s.creator?.creator_display_name || s.creator?.full_name || '').toLowerCase();
    const email = (s.creator?.email || '').toLowerCase();
    return name.includes(searchTerm.toLowerCase()) || email.includes(searchTerm.toLowerCase());
  });

  // Creators who don't have a subscription yet
  const creatorsWithoutPro = creators.filter(
    (c: any) => !subs.find((s: any) => s.creator_id === c.id)
  );

  const statusBadge = (plan: string, status: string) => {
    if (status === 'cancelled') return <Badge variant="destructive" className="text-[10px]">Cancelled</Badge>;
    if (plan === 'trial') return <Badge className="bg-amber-500/10 text-amber-500 border-amber-500/20 text-[10px]">Trial</Badge>;
    if (plan === 'pro') return <Badge className="bg-primary/10 text-primary border-primary/20 text-[10px]">Pro</Badge>;
    return <Badge variant="secondary" className="text-[10px]">Free</Badge>;
  };

  // Stats
  const activePro = subs.filter((s: any) => s.plan === 'pro' && s.status === 'active').length;
  const activeTrial = subs.filter((s: any) => s.plan === 'trial' && s.status === 'active').length;
  const cancelled = subs.filter((s: any) => s.status === 'cancelled').length;
  const monthlyRevenue = activePro * Number(proPrice);

  return (
    <AdminDashboardLayout>
      <div className="space-y-6">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="font-heading text-2xl font-bold flex items-center gap-2">
              <Star className="h-6 w-6 text-amber-500" /> Creator Pro Management
            </h1>
            <p className="text-sm text-muted-foreground mt-1">Manage Pro plans, pricing, and subscriptions</p>
          </div>
          <Dialog open={grantDialogOpen} onOpenChange={setGrantDialogOpen}>
            <DialogTrigger asChild>
              <Button className="gap-2">
                <UserPlus className="h-4 w-4" /> Grant Pro Access
              </Button>
            </DialogTrigger>
            <DialogContent>
              <DialogHeader>
                <DialogTitle className="flex items-center gap-2">
                  <Crown className="h-5 w-5 text-amber-500" /> Grant Creator Pro
                </DialogTitle>
              </DialogHeader>
              <div className="space-y-4 pt-2">
                <div className="space-y-2">
                  <Label>Select Creator</Label>
                  <Select value={grantCreatorId} onValueChange={setGrantCreatorId}>
                    <SelectTrigger>
                      <SelectValue placeholder="Choose a creator..." />
                    </SelectTrigger>
                    <SelectContent>
                      {creatorsWithoutPro.map((c: any) => (
                        <SelectItem key={c.id} value={c.id}>
                          {c.creator_display_name || c.full_name} — {c.email}
                        </SelectItem>
                      ))}
                      {creatorsWithoutPro.length === 0 && (
                        <div className="p-2 text-xs text-muted-foreground text-center">All creators already have Pro</div>
                      )}
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-2">
                  <Label>Plan Type</Label>
                  <Select value={grantPlan} onValueChange={(v) => setGrantPlan(v as 'pro' | 'trial')}>
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="pro">Pro (Full Access)</SelectItem>
                      <SelectItem value="trial">Trial ({trialDays} days)</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <Button
                  onClick={() => grantPro.mutate()}
                  disabled={!grantCreatorId || grantPro.isPending}
                  className="w-full gap-2"
                >
                  <Crown className="h-4 w-4" />
                  {grantPro.isPending ? 'Granting...' : `Grant ${grantPlan === 'pro' ? 'Pro' : 'Trial'} Access`}
                </Button>
              </div>
            </DialogContent>
          </Dialog>
        </div>

        {/* Stats */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          <Card className="bg-card border-border">
            <CardContent className="p-4 text-center">
              <Crown className="h-5 w-5 text-primary mx-auto mb-1" />
              <p className="text-2xl font-bold">{activePro}</p>
              <p className="text-xs text-muted-foreground">Active Pro</p>
            </CardContent>
          </Card>
          <Card className="bg-card border-border">
            <CardContent className="p-4 text-center">
              <Clock className="h-5 w-5 text-amber-500 mx-auto mb-1" />
              <p className="text-2xl font-bold">{activeTrial}</p>
              <p className="text-xs text-muted-foreground">Active Trials</p>
            </CardContent>
          </Card>
          <Card className="bg-card border-border">
            <CardContent className="p-4 text-center">
              <X className="h-5 w-5 text-destructive mx-auto mb-1" />
              <p className="text-2xl font-bold">{cancelled}</p>
              <p className="text-xs text-muted-foreground">Cancelled</p>
            </CardContent>
          </Card>
          <Card className="bg-card border-border">
            <CardContent className="p-4 text-center">
              <IndianRupee className="h-5 w-5 text-emerald-500 mx-auto mb-1" />
              <p className="text-2xl font-bold">₹{monthlyRevenue.toLocaleString()}</p>
              <p className="text-xs text-muted-foreground">Monthly Revenue</p>
            </CardContent>
          </Card>
        </div>

        <Tabs defaultValue="subscriptions" className="space-y-4">
          <TabsList>
            <TabsTrigger value="subscriptions" className="gap-1.5"><Users className="h-3.5 w-3.5" /> Subscriptions</TabsTrigger>
            <TabsTrigger value="settings" className="gap-1.5"><Settings className="h-3.5 w-3.5" /> Pro Settings</TabsTrigger>
          </TabsList>

          {/* Subscriptions Tab */}
          <TabsContent value="subscriptions" className="space-y-4">
            <div className="flex items-center gap-3">
              <div className="relative flex-1 max-w-sm">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                <Input
                  placeholder="Search creators..."
                  value={searchTerm}
                  onChange={e => setSearchTerm(e.target.value)}
                  className="pl-9"
                />
              </div>
            </div>

            {isLoading ? (
              <p className="text-sm text-muted-foreground py-8 text-center">Loading...</p>
            ) : filteredSubs.length === 0 ? (
              <Card className="bg-card border-border">
                <CardContent className="py-12 text-center">
                  <Star className="h-10 w-10 text-muted-foreground/30 mx-auto mb-3" />
                  <p className="text-muted-foreground">No Pro subscriptions yet</p>
                  <p className="text-xs text-muted-foreground mt-1">Use "Grant Pro Access" to activate Pro for creators</p>
                </CardContent>
              </Card>
            ) : (
              <div className="rounded-xl border border-border overflow-hidden">
                <table className="w-full text-sm">
                  <thead className="bg-card border-b border-border">
                    <tr>
                      <th className="text-left p-3 text-xs font-semibold text-muted-foreground">Creator</th>
                      <th className="text-left p-3 text-xs font-semibold text-muted-foreground">Plan</th>
                      <th className="text-left p-3 text-xs font-semibold text-muted-foreground hidden md:table-cell">Started</th>
                      <th className="text-left p-3 text-xs font-semibold text-muted-foreground hidden md:table-cell">Expires</th>
                      <th className="text-left p-3 text-xs font-semibold text-muted-foreground">Status</th>
                      <th className="text-right p-3 text-xs font-semibold text-muted-foreground">Actions</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-border">
                    {filteredSubs.map((s: any) => (
                      <tr key={s.id} className="hover:bg-secondary/30">
                        <td className="p-3">
                          <p className="font-medium">{s.creator?.creator_display_name || s.creator?.full_name}</p>
                          <p className="text-xs text-muted-foreground">{s.creator?.email}</p>
                        </td>
                        <td className="p-3 capitalize">{s.plan}</td>
                        <td className="p-3 text-xs text-muted-foreground hidden md:table-cell">
                          {s.plan === 'trial' && s.trial_started_at
                            ? new Date(s.trial_started_at).toLocaleDateString()
                            : s.pro_started_at
                            ? new Date(s.pro_started_at).toLocaleDateString()
                            : '-'}
                        </td>
                        <td className="p-3 text-xs text-muted-foreground hidden md:table-cell">
                          {s.plan === 'trial' && s.trial_ends_at
                            ? new Date(s.trial_ends_at).toLocaleDateString()
                            : s.pro_ends_at
                            ? new Date(s.pro_ends_at).toLocaleDateString()
                            : 'Indefinite'}
                        </td>
                        <td className="p-3">{statusBadge(s.plan, s.status)}</td>
                        <td className="p-3 text-right">
                          <div className="flex items-center justify-end gap-1 flex-wrap">
                            {s.plan !== 'pro' && s.status !== 'cancelled' && (
                              <Button
                                size="sm"
                                variant="outline"
                                className="text-xs rounded-md gap-1"
                                onClick={() => updatePlan.mutate({
                                  subId: s.id,
                                  updates: { plan: 'pro', status: 'active', pro_started_at: new Date().toISOString() },
                                })}
                              >
                                <Crown className="h-3 w-3" /> Upgrade to Pro
                              </Button>
                            )}
                            {s.status === 'active' && (
                              <Button
                                size="sm"
                                variant="outline"
                                className="text-xs text-destructive rounded-md"
                                onClick={() => updatePlan.mutate({
                                  subId: s.id,
                                  updates: { status: 'cancelled' },
                                })}
                              >
                                Cancel
                              </Button>
                            )}
                            {s.status === 'cancelled' && (
                              <Button
                                size="sm"
                                variant="outline"
                                className="text-xs rounded-md gap-1"
                                onClick={() => updatePlan.mutate({
                                  subId: s.id,
                                  updates: { status: 'active' },
                                })}
                              >
                                <Check className="h-3 w-3" /> Reactivate
                              </Button>
                            )}
                          </div>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </TabsContent>

          {/* Settings Tab */}
          <TabsContent value="settings">
            <Card className="bg-card border-border max-w-lg">
              <CardHeader>
                <CardTitle className="text-base flex items-center gap-2">
                  <Settings className="h-4 w-4" /> Creator Pro Plan Settings
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-5">
                <div className="space-y-2">
                  <Label className="text-sm font-medium">Monthly Price (₹)</Label>
                  <div className="relative">
                    <IndianRupee className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                    <Input
                      type="number"
                      value={proPrice}
                      onChange={e => setProPrice(e.target.value)}
                      className="pl-9"
                      min={0}
                    />
                  </div>
                  <p className="text-xs text-muted-foreground">This price is shown on the Creator Pro upgrade page</p>
                </div>

                <div className="space-y-2">
                  <Label className="text-sm font-medium">Free Trial Duration (days)</Label>
                  <div className="relative">
                    <Clock className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                    <Input
                      type="number"
                      value={trialDays}
                      onChange={e => setTrialDays(e.target.value)}
                      className="pl-9"
                      min={0}
                      max={90}
                    />
                  </div>
                  <p className="text-xs text-muted-foreground">0 = disable free trial for creators</p>
                </div>

                <div className="space-y-2">
                  <Label className="text-sm font-medium">Creator Pro Feature</Label>
                  <Select value={proEnabled} onValueChange={setProEnabled}>
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="true">Enabled — creators can see & request Pro</SelectItem>
                      <SelectItem value="false">Disabled — hide Pro from creators</SelectItem>
                    </SelectContent>
                  </Select>
                </div>

                <div className="border-t border-border pt-4">
                  <Button
                    onClick={() => saveSettings.mutate()}
                    disabled={saveSettings.isPending}
                    className="w-full gap-2"
                  >
                    <Shield className="h-4 w-4" />
                    {saveSettings.isPending ? 'Saving...' : 'Save Pro Settings'}
                  </Button>
                </div>
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>
      </div>
    </AdminDashboardLayout>
  );
};

export default AdminCreatorPro;
