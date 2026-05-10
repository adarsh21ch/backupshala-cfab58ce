import { Link, useLocation, useNavigate } from 'react-router-dom';
import { useAuth } from '@/contexts/AuthContext';
import { Bell, BookOpen, Users, IndianRupee, User, LayoutDashboard, LogOut, Menu, X, Wallet, Film, Settings, Unlock, Star, Tag, Megaphone, MessageSquare, PenTool } from 'lucide-react';
import { Button } from '@/components/ui/button';
import ThemeToggle from '@/components/ThemeToggle';
import { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useQuery } from '@tanstack/react-query';
import Logo from '@/components/Logo';
import DashboardFooter from '@/components/dashboard/DashboardFooter';

type NavItem = { to: string; label: string; icon: typeof LayoutDashboard };
type NavSection = { label: string; items: NavItem[] };

const mobileNav: NavItem[] = [
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

  const { data: proSub } = useQuery({
    queryKey: ['creator-pro-sub', user?.id],
    queryFn: async () => {
      const { data } = await supabase
        .from('creator_pro_subscriptions')
        .select('plan, status')
        .eq('creator_id', user!.id)
        .maybeSingle();
      return data;
    },
    enabled: !!user,
    staleTime: 5 * 60 * 1000,
  });

  // Platform-wide kill switch — when admin disables Creator Pro, hide all
  // upgrade entry points from the creator UI.
  const { data: proFeatureEnabled } = useQuery({
    queryKey: ['creator-pro-enabled-flag'],
    queryFn: async () => {
      const { data } = await supabase
        .from('platform_settings')
        .select('value')
        .eq('key', 'creator_pro_enabled')
        .maybeSingle();
      return data?.value === 'true';
    },
    staleTime: 5 * 60 * 1000,
  });

  const { data: walletBalance } = useQuery({
    queryKey: ['creator-wallet-balance', user?.id],
    queryFn: async () => {
      const { data } = await supabase
        .from('wallet_transactions')
        .select('amount, type')
        .eq('user_id', user!.id);
      const bal = (data || []).reduce((s, t: any) => s + (t.type === 'credit' ? Number(t.amount) : -Number(t.amount)), 0);
      return Math.max(0, bal);
    },
    enabled: !!user,
    staleTime: 60 * 1000,
  });

  const isPro = profile?.is_admin || (proSub && (proSub.plan === 'pro' || proSub.plan === 'trial') && proSub.status === 'active');

  const sections: NavSection[] = [
    {
      label: 'OVERVIEW',
      items: [
        { to: '/creator/dashboard', label: 'Overview', icon: LayoutDashboard },
        { to: '/creator/courses', label: 'My Courses', icon: BookOpen },
        { to: '/creator/students', label: 'Students', icon: Users },
      ],
    },
    {
      label: 'EARNINGS',
      items: [
        { to: '/creator/earnings', label: 'Earnings', icon: IndianRupee },
        { to: '/creator/payouts', label: 'Payouts', icon: Wallet },
      ],
    },
    {
      label: 'CONTENT',
      items: [
        { to: '/creator/videos', label: 'Video Gallery', icon: Film },
        { to: '/creator/announcements', label: 'Announcements', icon: Megaphone },
        { to: '/creator/discussions', label: 'Discussions', icon: MessageSquare },
      ],
    },
    {
      label: 'TOOLS',
      items: [
        { to: '/creator/coupons', label: 'Coupons', icon: Tag },
        ...(isPro ? [{ to: '/creator/unlock-requests', label: 'Unlock Requests', icon: Unlock }] : []),
        ...(!isPro ? [{ to: '/creator/upgrade', label: 'Upgrade to Pro', icon: Star }] : []),
        { to: '/creator/settings', label: 'Settings', icon: Settings },
        { to: '/creator/profile', label: 'Creator Profile', icon: PenTool },
      ],
    },
  ];

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
      {sections.map((section, idx) => (
        <div key={section.label} className={idx === 0 ? 'pt-2' : ''}>
          <SectionLabel>{section.label}</SectionLabel>
          <div className="space-y-0.5 px-2">
            {section.items.map(item => <NavLinkItem key={item.to} item={item} onNavigate={onNavigate} />)}
          </div>
        </div>
      ))}
      <SectionLabel>SWITCH</SectionLabel>
      <div className="space-y-0.5 px-2">
        <Link
          to="/dashboard"
          onClick={onNavigate}
          className="flex h-10 items-center gap-2.5 rounded-lg px-3 text-sm font-medium text-muted-foreground hover:bg-secondary/60 hover:text-foreground"
        >
          <User className="h-4 w-4" /> Student Dashboard
        </Link>
      </div>
    </>
  );

  return (
    <div className="min-h-screen bg-background text-foreground">
      <aside className="fixed inset-y-0 left-0 z-40 hidden w-[220px] border-r border-border bg-sidebar lg:flex lg:flex-col">
        <div className="flex h-[60px] items-center px-5">
          <Link to="/" className="flex items-center">
            <Logo
              iconSize={28}
              textClassName="text-lg"
              badge={<span className="ml-2 rounded-full bg-primary/15 px-2 py-0.5 text-[10px] font-semibold text-primary">Creator</span>}
            />
          </Link>
        </div>
        <div className="border-t border-border" />
        <nav className="flex-1 overflow-y-auto pb-4">
          {renderSidebarNav()}
        </nav>
        <div className="border-t border-border p-3 space-y-2">
          {typeof walletBalance === 'number' && walletBalance > 0 && (
            <div className="px-2 text-xs text-muted-foreground">
              Wallet: <span className="font-semibold text-primary">₹{walletBalance.toLocaleString('en-IN')}</span>
            </div>
          )}
          <Button variant="ghost" onClick={handleLogout} className="w-full justify-start gap-2.5 text-muted-foreground hover:text-destructive hover:bg-destructive/10">
            <LogOut className="h-4 w-4" /> Log Out
          </Button>
        </div>
      </aside>

      <header className="fixed inset-x-0 top-0 z-30 flex h-[60px] items-center justify-between border-b border-border bg-background/80 backdrop-blur px-4 lg:pl-[236px]">
        <button className="lg:hidden" onClick={() => setMobileOpen(!mobileOpen)} aria-label="Open menu">
          {mobileOpen ? <X className="h-6 w-6" /> : <Menu className="h-6 w-6" />}
        </button>
        <div className="hidden lg:flex items-center gap-2">
          <p className="text-sm font-medium text-foreground">Creator Dashboard</p>
          {profile?.creator_display_name || profile?.full_name ? (
            <span className="text-sm text-muted-foreground">— {profile?.creator_display_name || profile?.full_name}</span>
          ) : null}
        </div>
        <div className="flex items-center gap-3">
          <ThemeToggle />
          <Link to="/notifications" className="relative inline-flex h-9 w-9 items-center justify-center rounded-lg hover:bg-secondary/60 transition-colors">
            <Bell className="h-[18px] w-[18px] text-muted-foreground" />
            {unreadCount > 0 && <span className="absolute right-1.5 top-1.5 h-2 w-2 rounded-full bg-destructive" />}
          </Link>
          <Link to="/creator/profile" className="flex h-9 w-9 items-center justify-center rounded-full bg-accent/15 text-sm font-semibold text-accent hover:bg-accent/25 transition-colors">
            {profile?.full_name?.[0]?.toUpperCase() || 'C'}
          </Link>
        </div>
      </header>

      {mobileOpen && (
        <div className="fixed inset-0 z-50 lg:hidden">
          <div className="absolute inset-0 bg-background/80 backdrop-blur-sm" onClick={() => setMobileOpen(false)} />
          <aside className="absolute inset-y-0 left-0 w-[260px] border-r border-border bg-sidebar flex flex-col">
            <div className="flex h-[60px] items-center justify-between px-5">
              <Logo
                iconSize={26}
                textClassName="text-lg"
                badge={<span className="ml-2 rounded-full bg-primary/15 px-2 py-0.5 text-[10px] font-semibold text-primary">Creator</span>}
              />
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

      <nav className="fixed inset-x-0 bottom-0 z-30 flex border-t border-border bg-sidebar lg:hidden safe-area-bottom">
        {mobileNav.map(item => (
          <Link key={item.to} to={item.to}
            className={`flex flex-1 flex-col items-center gap-0.5 py-2 text-[10px] font-medium ${isActive(item.to) ? 'text-accent' : 'text-muted-foreground'}`}>
            <item.icon className="h-5 w-5" />{item.label}
          </Link>
        ))}
      </nav>

      <main className="pt-[60px] pb-20 lg:pb-6 lg:pl-[220px]">
        <div className="container mx-auto p-4 md:p-6">{children}<DashboardFooter /></div>
      </main>
    </div>
  );
};

export default CreatorDashboardLayout;
