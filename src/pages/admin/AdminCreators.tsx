import AdminDashboardLayout from '@/components/dashboard/AdminDashboardLayout';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';
import { CheckCircle, XCircle, Star, Shield, BadgeCheck, Percent } from 'lucide-react';
import { format } from 'date-fns';
import { useState } from 'react';
import { useAuth } from '@/contexts/AuthContext';

const AdminCreators = () => {
  const { user } = useAuth();
  const qc = useQueryClient();
  const [grantDialog, setGrantDialog] = useState<{ id: string; name: string } | null>(null);
  const [grantDuration, setGrantDuration] = useState('1');
  const [grantReason, setGrantReason] = useState('');
  const [feeDialog, setFeeDialog] = useState<{ id: string; name: string; current: number | null } | null>(null);
  const [feeValue, setFeeValue] = useState('');

  const { data: creators, isLoading } = useQuery({
    queryKey: ['admin-creators'],
    queryFn: async () => {
      const { data } = await supabase.from('profiles')
        .select('*, creator_pro_subscriptions(plan, status, pro_ends_at)')
        .eq('is_creator', true)
        .order('created_at', { ascending: false });
      return data || [];
    },
  });

  const approveMutation = useMutation({
    mutationFn: async ({ id, approve }: { id: string; approve: boolean }) => {
      // On approve: also auto-grant Creator Pro (free, lifetime — KYC benefit)
      const updates: any = { creator_approved: approve };
      if (approve) updates.is_creator_pro = true;
      const { error } = await supabase.from('profiles').update(updates).eq('id', id);
      if (error) throw error;

      if (approve) {
        await supabase.from('creator_pro_subscriptions').upsert({
          creator_id: id,
          plan: 'annual',
          status: 'active',
          pro_started_at: new Date().toISOString(),
          pro_ends_at: null,
          amount_per_month: 0,
          razorpay_subscription_id: 'kyc_grant',
          updated_at: new Date().toISOString(),
        }, { onConflict: 'creator_id' });
      }

      await supabase.from('admin_audit_log').insert({
        admin_id: user!.id,
        action: approve ? 'approve_creator_kyc' : 'reject_creator',
        target_type: 'creator',
        target_id: id,
        details: approve ? { note: 'Creator Pro granted automatically on KYC approval' } : {},
      });
    },
    onSuccess: (_, { approve }) => {
      toast.success(approve ? 'Creator approved — Pro granted' : 'Creator rejected');
      qc.invalidateQueries({ queryKey: ['admin-creators'] });
    },
    onError: () => toast.error('Action failed'),
  });

  const verifyMutation = useMutation({
    mutationFn: async ({ id, verified }: { id: string; verified: boolean }) => {
      const { error } = await supabase.from('profiles').update({ is_verified: verified } as any).eq('id', id);
      if (error) throw error;
      await supabase.from('admin_audit_log').insert({
        admin_id: user!.id, action: verified ? 'verify_creator' : 'unverify_creator',
        target_type: 'creator', target_id: id,
      });
    },
    onSuccess: () => { qc.invalidateQueries({ queryKey: ['admin-creators'] }); toast.success('Updated'); },
  });

  const grantProMutation = useMutation({
    mutationFn: async () => {
      if (!grantDialog) return;
      const months = Number(grantDuration);
      const now = new Date();
      const expiresAt = months === 0 ? null : new Date(now.getTime() + months * 30 * 24 * 60 * 60 * 1000);

      await supabase.from('creator_pro_subscriptions').upsert({
        creator_id: grantDialog.id,
        plan: 'pro',
        status: 'active',
        pro_started_at: now.toISOString(),
        pro_ends_at: expiresAt?.toISOString() || null,
        amount_per_month: 0,
        razorpay_subscription_id: 'admin_grant',
        updated_at: now.toISOString(),
      }, { onConflict: 'creator_id' });

      await supabase.from('profiles').update({ is_creator_pro: true }).eq('id', grantDialog.id);

      await supabase.from('admin_audit_log').insert({
        admin_id: user!.id, action: 'grant_pro', target_type: 'creator', target_id: grantDialog.id,
        details: { duration_months: months === 0 ? 'lifetime' : months, reason: grantReason },
      });
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['admin-creators'] });
      toast.success('Pro granted!');
      setGrantDialog(null); setGrantReason('');
    },
    onError: () => toast.error('Failed'),
  });

  const revokeProMutation = useMutation({
    mutationFn: async (id: string) => {
      await supabase.from('creator_pro_subscriptions').update({ status: 'expired' }).eq('creator_id', id);
      await supabase.from('profiles').update({ is_creator_pro: false }).eq('id', id);
      await supabase.from('admin_audit_log').insert({
        admin_id: user!.id, action: 'revoke_pro', target_type: 'creator', target_id: id,
      });
    },
    onSuccess: () => { qc.invalidateQueries({ queryKey: ['admin-creators'] }); toast.success('Pro revoked'); },
  });

  const setFeeMutation = useMutation({
    mutationFn: async () => {
      if (!feeDialog) return;
      const trimmed = feeValue.trim();
      const newFee: number | null = trimmed === '' ? null : Number(trimmed);
      if (newFee !== null && (isNaN(newFee) || newFee < 0 || newFee > 49)) {
        throw new Error('Fee must be 0–49% or empty to reset');
      }
      const { error } = await supabase.from('profiles')
        .update({ custom_platform_fee: newFee })
        .eq('id', feeDialog.id);
      if (error) throw error;
      await supabase.from('admin_audit_log').insert({
        admin_id: user!.id,
        action: newFee === null ? 'reset_creator_fee' : 'set_creator_fee',
        target_type: 'creator',
        target_id: feeDialog.id,
        details: { previous: feeDialog.current, new: newFee },
      });
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['admin-creators'] });
      toast.success('Custom fee updated');
      setFeeDialog(null); setFeeValue('');
    },
    onError: (e: any) => toast.error(e.message || 'Failed'),
  });

  return (
    <AdminDashboardLayout>
      <div className="space-y-6">
        <h1 className="text-2xl font-heading font-bold">Creator Management</h1>
        <Card className="bg-card border-border">
          <CardContent className="p-0 overflow-x-auto">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Name</TableHead>
                  <TableHead>Email</TableHead>
                  <TableHead>Category</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead>Tier</TableHead>
                  <TableHead>Fee</TableHead>
                  <TableHead>Pro Expires</TableHead>
                  <TableHead>Joined</TableHead>
                  <TableHead className="text-right">Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {isLoading ? (
                  <TableRow><TableCell colSpan={9} className="text-center text-muted-foreground py-8">Loading…</TableCell></TableRow>
                ) : (creators || []).map((c: any) => {
                  const proSub = c.creator_pro_subscriptions?.[0] || c.creator_pro_subscriptions;
                  const isPro = proSub && proSub.status === 'active';
                  const proExpires = proSub?.pro_ends_at;
                  return (
                    <TableRow key={c.id}>
                      <TableCell className="font-medium">
                        <div className="flex items-center gap-1.5">
                          {c.creator_display_name || c.full_name}
                          {c.is_verified && <BadgeCheck className="h-3.5 w-3.5 text-blue-400" />}
                        </div>
                      </TableCell>
                      <TableCell className="text-muted-foreground">{c.email}</TableCell>
                      <TableCell>{c.creator_category || '—'}</TableCell>
                      <TableCell>
                        <Badge variant={c.creator_approved ? 'default' : 'secondary'} className={c.creator_approved ? 'bg-primary/20 text-primary border-0' : 'bg-accent/20 text-accent border-0'}>
                          {c.creator_approved ? 'Approved' : 'Pending'}
                        </Badge>
                      </TableCell>
                      <TableCell>
                        <Badge variant={isPro ? 'default' : 'secondary'} className={`border-0 ${isPro ? 'bg-accent/20 text-accent' : 'bg-secondary text-muted-foreground'}`}>
                          {isPro ? '⭐ Pro' : 'Free'}
                        </Badge>
                      </TableCell>
                      <TableCell>
                        {c.custom_platform_fee !== null && c.custom_platform_fee !== undefined ? (
                          <Badge className="bg-accent/15 text-accent border-0">{c.custom_platform_fee}% custom</Badge>
                        ) : (
                          <span className="text-xs text-muted-foreground">Default</span>
                        )}
                      </TableCell>
                      <TableCell className="text-muted-foreground text-xs">
                        {proExpires ? format(new Date(proExpires), 'dd MMM yyyy') : isPro ? 'Lifetime' : '—'}
                      </TableCell>
                      <TableCell className="text-muted-foreground">{format(new Date(c.created_at), 'dd MMM yyyy')}</TableCell>
                      <TableCell>
                        <div className="flex gap-1 justify-end flex-wrap">
                          {!c.creator_approved ? (
                            <>
                              <Button size="sm" onClick={() => approveMutation.mutate({ id: c.id, approve: true })} className="bg-primary hover:bg-primary/90 h-7 text-xs">
                                <CheckCircle className="h-3 w-3 mr-1" /> Approve
                              </Button>
                              <Button size="sm" variant="destructive" onClick={() => approveMutation.mutate({ id: c.id, approve: false })} className="h-7 text-xs">
                                <XCircle className="h-3 w-3 mr-1" /> Reject
                              </Button>
                            </>
                          ) : (
                            <Button size="sm" variant="outline" onClick={() => approveMutation.mutate({ id: c.id, approve: false })} className="h-7 text-xs">Revoke</Button>
                          )}
                          {!isPro ? (
                            <Button size="sm" variant="outline" onClick={() => setGrantDialog({ id: c.id, name: c.creator_display_name || c.full_name })} className="h-7 text-xs gap-1">
                              <Star className="h-3 w-3" /> Grant Pro
                            </Button>
                          ) : (
                            <Button size="sm" variant="outline" onClick={() => revokeProMutation.mutate(c.id)} className="h-7 text-xs text-destructive">Revoke Pro</Button>
                          )}
                          <Button size="sm" variant={c.is_verified ? 'default' : 'outline'} onClick={() => verifyMutation.mutate({ id: c.id, verified: !c.is_verified })} className="h-7 text-xs gap-1">
                            <BadgeCheck className="h-3 w-3" /> {c.is_verified ? 'Verified' : 'Verify'}
                          </Button>
                          <Button
                            size="sm"
                            variant="outline"
                            className="h-7 text-xs gap-1"
                            onClick={() => {
                              setFeeDialog({ id: c.id, name: c.creator_display_name || c.full_name, current: c.custom_platform_fee ?? null });
                              setFeeValue(c.custom_platform_fee !== null && c.custom_platform_fee !== undefined ? String(c.custom_platform_fee) : '');
                            }}
                          >
                            <Percent className="h-3 w-3" /> Fee
                          </Button>
                        </div>
                      </TableCell>
                    </TableRow>
                  );
                })}
              </TableBody>
            </Table>
          </CardContent>
        </Card>
      </div>

      {/* Grant Pro Dialog */}
      <Dialog open={!!grantDialog} onOpenChange={() => setGrantDialog(null)}>
        <DialogContent className="bg-card border-border max-w-sm">
          <DialogHeader><DialogTitle>Grant Pro to {grantDialog?.name}</DialogTitle></DialogHeader>
          <div className="space-y-4">
            <div>
              <Label className="text-sm">Duration</Label>
              <Select value={grantDuration} onValueChange={setGrantDuration}>
                <SelectTrigger className="mt-1"><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="1">1 Month</SelectItem>
                  <SelectItem value="3">3 Months</SelectItem>
                  <SelectItem value="6">6 Months</SelectItem>
                  <SelectItem value="12">1 Year</SelectItem>
                  <SelectItem value="0">Lifetime</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div>
              <Label className="text-sm">Reason</Label>
              <Textarea value={grantReason} onChange={e => setGrantReason(e.target.value)} placeholder="Partner, beta user, compensation..." className="mt-1" rows={2} />
            </div>
            <Button onClick={() => grantProMutation.mutate()} disabled={grantProMutation.isPending} className="w-full">
              Grant Creator Pro
            </Button>
          </div>
        </DialogContent>
      </Dialog>

      {/* Custom Fee Dialog */}
      <Dialog open={!!feeDialog} onOpenChange={() => setFeeDialog(null)}>
        <DialogContent className="bg-card border-border max-w-sm">
          <DialogHeader><DialogTitle>Custom Platform Fee — {feeDialog?.name}</DialogTitle></DialogHeader>
          <div className="space-y-4">
            <p className="text-xs text-muted-foreground">
              Override the default platform fee for this creator only. Range: 0–49%. Leave empty to reset to platform default.
            </p>
            <div>
              <Label className="text-sm">Custom Platform Fee %</Label>
              <Input
                type="number"
                value={feeValue}
                onChange={e => setFeeValue(e.target.value)}
                placeholder="e.g. 5"
                min={0}
                max={49}
                className="mt-1 bg-secondary border-border"
              />
              <p className="text-xs text-muted-foreground mt-1">
                Current: {feeDialog?.current !== null && feeDialog?.current !== undefined ? `${feeDialog.current}% custom` : 'Default'}
              </p>
            </div>
            <div className="flex gap-2">
              <Button onClick={() => setFeeMutation.mutate()} disabled={setFeeMutation.isPending} className="flex-1">
                Save
              </Button>
              {feeDialog?.current !== null && feeDialog?.current !== undefined && (
                <Button variant="outline" onClick={() => { setFeeValue(''); setFeeMutation.mutate(); }}>
                  Reset
                </Button>
              )}
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </AdminDashboardLayout>
  );
};

export default AdminCreators;
