import { useAuth } from '@/contexts/AuthContext';
import CreatorDashboardLayout from '@/components/dashboard/CreatorDashboardLayout';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { Button } from '@/components/ui/button';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { useToast } from '@/hooks/use-toast';
import { useState } from 'react';
import { MessageCircle, Check, X, Search, ChevronDown, ChevronUp } from 'lucide-react';

const CreatorUnlockRequests = () => {
  const { user } = useAuth();
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const [rejectDialogOpen, setRejectDialogOpen] = useState(false);
  const [selectedRequest, setSelectedRequest] = useState<any>(null);
  const [rejectionReason, setRejectionReason] = useState('');
  const [search, setSearch] = useState('');
  const [expandedStudent, setExpandedStudent] = useState<string | null>(null);

  const { data: requests = [], isLoading } = useQuery({
    queryKey: ['unlock-requests', user?.id],
    queryFn: async () => {
      const { data } = await supabase
        .from('mentor_unlock_requests')
        .select(`
          *,
          student:profiles!mentor_unlock_requests_student_id_fkey(full_name, email, phone),
          locked_module:modules!mentor_unlock_requests_locked_module_id_fkey(title, order_index),
          completed_module:modules!mentor_unlock_requests_completed_module_id_fkey(title, order_index),
          course:courses!mentor_unlock_requests_course_id_fkey(title)
        `)
        .eq('mentor_user_id', user!.id)
        .order('created_at', { ascending: false });
      return data || [];
    },
    enabled: !!user,
  });

  const approveMutation = useMutation({
    mutationFn: async (requestId: string) => {
      const { data, error } = await supabase.functions.invoke('approve-module-unlock', {
        body: { request_id: requestId, action: 'approve' },
      });
      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['unlock-requests'] });
      toast({ title: 'Access approved! ✅' });
    },
    onError: () => toast({ title: 'Failed to approve', variant: 'destructive' }),
  });

  const rejectMutation = useMutation({
    mutationFn: async ({ requestId, reason }: { requestId: string; reason: string }) => {
      const { data, error } = await supabase.functions.invoke('approve-module-unlock', {
        body: { request_id: requestId, action: 'reject', rejection_reason: reason },
      });
      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['unlock-requests'] });
      setRejectDialogOpen(false);
      setRejectionReason('');
      toast({ title: 'Request rejected' });
    },
    onError: () => toast({ title: 'Failed to reject', variant: 'destructive' }),
  });

  const pending = requests.filter((r: any) => r.status === 'waiting' || r.status === 'contacted');
  const approved = requests.filter((r: any) => r.status === 'approved');
  const all = requests;

  const filterBySearch = (items: any[]) =>
    search
      ? items.filter((r: any) =>
          r.student?.full_name?.toLowerCase().includes(search.toLowerCase()) ||
          r.course?.title?.toLowerCase().includes(search.toLowerCase())
        )
      : items;

  const getTimeAgo = (date: string) => {
    const diffMs = Date.now() - new Date(date).getTime();
    const diffMins = Math.floor(diffMs / 60000);
    if (diffMins < 60) return `${diffMins}m ago`;
    const diffHours = Math.floor(diffMins / 60);
    if (diffHours < 24) return `${diffHours}h ago`;
    return `${Math.floor(diffHours / 24)}d ago`;
  };

  const statusBadge = (status: string) => {
    const colors: Record<string, string> = {
      waiting: 'bg-yellow-500/10 text-yellow-400',
      contacted: 'bg-accent/10 text-accent',
      approved: 'bg-primary/10 text-primary',
      rejected: 'bg-destructive/10 text-destructive',
    };
    return (
      <span className={`rounded-full px-2 py-0.5 text-[10px] font-semibold ${colors[status] || 'bg-secondary text-muted-foreground'}`}>
        {status === 'waiting' ? '🟡 Waiting' : status === 'contacted' ? '🟠 Contacted' : status === 'approved' ? '✅ Approved' : '❌ Rejected'}
      </span>
    );
  };

  const RequestCard = ({ r }: { r: any }) => {
    const phone = r.student?.phone?.replace(/\D/g, '');
    const waUrl = phone ? `https://wa.me/91${phone}?text=Hi ${r.student?.full_name}, I can see you completed a module! Let's discuss.` : '#';

    return (
      <div className="rounded-xl border border-border bg-card p-4 space-y-3">
        <div className="flex items-start justify-between">
          <div>
            <p className="text-sm font-semibold">👤 {r.student?.full_name || 'Student'}</p>
            <p className="text-xs text-muted-foreground">Course: {r.course?.title}</p>
          </div>
          <span className="text-xs text-muted-foreground">{getTimeAgo(r.created_at)}</span>
        </div>
        <div className="text-xs text-muted-foreground space-y-0.5">
          <p>Completed: {r.completed_module?.title}</p>
          <p>Wants to unlock: <span className="font-medium text-foreground">{r.locked_module?.title}</span></p>
        </div>
        <div className="flex items-center gap-2">
          {statusBadge(r.status)}
          {r.student_contacted_at && (
            <span className="text-[10px] text-muted-foreground">
              Contacted via {r.contact_method} ({getTimeAgo(r.student_contacted_at)})
            </span>
          )}
        </div>
        {(r.status === 'waiting' || r.status === 'contacted') && (
          <div className="flex items-center gap-2 pt-1">
            <Button
              size="sm"
              variant="outline"
              className="rounded-lg text-xs"
              onClick={() => window.open(waUrl, '_blank')}
            >
              <MessageCircle className="h-3 w-3 mr-1" /> WhatsApp
            </Button>
            <Button
              size="sm"
              className="rounded-lg bg-primary hover:bg-primary/90 text-xs"
              onClick={() => approveMutation.mutate(r.id)}
              disabled={approveMutation.isPending}
            >
              <Check className="h-3 w-3 mr-1" /> Approve
            </Button>
            <Button
              size="sm"
              variant="outline"
              className="rounded-lg text-destructive text-xs"
              onClick={() => { setSelectedRequest(r); setRejectDialogOpen(true); }}
            >
              <X className="h-3 w-3 mr-1" /> Reject
            </Button>
          </div>
        )}
      </div>
    );
  };

  return (
    <CreatorDashboardLayout>
      <div className="space-y-6">
        <div className="flex items-center justify-between">
          <h1 className="font-heading text-2xl font-700">🔓 Unlock Requests</h1>
          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <Input
              value={search}
              onChange={e => setSearch(e.target.value)}
              placeholder="Search by name..."
              className="pl-9 w-48 rounded-lg text-xs"
            />
          </div>
        </div>

        <Tabs defaultValue="pending">
          <TabsList className="bg-card border border-border rounded-lg p-1">
            <TabsTrigger value="pending" className="rounded-md text-xs">
              Pending ({pending.length})
            </TabsTrigger>
            <TabsTrigger value="approved" className="rounded-md text-xs">
              Approved ({approved.length})
            </TabsTrigger>
            <TabsTrigger value="all" className="rounded-md text-xs">
              All ({all.length})
            </TabsTrigger>
          </TabsList>

          <TabsContent value="pending" className="mt-4 space-y-3">
            {filterBySearch(pending).length === 0 ? (
              <div className="text-center py-12 text-muted-foreground text-sm">No pending requests</div>
            ) : (
              filterBySearch(pending).map((r: any) => <RequestCard key={r.id} r={r} />)
            )}
          </TabsContent>

          <TabsContent value="approved" className="mt-4 space-y-3">
            {filterBySearch(approved).length === 0 ? (
              <div className="text-center py-12 text-muted-foreground text-sm">No approved requests</div>
            ) : (
              filterBySearch(approved).map((r: any) => <RequestCard key={r.id} r={r} />)
            )}
          </TabsContent>

          <TabsContent value="all" className="mt-4 space-y-3">
            {filterBySearch(all).length === 0 ? (
              <div className="text-center py-12 text-muted-foreground text-sm">No requests yet</div>
            ) : (
              filterBySearch(all).map((r: any) => <RequestCard key={r.id} r={r} />)
            )}
          </TabsContent>
        </Tabs>
      </div>

      <Dialog open={rejectDialogOpen} onOpenChange={setRejectDialogOpen}>
        <DialogContent className="dark bg-card border-border">
          <DialogHeader>
            <DialogTitle>Reject Access</DialogTitle>
          </DialogHeader>
          <div className="space-y-3">
            <p className="text-sm text-muted-foreground">Reason for rejection (optional):</p>
            <Textarea
              value={rejectionReason}
              onChange={e => setRejectionReason(e.target.value)}
              placeholder="Please complete the homework first before proceeding"
              className="rounded-lg"
            />
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setRejectDialogOpen(false)}>Cancel</Button>
            <Button
              variant="destructive"
              onClick={() => selectedRequest && rejectMutation.mutate({ requestId: selectedRequest.id, reason: rejectionReason })}
              disabled={rejectMutation.isPending}
            >
              Reject Access
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </CreatorDashboardLayout>
  );
};

export default CreatorUnlockRequests;
