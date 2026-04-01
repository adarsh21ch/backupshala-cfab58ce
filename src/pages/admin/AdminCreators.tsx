import AdminDashboardLayout from '@/components/dashboard/AdminDashboardLayout';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';
import { CheckCircle, XCircle } from 'lucide-react';
import { format } from 'date-fns';

const AdminCreators = () => {
  const qc = useQueryClient();

  const { data: creators, isLoading } = useQuery({
    queryKey: ['admin-creators'],
    queryFn: async () => {
      const { data } = await supabase.from('profiles')
        .select('*')
        .eq('is_creator', true)
        .order('created_at', { ascending: false });
      return data || [];
    },
  });

  const approveMutation = useMutation({
    mutationFn: async ({ id, approve }: { id: string; approve: boolean }) => {
      const { error } = await supabase.from('profiles').update({ creator_approved: approve }).eq('id', id);
      if (error) throw error;
    },
    onSuccess: (_, { approve }) => {
      toast.success(approve ? 'Creator approved' : 'Creator rejected');
      qc.invalidateQueries({ queryKey: ['admin-creators'] });
    },
    onError: () => toast.error('Action failed'),
  });

  return (
    <AdminDashboardLayout>
      <div className="space-y-6">
        <h1 className="text-2xl font-heading font-bold">Creator Management</h1>
        <Card className="bg-card border-border">
          <CardContent className="p-0">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Name</TableHead>
                  <TableHead>Email</TableHead>
                  <TableHead>Category</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead>Joined</TableHead>
                  <TableHead className="text-right">Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {isLoading ? (
                  <TableRow><TableCell colSpan={6} className="text-center text-muted-foreground py-8">Loading…</TableCell></TableRow>
                ) : (creators || []).map(c => (
                  <TableRow key={c.id}>
                    <TableCell className="font-medium">{c.creator_display_name || c.full_name}</TableCell>
                    <TableCell className="text-muted-foreground">{c.email}</TableCell>
                    <TableCell>{c.creator_category || '—'}</TableCell>
                    <TableCell>
                      <Badge variant={c.creator_approved ? 'default' : 'secondary'} className={c.creator_approved ? 'bg-primary/20 text-primary border-0' : 'bg-accent/20 text-accent border-0'}>
                        {c.creator_approved ? 'Approved' : 'Pending'}
                      </Badge>
                    </TableCell>
                    <TableCell className="text-muted-foreground">{format(new Date(c.created_at), 'dd MMM yyyy')}</TableCell>
                    <TableCell className="text-right">
                      {!c.creator_approved ? (
                        <div className="flex gap-2 justify-end">
                          <Button size="sm" onClick={() => approveMutation.mutate({ id: c.id, approve: true })} className="bg-primary hover:bg-primary/90 h-8">
                            <CheckCircle className="h-3 w-3 mr-1" /> Approve
                          </Button>
                          <Button size="sm" variant="destructive" onClick={() => approveMutation.mutate({ id: c.id, approve: false })} className="h-8">
                            <XCircle className="h-3 w-3 mr-1" /> Reject
                          </Button>
                        </div>
                      ) : (
                        <Button size="sm" variant="outline" onClick={() => approveMutation.mutate({ id: c.id, approve: false })} className="h-8">
                          Revoke
                        </Button>
                      )}
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </CardContent>
        </Card>
      </div>
    </AdminDashboardLayout>
  );
};

export default AdminCreators;
