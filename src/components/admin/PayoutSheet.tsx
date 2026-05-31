import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { formatINR } from '@/lib/format';
import { toast } from 'sonner';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import {
  Copy, Check, Eye, EyeOff, Download, CheckCircle, Loader2, Users, Wallet,
} from 'lucide-react';

// ── helpers ──────────────────────────────────────────────────────────────
const maskAccount = (acc?: string | null) =>
  acc ? `${'•'.repeat(Math.max(acc.length - 4, 0))}${acc.slice(-4)}` : '';

const csvEscape = (v: unknown) => {
  const s = v == null ? '' : String(v);
  return /[",\n]/.test(s) ? `"${s.replace(/"/g, '""')}"` : s;
};

const methodLabel = (r: any) => (r.upi_id ? 'UPI' : r.account_number ? 'Bank' : '—');

// ── tiny copy-to-clipboard button ────────────────────────────────────────
const CopyButton = ({
  value, label, className = '',
}: { value?: string | null; label?: string; className?: string }) => {
  const [copied, setCopied] = useState(false);
  if (!value) return null;
  const onCopy = async () => {
    try {
      await navigator.clipboard.writeText(value);
      setCopied(true);
      toast.success(`${label || 'Value'} copied`);
      setTimeout(() => setCopied(false), 1200);
    } catch {
      toast.error('Could not copy');
    }
  };
  return (
    <Button
      type="button" size="icon" variant="ghost"
      onClick={onCopy}
      className={`h-6 w-6 shrink-0 text-muted-foreground hover:text-foreground ${className}`}
      title={`Copy ${label || ''}`.trim()}
    >
      {copied ? <Check className="h-3.5 w-3.5 text-primary" /> : <Copy className="h-3.5 w-3.5" />}
    </Button>
  );
};

// ── single field row (label + value + copy) ──────────────────────────────
const Field = ({
  label, value, mono = true, masked = false,
}: { label: string; value?: string | null; mono?: boolean; masked?: boolean }) => {
  const [revealed, setRevealed] = useState(false);
  if (!value) return null;
  const display = masked && !revealed ? maskAccount(value) : value;
  return (
    <div className="flex items-center gap-1.5 min-w-0">
      <span className="text-[10px] uppercase tracking-wide text-muted-foreground shrink-0">{label}</span>
      <span className={`text-xs truncate ${mono ? 'font-mono' : ''}`}>{display}</span>
      {masked && (
        <Button
          type="button" size="icon" variant="ghost"
          onClick={() => setRevealed((v) => !v)}
          className="h-6 w-6 shrink-0 text-muted-foreground hover:text-foreground"
          title={revealed ? 'Hide' : 'Reveal full'}
        >
          {revealed ? <EyeOff className="h-3.5 w-3.5" /> : <Eye className="h-3.5 w-3.5" />}
        </Button>
      )}
      <CopyButton value={value} label={label} />
    </div>
  );
};

interface PayoutSheetProps {
  /** When true renders a compact heading (used inside Payout Runs page). */
  compact?: boolean;
}

const PayoutSheet = ({ compact = false }: PayoutSheetProps) => {
  const qc = useQueryClient();
  const [utrById, setUtrById] = useState<Record<string, string>>({});

  const { data: requests, isLoading } = useQuery({
    queryKey: ['payout-sheet-pending'],
    queryFn: async () => {
      const { data } = await supabase
        .from('payout_requests')
        .select('*, profiles!payout_requests_user_id_fkey(full_name, email, pan_number)')
        .in('status', ['pending', 'processing'])
        .order('requested_at', { ascending: true });
      return data || [];
    },
  });

  const rows = requests || [];
  const total = rows.reduce((s: number, r: any) => s + Number(r.amount || 0), 0);

  const invokeComplete = async (id: string, utr: string) => {
    const { data, error } = await supabase.functions.invoke('admin-payout-action', {
      body: { action: 'complete', payout_id: id, utr },
    });
    if (error) {
      let msg = error.message;
      try {
        const parsed = JSON.parse((error as any).context?.body || '{}');
        if (parsed?.error) msg = parsed.error;
      } catch {}
      throw new Error(msg || 'Action failed');
    }
    if ((data as any)?.error) throw new Error((data as any).error);
    return data;
  };

  const markPaid = useMutation({
    mutationFn: async (id: string) => {
      const utr = (utrById[id] || '').trim();
      if (!utr) throw new Error('Enter the UTR / reference first');
      return invokeComplete(id, utr);
    },
    onSuccess: (_d, id) => {
      toast.success('Marked paid');
      setUtrById((m) => { const n = { ...m }; delete n[id]; return n; });
      qc.invalidateQueries({ queryKey: ['payout-sheet-pending'] });
      qc.invalidateQueries({ queryKey: ['admin-payout-requests'] });
    },
    onError: (e: any) => toast.error(e.message),
  });

  const pan = (r: any) => r.pan_number || r.profiles?.pan_number || '';

  const rowText = (r: any) => {
    const lines = [
      `Name: ${r.profiles?.full_name || ''}`,
      `Amount: ${formatINR(r.amount)}`,
      `Method: ${methodLabel(r)}`,
    ];
    if (r.upi_id) lines.push(`UPI: ${r.upi_id}`);
    if (r.account_number) {
      lines.push(`A/c Holder: ${r.account_holder_name || ''}`);
      lines.push(`A/c No: ${r.account_number}`);
      lines.push(`IFSC: ${r.ifsc_code || ''}`);
      if (r.bank_name) lines.push(`Bank: ${r.bank_name}`);
    }
    if (pan(r)) lines.push(`PAN: ${pan(r)}`);
    return lines.join('\n');
  };

  const copyRow = async (r: any) => {
    try {
      await navigator.clipboard.writeText(rowText(r));
      toast.success('Row copied');
    } catch {
      toast.error('Could not copy');
    }
  };

  const exportCSV = () => {
    const header = ['name', 'amount', 'method', 'account_holder', 'account_number', 'ifsc', 'bank', 'upi_id', 'pan'];
    const lines = rows.map((r: any) => [
      r.profiles?.full_name || '',
      r.amount,
      methodLabel(r),
      r.account_holder_name || '',
      r.account_number || '',
      r.ifsc_code || '',
      r.bank_name || '',
      r.upi_id || '',
      pan(r),
    ].map(csvEscape).join(','));
    const csv = [header.join(','), ...lines].join('\n');
    const blob = new Blob([csv], { type: 'text/csv' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `payout-sheet-${new Date().toISOString().slice(0, 10)}.csv`;
    a.click();
    URL.revokeObjectURL(url);
  };

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h2 className={`font-heading font-bold flex items-center gap-2 ${compact ? 'text-lg' : 'text-xl'}`}>
            <Wallet className="h-5 w-5 text-primary" /> This week's payout sheet
          </h2>
          <p className="text-sm text-muted-foreground mt-0.5 flex items-center gap-1">
            <Users className="h-3.5 w-3.5" />
            <span className="font-semibold text-foreground">{formatINR(total)}</span> to {rows.length}{' '}
            {rows.length === 1 ? 'person' : 'people'} this week
          </p>
        </div>
        <Button size="sm" variant="outline" onClick={exportCSV} disabled={rows.length === 0}>
          <Download className="h-4 w-4 mr-1" /> Export CSV
        </Button>
      </div>

      {isLoading ? (
        <Card className="bg-card border-border"><CardContent className="py-10 text-center text-muted-foreground">Loading…</CardContent></Card>
      ) : rows.length === 0 ? (
        <Card className="bg-card border-border"><CardContent className="py-10 text-center text-muted-foreground">No pending payouts. You're all caught up 🎉</CardContent></Card>
      ) : (
        <div className="space-y-3">
          {rows.map((r: any) => (
            <Card key={r.id} className="bg-card border-border">
              <CardContent className="p-4 space-y-3">
                {/* top line: name + amount + method + copy-all */}
                <div className="flex flex-wrap items-center justify-between gap-2">
                  <div className="flex items-center gap-2 min-w-0">
                    <div className="min-w-0">
                      <p className="font-semibold truncate flex items-center gap-1">
                        {r.profiles?.full_name || 'Unknown'}
                        <CopyButton value={r.profiles?.full_name} label="Name" />
                      </p>
                      <p className="text-xs text-muted-foreground truncate">{r.profiles?.email}</p>
                    </div>
                  </div>
                  <div className="flex items-center gap-2">
                    <Badge variant="secondary" className="border-0">{methodLabel(r)}</Badge>
                    {r.source === 'auto_weekly' && (
                      <Badge variant="secondary" className="border-0 bg-blue-100 text-blue-700 text-[10px]">Auto</Badge>
                    )}
                    <span className="font-bold text-primary flex items-center gap-1">
                      {formatINR(r.amount)}
                      <CopyButton value={String(r.amount)} label="Amount" />
                    </span>
                    <Button size="sm" variant="outline" className="h-7 text-xs" onClick={() => copyRow(r)}>
                      <Copy className="h-3 w-3 mr-1" /> Copy all
                    </Button>
                  </div>
                </div>

                {/* payment fields */}
                <div className="flex flex-wrap gap-x-5 gap-y-1.5 rounded-lg bg-muted/40 p-2.5">
                  <Field label="UPI" value={r.upi_id} />
                  <Field label="Holder" value={r.account_holder_name} mono={false} />
                  <Field label="A/c No" value={r.account_number} masked />
                  <Field label="IFSC" value={r.ifsc_code} />
                  <Field label="Bank" value={r.bank_name} mono={false} />
                  <Field label="PAN" value={pan(r)} />
                </div>

                {/* inline mark-paid */}
                <div className="flex flex-wrap items-center gap-2">
                  <Input
                    value={utrById[r.id] || ''}
                    onChange={(e) => setUtrById((m) => ({ ...m, [r.id]: e.target.value }))}
                    placeholder="UTR / transaction reference"
                    className="h-8 text-xs max-w-xs"
                  />
                  <Button
                    size="sm"
                    className="h-8 text-xs bg-primary hover:bg-primary/90"
                    disabled={markPaid.isPending && markPaid.variables === r.id}
                    onClick={() => markPaid.mutate(r.id)}
                  >
                    {markPaid.isPending && markPaid.variables === r.id
                      ? <Loader2 className="h-3.5 w-3.5 mr-1 animate-spin" />
                      : <CheckCircle className="h-3.5 w-3.5 mr-1" />}
                    Mark paid
                  </Button>
                  {r.status === 'processing' && (
                    <Badge variant="secondary" className="border-0 bg-blue-100 text-blue-700 text-[10px]">processing</Badge>
                  )}
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
};

export default PayoutSheet;
