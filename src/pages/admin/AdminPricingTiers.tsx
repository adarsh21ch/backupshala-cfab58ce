import AdminDashboardLayout from '@/components/dashboard/AdminDashboardLayout';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Switch } from '@/components/ui/switch';
import { Badge } from '@/components/ui/badge';
import { Skeleton } from '@/components/ui/skeleton';
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter,
} from '@/components/ui/dialog';
import {
  AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent,
  AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle,
} from '@/components/ui/alert-dialog';
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from '@/components/ui/select';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { usePlatformSettings } from '@/hooks/usePlatformSettings';
import { computeCommission, inputsFromSettings } from '@/lib/commissionModel';
import { toast } from 'sonner';
import { useState } from 'react';
import {
  Layers, Plus, Pencil, ArrowUp, ArrowDown, Trash2, X, Loader2, IndianRupee,
} from 'lucide-react';

type TierStatus = 'live' | 'coming_soon' | 'hidden';

interface TierRow {
  id: string;
  slug: string;
  name: string;
  price: number;
  tagline: string | null;
  description: string | null;
  features: string[];
  badge: string | null;
  highlight: boolean;
  status: TierStatus;
  display_order: number;
}

interface FormState {
  id: string | null;
  slug: string;
  name: string;
  price: string;
  tagline: string;
  description: string;
  features: string[];
  badge: string;
  highlight: boolean;
  status: TierStatus;
  display_order: number;
}

const emptyForm = (order: number): FormState => ({
  id: null, slug: '', name: '', price: '', tagline: '', description: '',
  features: [''], badge: '', highlight: false, status: 'coming_soon', display_order: order,
});

const statusLabel: Record<TierStatus, string> = {
  live: 'Live', coming_soon: 'Coming soon', hidden: 'Hidden',
};
const statusVariant: Record<TierStatus, string> = {
  live: 'bg-primary/15 text-primary',
  coming_soon: 'bg-warning/15 text-warning',
  hidden: 'bg-muted text-muted-foreground',
};

const fmt = (n: number) => `₹${n.toLocaleString('en-IN', { maximumFractionDigits: 2 })}`;

const AdminPricingTiers = () => {
  const { user } = useAuth();
  const qc = useQueryClient();
  const { raw: settingsRaw } = usePlatformSettings();
  const [dialogOpen, setDialogOpen] = useState(false);
  const [form, setForm] = useState<FormState>(emptyForm(0));
  const [deleteTier, setDeleteTier] = useState<TierRow | null>(null);

  const { data: tiers, isLoading } = useQuery({
    queryKey: ['admin-pricing-tiers'],
    queryFn: async (): Promise<TierRow[]> => {
      const { data, error } = await supabase
        .from('pricing_tiers').select('*').order('display_order', { ascending: true });
      if (error) throw error;
      return (data || []).map((r: any) => ({
        ...r, price: Number(r.price),
        features: Array.isArray(r.features) ? r.features : [],
      }));
    },
  });

  const audit = async (action: string, target_id: string, details: Record<string, unknown>) => {
    await supabase.from('admin_audit_log').insert({
      admin_id: user!.id, action, target_type: 'pricing_tier', target_id, details: details as any,
    });
  };

  const save = useMutation({
    mutationFn: async (f: FormState) => {
      const slug = f.slug.trim().toLowerCase().replace(/[^a-z0-9_-]/g, '');
      const name = f.name.trim();
      const price = Number(f.price);
      if (!name) throw new Error('Name is required');
      if (!slug) throw new Error('Slug is required');
      if (!Number.isFinite(price) || price < 0) throw new Error('Price must be 0 or more');
      const features = f.features.map(x => x.trim()).filter(Boolean);

      const payload = {
        slug, name, price,
        tagline: f.tagline.trim() || null,
        description: f.description.trim() || null,
        features,
        badge: f.badge.trim() || null,
        highlight: f.highlight,
        status: f.status,
        display_order: f.display_order,
      };

      if (f.id) {
        // slug is immutable on edit — never send it
        const { slug: _omit, ...rest } = payload;
        const { error } = await supabase.from('pricing_tiers').update(rest).eq('id', f.id);
        if (error) throw error;
        await audit('update_pricing_tier', f.id, rest);
      } else {
        const { data, error } = await supabase.from('pricing_tiers').insert(payload).select('id').single();
        if (error) {
          if ((error as any).code === '23505') throw new Error('A tier with that slug already exists');
          throw error;
        }
        await audit('create_pricing_tier', data!.id, payload);
      }
    },
    onSuccess: () => {
      toast.success('Tier saved');
      setDialogOpen(false);
      qc.invalidateQueries({ queryKey: ['admin-pricing-tiers'] });
      qc.invalidateQueries({ queryKey: ['pricing-tiers'] });
    },
    onError: (e: any) => toast.error(e.message),
  });

  const reorder = useMutation({
    mutationFn: async ({ a, b }: { a: TierRow; b: TierRow }) => {
      const { error: e1 } = await supabase.from('pricing_tiers').update({ display_order: b.display_order }).eq('id', a.id);
      const { error: e2 } = await supabase.from('pricing_tiers').update({ display_order: a.display_order }).eq('id', b.id);
      if (e1 || e2) throw (e1 || e2);
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['admin-pricing-tiers'] });
      qc.invalidateQueries({ queryKey: ['pricing-tiers'] });
    },
    onError: (e: any) => toast.error(e.message),
  });

  const remove = useMutation({
    mutationFn: async (tier: TierRow) => {
      const { count } = await supabase
        .from('courses').select('id', { count: 'exact', head: true }).eq('tier_slug', tier.slug);
      if ((count || 0) > 0) {
        throw new Error('This tier is linked to courses. Hide it instead of deleting.');
      }
      const { error } = await supabase.from('pricing_tiers').delete().eq('id', tier.id);
      if (error) throw error;
      await audit('delete_pricing_tier', tier.id, { slug: tier.slug, name: tier.name });
    },
    onSuccess: () => {
      toast.success('Tier deleted');
      setDeleteTier(null);
      qc.invalidateQueries({ queryKey: ['admin-pricing-tiers'] });
      qc.invalidateQueries({ queryKey: ['pricing-tiers'] });
    },
    onError: (e: any) => { toast.error(e.message); setDeleteTier(null); },
  });

  const hideInstead = useMutation({
    mutationFn: async (tier: TierRow) => {
      const { error } = await supabase.from('pricing_tiers').update({ status: 'hidden' }).eq('id', tier.id);
      if (error) throw error;
      await audit('hide_pricing_tier', tier.id, { slug: tier.slug });
    },
    onSuccess: () => {
      toast.success('Tier hidden');
      setDeleteTier(null);
      qc.invalidateQueries({ queryKey: ['admin-pricing-tiers'] });
      qc.invalidateQueries({ queryKey: ['pricing-tiers'] });
    },
    onError: (e: any) => toast.error(e.message),
  });

  const openAdd = () => {
    const maxOrder = Math.max(0, ...(tiers || []).map(t => t.display_order));
    setForm(emptyForm(maxOrder + 1));
    setDialogOpen(true);
  };
  const openEdit = (t: TierRow) => {
    setForm({
      id: t.id, slug: t.slug, name: t.name, price: String(t.price),
      tagline: t.tagline || '', description: t.description || '',
      features: t.features.length ? t.features : [''],
      badge: t.badge || '', highlight: t.highlight, status: t.status, display_order: t.display_order,
    });
    setDialogOpen(true);
  };

  // Live earning preview (platform-course formula: price ÷ 1.18 → −gateway → ×75%)
  const previewPrice = Number(form.price) || 0;
  const breakdown = computeCommission(inputsFromSettings(previewPrice, true, settingsRaw));

  return (
    <AdminDashboardLayout>
      <div className="space-y-6">
        <div className="flex items-center justify-between gap-3 flex-wrap">
          <h1 className="font-heading text-2xl font-bold flex items-center gap-2">
            <Layers className="h-6 w-6 text-accent" /> Pricing Tiers
          </h1>
          <Button onClick={openAdd} className="rounded-md bg-accent hover:bg-accent/90 text-accent-foreground">
            <Plus className="h-4 w-4 mr-1.5" /> Add Tier
          </Button>
        </div>
        <p className="text-sm text-muted-foreground -mt-2">
          The single source of truth for plan names, prices and availability. Changes appear instantly on the public pricing page.
        </p>

        {isLoading ? (
          <div className="space-y-3">{[0, 1, 2].map(i => <Skeleton key={i} className="h-20 rounded-xl" />)}</div>
        ) : (
          <div className="space-y-3">
            {(tiers || []).map((t, i) => (
              <Card key={t.id} className="bg-card border-border">
                <CardContent className="p-4 flex items-center gap-4 flex-wrap">
                  <div className="flex flex-col gap-0.5">
                    <Button size="icon" variant="ghost" className="h-6 w-6" disabled={i === 0 || reorder.isPending}
                      onClick={() => reorder.mutate({ a: t, b: tiers![i - 1] })}>
                      <ArrowUp className="h-4 w-4" />
                    </Button>
                    <Button size="icon" variant="ghost" className="h-6 w-6" disabled={i === tiers!.length - 1 || reorder.isPending}
                      onClick={() => reorder.mutate({ a: t, b: tiers![i + 1] })}>
                      <ArrowDown className="h-4 w-4" />
                    </Button>
                  </div>
                  <div className="flex-1 min-w-[180px]">
                    <div className="flex items-center gap-2 flex-wrap">
                      <p className="font-heading font-700">{t.name}</p>
                      <code className="text-[11px] text-muted-foreground bg-secondary px-1.5 py-0.5 rounded">{t.slug}</code>
                      {t.highlight && <Badge className="bg-accent/15 text-accent">Highlighted</Badge>}
                      {t.badge && <Badge variant="outline">{t.badge}</Badge>}
                    </div>
                    {t.tagline && <p className="text-xs text-muted-foreground mt-0.5">{t.tagline}</p>}
                  </div>
                  <p className="font-heading text-lg font-700 text-accent">{fmt(t.price)}</p>
                  <span className={`text-xs font-medium px-2 py-1 rounded-md ${statusVariant[t.status]}`}>{statusLabel[t.status]}</span>
                  <div className="flex gap-1">
                    <Button size="icon" variant="ghost" className="h-8 w-8" onClick={() => openEdit(t)}>
                      <Pencil className="h-4 w-4" />
                    </Button>
                    <Button size="icon" variant="ghost" className="h-8 w-8 text-destructive hover:text-destructive" onClick={() => setDeleteTier(t)}>
                      <Trash2 className="h-4 w-4" />
                    </Button>
                  </div>
                </CardContent>
              </Card>
            ))}
            {(tiers || []).length === 0 && (
              <p className="text-sm text-muted-foreground">No tiers yet. Add your first tier.</p>
            )}
          </div>
        )}
      </div>

      {/* Add / Edit dialog */}
      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent className="max-w-lg max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>{form.id ? 'Edit Tier' : 'Add Tier'}</DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <div className="grid grid-cols-2 gap-3">
              <div>
                <Label className="text-sm">Name *</Label>
                <Input value={form.name} onChange={e => setForm({ ...form, name: e.target.value })} className="mt-1" placeholder="Starter" />
              </div>
              <div>
                <Label className="text-sm">Slug {form.id ? '(locked)' : '*'}</Label>
                <Input value={form.slug} disabled={!!form.id}
                  onChange={e => setForm({ ...form, slug: e.target.value })} className="mt-1" placeholder="starter" />
              </div>
            </div>

            <div>
              <Label className="text-sm">Price (₹) *</Label>
              <Input type="number" min={0} value={form.price} onChange={e => setForm({ ...form, price: e.target.value })} className="mt-1" placeholder="499" />
              <p className="text-[11px] text-muted-foreground mt-1">This is the final GST-inclusive price the customer pays.</p>
            </div>

            {/* Live earning preview */}
            <div className="rounded-lg border border-border bg-secondary/50 p-3 text-xs space-y-1">
              <p className="flex items-center gap-1.5 font-semibold text-foreground"><IndianRupee className="h-3.5 w-3.5" /> Affiliate-earning preview</p>
              <p className="text-muted-foreground">Customer pays <b className="text-foreground">{fmt(breakdown.gross)}</b> · GST <b className="text-foreground">{fmt(breakdown.gst)}</b> · Gateway <b className="text-foreground">{fmt(breakdown.gatewayFee)}</b></p>
              <p className="text-muted-foreground">Affiliate earns <b className="text-primary">{fmt(breakdown.affiliateEarning)}</b> (75% of net) · You keep <b className="text-accent">{fmt(breakdown.withReferral.platform)}</b></p>
            </div>

            <div>
              <Label className="text-sm">Tagline</Label>
              <Input value={form.tagline} onChange={e => setForm({ ...form, tagline: e.target.value })} className="mt-1" placeholder="Your digital-skills starter pack" />
            </div>
            <div>
              <Label className="text-sm">Description</Label>
              <Textarea value={form.description} onChange={e => setForm({ ...form, description: e.target.value })} className="mt-1" rows={2} />
            </div>

            <div>
              <Label className="text-sm">Features</Label>
              <div className="space-y-2 mt-1">
                {form.features.map((feat, idx) => (
                  <div key={idx} className="flex gap-2">
                    <Input value={feat} placeholder={`Feature ${idx + 1}`}
                      onChange={e => {
                        const next = [...form.features]; next[idx] = e.target.value;
                        setForm({ ...form, features: next });
                      }} />
                    <Button size="icon" variant="ghost" className="h-9 w-9 shrink-0"
                      onClick={() => setForm({ ...form, features: form.features.filter((_, i) => i !== idx) })}>
                      <X className="h-4 w-4" />
                    </Button>
                  </div>
                ))}
                <Button size="sm" variant="outline" className="rounded-md"
                  onClick={() => setForm({ ...form, features: [...form.features, ''] })}>
                  <Plus className="h-3.5 w-3.5 mr-1" /> Add feature
                </Button>
              </div>
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div>
                <Label className="text-sm">Badge</Label>
                <Input value={form.badge} onChange={e => setForm({ ...form, badge: e.target.value })} className="mt-1" placeholder="Most Popular" />
              </div>
              <div>
                <Label className="text-sm">Status</Label>
                <Select value={form.status} onValueChange={(v: TierStatus) => setForm({ ...form, status: v })}>
                  <SelectTrigger className="mt-1"><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="live">Live</SelectItem>
                    <SelectItem value="coming_soon">Coming soon</SelectItem>
                    <SelectItem value="hidden">Hidden</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>

            <div className="flex items-center justify-between rounded-lg border border-border p-3">
              <div>
                <Label className="text-sm">Highlight this tier</Label>
                <p className="text-[11px] text-muted-foreground">Visually emphasize as the recommended plan.</p>
              </div>
              <Switch checked={form.highlight} onCheckedChange={v => setForm({ ...form, highlight: v })} />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setDialogOpen(false)}>Cancel</Button>
            <Button onClick={() => save.mutate(form)} disabled={save.isPending} className="bg-accent hover:bg-accent/90 text-accent-foreground">
              {save.isPending && <Loader2 className="h-4 w-4 animate-spin mr-2" />} Save Tier
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Delete confirm */}
      <AlertDialog open={!!deleteTier} onOpenChange={o => !o && setDeleteTier(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete "{deleteTier?.name}"?</AlertDialogTitle>
            <AlertDialogDescription>
              Deleting a tier is permanent. If this tier is referenced by any course, you'll be asked to hide it instead.
              Hiding keeps historical references intact while removing it from the public page.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <Button variant="outline" onClick={() => deleteTier && hideInstead.mutate(deleteTier)} disabled={hideInstead.isPending}>
              Hide instead
            </Button>
            <AlertDialogAction className="bg-destructive hover:bg-destructive/90"
              onClick={() => deleteTier && remove.mutate(deleteTier)} disabled={remove.isPending}>
              Delete
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </AdminDashboardLayout>
  );
};

export default AdminPricingTiers;
