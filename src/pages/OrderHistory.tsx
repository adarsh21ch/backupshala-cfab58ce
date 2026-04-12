import { useAuth } from '@/contexts/AuthContext';
import DashboardLayout from '@/components/dashboard/DashboardLayout';
import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { formatPrice, timeAgo } from '@/lib/format';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Link } from 'react-router-dom';
import { Receipt, ShoppingBag } from 'lucide-react';
import EmptyState from '@/components/dashboard/EmptyState';

const OrderHistory = () => {
  const { user } = useAuth();

  const { data: payments, isLoading } = useQuery({
    queryKey: ['order-history', user?.id],
    queryFn: async () => {
      const { data } = await supabase
        .from('payments')
        .select('*, courses(title)')
        .eq('student_id', user!.id)
        .order('created_at', { ascending: false });
      return data || [];
    },
    enabled: !!user,
  });

  return (
    <DashboardLayout>
      <div className="space-y-6">
        <h1 className="font-heading text-2xl font-800">Order History</h1>

        {isLoading ? (
          <div className="space-y-3">
            {[...Array(3)].map((_, i) => (
              <div key={i} className="h-20 rounded-xl bg-muted animate-pulse" />
            ))}
          </div>
        ) : !payments || payments.length === 0 ? (
          <EmptyState
            icon={ShoppingBag}
            title="No purchases yet"
            description="You haven't made any purchases yet. Browse courses to get started."
            actionLabel="Explore Courses"
            actionTo="/explore"
          />
        ) : (
          <div className="space-y-3">
            {payments.map((p: any) => (
              <div key={p.id} className="rounded-xl border border-border bg-card p-4 flex flex-col sm:flex-row sm:items-center gap-3 justify-between">
                <div className="flex-1 min-w-0">
                  <p className="font-heading font-700 text-sm truncate">{p.courses?.title || 'Course'}</p>
                  <p className="text-xs text-muted-foreground mt-1">{timeAgo(p.created_at)} · {p.razorpay_payment_id || 'N/A'}</p>
                </div>
                <div className="flex items-center gap-3">
                  <p className="font-heading font-700 text-sm">{formatPrice(p.amount_total)}</p>
                  <Badge variant="secondary" className={`border-0 text-xs ${
                    p.status === 'paid' || p.status === 'success' ? 'bg-primary/20 text-primary' :
                    p.status === 'pending' ? 'bg-accent/20 text-accent' :
                    'bg-destructive/20 text-destructive'
                  }`}>
                    {p.status}
                  </Badge>
                  {(p.status === 'paid' || p.status === 'success') && (
                    <Button asChild variant="ghost" size="sm">
                      <Link to={`/receipt/${p.id}`}><Receipt className="h-4 w-4" /></Link>
                    </Button>
                  )}
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </DashboardLayout>
  );
};

export default OrderHistory;
