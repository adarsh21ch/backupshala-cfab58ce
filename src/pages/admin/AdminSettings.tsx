import AdminDashboardLayout from '@/components/dashboard/AdminDashboardLayout';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';
import { useState, useEffect } from 'react';
import { Save, AlertTriangle } from 'lucide-react';

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

  const validate = (): boolean => {
    const errs: Record<string, string> = {};
    const feeFree = Number(values.platform_fee_free);
    if (isNaN(feeFree) || feeFree < 1 || feeFree > 49) errs.platform_fee_free = 'Must be 1–49%';
    const feePro = Number(values.platform_fee_pro);
    if (isNaN(feePro) || feePro < 1 || feePro > 49) errs.platform_fee_pro = 'Must be 1–49%';
    const refOfPlatform = Number(values.referral_commission_percent);
    if (isNaN(refOfPlatform) || refOfPlatform < 0 || refOfPlatform > 100)
      errs.referral_commission_percent = 'Must be 0–100% (of platform fee)';
    const gateway = Number(values.gateway_fee_percent);
    if (isNaN(gateway) || gateway < 0 || gateway > 10) errs.gateway_fee_percent = 'Must be 0–10%';
    const payout = Number(values.min_payout_amount);
    if (isNaN(payout) || payout < 1) errs.min_payout_amount = 'Must be at least ₹1';
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

  const settingsConfig = [
    { key: 'platform_name', label: 'Platform Name', type: 'text' },
    { key: 'platform_fee_free', label: 'Platform Fee % (Free Creators)', type: 'number' },
    { key: 'platform_fee_pro', label: 'Platform Fee % (Pro Creators)', type: 'number' },
    { key: 'default_commission_percent', label: 'Default Referral Commission %', type: 'number' },
    { key: 'min_payout_amount', label: 'Minimum Payout Amount (₹)', type: 'number' },
    { key: 'support_email', label: 'Support Email', type: 'email' },
    { key: 'razorpay_enabled', label: 'Razorpay Enabled (true/false)', type: 'text' },
    { key: 'maintenance_mode', label: 'Maintenance Mode (true/false)', type: 'text' },
  ];

  const affiliateConfig = [
    { key: 'affiliate_commission_percent', label: 'Affiliate Commission %', type: 'number' },
    { key: 'min_affiliate_payout', label: 'Min Affiliate Payout (₹)', type: 'number' },
    { key: 'allow_non_student_affiliates', label: 'Allow Non-Student Affiliates (true/false)', type: 'text' },
  ];

  const proConfig = [
    { key: 'creator_pro_monthly_price', label: 'Creator Pro Monthly Price (₹)', type: 'number' },
    { key: 'creator_pro_annual_price', label: 'Creator Pro Annual Price (₹)', type: 'number' },
    { key: 'creator_pro_enabled', label: 'Creator Pro Enabled (true/false)', type: 'text' },
    { key: 'creator_pro_trial_days', label: 'Creator Pro Trial Days', type: 'number' },
  ];

  const renderFields = (config: typeof settingsConfig) => config.map(cfg => (
    <div key={cfg.key} className="space-y-1.5">
      <Label className="text-sm">{cfg.label}</Label>
      <Input
        type={cfg.type}
        value={values[cfg.key] || ''}
        onChange={e => {
          setValues(prev => ({ ...prev, [cfg.key]: e.target.value }));
          setErrors(prev => { const n = { ...prev }; delete n[cfg.key]; return n; });
        }}
        className={`bg-secondary border-border ${errors[cfg.key] ? 'border-destructive' : ''}`}
      />
      {errors[cfg.key] && <p className="text-xs text-destructive">{errors[cfg.key]}</p>}
    </div>
  ));

  const renderDropdown = (key: string, label: string, options: { value: string; label: string }[]) => (
    <div className="space-y-1.5">
      <Label className="text-sm">{label}</Label>
      <Select value={values[key] || options[0].value} onValueChange={v => setValues(prev => ({ ...prev, [key]: v }))}>
        <SelectTrigger className="bg-secondary border-border"><SelectValue /></SelectTrigger>
        <SelectContent>
          {options.map(o => <SelectItem key={o.value} value={o.value}>{o.label}</SelectItem>)}
        </SelectContent>
      </Select>
    </div>
  );

  return (
    <AdminDashboardLayout>
      <div className="space-y-6">
        <h1 className="text-2xl font-heading font-bold">Platform Settings</h1>

        <div className="flex items-start gap-3 rounded-xl border border-yellow-500/30 bg-yellow-500/5 p-4 max-w-2xl">
          <AlertTriangle className="h-5 w-5 text-yellow-500 shrink-0 mt-0.5" />
          <div>
            <p className="text-sm font-medium text-yellow-400">Important</p>
            <p className="text-xs text-muted-foreground mt-1">
              Changing platform fees only affects <strong>NEW courses</strong> created after this change.
            </p>
          </div>
        </div>

        <div className="grid gap-6 max-w-2xl">
          <Card className="bg-card border-border">
            <CardHeader><CardTitle className="text-base">General Settings</CardTitle></CardHeader>
            <CardContent className="space-y-4">
              {renderFields(settingsConfig)}
              {renderDropdown('payout_cycle', 'Payout Cycle', [
                { value: 'manual', label: 'Manual' },
                { value: 'every_15_days', label: 'Every 15 Days' },
                { value: 'monthly', label: 'Monthly' },
              ])}
            </CardContent>
          </Card>

          <Card className="bg-card border-border">
            <CardHeader><CardTitle className="text-base">Affiliate Program</CardTitle></CardHeader>
            <CardContent className="space-y-4">
              {renderFields(affiliateConfig)}
            </CardContent>
          </Card>

          <Card className="bg-card border-border">
            <CardHeader><CardTitle className="text-base">Creator Pro</CardTitle></CardHeader>
            <CardContent className="space-y-4">
              {renderFields(proConfig)}
            </CardContent>
          </Card>

          <Button onClick={() => { if (validate()) saveMutation.mutate(); }} disabled={saveMutation.isPending} className="bg-primary hover:bg-primary/90 w-full sm:w-auto">
            <Save className="h-4 w-4 mr-2" /> Save All Settings
          </Button>
        </div>
      </div>
    </AdminDashboardLayout>
  );
};

export default AdminSettings;
