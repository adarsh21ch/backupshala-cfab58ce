import AdminDashboardLayout from '@/components/dashboard/AdminDashboardLayout';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Tabs, TabsList, TabsTrigger, TabsContent } from '@/components/ui/tabs';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { toast } from 'sonner';
import { formatINR } from '@/lib/format';
import { CheckCircle, XCircle, Star, Settings } from 'lucide-react';
import { useState } from 'react';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';

const statusColors: Record<string, string> = {
  published: 'bg-primary/20 text-primary',
  pending_review: 'bg-accent/20 text-accent',
  draft: 'bg-muted text-muted-foreground',
  suspended: 'bg-destructive/20 text-destructive',
};

const AdminCourses = () => {
  const qc = useQueryClient();
  const { user } = useAuth();
  const [rejectionReason, setRejectionReason] = useState('');
  const [rejectingId, setRejectingId] = useState<string | null>(null);

  // Override modal state
  const [overrideCourse, setOverrideCourse] = useState<any>(null);
  const [overrideFee, setOverrideFee] = useState('');
  const [overrideComm, setOverrideComm] = useState('');
  const [overridePrice, setOverridePrice] = useState('');
  const [overrideReason, setOverrideReason] = useState('');

  const { data: courses, isLoading } = useQuery({
    queryKey: ['admin-courses'],
    queryFn: async () => {
      const { data } = await supabase.from('courses')
        .select('*, profiles!courses_creator_id_fkey(full_name, creator_display_name)')
        .order('created_at', { ascending: false });
      return data || [];
    },
  });

  const updateMutation = useMutation({
    mutationFn: async ({ id, status, rejection_reason }: { id: string; status: string; rejection_reason?: string }) => {
      const update: any = { status };
      if (rejection_reason) update.rejection_reason = rejection_reason;
      const { error } = await supabase.from('courses').update(update).eq('id', id);
      if (error) throw error;
    },
    onSuccess: () => {
      toast.success('Course updated');
      qc.invalidateQueries({ queryKey: ['admin-courses'] });
      setRejectingId(null);
      setRejectionReason('');
    },
    onError: () => toast.error('Update failed'),
  });

  const featureMutation = useMutation({
    mutationFn: async ({ id, featured }: { id: string; featured: boolean }) => {
      const { error } = await supabase.from('courses').update({ is_featured: featured }).eq('id', id);
      if (error) throw error;
    },
    onSuccess: () => {
      toast.success('Updated');
      qc.invalidateQueries({ queryKey: ['admin-courses'] });
    },
  });

  const overrideMutation = useMutation({
    mutationFn: async () => {
      if (!overrideCourse || !overrideReason.trim()) throw new Error('Reason required');

      const newFee = Number(overrideFee);
      const newComm = Number(overrideComm);
      const newPrice = Number(overridePrice);

      // Update course
      await supabase.from('courses').update({
        platform_fee_percent: newFee,
        commission_percent: newComm,
        price: newPrice,
      }).eq('id', overrideCourse.id);

      // Insert override record
      await supabase.from('course_overrides' as any).insert({
        course_id: overrideCourse.id,
        admin_id: user!.id,
        old_platform_fee: overrideCourse.platform_fee_percent,
        new_platform_fee: newFee,
        old_commission: overrideCourse.commission_percent,
        new_commission: newComm,
        old_price: overrideCourse.price,
        new_price: newPrice,
        reason: overrideReason.trim(),
      });

      // Notify creator
      await supabase.from('notifications').insert({
        user_id: overrideCourse.creator_id,
        title: 'Course Settings Updated by Backupshala',
        message: `Settings for "${overrideCourse.title}" have been updated. New price: ₹${newPrice}, Platform fee: ${newFee}%, Commission: ${newComm}%. Reason: ${overrideReason.trim()}`,
        type: 'info',
      });
    },
    onSuccess: () => {
      toast.success('Override applied');
      qc.invalidateQueries({ queryKey: ['admin-courses'] });
      setOverrideCourse(null);
      setOverrideReason('');
    },
    onError: (e: any) => toast.error(e.message || 'Override failed'),
  });

  const openOverride = (c: any) => {
    setOverrideCourse(c);
    setOverrideFee(String(c.platform_fee_percent));
    setOverrideComm(String(c.commission_percent));
    setOverridePrice(String(c.price));
    setOverrideReason('');
  };

  const filterCourses = (status: string) => (courses || []).filter((c: any) => c.status === status);

  const CourseTable = ({ items }: { items: any[] }) => (
    <Table>
      <TableHeader>
        <TableRow>
          <TableHead>Title</TableHead>
          <TableHead>Creator</TableHead>
          <TableHead>Price</TableHead>
          <TableHead>Fee/Comm</TableHead>
          <TableHead>Status</TableHead>
          <TableHead>Featured</TableHead>
          <TableHead className="text-right">Actions</TableHead>
        </TableRow>
      </TableHeader>
      <TableBody>
        {items.length === 0 ? (
          <TableRow><TableCell colSpan={7} className="text-center text-muted-foreground py-8">No courses</TableCell></TableRow>
        ) : items.map((c: any) => (
          <TableRow key={c.id}>
            <TableCell className="font-medium max-w-[200px] truncate">{c.title}</TableCell>
            <TableCell className="text-muted-foreground">{c.profiles?.creator_display_name || c.profiles?.full_name}</TableCell>
            <TableCell>{formatINR(c.price)}</TableCell>
            <TableCell className="text-xs text-muted-foreground">{c.platform_fee_percent}% / {c.commission_percent}%</TableCell>
            <TableCell>
              <Badge variant="secondary" className={`border-0 ${statusColors[c.status] || ''}`}>{c.status}</Badge>
            </TableCell>
            <TableCell>
              <Button variant="ghost" size="icon" className="h-8 w-8" onClick={() => featureMutation.mutate({ id: c.id, featured: !c.is_featured })}>
                <Star className={`h-4 w-4 ${c.is_featured ? 'fill-accent text-accent' : 'text-muted-foreground'}`} />
              </Button>
            </TableCell>
            <TableCell className="text-right">
              <div className="flex gap-2 justify-end">
                <Button variant="ghost" size="icon" className="h-8 w-8" onClick={() => openOverride(c)} title="Override settings">
                  <Settings className="h-4 w-4" />
                </Button>
                {c.status === 'pending_review' && (
                  <>
                    <Button size="sm" className="h-8 bg-primary hover:bg-primary/90" onClick={() => updateMutation.mutate({ id: c.id, status: 'published' })}>
                      <CheckCircle className="h-3 w-3 mr-1" /> Approve
                    </Button>
                    {rejectingId === c.id ? (
                      <div className="flex gap-1">
                        <Input value={rejectionReason} onChange={e => setRejectionReason(e.target.value)} placeholder="Reason" className="h-8 w-40 text-xs" />
                        <Button size="sm" variant="destructive" className="h-8" onClick={() => updateMutation.mutate({ id: c.id, status: 'draft', rejection_reason: rejectionReason })}>
                          Send
                        </Button>
                      </div>
                    ) : (
                      <Button size="sm" variant="outline" className="h-8" onClick={() => setRejectingId(c.id)}>
                        <XCircle className="h-3 w-3 mr-1" /> Reject
                      </Button>
                    )}
                  </>
                )}
                {c.status === 'published' && (
                  <Button size="sm" variant="destructive" className="h-8" onClick={() => updateMutation.mutate({ id: c.id, status: 'suspended' })}>
                    Suspend
                  </Button>
                )}
                {c.status === 'suspended' && (
                  <Button size="sm" className="h-8 bg-primary hover:bg-primary/90" onClick={() => updateMutation.mutate({ id: c.id, status: 'published' })}>
                    Republish
                  </Button>
                )}
              </div>
            </TableCell>
          </TableRow>
        ))}
      </TableBody>
    </Table>
  );

  return (
    <AdminDashboardLayout>
      <div className="space-y-6">
        <h1 className="text-2xl font-heading font-bold">Course Management</h1>
        <Tabs defaultValue="pending_review">
          <TabsList>
            <TabsTrigger value="pending_review">Pending ({filterCourses('pending_review').length})</TabsTrigger>
            <TabsTrigger value="published">Published ({filterCourses('published').length})</TabsTrigger>
            <TabsTrigger value="draft">Draft ({filterCourses('draft').length})</TabsTrigger>
            <TabsTrigger value="suspended">Suspended ({filterCourses('suspended').length})</TabsTrigger>
          </TabsList>
          {['pending_review', 'published', 'draft', 'suspended'].map(status => (
            <TabsContent key={status} value={status}>
              <Card className="bg-card border-border">
                <CardContent className="p-0">
                  <CourseTable items={filterCourses(status)} />
                </CardContent>
              </Card>
            </TabsContent>
          ))}
        </Tabs>
      </div>

      {/* Override Modal */}
      <Dialog open={!!overrideCourse} onOpenChange={(open) => { if (!open) setOverrideCourse(null); }}>
        <DialogContent className="bg-card border-border">
          <DialogHeader>
            <DialogTitle>Override Course Settings</DialogTitle>
          </DialogHeader>
          {overrideCourse && (
            <div className="space-y-4">
              <p className="text-sm text-muted-foreground">Course: <span className="font-medium text-foreground">{overrideCourse.title}</span></p>
              <div className="grid grid-cols-3 gap-3">
                <div>
                  <Label className="text-xs">Platform Fee %</Label>
                  <Input type="number" value={overrideFee} onChange={e => setOverrideFee(e.target.value)} className="mt-1" min={1} max={49} />
                </div>
                <div>
                  <Label className="text-xs">Commission %</Label>
                  <Input type="number" value={overrideComm} onChange={e => setOverrideComm(e.target.value)} className="mt-1" min={0} max={99} />
                </div>
                <div>
                  <Label className="text-xs">Price (₹)</Label>
                  <Input type="number" value={overridePrice} onChange={e => setOverridePrice(e.target.value)} className="mt-1" min={99} max={9999} />
                </div>
              </div>
              <div>
                <Label className="text-xs">Reason for override *</Label>
                <Textarea value={overrideReason} onChange={e => setOverrideReason(e.target.value)} placeholder="Explain why..." className="mt-1" />
              </div>
              <DialogFooter>
                <Button variant="outline" onClick={() => setOverrideCourse(null)}>Cancel</Button>
                <Button
                  onClick={() => overrideMutation.mutate()}
                  disabled={!overrideReason.trim() || overrideMutation.isPending}
                  className="bg-primary hover:bg-primary/90"
                >
                  Apply Override
                </Button>
              </DialogFooter>
            </div>
          )}
        </DialogContent>
      </Dialog>
    </AdminDashboardLayout>
  );
};

export default AdminCourses;
