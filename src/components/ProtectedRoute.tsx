import { useAuth } from '@/contexts/AuthContext';
import { Navigate } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';

const ProtectedRoute = ({ children }: { children: React.ReactNode }) => {
  const { user, loading } = useAuth();
  if (loading) return (
    <div className="flex min-h-screen items-center justify-center bg-background">
      <div className="h-8 w-8 animate-spin rounded-full border-4 border-primary border-t-transparent" />
    </div>
  );
  if (!user) return <Navigate to="/login" replace />;
  if (!user.email_confirmed_at) return <Navigate to={`/verify-email?email=${encodeURIComponent(user.email || '')}`} replace />;
  return <>{children}</>;
};

export const CreatorRoute = ({ children }: { children: React.ReactNode }) => {
  const { user, profile, loading } = useAuth();
  if (loading) return (
    <div className="flex min-h-screen items-center justify-center bg-background">
      <div className="h-8 w-8 animate-spin rounded-full border-4 border-primary border-t-transparent" />
    </div>
  );
  if (!user) return <Navigate to="/login" replace />;
  if (!profile?.is_creator || !profile?.creator_approved) return <Navigate to="/dashboard" replace />;
  return <>{children}</>;
};

type StaffRole = 'admin' | 'support' | 'finance';

export const AdminRoute = ({
  children,
  allow = ['admin', 'support', 'finance'],
}: {
  children: React.ReactNode;
  allow?: StaffRole[];
}) => {
  const { user, loading } = useAuth();

  const { data: roles, isLoading: roleLoading } = useQuery({
    queryKey: ['user-roles', user?.id],
    queryFn: async () => {
      const { data } = await supabase
        .from('user_roles')
        .select('role')
        .eq('user_id', user!.id);
      return ((data ?? []).map((r: any) => r.role)) as StaffRole[];
    },
    enabled: !!user,
  });

  if (loading || roleLoading) return (
    <div className="flex min-h-screen items-center justify-center bg-background">
      <div className="h-8 w-8 animate-spin rounded-full border-4 border-primary border-t-transparent" />
    </div>
  );
  if (!user) return <Navigate to="/login" replace />;
  const allowed = (roles ?? []).some((r) => allow.includes(r));
  if (!allowed) return <Navigate to="/dashboard" replace />;
  return <>{children}</>;
};

export default ProtectedRoute;
