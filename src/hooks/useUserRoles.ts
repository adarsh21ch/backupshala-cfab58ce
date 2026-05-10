import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';

export type StaffRole = 'admin' | 'support' | 'finance';

export const useUserRoles = () => {
  const { user } = useAuth();
  const { data, isLoading } = useQuery({
    queryKey: ['user-roles', user?.id],
    queryFn: async () => {
      if (!user) return [] as StaffRole[];
      const { data } = await supabase
        .from('user_roles')
        .select('role')
        .eq('user_id', user.id);
      return ((data ?? []).map((r: any) => r.role) as StaffRole[]);
    },
    enabled: !!user,
  });

  const roles = data ?? [];
  const isAdmin = roles.includes('admin');
  const isSupport = roles.includes('support');
  const isFinance = roles.includes('finance');
  const isStaff = isAdmin || isSupport || isFinance;
  const can = (allowed: StaffRole[]) => isAdmin || allowed.some((r) => roles.includes(r));

  return { roles, isAdmin, isSupport, isFinance, isStaff, can, isLoading };
};
