import { Link, useLocation, useNavigate } from 'react-router-dom';
import { useAuth } from '@/contexts/AuthContext';
import { Bell, BookOpen, Users, IndianRupee, User, LayoutDashboard, LogOut, Menu, X, Wallet, PenTool, Film, Settings } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';

const creatorNav = [
  { to: '/creator/dashboard', label: 'Overview', icon: LayoutDashboard },
  { to: '/creator/courses', label: 'My Courses', icon: BookOpen },
  { to: '/creator/videos', label: 'Video Gallery', icon: Film },
  { to: '/creator/students', label: 'Students', icon: Users },
  { to: '/creator/earnings', label: 'Earnings', icon: IndianRupee },
  { to: '/creator/payouts', label: 'Payouts', icon: Wallet },
  { to: '/creator/profile', label: 'Creator Profile', icon: PenTool },
];

const mobileNav = [
  { to: '/creator/dashboard', label: 'Overview', icon: LayoutDashboard },
  { to: '/creator/courses', label: 'Courses', icon: BookOpen },
  { to: '/creator/students', label: 'Students', icon: Users },
  { to: '/creator/earnings', label: 'Earnings', icon: IndianRupee },
  { to: '/creator/profile', label: 'Profile', icon: PenTool },
];

const CreatorDashboardLayout = ({ children }: { children: React.ReactNode }) => {
  const { user, profile, signOut } = useAuth();
  const location = useLocation();
  const navigate = useNavigate();
  const [mobileOpen, setMobileOpen] = useState(false);
  const [unreadCount, setUnreadCount] = useState(0);

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
    const channel = supabase
      .channel('creator-notif-count')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'notifications', filter: `user_id=eq.${user.id}` }, () => fetchUnread())
      .subscribe();
    return () => { supabase.removeChannel(channel); };
  }, [user]);

  const handleLogout = async () => { await signOut(); navigate('/'); };
  const isActive = (path: string) => location.pathname === path;

  return (
    <div className="dark min-h-screen bg-background text-foreground">
      <aside className="fixed inset-y-0 left-0 z-40 hidden w-64 border-r border-border bg-card lg:block">
        <div className="flex h-16 items-center border-b border-border px-6">
          <Link to="/" className="flex items-center">
            <span className="font-heading text-xl font-800"><span className="text-primary">Backup</span><span className="text-accent">shala</span></span>
          </Link>
           <span className="ml-2 rounded-full bg-primary/10 px-2 py-0.5 text-[10px] font-semibold text-primary">Creator</span>
        </div>
        <nav className="p-4 space-y-1">
          {creatorNav.map(item => (
            <Link key={item.to} to={item.to}
              className={`flex items-center gap-3 rounded-lg px-3 py-2.5 text-sm font-medium transition-colors ${isActive(item.to) ? 'bg-primary/8 text-primary border-l-[3px] border-primary' : 'text-muted-foreground hover:bg-secondary hover:text-foreground'}`}>
              <item.icon className={`h-4 w-4 ${isActive(item.to) ? 'text-primary' : ''}`} />{item.label}
            </Link>
          ))}
          <div className="border-t border-border my-3" />
          <Link to="/dashboard" className="flex items-center gap-3 rounded-lg px-3 py-2.5 text-sm font-medium text-muted-foreground hover:bg-secondary hover:text-foreground">
            <User className="h-4 w-4" /> Student Dashboard
          </Link>
        </nav>
        <div className="absolute bottom-4 left-4 right-4">
          <Button variant="ghost" onClick={handleLogout} className="w-full justify-start gap-3 text-muted-foreground hover:text-foreground">
            <LogOut className="h-4 w-4" /> Log Out
          </Button>
        </div>
      </aside>

      <header className="fixed inset-x-0 top-0 z-30 flex h-16 items-center justify-between border-b border-border bg-card px-4 lg:pl-72">
        <button className="lg:hidden" onClick={() => setMobileOpen(!mobileOpen)}>
          {mobileOpen ? <X className="h-6 w-6" /> : <Menu className="h-6 w-6" />}
        </button>
        <div className="hidden lg:flex items-center gap-2">
          <p className="text-sm text-muted-foreground">Creator Dashboard</p>
          <span className="text-sm text-foreground font-medium">— {profile?.creator_display_name || profile?.full_name}</span>
        </div>
        <div className="flex items-center gap-3">
          <Link to="/notifications" className="relative">
            <Bell className="h-5 w-5 text-muted-foreground" />
            {unreadCount > 0 && (
              <span className="absolute -right-1.5 -top-1.5 flex h-4 w-4 items-center justify-center rounded-full bg-primary text-[10px] font-bold text-primary-foreground">{unreadCount > 9 ? '9+' : unreadCount}</span>
            )}
          </Link>
          <Link to="/creator/profile" className="flex h-8 w-8 items-center justify-center rounded-full bg-primary/20 text-sm font-semibold text-primary">
            {profile?.full_name?.[0]?.toUpperCase() || 'C'}
          </Link>
        </div>
      </header>

      {mobileOpen && (
        <div className="fixed inset-0 z-50 lg:hidden">
          <div className="absolute inset-0 bg-background/80 backdrop-blur-sm" onClick={() => setMobileOpen(false)} />
          <aside className="absolute inset-y-0 left-0 w-64 border-r border-border bg-card p-4">
            <div className="mb-6 flex items-center px-3">
              <span className="font-heading text-xl font-800"><span className="text-primary">Backup</span><span className="text-accent">shala</span></span>
              <span className="ml-2 rounded-full bg-primary/10 px-2 py-0.5 text-[10px] font-semibold text-primary">Creator</span>
            </div>
            <nav className="space-y-1">
              {creatorNav.map(item => (
                <Link key={item.to} to={item.to} onClick={() => setMobileOpen(false)}
                  className={`flex items-center gap-3 rounded-lg px-3 py-2.5 text-sm font-medium transition-colors ${isActive(item.to) ? 'bg-primary/10 text-primary' : 'text-muted-foreground hover:bg-secondary hover:text-foreground'}`}>
                  <item.icon className="h-4 w-4" />{item.label}
                </Link>
              ))}
            </nav>
            <Button variant="ghost" onClick={handleLogout} className="mt-4 w-full justify-start gap-3 text-muted-foreground">
              <LogOut className="h-4 w-4" /> Log Out
            </Button>
          </aside>
        </div>
      )}

      <nav className="fixed inset-x-0 bottom-0 z-30 flex border-t border-border bg-card lg:hidden">
        {mobileNav.map(item => (
          <Link key={item.to} to={item.to}
            className={`flex flex-1 flex-col items-center gap-0.5 py-2 text-[10px] font-medium ${isActive(item.to) ? 'text-primary' : 'text-muted-foreground'}`}>
            <item.icon className="h-5 w-5" />{item.label}
          </Link>
        ))}
      </nav>

      <main className="pt-16 pb-20 lg:pb-6 lg:pl-64">
        <div className="container mx-auto p-4 md:p-6">{children}</div>
      </main>
    </div>
  );
};

export default CreatorDashboardLayout;
