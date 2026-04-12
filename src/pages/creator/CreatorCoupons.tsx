import { useState } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import CreatorDashboardLayout from '@/components/dashboard/CreatorDashboardLayout';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Switch } from '@/components/ui/switch';
import { Plus, Tag, Copy } from 'lucide-react';
import { toast } from 'sonner';
import { formatPrice } from '@/lib/format';

const CreatorCoupons = () => {
  const { user } = useAuth();
  const queryClient = useQueryClient();
  const [dialogOpen, setDialogOpen] = useState(false);
  const [code, setCode] = useState('');
  const [discountType, setDiscountType] = useState<'percent' | 'fixed'>('percent');
  const [discountValue, setDiscountValue] = useState('10');
  const [maxUses, setMaxUses] = useState('');
  const [courseId, setCourseId] = useState('all');
  const [validUntil, setValidUntil] = useState('');

  const { data: coupons, isLoading } = useQuery({
    queryKey: ['creator-coupons', user?.id],
    queryFn: async () => {
      const { data } = await supabase
        .from('coupon_codes')
        .select('*')
        .eq('creator_id', user!.id)
        .order('created_at', { ascending: false });
      return data || [];
    },
    enabled: !!user,
  });

  const { data: courses } = useQuery({
    queryKey: ['creator-courses-list', user?.id],
    queryFn: async () => {
      const { data } = await supabase
        .from('courses')
        .select('id, title')
        .eq('creator_id', user!.id)
        .in('status', ['published', 'draft']);
      return data || [];
    },
    enabled: !!user,
  });

  const createMutation = useMutation({
    mutationFn: async () => {
      const { error } = await supabase.from('coupon_codes').insert({
        code: code.trim().toUpperCase(),
        creator_id: user!.id,
        course_id: courseId === 'all' ? null : courseId,
        discount_type: discountType,
        discount_value: Number(discountValue),
        max_uses: maxUses ? Number(maxUses) : null,
        valid_until: validUntil || null,
      });
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['creator-coupons'] });
      toast.success('Coupon created!');
      setDialogOpen(false);
      setCode(''); setDiscountValue('10'); setMaxUses(''); setCourseId('all'); setValidUntil('');
    },
    onError: (err: any) => toast.error(err.message?.includes('unique') ? 'Code already exists' : err.message),
  });

  const toggleMutation = useMutation({
    mutationFn: async ({ id, active }: { id: string; active: boolean }) => {
      await supabase.from('coupon_codes').update({ is_active: active }).eq('id', id);
    },
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['creator-coupons'] }),
  });

  return (
    <CreatorDashboardLayout>
      <div className="space-y-6">
        <div className="flex items-center justify-between">
          <h1 className="font-heading text-2xl font-700">Coupon Codes</h1>
          <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
            <DialogTrigger asChild>
              <Button className="gap-2 rounded-lg"><Plus className="h-4 w-4" /> Create Coupon</Button>
            </DialogTrigger>
            <DialogContent className="bg-card border-border">
              <DialogHeader><DialogTitle>Create Coupon</DialogTitle></DialogHeader>
              <div className="space-y-4">
                <div>
                  <Label className="text-sm">Code *</Label>
                  <Input value={code} onChange={e => setCode(e.target.value.toUpperCase().replace(/[^A-Z0-9]/g, ''))} placeholder="e.g. LAUNCH50" maxLength={20} className="mt-1 rounded-lg font-mono" />
                </div>
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <Label className="text-sm">Discount Type</Label>
                    <Select value={discountType} onValueChange={(v: any) => setDiscountType(v)}>
                      <SelectTrigger className="mt-1 rounded-lg"><SelectValue /></SelectTrigger>
                      <SelectContent>
                        <SelectItem value="percent">Percentage (%)</SelectItem>
                        <SelectItem value="fixed">Fixed (₹)</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                  <div>
                    <Label className="text-sm">Value</Label>
                    <Input type="number" value={discountValue} onChange={e => setDiscountValue(e.target.value)} className="mt-1 rounded-lg" />
                  </div>
                </div>
                <div>
                  <Label className="text-sm">Applies To</Label>
                  <Select value={courseId} onValueChange={setCourseId}>
                    <SelectTrigger className="mt-1 rounded-lg"><SelectValue /></SelectTrigger>
                    <SelectContent>
                      <SelectItem value="all">All My Courses</SelectItem>
                      {courses?.map(c => <SelectItem key={c.id} value={c.id}>{c.title}</SelectItem>)}
                    </SelectContent>
                  </Select>
                </div>
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <Label className="text-sm">Max Uses (optional)</Label>
                    <Input type="number" value={maxUses} onChange={e => setMaxUses(e.target.value)} placeholder="Unlimited" className="mt-1 rounded-lg" />
                  </div>
                  <div>
                    <Label className="text-sm">Expires (optional)</Label>
                    <Input type="date" value={validUntil} onChange={e => setValidUntil(e.target.value)} className="mt-1 rounded-lg" />
                  </div>
                </div>
                <Button onClick={() => createMutation.mutate()} disabled={!code.trim() || !discountValue || createMutation.isPending} className="w-full rounded-lg">
                  Create Coupon
                </Button>
              </div>
            </DialogContent>
          </Dialog>
        </div>

        {isLoading ? (
          <p className="text-sm text-muted-foreground">Loading...</p>
        ) : !coupons?.length ? (
          <div className="rounded-xl border border-dashed border-border p-8 text-center">
            <Tag className="h-10 w-10 mx-auto text-muted-foreground/40 mb-3" />
            <p className="text-sm text-muted-foreground">No coupons yet. Create one to offer discounts!</p>
          </div>
        ) : (
          <div className="rounded-xl border border-border bg-card overflow-hidden">
            <table className="w-full text-sm">
              <thead className="border-b border-border bg-secondary/30">
                <tr>
                  <th className="text-left px-4 py-3 text-xs font-semibold text-muted-foreground">Code</th>
                  <th className="text-left px-4 py-3 text-xs font-semibold text-muted-foreground">Discount</th>
                  <th className="text-left px-4 py-3 text-xs font-semibold text-muted-foreground hidden sm:table-cell">Uses</th>
                  <th className="text-left px-4 py-3 text-xs font-semibold text-muted-foreground hidden md:table-cell">Expires</th>
                  <th className="text-center px-4 py-3 text-xs font-semibold text-muted-foreground">Active</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-border">
                {coupons.map(c => (
                  <tr key={c.id}>
                    <td className="px-4 py-3">
                      <button onClick={() => { navigator.clipboard.writeText(c.code); toast.success('Copied!'); }} className="flex items-center gap-1.5 font-mono font-semibold text-primary hover:underline">
                        {c.code} <Copy className="h-3 w-3" />
                      </button>
                    </td>
                    <td className="px-4 py-3">{c.discount_type === 'percent' ? `${c.discount_value}%` : formatPrice(c.discount_value)}</td>
                    <td className="px-4 py-3 hidden sm:table-cell">{c.uses_count}{c.max_uses ? `/${c.max_uses}` : ''}</td>
                    <td className="px-4 py-3 hidden md:table-cell text-xs text-muted-foreground">{c.valid_until ? new Date(c.valid_until).toLocaleDateString() : '—'}</td>
                    <td className="px-4 py-3 text-center">
                      <Switch checked={c.is_active} onCheckedChange={checked => toggleMutation.mutate({ id: c.id, active: checked })} />
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </CreatorDashboardLayout>
  );
};

export default CreatorCoupons;
