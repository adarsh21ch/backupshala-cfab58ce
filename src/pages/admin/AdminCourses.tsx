import AdminDashboardLayout from '@/components/dashboard/AdminDashboardLayout';
import { Link } from 'react-router-dom';
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
import { CheckCircle, XCircle, Star, Settings, Trash2 } from 'lucide-react';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/components/ui/alert-dialog';
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

  const [deleteTarget, setDeleteTarget] = useState<any>(null);

  const { data: courses, isLoading } = useQuery({
    queryKey: ['admin-creator-courses'],
    queryFn: async () => {
      const { data } = await supabase.from('courses')
        .select('*, profiles!courses_creator_id_fkey(full_name, creator_display_name)')
        .eq('is_platform_course', false)
        .order('created_at', { ascending: false });
      return data || [];
    },
    staleTime: 60_000,
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

  const deleteMutation = useMutation({
    mutationFn: async (course: any) => {
      // Block delete if any students enrolled
      const { count } = await supabase
        .from('enrollments')
        .select('id', { count: 'exact', head: true })
        .eq('course_id', course.id);
      if ((count || 0) > 0) {
        throw new Error(`Course has ${count} enrolled student${count === 1 ? '' : 's'} — cannot delete. Suspend it instead.`);
      }
      await supabase.from('modules').delete().eq('course_id', course.id);
      const { error } = await supabase.from('courses').delete().eq('id', course.id);
      if (error) throw error;
    },
    onSuccess: () => {
      toast.success('Course deleted');
      qc.invalidateQueries({ queryKey: ['admin-courses'] });
      setDeleteTarget(null);
    },
    onError: (err: any) => {
      toast.error(err.message || 'Delete failed');
      setDeleteTarget(null);
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
          <TableHead>Type</TableHead>
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
          <TableRow><TableCell colSpan={8} className="text-center text-muted-foreground py-8">No courses</TableCell></TableRow>
        ) : items.map((c: any) => {
          const isPlatform = c.is_platform_course === true;
          return (
          <TableRow key={c.id}>
            <TableCell className="font-medium max-w-[200px] truncate">{c.title}</TableCell>
            <TableCell>
              {isPlatform ? (
                <Badge variant="secondary" className="border-0 bg-accent/20 text-accent">Backupshala</Badge>
              ) : (
                <Badge variant="secondary" className="border-0 bg-muted text-muted-foreground">Creator</Badge>
              )}
            </TableCell>
            <TableCell className="text-muted-foreground">{isPlatform ? 'Backupshala (Platform)' : (c.profiles?.creator_display_name || c.profiles?.full_name)}</TableCell>
            <TableCell>{formatINR(c.price)}</TableCell>
            <TableCell className="text-xs text-muted-foreground">
              {isPlatform ? <span className="text-accent">100% retained</span> : `${c.platform_fee_percent}% / ${c.commission_percent}%`}
            </TableCell>
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
                {!isPlatform && (
                  <Button variant="ghost" size="icon" className="h-8 w-8" onClick={() => openOverride(c)} title="Override settings">
                    <Settings className="h-4 w-4" />
                  </Button>
                )}
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
                <Button
                  variant="ghost"
                  size="icon"
                  className="h-8 w-8 text-destructive hover:text-destructive hover:bg-destructive/10"
                  onClick={() => setDeleteTarget(c)}
                  title="Delete course"
                >
                  <Trash2 className="h-4 w-4" />
                </Button>
              </div>
            </TableCell>
          </TableRow>
        );
        })}
      </TableBody>
    </Table>
  );

  return (
    <AdminDashboardLayout>
      <div className="space-y-6">
        <div className="flex items-center justify-between flex-wrap gap-3">
          <div>
            <h1 className="text-2xl font-heading font-bold">Creator Courses</h1>
            <p className="text-sm text-muted-foreground mt-1">
              Courses submitted by platform creators. Use Platform Courses to manage Basic / Advanced / Premium tiers.
            </p>
          </div>
        </div>
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

      <AlertDialog open={!!deleteTarget} onOpenChange={(o) => !o && setDeleteTarget(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete this course permanently?</AlertDialogTitle>
            <AlertDialogDescription>
              You are about to delete <span className="font-medium text-foreground">"{deleteTarget?.title}"</span> and all its modules.
              This cannot be undone. If any student is already enrolled, the deletion will be blocked — suspend the course instead.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
              onClick={() => deleteTarget && deleteMutation.mutate(deleteTarget)}
              disabled={deleteMutation.isPending}
            >
              {deleteMutation.isPending ? 'Deleting…' : 'Delete forever'}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </AdminDashboardLayout>
  );
};

export default AdminCourses;
