import { Link, useLocation, useNavigate } from 'react-router-dom';
import { useAuth } from '@/contexts/AuthContext';
import { Bell, BookOpen, Award, Users, User, LayoutDashboard, LogOut, Menu, X, Wallet, PenTool, Compass, ShieldCheck, Film, ShoppingBag } from 'lucide-react';
import { Button } from '@/components/ui/button';
import ThemeToggle from '@/components/ThemeToggle';
import { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import Logo from '@/components/Logo';

type NavItem = { to: string; label: string; icon: typeof LayoutDashboard };
type NavSection = { label: string; items: NavItem[] };

const studentSections: NavSection[] = [
  {
    label: 'LEARN',
    items: [
      { to: '/dashboard', label: 'Dashboard', icon: LayoutDashboard },
      { to: '/courses', label: 'My Courses', icon: BookOpen },
      { to: '/explore', label: 'Explore Courses', icon: Compass },
      { to: '/dashboard/certificates', label: 'Certificates', icon: Award },
    ],
  },
  {
    label: 'EARN',
    items: [
      { to: '/refer', label: 'Refer & Earn', icon: Users },
      { to: '/dashboard/wallet', label: 'Wallet', icon: Wallet },
      { to: '/dashboard/videos', label: 'Video Gallery', icon: Film },
    ],
  },
  {
    label: 'ACCOUNT',
    items: [
      { to: '/dashboard/orders', label: 'Order History', icon: ShoppingBag },
      { to: '/profile', label: 'Profile', icon: User },
    ],
  },
];

const mobileNav: NavItem[] = [
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

  const NavLinkItem = ({ item, onNavigate }: { item: NavItem; onNavigate?: () => void }) => {
    const active = isActive(item.to);
    return (
      <Link
        to={item.to}
        onClick={onNavigate}
        className={`group relative flex h-10 items-center gap-2.5 rounded-lg px-3 text-sm font-medium transition-colors ${
          active
            ? 'bg-secondary text-foreground'
            : 'text-muted-foreground hover:bg-secondary/60 hover:text-foreground'
        }`}
      >
        {active && <span className="absolute left-0 top-1.5 bottom-1.5 w-[3px] rounded-r bg-accent" aria-hidden />}
        <item.icon className={`h-4 w-4 ${active ? 'text-accent' : ''}`} />
        <span>{item.label}</span>
      </Link>
    );
  };

  const SectionLabel = ({ children }: { children: React.ReactNode }) => (
    <div className="px-3 pt-4 pb-1.5 text-[10px] font-semibold uppercase tracking-[0.08em] text-muted-foreground/70">
      {children}
    </div>
  );

  const renderSidebarNav = (onNavigate?: () => void) => (
    <>
      {studentSections.map((section, idx) => (
        <div key={section.label} className={idx === 0 ? 'pt-2' : ''}>
          <SectionLabel>{section.label}</SectionLabel>
          <div className="space-y-0.5 px-2">
            {section.items.map(item => <NavLinkItem key={item.to} item={item} onNavigate={onNavigate} />)}
          </div>
        </div>
      ))}
      {(profile?.is_creator && profile?.creator_approved) || isAdmin ? (
        <>
          <SectionLabel>SWITCH</SectionLabel>
          <div className="space-y-0.5 px-2">
            {profile?.is_creator && profile?.creator_approved && (
              <Link
                to="/creator/dashboard"
                onClick={onNavigate}
                className="flex h-10 items-center gap-2.5 rounded-lg px-3 text-sm font-medium text-primary hover:bg-secondary/60"
              >
                <PenTool className="h-4 w-4" /> Creator Dashboard
              </Link>
            )}
            {isAdmin && (
              <Link
                to="/admin/dashboard"
                onClick={onNavigate}
                className="flex h-10 items-center gap-2.5 rounded-lg px-3 text-sm font-medium text-destructive hover:bg-secondary/60"
              >
                <ShieldCheck className="h-4 w-4" /> Admin Panel
              </Link>
            )}
          </div>
        </>
      ) : null}
    </>
  );

  return (
    <div className="min-h-screen bg-background text-foreground">
      {/* Desktop sidebar */}
      <aside className="fixed inset-y-0 left-0 z-40 hidden w-[220px] border-r border-border bg-sidebar lg:flex lg:flex-col">
        <div className="flex h-[60px] items-center px-5">
          <Link to="/" className="flex items-center">
            <Logo iconSize={28} textClassName="text-lg" />
          </Link>
        </div>
        <div className="border-t border-border" />
        <nav className="flex-1 overflow-y-auto pb-4">
          {renderSidebarNav()}
        </nav>
        <div className="border-t border-border p-3">
          <Button variant="ghost" onClick={handleLogout} className="w-full justify-start gap-2.5 text-muted-foreground hover:text-destructive hover:bg-destructive/10">
            <LogOut className="h-4 w-4" />
            Log Out
          </Button>
        </div>
      </aside>

      {/* Top bar */}
      <header className="fixed inset-x-0 top-0 z-30 flex h-[60px] items-center justify-between border-b border-border bg-background/80 backdrop-blur px-4 lg:pl-[236px]">
        <button className="lg:hidden" onClick={() => setMobileOpen(!mobileOpen)} aria-label="Open menu">
          {mobileOpen ? <X className="h-6 w-6" /> : <Menu className="h-6 w-6" />}
        </button>
        <div className="hidden lg:block">
          <p className="text-sm font-medium text-foreground">Welcome back, {profile?.full_name?.split(' ')[0] || 'Student'}</p>
        </div>
        <div className="flex items-center gap-3">
          <ThemeToggle />
          <Link to="/notifications" className="relative inline-flex h-9 w-9 items-center justify-center rounded-lg hover:bg-secondary/60 transition-colors">
            <Bell className="h-[18px] w-[18px] text-muted-foreground" />
            {unreadCount > 0 && (
              <span className="absolute right-1.5 top-1.5 h-2 w-2 rounded-full bg-destructive" />
            )}
          </Link>
          <Link to="/profile" className="flex h-9 w-9 items-center justify-center rounded-full bg-accent/15 text-sm font-semibold text-accent hover:bg-accent/25 transition-colors">
            {profile?.full_name?.[0]?.toUpperCase() || 'U'}
          </Link>
        </div>
      </header>

      {/* Mobile drawer */}
      {mobileOpen && (
        <div className="fixed inset-0 z-50 lg:hidden">
          <div className="absolute inset-0 bg-background/80 backdrop-blur-sm" onClick={() => setMobileOpen(false)} />
          <aside className="absolute inset-y-0 left-0 w-[260px] border-r border-border bg-sidebar flex flex-col">
            <div className="flex h-[60px] items-center justify-between px-5">
              <Logo iconSize={26} textClassName="text-lg" />
              <button onClick={() => setMobileOpen(false)} aria-label="Close menu" className="p-1.5 rounded-lg hover:bg-secondary/60">
                <X className="h-5 w-5" />
              </button>
            </div>
            <div className="border-t border-border" />
            <nav className="flex-1 overflow-y-auto pb-4">
              {renderSidebarNav(() => setMobileOpen(false))}
            </nav>
            <div className="border-t border-border p-3">
              <Button variant="ghost" onClick={handleLogout} className="w-full justify-start gap-2.5 text-muted-foreground hover:text-destructive hover:bg-destructive/10">
                <LogOut className="h-4 w-4" /> Log Out
              </Button>
            </div>
          </aside>
        </div>
      )}

      {/* Mobile bottom nav */}
      <nav className="fixed inset-x-0 bottom-0 z-30 flex border-t border-border bg-sidebar lg:hidden safe-area-bottom">
        {mobileNav.map(item => (
          <Link
            key={item.to}
            to={item.to}
            className={`flex flex-1 flex-col items-center gap-0.5 py-3 text-[10px] font-semibold transition-colors ${
              isActive(item.to) ? 'text-accent' : 'text-muted-foreground'
            }`}
          >
            <item.icon className="h-5 w-5" />
            {item.label}
          </Link>
        ))}
      </nav>

      {/* Main content */}
      <main className="pt-[60px] pb-20 lg:pb-6 lg:pl-[220px]">
        <div className="container mx-auto p-4 md:p-6">
          {children}
        </div>
      </main>
    </div>
  );
};

export default DashboardLayout;
