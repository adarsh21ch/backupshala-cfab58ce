import { Link, useLocation, useNavigate } from 'react-router-dom';
import { useAuth } from '@/contexts/AuthContext';
import { Bell, BookOpen, Award, Users, User, LayoutDashboard, LogOut, Menu, X, Wallet, PenTool, Compass, ShieldCheck, Film } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';

const studentNav = [
  { to: '/dashboard', label: 'Dashboard', icon: LayoutDashboard },
  { to: '/courses', label: 'My Courses', icon: BookOpen },
  { to: '/explore', label: 'Explore Courses', icon: Compass },
  { to: '/dashboard/certificates', label: 'Certificates', icon: Award },
  { to: '/dashboard/videos', label: 'Video Gallery', icon: Film },
  { to: '/refer', label: 'Refer & Earn', icon: Users },
  { to: '/dashboard/payouts', label: 'Payouts', icon: Wallet },
  { to: '/profile', label: 'Profile', icon: User },
];

const mobileNav = [
  { to: '/dashboard', label: 'Home', icon: LayoutDashboard },
  { to: '/courses', label: 'Courses', icon: BookOpen },
  { to: '/explore', label: 'Explore', icon: Compass },
  { to: '/refer', label: 'Refer', icon: Users },
  { to: '/profile', label: 'Profile', icon: User },
];

const DashboardLayout = ({ children }: { children: React.ReactNode }) => {
  const { user, profile, signOut } = useAuth();
  const location = useLocation();
  const navigate = useNavigate();
  const [mobileOpen, setMobileOpen] = useState(false);
  const [unreadCount, setUnreadCount] = useState(0);
  const [isAdmin, setIsAdmin] = useState(false);

  useEffect(() => {
    if (!user) return;
    const fetchUnread = async () => {
      const { count } = await supabase
        .from('notifications')
        .select('*', { count: 'exact', head: true })
        .eq('user_id', user.id)
        .eq('is_read', false);
      setUnreadCount(count || 0);
    };
    fetchUnread();

    // Check admin role
    supabase.rpc('has_role', { _user_id: user.id, _role: 'admin' }).then(({ data }) => {
      setIsAdmin(!!data);
    });

    const channel = supabase
      .channel('notifications-count')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'notifications', filter: `user_id=eq.${user.id}` }, () => {
        fetchUnread();
      })
      .subscribe();

    return () => { supabase.removeChannel(channel); };
  }, [user]);

  const handleLogout = async () => {
    await signOut();
    navigate('/');
  };

  const isActive = (path: string) => location.pathname === path;

  return (
    <div className="dark min-h-screen bg-background text-foreground">
      {/* Desktop sidebar */}
      <aside className="fixed inset-y-0 left-0 z-40 hidden w-64 border-r border-border bg-card lg:block">
        <div className="flex h-16 items-center border-b border-border px-6">
          <Link to="/" className="flex items-center">
            <span className="font-heading text-xl font-800"><span className="text-accent">Backup</span><span className="text-primary">shala</span></span>
          </Link>
        </div>
        <nav className="p-4 space-y-1">
          {studentNav.map(item => (
            <Link
              key={item.to}
              to={item.to}
              className={`flex items-center gap-3 rounded-lg px-3 py-2.5 text-sm font-medium transition-colors ${
                isActive(item.to)
                  ? 'bg-accent/8 text-accent border-l-[3px] border-accent'
                  : 'text-muted-foreground hover:bg-secondary hover:text-foreground'
              }`}
            >
              <item.icon className={`h-4 w-4 ${isActive(item.to) ? 'text-accent' : ''}`} />
              {item.label}
            </Link>
          ))}
          {profile?.is_creator && profile?.creator_approved && (
            <Link
              to="/creator/dashboard"
              className="flex items-center gap-3 rounded-lg px-3 py-2.5 text-sm font-medium text-accent hover:bg-secondary hover:text-foreground transition-colors"
            >
              <PenTool className="h-4 w-4" />
              Creator Dashboard
            </Link>
          )}
          {isAdmin && (
            <Link
              to="/admin/dashboard"
              className="flex items-center gap-3 rounded-lg px-3 py-2.5 text-sm font-medium text-destructive hover:bg-secondary hover:text-foreground transition-colors"
            >
              <ShieldCheck className="h-4 w-4" />
              Admin Panel
            </Link>
          )}
        </nav>
        <div className="absolute bottom-4 left-4 right-4">
          <Button variant="ghost" onClick={handleLogout} className="w-full justify-start gap-3 text-muted-foreground hover:text-foreground">
            <LogOut className="h-4 w-4" />
            Log Out
          </Button>
        </div>
      </aside>

      {/* Top bar */}
      <header className="fixed inset-x-0 top-0 z-30 flex h-16 items-center justify-between border-b border-border bg-card px-4 lg:pl-72">
        <button className="lg:hidden" onClick={() => setMobileOpen(!mobileOpen)}>
          {mobileOpen ? <X className="h-6 w-6" /> : <Menu className="h-6 w-6" />}
        </button>
        <div className="hidden lg:block">
          <p className="text-sm text-muted-foreground">Welcome back, {profile?.full_name?.split(' ')[0] || 'Student'}</p>
        </div>
        <div className="flex items-center gap-3">
          <Link to="/notifications" className="relative">
            <Bell className="h-5 w-5 text-muted-foreground" />
            {unreadCount > 0 && (
              <span className="absolute -right-1.5 -top-1.5 flex h-4 w-4 items-center justify-center rounded-full bg-accent text-[10px] font-bold text-accent-foreground">
                {unreadCount > 9 ? '9+' : unreadCount}
              </span>
            )}
          </Link>
          <Link to="/profile" className="flex h-8 w-8 items-center justify-center rounded-full bg-primary/20 text-sm font-semibold text-primary">
            {profile?.full_name?.[0]?.toUpperCase() || 'U'}
          </Link>
        </div>
      </header>

      {/* Mobile nav overlay */}
      {mobileOpen && (
        <div className="fixed inset-0 z-50 lg:hidden">
          <div className="absolute inset-0 bg-background/80 backdrop-blur-sm" onClick={() => setMobileOpen(false)} />
          <aside className="absolute inset-y-0 left-0 w-64 border-r border-border bg-card p-4">
            <div className="mb-6 flex items-center px-3">
              <span className="font-heading text-xl font-800"><span className="text-accent">Backup</span><span className="text-primary">shala</span></span>
            </div>
            <nav className="space-y-1">
              {studentNav.map(item => (
                <Link
                  key={item.to}
                  to={item.to}
                  onClick={() => setMobileOpen(false)}
                  className={`flex items-center gap-3 rounded-lg px-3 py-2.5 text-sm font-medium transition-colors ${
                    isActive(item.to)
                      ? 'bg-primary/10 text-primary'
                      : 'text-muted-foreground hover:bg-secondary hover:text-foreground'
                  }`}
                >
                  <item.icon className="h-4 w-4" />
                  {item.label}
                </Link>
              ))}
              {isAdmin && (
                <Link to="/admin/dashboard" onClick={() => setMobileOpen(false)} className="flex items-center gap-3 rounded-lg px-3 py-2.5 text-sm font-medium text-destructive hover:bg-secondary hover:text-foreground transition-colors">
                  <ShieldCheck className="h-4 w-4" /> Admin Panel
                </Link>
              )}
            </nav>
            <Button variant="ghost" onClick={handleLogout} className="mt-4 w-full justify-start gap-3 text-muted-foreground">
              <LogOut className="h-4 w-4" />
              Log Out
            </Button>
          </aside>
        </div>
      )}

      {/* Mobile bottom nav */}
      <nav className="fixed inset-x-0 bottom-0 z-30 flex border-t border-border bg-card lg:hidden">
        {mobileNav.map(item => (
          <Link
            key={item.to}
            to={item.to}
            className={`flex flex-1 flex-col items-center gap-0.5 py-2 text-[10px] font-medium ${
              isActive(item.to) ? 'text-primary' : 'text-muted-foreground'
            }`}
          >
            <item.icon className="h-5 w-5" />
            {item.label}
          </Link>
        ))}
      </nav>

      {/* Main content */}
      <main className="pt-16 pb-20 lg:pb-6 lg:pl-64">
        <div className="container mx-auto p-4 md:p-6">
          {children}
        </div>
      </main>
    </div>
  );
};

export default DashboardLayout;
