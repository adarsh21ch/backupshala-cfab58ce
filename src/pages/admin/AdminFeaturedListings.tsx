import { useState } from 'react';
import AdminDashboardLayout from '@/components/dashboard/AdminDashboardLayout';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { formatINR } from '@/lib/format';
import { format } from 'date-fns';
import { Plus, Sparkles, Trash2 } from 'lucide-react';
import { toast } from 'sonner';
import { useAuth } from '@/contexts/AuthContext';
import KPICard from '@/components/dashboard/KPICard';

const AdminFeaturedListings = () => {
  const { user } = useAuth();
  const qc = useQueryClient();
  const [dialogOpen, setDialogOpen] = useState(false);
  const [selectedCourse, setSelectedCourse] = useState('');
  const [duration, setDuration] = useState('7');

  const { data: listings, isLoading } = useQuery({
    queryKey: ['admin-featured-listings'],
    queryFn: async () => {
      const { data } = await supabase.from('featured_listings')
        .select('*, courses(title), profiles:creator_id(full_name)')
        .order('created_at', { ascending: false });
      return data || [];
    },
  });

  const { data: courses } = useQuery({
    queryKey: ['admin-all-courses'],
    queryFn: async () => {
      const { data } = await supabase.from('courses').select('id, title').eq('status', 'published');
      return data || [];
    },
  });

  const totalRevenue = (listings || []).reduce((s, l) => s + Number(l.amount_paid), 0);
  const activeCount = (listings || []).filter(l => l.status === 'active' && new Date(l.expires_at) > new Date()).length;

  const addMutation = useMutation({
    mutationFn: async () => {
      const days = Number(duration);
      const expiresAt = new Date(Date.now() + days * 24 * 60 * 60 * 1000).toISOString();
      const course = courses?.find(c => c.id === selectedCourse);
      const { error } = await supabase.from('featured_listings').insert({
        course_id: selectedCourse,
        creator_id: user!.id,
        expires_at: expiresAt,
        amount_paid: 0,
        payment_id: 'admin_grant',
        status: 'active',
      });
      if (error) throw error;
      await supabase.from('admin_audit_log').insert({
        admin_id: user!.id, action: 'grant_featured', target_type: 'course', target_id: selectedCourse,
        details: { course_title: course?.title, duration_days: days },
      });
    },
    onSuccess: () => { qc.invalidateQueries({ queryKey: ['admin-featured-listings'] }); toast.success('Course featured!'); setDialogOpen(false); },
    onError: () => toast.error('Failed to feature course'),
  });

  const removeMutation = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase.from('featured_listings').update({ status: 'expired' }).eq('id', id);
      if (error) throw error;
      await supabase.from('admin_audit_log').insert({
        admin_id: user!.id, action: 'remove_featured', target_type: 'featured_listing', target_id: id,
      });
    },
    onSuccess: () => { qc.invalidateQueries({ queryKey: ['admin-featured-listings'] }); toast.success('Feature removed'); },
  });

  return (
    <AdminDashboardLayout>
      <div className="space-y-6">
        <div className="flex items-center justify-between">
          <h1 className="text-2xl font-heading font-bold">Featured Listings</h1>
          <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
            <DialogTrigger asChild>
              <Button className="gap-2"><Plus className="h-4 w-4" /> Add Featured</Button>
            </DialogTrigger>
            <DialogContent className="bg-card border-border">
              <DialogHeader><DialogTitle>Feature a Course</DialogTitle></DialogHeader>
              <div className="space-y-4">
                <div>
                  <Label className="text-sm">Course</Label>
                  <Select value={selectedCourse} onValueChange={setSelectedCourse}>
                    <SelectTrigger className="mt-1"><SelectValue placeholder="Select course" /></SelectTrigger>
                    <SelectContent>{courses?.map(c => <SelectItem key={c.id} value={c.id}>{c.title}</SelectItem>)}</SelectContent>
                  </Select>
                </div>
                <div>
                  <Label className="text-sm">Duration (days)</Label>
                  <Input type="number" value={duration} onChange={e => setDuration(e.target.value)} className="mt-1" />
                </div>
                <p className="text-xs text-muted-foreground">Admin override — no payment required.</p>
                <Button onClick={() => addMutation.mutate()} disabled={!selectedCourse || addMutation.isPending} className="w-full">
                  Feature Course
                </Button>
              </div>
            </DialogContent>
          </Dialog>
        </div>

        <div className="grid grid-cols-2 gap-4 max-w-md">
          <KPICard icon={Sparkles} label="Total Revenue" value={formatINR(totalRevenue)} color="accent" />
          <KPICard icon={Sparkles} label="Active Now" value={activeCount} color="primary" />
        </div>

        <Card className="bg-card border-border">
          <CardContent className="p-0">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Course</TableHead>
                  <TableHead>Creator</TableHead>
                  <TableHead>Start</TableHead>
                  <TableHead>End</TableHead>
                  <TableHead>Amount</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead className="text-right">Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {isLoading ? (
                  <TableRow><TableCell colSpan={7} className="text-center text-muted-foreground py-8">Loading…</TableCell></TableRow>
                ) : (listings || []).map((l: any) => {
                  const isExpired = new Date(l.expires_at) < new Date();
                  const displayStatus = isExpired ? 'expired' : l.status;
                  return (
                    <TableRow key={l.id}>
                      <TableCell className="font-medium max-w-[200px] truncate">{l.courses?.title}</TableCell>
                      <TableCell className="text-muted-foreground">{l.profiles?.full_name}</TableCell>
                      <TableCell className="text-muted-foreground">{format(new Date(l.started_at), 'dd MMM yyyy')}</TableCell>
                      <TableCell className="text-muted-foreground">{format(new Date(l.expires_at), 'dd MMM yyyy')}</TableCell>
                      <TableCell>{l.amount_paid > 0 ? formatINR(l.amount_paid) : 'Free'}</TableCell>
                      <TableCell>
                        <Badge variant={displayStatus === 'active' ? 'default' : 'secondary'} className="border-0">{displayStatus}</Badge>
                      </TableCell>
                      <TableCell className="text-right">
                        {displayStatus === 'active' && (
                          <Button size="sm" variant="destructive" className="h-7" onClick={() => removeMutation.mutate(l.id)}>
                            <Trash2 className="h-3 w-3 mr-1" /> Remove
                          </Button>
                        )}
                      </TableCell>
                    </TableRow>
                  );
                })}
              </TableBody>
            </Table>
          </CardContent>
        </Card>
      </div>
    </AdminDashboardLayout>
  );
};

export default AdminFeaturedListings;
