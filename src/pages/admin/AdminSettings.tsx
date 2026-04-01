import AdminDashboardLayout from '@/components/dashboard/AdminDashboardLayout';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';
import { useState, useEffect } from 'react';
import { Save } from 'lucide-react';

const AdminSettings = () => {
  const qc = useQueryClient();
  const [values, setValues] = useState<Record<string, string>>({});

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
      toast.success('Settings saved');
      qc.invalidateQueries({ queryKey: ['admin-settings'] });
    },
    onError: () => toast.error('Failed to save'),
  });

  const settingsConfig = [
    { key: 'platform_name', label: 'Platform Name', type: 'text' },
    { key: 'default_commission_percent', label: 'Default Commission %', type: 'number' },
    { key: 'default_platform_fee_percent', label: 'Default Platform Fee %', type: 'number' },
    { key: 'min_payout_amount', label: 'Minimum Payout Amount (₹)', type: 'number' },
    { key: 'support_email', label: 'Support Email', type: 'email' },
    { key: 'razorpay_enabled', label: 'Razorpay Enabled (true/false)', type: 'text' },
  ];

  return (
    <AdminDashboardLayout>
      <div className="space-y-6">
        <h1 className="text-2xl font-heading font-bold">Platform Settings</h1>
        <Card className="bg-card border-border max-w-2xl">
          <CardHeader><CardTitle className="text-base">General Settings</CardTitle></CardHeader>
          <CardContent className="space-y-4">
            {settingsConfig.map(cfg => (
              <div key={cfg.key} className="space-y-1.5">
                <Label className="text-sm">{cfg.label}</Label>
                <Input
                  type={cfg.type}
                  value={values[cfg.key] || ''}
                  onChange={e => setValues(prev => ({ ...prev, [cfg.key]: e.target.value }))}
                  className="bg-secondary border-border"
                />
              </div>
            ))}
            <Button onClick={() => saveMutation.mutate()} disabled={saveMutation.isPending} className="bg-primary hover:bg-primary/90">
              <Save className="h-4 w-4 mr-2" /> Save Settings
            </Button>
          </CardContent>
        </Card>
      </div>
    </AdminDashboardLayout>
  );
};

export default AdminSettings;
