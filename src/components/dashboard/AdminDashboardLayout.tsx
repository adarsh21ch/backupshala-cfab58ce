import { Link, useLocation, useNavigate } from 'react-router-dom';
import { useAuth } from '@/contexts/AuthContext';
import { BookOpen, Users, IndianRupee, LayoutDashboard, LogOut, Menu, X, Wallet, Settings, ShieldCheck, CreditCard, UserCheck, MessageSquare, Trophy, Film, Star, ClipboardList, TrendingUp, Sparkles, ChevronDown } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { useState, useMemo } from 'react';
import ThemeToggle from '@/components/ThemeToggle';
import Logo from '@/components/Logo';
import DashboardFooter from '@/components/dashboard/DashboardFooter';

type NavItem = { to: string; label: string; icon: typeof LayoutDashboard };
type Group = { label: string; items: NavItem[]; collapsible?: boolean };

const groups: Group[] = [
  {
    label: 'OVERVIEW',
    items: [
      { to: '/admin/dashboard', label: 'Overview', icon: LayoutDashboard },
      { to: '/admin/revenue', label: 'Revenue', icon: TrendingUp },
    ],
  },
  {
    label: 'MANAGE',
    collapsible: true,
    items: [
      { to: '/admin/creators', label: 'Creators', icon: UserCheck },
      { to: '/admin/courses', label: 'Courses', icon: BookOpen },
      { to: '/admin/videos', label: 'Videos', icon: Film },
      { to: '/admin/students', label: 'Students', icon: Users },
    ],
  },
  {
    label: 'FINANCE',
    collapsible: true,
    items: [
      { to: '/admin/payments', label: 'Payments', icon: CreditCard },
      { to: '/admin/commissions', label: 'Commissions', icon: IndianRupee },
      { to: '/admin/payouts', label: 'Payouts', icon: Wallet },
    ],
  },
  {
    label: 'PLATFORM',
    items: [
      { to: '/admin/featured', label: 'Featured', icon: Sparkles },
      { to: '/admin/support', label: 'Support', icon: MessageSquare },
      { to: '/admin/creator-pro', label: 'Creator Pro', icon: Star },
      { to: '/admin/standard-bundle', label: 'Standard Bundle', icon: Trophy },
    ],
  },
  {
    label: 'SETTINGS',
    items: [
      { to: '/admin/settings', label: 'Settings', icon: Settings },
      { to: '/admin/audit-log', label: 'Audit Log', icon: ClipboardList },
    ],
  },
];

const AdminDashboardLayout = ({ children }: { children: React.ReactNode }) => {
  const { profile, signOut } = useAuth();
  const location = useLocation();
  const navigate = useNavigate();
  const [mobileOpen, setMobileOpen] = useState(false);

  const handleLogout = async () => { await signOut(); navigate('/'); };
  const isActive = (path: string) => location.pathname === path;

  // Auto-expand groups whose child is active; user can still toggle.
  const initialOpen = useMemo(() => {
    const map: Record<string, boolean> = {};
    groups.forEach(g => {
      if (!g.collapsible) return;
      map[g.label] = g.items.some(i => isActive(i.to));
    });
    return map;
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [location.pathname]);
  const [openMap, setOpenMap] = useState<Record<string, boolean>>(initialOpen);

  // Sync open-state when route changes so the active group expands.
  useMemo(() => {
    setOpenMap(prev => ({ ...prev, ...initialOpen }));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [location.pathname]);

  const toggleGroup = (label: string) => setOpenMap(p => ({ ...p, [label]: !p[label] }));

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

  const renderGroup = (g: Group, idx: number, onNavigate?: () => void) => {
    const isOpen = g.collapsible ? !!openMap[g.label] : true;

    if (!g.collapsible) {
      return (
        <div key={g.label} className={idx === 0 ? 'pt-2' : ''}>
          <div className="px-3 pt-4 pb-1.5 text-[10px] font-semibold uppercase tracking-[0.08em] text-muted-foreground/70">
            {g.label}
          </div>
          <div className="space-y-0.5 px-2">
            {g.items.map(item => <NavLinkItem key={item.to} item={item} onNavigate={onNavigate} />)}
          </div>
        </div>
      );
    }

    return (
      <div key={g.label} className={idx === 0 ? 'pt-2' : ''}>
        <button
          type="button"
          onClick={() => toggleGroup(g.label)}
          className="flex w-full items-center justify-between px-3 pt-4 pb-1.5 text-[10px] font-semibold uppercase tracking-[0.08em] text-muted-foreground/70 hover:text-foreground transition-colors"
          aria-expanded={isOpen}
        >
          <span>{g.label}</span>
          <ChevronDown className={`h-3 w-3 transition-transform ${isOpen ? 'rotate-0' : '-rotate-90'}`} />
        </button>
        <div
          className="overflow-hidden transition-[max-height] duration-200 ease-out"
          style={{ maxHeight: isOpen ? `${g.items.length * 44}px` : '0px' }}
        >
          <div className="space-y-0.5 px-2 pt-0.5">
            {g.items.map(item => <NavLinkItem key={item.to} item={item} onNavigate={onNavigate} />)}
          </div>
        </div>
      </div>
    );
  };

  const renderSidebarNav = (onNavigate?: () => void) => (
    <>
      {groups.map((g, i) => renderGroup(g, i, onNavigate))}
      <div className="px-3 pt-4 pb-1.5 text-[10px] font-semibold uppercase tracking-[0.08em] text-muted-foreground/70">SWITCH</div>
      <div className="space-y-0.5 px-2">
        <Link
          to="/dashboard"
          onClick={onNavigate}
          className="flex h-10 items-center gap-2.5 rounded-lg px-3 text-sm font-medium text-muted-foreground hover:bg-secondary/60 hover:text-foreground"
        >
          <Users className="h-4 w-4" /> Student Dashboard
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
              badge={<span className="ml-2 rounded-full bg-destructive/15 px-2 py-0.5 text-[10px] font-semibold text-destructive">Admin</span>}
            />
          </Link>
        </div>
        <div className="border-t border-border" />
        <nav className="flex-1 overflow-y-auto pb-4">
          {renderSidebarNav()}
        </nav>
        <div className="border-t border-border p-3">
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
          <ShieldCheck className="h-4 w-4 text-destructive" />
          <p className="text-sm font-medium text-foreground">Admin Panel — Backupshala</p>
        </div>
        <div className="flex items-center gap-3">
          <ThemeToggle />
          <Link to="/admin/dashboard" className="flex h-9 w-9 items-center justify-center rounded-full bg-destructive/15 text-sm font-semibold text-destructive hover:bg-destructive/25 transition-colors">
            {profile?.full_name?.[0]?.toUpperCase() || 'A'}
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
                badge={<span className="ml-2 rounded-full bg-destructive/15 px-2 py-0.5 text-[10px] font-semibold text-destructive">Admin</span>}
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

      <main className="pt-[60px] pb-6 lg:pl-[220px]">
        <div className="container mx-auto p-4 md:p-6">{children}<DashboardFooter /></div>
      </main>
    </div>
  );
};

export default AdminDashboardLayout;
