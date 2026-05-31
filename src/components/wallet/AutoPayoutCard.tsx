import { useEffect, useState } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { usePlatformSettings } from '@/hooks/usePlatformSettings';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Switch } from '@/components/ui/switch';
import { useToast } from '@/hooks/use-toast';
import { CalendarClock, Loader2 } from 'lucide-react';

const AutoPayoutCard = () => {
  const { user } = useAuth();
  const { toast } = useToast();
  const qc = useQueryClient();
  const { raw } = usePlatformSettings();
  const minAmount = Number(raw?.auto_payout_min_amount) || 500;
  const globallyEnabled = (raw?.auto_payout_enabled ?? 'true') === 'true';

  const { data: profile } = useQuery({
    queryKey: ['auto-payout-profile', user?.id],
    queryFn: async () => {
      const { data } = await supabase
        .from('profiles')
        .select('auto_payout_enabled, payout_method, payout_upi_id, payout_bank_name, payout_account_holder, payout_account_number, payout_ifsc_code, pan_number')
        .eq('id', user!.id)
        .maybeSingle();
      return data;
    },
    enabled: !!user,
  });

  const [enabled, setEnabled] = useState(true);
  const [method, setMethod] = useState<'upi' | 'bank'>('upi');
  const [upiId, setUpiId] = useState('');
  const [bankName, setBankName] = useState('');
  const [accountHolder, setAccountHolder] = useState('');
  const [accountNumber, setAccountNumber] = useState('');
  const [ifscCode, setIfscCode] = useState('');
  const [pan, setPan] = useState('');
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (!profile) return;
    setEnabled(profile.auto_payout_enabled ?? true);
    setMethod((profile.payout_method as 'upi' | 'bank') || (profile.payout_bank_name ? 'bank' : 'upi'));
    setUpiId(profile.payout_upi_id || '');
    setBankName(profile.payout_bank_name || '');
    setAccountHolder(profile.payout_account_holder || '');
    setAccountNumber(profile.payout_account_number || '');
    setIfscCode(profile.payout_ifsc_code || '');
    setPan(profile.pan_number || '');
  }, [profile]);

  const save = async () => {
    if (!user) return;

    let payoutFields: {
      payout_upi_id?: string | null;
      payout_bank_name?: string | null;
      payout_account_holder?: string | null;
      payout_account_number?: string | null;
      payout_ifsc_code?: string | null;
    } = {};

    if (method === 'upi') {
      if (!/^[a-zA-Z0-9._-]+@[a-zA-Z]{2,}$/.test(upiId.trim())) {
        toast({ title: 'Invalid UPI ID (e.g. name@bank)', variant: 'destructive' }); return;
      }
      payoutFields = { payout_upi_id: upiId.trim() };
    } else {
      if (!bankName.trim() || !accountHolder.trim()) { toast({ title: 'Bank name & holder required', variant: 'destructive' }); return; }
      if (!/^\d{9,18}$/.test(accountNumber.trim())) { toast({ title: 'Account number must be 9-18 digits', variant: 'destructive' }); return; }
      if (!/^[A-Z]{4}0[A-Z0-9]{6}$/.test(ifscCode.trim().toUpperCase())) { toast({ title: 'Invalid IFSC code', variant: 'destructive' }); return; }
      payoutFields = {
        payout_bank_name: bankName.trim(),
        payout_account_holder: accountHolder.trim(),
        payout_account_number: accountNumber.trim(),
        payout_ifsc_code: ifscCode.trim().toUpperCase(),
      };
    }

    const panUp = pan.trim().toUpperCase();
    if (!/^[A-Z]{5}[0-9]{4}[A-Z]$/.test(panUp)) { toast({ title: 'Valid PAN required (e.g. ABCDE1234F)', variant: 'destructive' }); return; }

    setSaving(true);
    const { error } = await supabase
      .from('profiles')
      .update({ auto_payout_enabled: enabled, payout_method: method, pan_number: panUp, ...payoutFields })
      .eq('id', user.id);
    setSaving(false);
    if (error) { toast({ title: 'Failed to save', description: error.message, variant: 'destructive' }); return; }
    toast({ title: 'Auto-payout details saved ✓' });
    qc.invalidateQueries({ queryKey: ['auto-payout-profile'] });
  };

  return (
    <div className="rounded-xl border border-border bg-card p-6 space-y-4">
      <div className="flex items-start justify-between gap-4">
        <div>
          <h2 className="font-heading text-base font-600 flex items-center gap-2">
            <CalendarClock className="h-4 w-4 text-primary" /> Automatic Weekly Payout
          </h2>
          <p className="text-xs text-muted-foreground mt-1">
            Automatically request a payout every week when your withdrawable balance crosses {`₹${minAmount}`}. No need to click withdraw each time.
          </p>
        </div>
        <Switch checked={enabled} onCheckedChange={setEnabled} />
      </div>

      {!globallyEnabled && (
        <div className="rounded-lg border border-accent/30 bg-accent/5 p-3 text-xs text-muted-foreground">
          Automatic payouts are currently paused platform-wide. Your preference will be saved and used when they resume.
        </div>
      )}

      <div className="space-y-3 pt-2 border-t border-border">
        <p className="text-xs font-medium text-muted-foreground">Saved payout details (used for both manual &amp; automatic payouts)</p>

        <div className="flex gap-2">
          <button type="button" onClick={() => setMethod('upi')}
            className={`rounded-md px-4 py-2 text-sm font-medium transition-colors ${method === 'upi' ? 'bg-primary text-primary-foreground' : 'bg-secondary text-muted-foreground'}`}>UPI</button>
          <button type="button" onClick={() => setMethod('bank')}
            className={`rounded-md px-4 py-2 text-sm font-medium transition-colors ${method === 'bank' ? 'bg-primary text-primary-foreground' : 'bg-secondary text-muted-foreground'}`}>Bank Transfer</button>
        </div>

        {method === 'upi' ? (
          <div><Label>UPI ID</Label><Input value={upiId} onChange={e => setUpiId(e.target.value)} placeholder="yourname@upi" className="mt-1 rounded-lg" /></div>
        ) : (
          <div className="space-y-3">
            <div><Label>Bank Name</Label><Input value={bankName} onChange={e => setBankName(e.target.value)} placeholder="State Bank of India" className="mt-1 rounded-lg" /></div>
            <div><Label>Account Holder Name</Label><Input value={accountHolder} onChange={e => setAccountHolder(e.target.value)} className="mt-1 rounded-lg" /></div>
            <div><Label>Account Number</Label><Input value={accountNumber} onChange={e => setAccountNumber(e.target.value.replace(/\D/g, ''))} className="mt-1 rounded-lg" /></div>
            <div><Label>IFSC Code</Label><Input value={ifscCode} onChange={e => setIfscCode(e.target.value.toUpperCase())} placeholder="SBIN0001234" className="mt-1 rounded-lg font-mono" /></div>
          </div>
        )}

        <div>
          <Label>PAN Number <span className="text-accent">(required by Indian tax law)</span></Label>
          <Input value={pan} onChange={e => setPan(e.target.value.toUpperCase())} placeholder="ABCDE1234F" maxLength={10} className="mt-1 rounded-lg font-mono" />
        </div>

        <Button onClick={save} disabled={saving} className="rounded-md bg-primary hover:bg-primary/90">
          {saving ? <Loader2 className="h-4 w-4 animate-spin" /> : 'Save Auto-Payout Settings'}
        </Button>
      </div>
    </div>
  );
};

export default AutoPayoutCard;
