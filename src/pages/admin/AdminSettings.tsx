import AdminDashboardLayout from '@/components/dashboard/AdminDashboardLayout';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Switch } from '@/components/ui/switch';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';
import { useState, useEffect, useMemo } from 'react';
import { Save, AlertTriangle, IndianRupee, Settings as SettingsIcon, Layers, Percent, Gift, Star, Cog, Film } from 'lucide-react';
// (commission calc lives inside CommissionStructureCard)
import VideoSettingsSection from '@/components/admin/VideoSettingsSection';
import CommissionStructureCard from '@/components/admin/CommissionStructureCard';
import { Tabs, TabsList, TabsTrigger, TabsContent } from '@/components/ui/tabs';

const AdminSettings = () => {
  const qc = useQueryClient();
  const [values, setValues] = useState<Record<string, string>>({});
  const [errors, setErrors] = useState<Record<string, string>>({});

  const { data: settings } = useQuery({
    queryKey: ['admin-settings'],
    queryFn: async () => {
      const { data } = await supabase.from('platform_settings').select('*');
      return data || [];
    },
  });

  useEffect(() => {
    if (settings) {
      const map: Record<string, string> = {};
      settings.forEach(s => { map[s.key] = s.value; });
      setValues(map);
    }
  }, [settings]);

  const setVal = (key: string, value: string) => {
    setValues(prev => ({ ...prev, [key]: value }));
    setErrors(prev => { const n = { ...prev }; delete n[key]; return n; });
  };

  const validate = (): boolean => {
    const errs: Record<string, string> = {};
    const num = (k: string, min: number, max: number, label: string) => {
      const n = Number(values[k]);
      if (isNaN(n) || n < min || n > max) errs[k] = `${label} must be ${min}–${max}`;
    };
    num('platform_course_platform_fee_percent', 0, 100, 'Platform-course platform fee');
    num('platform_course_affiliate_percent', 0, 100, 'Platform-course affiliate %');
    num('creator_course_platform_fee_percent', 0, 100, 'Creator-course platform fee');
    num('creator_course_creator_fee_percent', 0, 100, 'Creator-course creator fee');
    num('creator_course_affiliate_percent', 0, 100, 'Creator-course affiliate %');
    num('gateway_fee_percent', 0, 10, 'Gateway %');
    num('gst_rate_percent', 0, 50, 'GST rate');
    num('basic_price', 1, 49999, 'Standard course default');
    num('advanced_price', 1, 49999, 'Premium course default');
    num('min_payout_amount', 1, 100000, 'Min payout');
    if (!values.support_email?.includes('@')) errs.support_email = 'Invalid email';

    // Sums must equal 100
    const platSum = Number(values.platform_course_platform_fee_percent) + Number(values.platform_course_affiliate_percent);
    if (platSum !== 100) errs.platform_course_platform_fee_percent = 'Platform + affiliate must = 100%';
    const creSum = Number(values.creator_course_platform_fee_percent) + Number(values.creator_course_creator_fee_percent) + Number(values.creator_course_affiliate_percent);
    if (creSum !== 100) errs.creator_course_platform_fee_percent = 'Platform + creator + affiliate must = 100%';

    setErrors(errs);
    return Object.keys(errs).length === 0;
  };

  const saveMutation = useMutation({
    mutationFn: async () => {
      for (const [key, value] of Object.entries(values)) {
        const existing = settings?.find(s => s.key === key);
        if (existing) {
          await supabase.from('platform_settings').update({ value, updated_at: new Date().toISOString() }).eq('id', existing.id);
        } else {
          await supabase.from('platform_settings').insert({ key, value });
        }
      }
    },
    onSuccess: () => {
      toast.success('Settings saved successfully.');
      qc.invalidateQueries({ queryKey: ['admin-settings'] });
      qc.invalidateQueries({ queryKey: ['platform-settings'] });
    },
    onError: () => toast.error('Failed to save'),
  });

  // Course default prices (used in Platform Course Defaults section)
  const basicPrice = Number(values.basic_price) || 249;
  const advancedPrice = Number(values.advanced_price) || 499;

  // ---- Field helpers ----
  const NumberField = ({ k, label, prefix, suffix, hint }: { k: string; label: string; prefix?: string; suffix?: string; hint?: string }) => (
    <div className="space-y-1.5">
      <Label className="text-sm">{label}</Label>
      <div className="relative">
        {prefix && <span className="absolute left-3 top-1/2 -translate-y-1/2 text-sm text-muted-foreground">{prefix}</span>}
        <Input
          type="number"
          inputMode="decimal"
          value={values[k] ?? ''}
          onChange={e => setVal(k, e.target.value)}
          className={`bg-secondary border-border ${prefix ? 'pl-7' : ''} ${suffix ? 'pr-9' : ''} ${errors[k] ? 'border-destructive' : ''}`}
        />
        {suffix && <span className="absolute right-3 top-1/2 -translate-y-1/2 text-sm text-muted-foreground">{suffix}</span>}
      </div>
      {hint && !errors[k] && <p className="text-xs text-muted-foreground">{hint}</p>}
      {errors[k] && <p className="text-xs text-destructive">{errors[k]}</p>}
    </div>
  );

  const TextField = ({ k, label, hint }: { k: string; label: string; hint?: string }) => (
    <div className="space-y-1.5">
      <Label className="text-sm">{label}</Label>
      <Input
        value={values[k] ?? ''}
        onChange={e => setVal(k, e.target.value)}
        className={`bg-secondary border-border ${errors[k] ? 'border-destructive' : ''}`}
      />
      {hint && !errors[k] && <p className="text-xs text-muted-foreground">{hint}</p>}
      {errors[k] && <p className="text-xs text-destructive">{errors[k]}</p>}
    </div>
  );

  const ToggleField = ({ k, label, hint }: { k: string; label: string; hint?: string }) => (
    <div className="flex items-start justify-between gap-4 rounded-lg border border-border bg-secondary/40 p-3">
      <div className="min-w-0">
        <Label className="text-sm font-medium">{label}</Label>
        {hint && <p className="text-xs text-muted-foreground mt-0.5">{hint}</p>}
      </div>
      <Switch
        checked={values[k] === 'true'}
        onCheckedChange={v => setVal(k, v ? 'true' : 'false')}
      />
    </div>
  );

  const Row = ({ label, value, sub, accent }: { label: string; value: string; sub?: boolean; accent?: 'primary' | 'accent' | 'muted' }) => (
    <div className={`flex justify-between ${sub ? 'text-xs ml-4' : 'text-sm'}`}>
      <span className={accent === 'primary' ? 'text-primary' : accent === 'accent' ? 'text-accent' : 'text-muted-foreground'}>{label}</span>
      <span className={`font-medium ${accent === 'primary' ? 'text-primary' : accent === 'accent' ? 'text-accent' : ''}`}>{value}</span>
    </div>
  );

  const fmt = (n: number) => `₹${n.toFixed(2)}`;

  const handleSave = () => {
    if (validate()) saveMutation.mutate();
    else toast.error('Fix the highlighted errors');
  };

  const TABS = [
    { value: 'defaults', label: 'Course Defaults', icon: IndianRupee },
    { value: 'commission', label: 'Commission', icon: Percent },
    { value: 'referral', label: 'Referral', icon: Gift },
    { value: 'pro', label: 'Creator Pro', icon: Star },
    { value: 'general', label: 'General', icon: Cog },
    { value: 'video', label: 'Video & Player', icon: Film },
  ];

  return (
    <AdminDashboardLayout>
      <div className="space-y-5">
        {/* Sticky header with title + Save button top-right */}
        <div className="sticky top-0 z-20 -mx-4 sm:-mx-6 px-4 sm:px-6 py-3 bg-background/85 backdrop-blur-md border-b border-border">
          <div className="flex items-center justify-between gap-4">
            <div className="min-w-0">
              <h1 className="text-xl sm:text-2xl font-heading font-bold flex items-center gap-2">
                <SettingsIcon className="h-5 w-5 text-primary" /> Platform Settings
              </h1>
              <p className="text-xs text-muted-foreground mt-0.5 hidden sm:block">All pricing & commission values are read live from this page.</p>
            </div>
            <Button
              onClick={handleSave}
              disabled={saveMutation.isPending}
              size="sm"
              className="bg-primary hover:bg-primary/90 shadow-md shrink-0"
            >
              <Save className="h-4 w-4 sm:mr-2" />
              <span className="hidden sm:inline">{saveMutation.isPending ? 'Saving…' : 'Save All Settings'}</span>
            </Button>
          </div>
        </div>

        <div className="flex items-start gap-3 rounded-xl border border-warning/30 bg-warning/5 p-3 max-w-4xl">
          <AlertTriangle className="h-5 w-5 text-warning shrink-0 mt-0.5" />
          <div>
            <p className="text-sm font-medium text-warning">Creator share is protected</p>
            <p className="text-xs text-muted-foreground mt-1">
              Creators <strong>always</strong> receive their {values.creator_course_creator_fee_percent || 15}% of net.
              The {values.creator_course_affiliate_percent || 75}% affiliate share goes to the referrer if referred,
              or back to the creator if not referred.
            </p>
          </div>
        </div>

        <Tabs defaultValue="defaults" className="max-w-4xl">
          <div className="sticky top-[68px] z-10 -mx-4 sm:-mx-6 px-4 sm:px-6 py-2 bg-background/85 backdrop-blur-md border-b border-border overflow-x-auto">
            <TabsList className="inline-flex h-auto bg-secondary/60 p-1 gap-1 w-max">
              {TABS.map(t => {
                const Icon = t.icon;
                return (
                  <TabsTrigger
                    key={t.value}
                    value={t.value}
                    className="gap-1.5 px-3 py-2 text-sm whitespace-nowrap data-[state=active]:bg-background data-[state=active]:text-primary data-[state=active]:shadow-sm"
                  >
                    <Icon className="h-3.5 w-3.5" />
                    {t.label}
                  </TabsTrigger>
                );
              })}
            </TabsList>
          </div>

          <TabsContent value="defaults" className="mt-5">
            <Card className="bg-card border-border">
              <CardHeader>
                <CardTitle className="text-base flex items-center gap-2">
                  <IndianRupee className="h-4 w-4" /> Platform Course Defaults
                </CardTitle>
                <p className="text-xs text-muted-foreground mt-1">
                  These are default prices for Backupshala's <strong>own</strong> courses (Standard Bundle etc.).
                  Creator courses use creator-set pricing — these values do not affect them.
                </p>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="grid sm:grid-cols-2 gap-4">
                  <NumberField k="basic_price" label="Standard course default price" prefix="₹" hint="Default ₹249" />
                  <NumberField k="advanced_price" label="Premium course default price" prefix="₹" hint="Optional second default" />
                </div>
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="commission" className="mt-5">
            <CommissionStructureCard values={values} setVal={setVal} errors={errors} />
          </TabsContent>

          <TabsContent value="referral" className="mt-5">
            <Card className="bg-card border-border">
              <CardHeader><CardTitle className="text-base">Referral Program</CardTitle></CardHeader>
              <CardContent className="space-y-4">
                <div className="grid sm:grid-cols-2 gap-4">
                  <NumberField k="referral_hold_days" label="Referral Hold Period" suffix="days" />
                  <NumberField k="creator_hold_days" label="Creator Hold Period" suffix="days" />
                  <NumberField k="min_affiliate_payout" label="Min Affiliate Payout" prefix="₹" />
                </div>
                <ToggleField k="allow_non_student_affiliates" label="Allow Non-Student Affiliates" hint="If off, only enrolled students can earn referral commission." />
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="pro" className="mt-5">
            <Card className="bg-card border-border">
              <CardHeader><CardTitle className="text-base">Creator Pro</CardTitle></CardHeader>
              <CardContent className="space-y-4">
                <ToggleField k="creator_pro_enabled" label="Creator Pro Enabled" />
                <div className="grid sm:grid-cols-2 gap-4">
                  <NumberField k="creator_pro_monthly_price" label="Monthly Price" prefix="₹" />
                  <NumberField k="creator_pro_annual_price" label="Annual Price" prefix="₹" />
                  <NumberField k="creator_pro_trial_days" label="Trial Days" suffix="days" />
                </div>
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="general" className="mt-5">
            <Card className="bg-card border-border">
              <CardHeader><CardTitle className="text-base">General</CardTitle></CardHeader>
              <CardContent className="space-y-4">
                <TextField k="platform_name" label="Platform Name" />
                <TextField k="support_email" label="Support Email" />
                <NumberField k="min_payout_amount" label="Minimum Payout" prefix="₹" />
                <div className="space-y-1.5">
                  <Label className="text-sm">Payout Cycle</Label>
                  <Select value={values.payout_cycle || 'manual'} onValueChange={v => setVal('payout_cycle', v)}>
                    <SelectTrigger className="bg-secondary border-border"><SelectValue /></SelectTrigger>
                    <SelectContent>
                      <SelectItem value="manual">Manual</SelectItem>
                      <SelectItem value="every_15_days">Every 15 Days</SelectItem>
                      <SelectItem value="monthly">Monthly</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <ToggleField k="razorpay_enabled" label="Razorpay Enabled" />
                <ToggleField k="maintenance_mode" label="Maintenance Mode" hint="Blocks new signups & purchases when on." />
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="video" className="mt-5">
            <VideoSettingsSection values={values} setVal={setVal} />
          </TabsContent>
        </Tabs>
      </div>
    </AdminDashboardLayout>
  );
};

export default AdminSettings;
