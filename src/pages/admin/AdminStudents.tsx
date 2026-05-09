import { useState } from 'react';
import AdminDashboardLayout from '@/components/dashboard/AdminDashboardLayout';
import { Card, CardContent } from '@/components/ui/card';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Button } from '@/components/ui/button';
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from '@/components/ui/dropdown-menu';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { formatINR } from '@/lib/format';
import { format } from 'date-fns';
import { MoreHorizontal, Gift } from 'lucide-react';
import GrantAccessModal from '@/components/admin/GrantAccessModal';

const AdminStudents = () => {
  const queryClient = useQueryClient();
  const [granting, setGranting] = useState<{ id: string; name: string } | null>(null);

  const { data: students, isLoading } = useQuery({
    queryKey: ['admin-students'],
    queryFn: async () => {
      const { data } = await supabase.from('profiles')
        .select('id, full_name, email, phone, wallet_balance, total_enrolled, total_referred, total_earned, created_at')
        .order('created_at', { ascending: false });
      return data || [];
    },
  });

  return (
    <AdminDashboardLayout>
      <div className="space-y-6">
        <h1 className="text-2xl font-heading font-bold">Student Management</h1>
        <Card className="bg-card border-border">
          <CardContent className="p-0">
            <div className="overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Name</TableHead>
                    <TableHead>Email</TableHead>
                    <TableHead>Enrolled</TableHead>
                    <TableHead>Referred</TableHead>
                    <TableHead>Wallet</TableHead>
                    <TableHead>Earned</TableHead>
                    <TableHead>Joined</TableHead>
                    <TableHead className="text-right">Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {isLoading ? (
                    <TableRow><TableCell colSpan={8} className="text-center text-muted-foreground py-8">Loading…</TableCell></TableRow>
                  ) : (students || []).map(s => (
                    <TableRow key={s.id}>
                      <TableCell className="font-medium">{s.full_name}</TableCell>
                      <TableCell className="text-muted-foreground">{s.email}</TableCell>
                      <TableCell>{s.total_enrolled}</TableCell>
                      <TableCell>{s.total_referred}</TableCell>
                      <TableCell>{formatINR(s.wallet_balance)}</TableCell>
                      <TableCell>{formatINR(s.total_earned)}</TableCell>
                      <TableCell className="text-muted-foreground whitespace-nowrap">{format(new Date(s.created_at), 'dd MMM yyyy')}</TableCell>
                      <TableCell className="text-right">
                        <DropdownMenu>
                          <DropdownMenuTrigger asChild>
                            <Button variant="ghost" size="icon" className="h-8 w-8">
                              <MoreHorizontal className="h-4 w-4" />
                            </Button>
                          </DropdownMenuTrigger>
                          <DropdownMenuContent align="end">
                            <DropdownMenuItem onClick={() => setGranting({ id: s.id, name: s.full_name || s.email })}>
                              <Gift className="h-4 w-4 mr-2" /> Grant Course Access
                            </DropdownMenuItem>
                          </DropdownMenuContent>
                        </DropdownMenu>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          </CardContent>
        </Card>
      </div>

      {granting && (
        <GrantAccessModal
          open={!!granting}
          onOpenChange={(o) => !o && setGranting(null)}
          studentId={granting.id}
          studentName={granting.name}
          onGranted={() => queryClient.invalidateQueries({ queryKey: ['admin-students'] })}
        />
      )}
    </AdminDashboardLayout>
  );
};

export default AdminStudents;
