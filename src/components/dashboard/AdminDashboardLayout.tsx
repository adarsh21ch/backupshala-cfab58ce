import { Link, useLocation, useNavigate } from 'react-router-dom';
import { useAuth } from '@/contexts/AuthContext';
import { Bell, BookOpen, Users, IndianRupee, LayoutDashboard, LogOut, Menu, X, Wallet, Settings, ShieldCheck, CreditCard, UserCheck } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';

const adminNav = [
  { to: '/admin/dashboard', label: 'Overview', icon: LayoutDashboard },
  { to: '/admin/creators', label: 'Creators', icon: UserCheck },
  { to: '/admin/courses', label: 'Courses', icon: BookOpen },
  { to: '/admin/students', label: 'Students', icon: Users },
  { to: '/admin/payments', label: 'Payments', icon: CreditCard },
  { to: '/admin/commissions', label: 'Commissions', icon: IndianRupee },
  { to: '/admin/payouts', label: 'Payouts', icon: Wallet },
  { to: '/admin/settings', label: 'Settings', icon: Settings },
];

const AdminDashboardLayout = ({ children }: { children: React.ReactNode }) => {
  const { profile, signOut } = useAuth();
  const location = useLocation();
  const navigate = useNavigate();
  const [mobileOpen, setMobileOpen] = useState(false);

  const handleLogout = async () => { await signOut(); navigate('/'); };
  const isActive = (path: string) => location.pathname === path;

  return (
    <div className="dark min-h-screen bg-background text-foreground">
      <aside className="fixed inset-y-0 left-0 z-40 hidden w-64 border-r border-border bg-card lg:block">
        <div className="flex h-16 items-center gap-1 border-b border-border px-6">
          <Link to="/" className="flex items-center gap-1">
            <span className="font-heading text-xl font-800 text-primary">Backup</span>
            <span className="font-heading text-xl font-800 text-accent">shala</span>
          </Link>
          <span className="ml-2 rounded-full bg-destructive/10 px-2 py-0.5 text-[10px] font-semibold text-destructive">Admin</span>
        </div>
        <nav className="p-4 space-y-1">
          {adminNav.map(item => (
            <Link key={item.to} to={item.to}
              className={`flex items-center gap-3 rounded-lg px-3 py-2.5 text-sm font-medium transition-colors ${isActive(item.to) ? 'bg-primary/10 text-primary' : 'text-muted-foreground hover:bg-secondary hover:text-foreground'}`}>
              <item.icon className="h-4 w-4" />{item.label}
            </Link>
          ))}
          <div className="border-t border-border my-3" />
          <Link to="/dashboard" className="flex items-center gap-3 rounded-lg px-3 py-2.5 text-sm font-medium text-muted-foreground hover:bg-secondary hover:text-foreground">
            <Users className="h-4 w-4" /> Student Dashboard
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
          <ShieldCheck className="h-4 w-4 text-destructive" />
          <p className="text-sm text-muted-foreground">Admin Panel</p>
        </div>
        <div className="flex items-center gap-3">
          <Link to="/admin/dashboard" className="flex h-8 w-8 items-center justify-center rounded-full bg-destructive/20 text-sm font-semibold text-destructive">
            {profile?.full_name?.[0]?.toUpperCase() || 'A'}
          </Link>
        </div>
      </header>

      {mobileOpen && (
        <div className="fixed inset-0 z-50 lg:hidden">
          <div className="absolute inset-0 bg-background/80 backdrop-blur-sm" onClick={() => setMobileOpen(false)} />
          <aside className="absolute inset-y-0 left-0 w-64 border-r border-border bg-card p-4">
            <div className="mb-6 flex items-center gap-1 px-3">
              <span className="font-heading text-xl font-800 text-primary">Backup</span>
              <span className="font-heading text-xl font-800 text-accent">shala</span>
              <span className="ml-2 rounded-full bg-destructive/10 px-2 py-0.5 text-[10px] font-semibold text-destructive">Admin</span>
            </div>
            <nav className="space-y-1">
              {adminNav.map(item => (
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

      <main className="pt-16 pb-6 lg:pl-64">
        <div className="container mx-auto p-4 md:p-6">{children}</div>
      </main>
    </div>
  );
};

export default AdminDashboardLayout;
