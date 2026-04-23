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
import { Save, AlertTriangle, IndianRupee } from 'lucide-react';
import { calculateSaleSplit, getCommissionConfig } from '@/lib/tierPricing';
import VideoSettingsSection from '@/components/admin/VideoSettingsSection';

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
    num('platform_fee_free', 1, 49, 'Free creator fee');
    num('platform_fee_pro', 1, 49, 'Pro creator fee');
    num('referral_commission_percent', 0, 100, 'Referral %');
    num('gateway_fee_percent', 0, 10, 'Gateway %');
    num('basic_price', 1, 10000, 'Basic price');
    num('advanced_price', 1, 20000, 'Advanced price');
    if (Number(values.advanced_price) <= Number(values.basic_price)) {
      errs.advanced_price = 'Advanced price must be > Basic price';
    }
    if (values.gst_enabled === 'true') num('gst_rate_percent', 0, 50, 'GST rate');
    num('min_payout_amount', 1, 100000, 'Min payout');
    if (!values.support_email?.includes('@')) errs.support_email = 'Invalid email';
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

  // ---- Live preview using shared calculator ----
  const cfg = useMemo(() => getCommissionConfig(values), [values]);
  const basicPrice = Number(values.basic_price) || 249;
  const advancedPrice = Number(values.advanced_price) || 499;
  const upgradePrice = Math.max(0, advancedPrice - basicPrice);
  const splitBasic = useMemo(() => calculateSaleSplit(basicPrice, cfg, false), [basicPrice, cfg]);
  const splitAdvanced = useMemo(() => calculateSaleSplit(advancedPrice, cfg, false), [advancedPrice, cfg]);

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

  return (
    <AdminDashboardLayout>
      <div className="space-y-6">
        <div>
          <h1 className="text-2xl font-heading font-bold">Platform Settings</h1>
          <p className="text-sm text-muted-foreground mt-1">All pricing & commission values are read live from this page. No hardcoded numbers anywhere.</p>
        </div>

        <div className="flex items-start gap-3 rounded-xl border border-warning/30 bg-warning/5 p-4 max-w-3xl">
          <AlertTriangle className="h-5 w-5 text-warning shrink-0 mt-0.5" />
          <div>
            <p className="text-sm font-medium text-warning">Creator share is protected</p>
            <p className="text-xs text-muted-foreground mt-1">
              Creators <strong>always</strong> receive {100 - (Number(values.platform_fee_free) || 10)}% of the net amount. Referral commission is taken
              <strong> from the platform fee only</strong>, never from the creator's share.
            </p>
          </div>
        </div>

        <div className="grid gap-6 max-w-3xl">
          {/* ===== Tier Pricing ===== */}
          <Card className="bg-card border-border">
            <CardHeader>
              <CardTitle className="text-base flex items-center gap-2">
                <IndianRupee className="h-4 w-4" /> Course Tier Pricing
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid sm:grid-cols-2 gap-4">
                <NumberField k="basic_price" label="Basic Tier Price" prefix="₹" hint="Default ₹249" />
                <NumberField k="advanced_price" label="Advanced Tier Price" prefix="₹" hint="Default ₹499" />
              </div>
              <div className="rounded-lg border border-accent/30 bg-accent/5 p-3 text-sm">
                <span className="text-muted-foreground">Upgrade price (auto-calculated): </span>
                <span className="font-semibold text-accent">₹{upgradePrice}</span>
              </div>
            </CardContent>
          </Card>

          {/* ===== Commission ===== */}
          <Card className="bg-card border-border">
            <CardHeader><CardTitle className="text-base">Commission & Fees</CardTitle></CardHeader>
            <CardContent className="space-y-4">
              <div className="grid sm:grid-cols-2 gap-4">
                <NumberField k="platform_fee_free" label="Platform Fee (Free Creator)" suffix="%" hint="Typical: 10%" />
                <NumberField k="platform_fee_pro" label="Platform Fee (Pro Creator)" suffix="%" hint="Typical: 10%" />
                <NumberField k="gateway_fee_percent" label="Razorpay Gateway Fee" suffix="%" hint="Typical: 2%" />
                <NumberField k="referral_commission_percent" label="Referral % (of platform fee)" suffix="%" hint="Default 70% → ₹17 of ₹25 platform fee" />
              </div>
            </CardContent>
          </Card>

          {/* ===== GST ===== */}
          <Card className="bg-card border-border">
            <CardHeader><CardTitle className="text-base">GST</CardTitle></CardHeader>
            <CardContent className="space-y-4">
              <ToggleField k="gst_enabled" label="GST Enabled" hint="Turn on after crossing ₹20 lakh annual revenue. Prices become GST-inclusive and receipts show tax breakdown." />
              {values.gst_enabled === 'true' && (
                <NumberField k="gst_rate_percent" label="GST Rate" suffix="%" hint="Standard: 18%" />
              )}
            </CardContent>
          </Card>

          {/* ===== Live Preview ===== */}
          <Card className="bg-card border-border">
            <CardHeader>
              <CardTitle className="text-base">Live Earnings Preview</CardTitle>
            </CardHeader>
            <CardContent className="grid sm:grid-cols-2 gap-4">
              {[{ label: 'Basic', s: splitBasic, price: basicPrice }, { label: 'Advanced', s: splitAdvanced, price: advancedPrice }].map(({ label, s, price }) => (
                <div key={label} className="space-y-1.5 rounded-lg border border-border p-4">
                  <p className="text-xs uppercase tracking-wide text-muted-foreground">{label} sale (₹{price})</p>
                  <Row label="Customer pays" value={fmt(s.customerPays)} />
                  {cfg.gstEnabled && (
                    <>
                      <Row label={`– GST (${cfg.gstRatePct}%)`} value={`−${fmt(s.gstAmount)}`} sub />
                      <Row label="Base amount" value={fmt(s.baseAmount)} sub />
                    </>
                  )}
                  <Row label={`– Gateway (${cfg.gatewayFeePct}%)`} value={`−${fmt(s.gatewayFee)}`} sub />
                  <div className="border-t border-border pt-1.5">
                    <Row label="Net" value={fmt(s.netAmount)} sub />
                    <Row label="Creator earns" value={fmt(s.creatorShare)} accent="primary" />
                    <Row label="Platform fee" value={fmt(s.platformFee)} />
                    <Row label="↳ Referral (max)" value={fmt(s.referralCommission)} sub accent="accent" />
                    <Row label="↳ Platform keeps" value={fmt(s.platformKeeps)} sub />
                  </div>
                </div>
              ))}
            </CardContent>
          </Card>

          {/* ===== Affiliate ===== */}
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

          {/* ===== Creator Pro ===== */}
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

          {/* ===== General ===== */}
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

          <div className="sticky bottom-4 z-10">
            <Button onClick={() => { if (validate()) saveMutation.mutate(); else toast.error('Fix the highlighted errors'); }}
              disabled={saveMutation.isPending}
              className="bg-primary hover:bg-primary/90 w-full sm:w-auto shadow-lg">
              <Save className="h-4 w-4 mr-2" /> {saveMutation.isPending ? 'Saving…' : 'Save All Settings'}
            </Button>
          </div>
        </div>
      </div>
    </AdminDashboardLayout>
  );
};

export default AdminSettings;
