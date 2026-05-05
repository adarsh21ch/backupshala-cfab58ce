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
import { useState, useEffect, useCallback, memo } from 'react';
import { Save, AlertTriangle, IndianRupee, Settings as SettingsIcon, Percent, Gift, Star, Cog, Film, X, Info } from 'lucide-react';
import VideoSettingsSection from '@/components/admin/VideoSettingsSection';
import CommissionStructureCard from '@/components/admin/CommissionStructureCard';
import { Tabs, TabsList, TabsTrigger, TabsContent } from '@/components/ui/tabs';

// ============================================================
// IMPORTANT: Field components are defined OUTSIDE the parent.
// Defining them inside caused React to remount the <input> on
// every keystroke (parent re-render → new component identity),
// which is why typing "1499" only registered the first character
// and dropped focus. Keep them out here.
// ============================================================

interface FieldProps {
  k: string;
  label: string;
  value: string;
  onChange: (value: string) => void;
  error?: string;
  hint?: string;
}

interface NumberFieldProps extends FieldProps {
  prefix?: string;
  suffix?: string;
}

const NumberField = memo(({ k, label, value, onChange, error, hint, prefix, suffix }: NumberFieldProps) => (
  <div className="space-y-1.5">
    <Label htmlFor={k} className="text-sm">{label}</Label>
    <div className="relative">
      {prefix && <span className="absolute left-3 top-1/2 -translate-y-1/2 text-sm text-muted-foreground pointer-events-none">{prefix}</span>}
      <Input
        id={k}
        type="number"
        inputMode="decimal"
        value={value ?? ''}
        onChange={e => onChange(e.target.value)}
        // Strip native spinner arrows — they overlap suffix labels and clutter the field.
        className={`bg-secondary border-border [appearance:textfield] [&::-webkit-outer-spin-button]:appearance-none [&::-webkit-inner-spin-button]:appearance-none ${prefix ? 'pl-7' : ''} ${suffix ? 'pr-12' : ''} ${error ? 'border-destructive' : ''}`}
      />
      {suffix && <span className="absolute right-3 top-1/2 -translate-y-1/2 text-xs text-muted-foreground pointer-events-none">{suffix}</span>}
    </div>
    {hint && !error && <p className="text-xs text-muted-foreground">{hint}</p>}
    {error && <p className="text-xs text-destructive">{error}</p>}
  </div>
));
NumberField.displayName = 'NumberField';

const TextField = memo(({ k, label, value, onChange, error, hint }: FieldProps) => (
  <div className="space-y-1.5">
    <Label htmlFor={k} className="text-sm">{label}</Label>
    <Input
      id={k}
      value={value ?? ''}
      onChange={e => onChange(e.target.value)}
      className={`bg-secondary border-border ${error ? 'border-destructive' : ''}`}
    />
    {hint && !error && <p className="text-xs text-muted-foreground">{hint}</p>}
    {error && <p className="text-xs text-destructive">{error}</p>}
  </div>
));
TextField.displayName = 'TextField';

interface ToggleFieldProps {
  k: string;
  label: string;
  checked: boolean;
  onChange: (v: boolean) => void;
  hint?: string;
}

const ToggleField = memo(({ k, label, checked, onChange, hint }: ToggleFieldProps) => (
  <div className="flex items-start justify-between gap-4 rounded-lg border border-border bg-secondary/40 p-3">
    <div className="min-w-0">
      <Label htmlFor={k} className="text-sm font-medium">{label}</Label>
      {hint && <p className="text-xs text-muted-foreground mt-0.5">{hint}</p>}
    </div>
    <Switch id={k} checked={checked} onCheckedChange={onChange} />
  </div>
));
ToggleField.displayName = 'ToggleField';

const AdminSettings = () => {
  const qc = useQueryClient();
  const [values, setValues] = useState<Record<string, string>>({});
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [showProtectedBanner, setShowProtectedBanner] = useState(() => {
    return localStorage.getItem('admin_settings_protected_banner_dismissed') !== 'true';
  });

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

  const setVal = useCallback((key: string, value: string) => {
    setValues(prev => ({ ...prev, [key]: value }));
    setErrors(prev => {
      if (!prev[key]) return prev;
      const n = { ...prev }; delete n[key]; return n;
    });
  }, []);

  const dismissBanner = () => {
    localStorage.setItem('admin_settings_protected_banner_dismissed', 'true');
    setShowProtectedBanner(false);
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

        {showProtectedBanner && (
          <div className="relative flex items-start gap-3 rounded-xl border border-warning/30 bg-warning/5 p-3 pr-10 max-w-4xl">
            <AlertTriangle className="h-5 w-5 text-warning shrink-0 mt-0.5" />
            <div>
              <p className="text-sm font-medium text-warning">Creator share is protected</p>
              <p className="text-xs text-muted-foreground mt-1">
                Creators <strong>always</strong> receive their {values.creator_course_creator_fee_percent || 15}% of net.
                The {values.creator_course_affiliate_percent || 75}% affiliate share goes to the referrer if referred,
                or back to the creator if not referred.
              </p>
            </div>
            <button
              type="button"
              onClick={dismissBanner}
              aria-label="Dismiss"
              className="absolute top-2 right-2 p-1 rounded-md text-muted-foreground hover:text-foreground hover:bg-secondary transition"
            >
              <X className="h-4 w-4" />
            </button>
          </div>
        )}

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
                  <NumberField k="basic_price" label="Standard course default price" value={values.basic_price} onChange={v => setVal('basic_price', v)} error={errors.basic_price} prefix="₹" hint="Default ₹249" />
                  <NumberField k="advanced_price" label="Premium course default price" value={values.advanced_price} onChange={v => setVal('advanced_price', v)} error={errors.advanced_price} prefix="₹" hint="Optional second default" />
                </div>
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="commission" className="mt-5">
            <CommissionStructureCard values={values} setVal={setVal} errors={errors} />
          </TabsContent>

          <TabsContent value="referral" className="mt-5">
            <Card className="bg-card border-border">
              <CardHeader>
                <CardTitle className="text-base flex items-center gap-2">
                  <Gift className="h-4 w-4 text-primary" /> Referral Program
                </CardTitle>
                <p className="text-xs text-muted-foreground mt-1">
                  Controls how long earnings stay on hold before becoming withdrawable, and the minimum amount affiliates can cash out.
                </p>
              </CardHeader>
              <CardContent className="space-y-5">
                <div className="grid sm:grid-cols-2 gap-4">
                  <NumberField
                    k="referral_hold_days"
                    label="Referral Hold Period"
                    value={values.referral_hold_days}
                    onChange={v => setVal('referral_hold_days', v)}
                    error={errors.referral_hold_days}
                    suffix="days"
                    hint="How many days a referral commission stays pending before the affiliate can withdraw it. Buffer for refunds & fraud checks. Recommended: 7 days."
                  />
                  <NumberField
                    k="creator_hold_days"
                    label="Creator Hold Period"
                    value={values.creator_hold_days}
                    onChange={v => setVal('creator_hold_days', v)}
                    error={errors.creator_hold_days}
                    suffix="days"
                    hint="How many days a creator's earnings stay pending before they can withdraw. Same purpose — protects against refunds. Recommended: 3 days."
                  />
                  <NumberField
                    k="min_affiliate_payout"
                    label="Min Affiliate Payout"
                    value={values.min_affiliate_payout}
                    onChange={v => setVal('min_affiliate_payout', v)}
                    error={errors.min_affiliate_payout}
                    prefix="₹"
                    hint="Minimum wallet balance an affiliate must reach before they can request a payout. Reduces transfer-fee waste on tiny amounts."
                  />
                </div>
                <ToggleField
                  k="allow_non_student_affiliates"
                  label="Allow Non-Student Affiliates"
                  checked={values.allow_non_student_affiliates === 'true'}
                  onChange={v => setVal('allow_non_student_affiliates', v ? 'true' : 'false')}
                  hint="If off, only enrolled students can earn referral commission."
                />
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="pro" className="mt-5">
            <Card className="bg-card border-border">
              <CardHeader>
                <CardTitle className="text-base flex items-center gap-2">
                  <Star className="h-4 w-4 text-accent" /> Creator Pro
                </CardTitle>
                <div className="mt-2 rounded-lg border border-info/20 bg-info/5 p-3 text-xs text-muted-foreground space-y-2">
                  <p className="flex items-start gap-2">
                    <Info className="h-3.5 w-3.5 text-info shrink-0 mt-0.5" />
                    <span>
                      <strong className="text-foreground">What is Creator Pro?</strong> A paid upgrade for creators on your platform. Pro creators unlock advanced tools (custom coupons, priority support, advanced analytics, higher upload limits, featured placement). It's an extra revenue stream for Backupshala on top of commission — creators pay you monthly/annually for the upgrade.
                    </span>
                  </p>
                  <p className="pl-5"><strong className="text-foreground">Who uses it?</strong> Creators who want more visibility and better tools. If you don't plan to offer this yet, just turn off "Creator Pro Enabled" below — the section will stay hidden from creators.</p>
                </div>
              </CardHeader>
              <CardContent className="space-y-4">
                <ToggleField
                  k="creator_pro_enabled"
                  label="Creator Pro Enabled"
                  checked={values.creator_pro_enabled === 'true'}
                  onChange={v => setVal('creator_pro_enabled', v ? 'true' : 'false')}
                  hint="When off, creators won't see the Pro upgrade option anywhere in the app."
                />
                <div className="grid sm:grid-cols-2 gap-4">
                  <NumberField k="creator_pro_monthly_price" label="Monthly Price" value={values.creator_pro_monthly_price} onChange={v => setVal('creator_pro_monthly_price', v)} error={errors.creator_pro_monthly_price} prefix="₹" hint="Charged monthly to creators who upgrade." />
                  <NumberField k="creator_pro_annual_price" label="Annual Price" value={values.creator_pro_annual_price} onChange={v => setVal('creator_pro_annual_price', v)} error={errors.creator_pro_annual_price} prefix="₹" hint="Discounted yearly plan." />
                  <NumberField k="creator_pro_trial_days" label="Trial Days" value={values.creator_pro_trial_days} onChange={v => setVal('creator_pro_trial_days', v)} error={errors.creator_pro_trial_days} suffix="days" hint="Free trial length. Set to 0 to disable trials." />
                </div>
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="general" className="mt-5">
            <Card className="bg-card border-border">
              <CardHeader><CardTitle className="text-base">General</CardTitle></CardHeader>
              <CardContent className="space-y-4">
                <TextField k="platform_name" label="Platform Name" value={values.platform_name} onChange={v => setVal('platform_name', v)} error={errors.platform_name} />
                <TextField k="legal_entity_name" label="Legal Entity Name" value={values.legal_entity_name} onChange={v => setVal('legal_entity_name', v)} error={errors.legal_entity_name} />
                <TextField k="support_email" label="Support Email" value={values.support_email} onChange={v => setVal('support_email', v)} error={errors.support_email} />
                <NumberField k="min_payout_amount" label="Minimum Payout" value={values.min_payout_amount} onChange={v => setVal('min_payout_amount', v)} error={errors.min_payout_amount} prefix="₹" hint="Smallest payout request the system will accept (creator side)." />
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
                <ToggleField
                  k="razorpay_enabled"
                  label="Razorpay Enabled"
                  checked={values.razorpay_enabled === 'true'}
                  onChange={v => setVal('razorpay_enabled', v ? 'true' : 'false')}
                />
                <ToggleField
                  k="maintenance_mode"
                  label="Maintenance Mode"
                  checked={values.maintenance_mode === 'true'}
                  onChange={v => setVal('maintenance_mode', v ? 'true' : 'false')}
                  hint="Blocks new signups & purchases when on."
                />

                <div className="pt-4 border-t border-border space-y-4">
                  <p className="text-sm font-semibold">GST & Legal</p>
                  <ToggleField
                    k="gst_enabled"
                    label="GST Enabled"
                    checked={values.gst_enabled === 'true'}
                    onChange={v => setVal('gst_enabled', v ? 'true' : 'false')}
                    hint="GST is extracted from the displayed price (price-inclusive)."
                  />
                  <div className="grid sm:grid-cols-2 gap-4">
                    <TextField k="gstin" label="GSTIN" value={values.gstin} onChange={v => setVal('gstin', v)} error={errors.gstin} />
                    <NumberField k="gst_rate_percent" label="GST Rate %" value={values.gst_rate_percent} onChange={v => setVal('gst_rate_percent', v)} error={errors.gst_rate_percent} suffix="%" />
                    <TextField k="business_state" label="Business State" value={values.business_state} onChange={v => setVal('business_state', v)} error={errors.business_state} />
                    <TextField k="hsn_sac_code" label="HSN / SAC Code" value={values.hsn_sac_code} onChange={v => setVal('hsn_sac_code', v)} error={errors.hsn_sac_code} />
                  </div>
                </div>
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
