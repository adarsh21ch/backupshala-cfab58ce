import { Link, useNavigate } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { Menu, User, LogOut, LayoutDashboard } from 'lucide-react';
import { useState } from 'react';
import ThemeToggle from '@/components/ThemeToggle';
import Logo from '@/components/Logo';
import { useAuth } from '@/contexts/AuthContext';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { Sheet, SheetContent, SheetTrigger, SheetHeader, SheetTitle } from '@/components/ui/sheet';

const LandingNavbar = () => {
  const [open, setOpen] = useState(false);
  const { user, profile, loading, signOut } = useAuth();
  const navigate = useNavigate();

  const handleLogout = async () => {
    await signOut();
    navigate('/');
  };

  const closeAnd = (cb?: () => void) => () => { setOpen(false); cb?.(); };

  return (
    <nav className="sticky top-0 z-50 border-b border-border bg-background/85 backdrop-blur-md">
      <div className="container mx-auto flex h-16 items-center justify-between px-4">
        <Link to="/" className="flex items-center" aria-label="Backupshala home">
          <Logo iconSize={32} textClassName="text-2xl" />
        </Link>

        <div className="hidden items-center gap-5 xl:gap-7 lg:flex whitespace-nowrap">
          <Link to="/explore" className="nav-underline text-sm font-medium text-foreground/80 hover:text-foreground transition-colors">Explore Courses</Link>
          <a href="/#standard-bundle" className="nav-underline text-sm font-medium text-foreground/80 hover:text-foreground transition-colors">Standard Bundle</a>
          <a href="/#for-creators" className="nav-underline text-sm font-medium text-foreground/80 hover:text-foreground transition-colors">For Creators</a>
          <a href="/#how-it-works" className="nav-underline text-sm font-medium text-foreground/80 hover:text-foreground transition-colors">How It Works</a>

          <ThemeToggle />

          {loading ? (
            <div className="h-8 w-8 animate-pulse rounded-full bg-muted" />
          ) : user ? (
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <button className="flex h-9 w-9 items-center justify-center rounded-full bg-primary/20 text-sm font-semibold text-primary hover:bg-primary/30 transition-colors">
                  {profile?.full_name?.[0]?.toUpperCase() || 'U'}
                </button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end" className="w-48">
                <div className="px-2 py-1.5">
                  <p className="text-sm font-medium">{profile?.full_name || 'User'}</p>
                  <p className="text-xs text-muted-foreground truncate">{user.email}</p>
                </div>
                <DropdownMenuSeparator />
                <DropdownMenuItem asChild>
                  <Link to="/dashboard" className="cursor-pointer gap-2">
                    <LayoutDashboard className="h-4 w-4" /> Dashboard
                  </Link>
                </DropdownMenuItem>
                <DropdownMenuItem asChild>
                  <Link to="/profile" className="cursor-pointer gap-2">
                    <User className="h-4 w-4" /> Profile
                  </Link>
                </DropdownMenuItem>
                <DropdownMenuSeparator />
                <DropdownMenuItem onClick={handleLogout} className="cursor-pointer gap-2 text-destructive">
                  <LogOut className="h-4 w-4" /> Log Out
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
          ) : (
            <>
              <Button asChild variant="outline" size="sm" className="rounded-lg border-[1.5px] px-5 hover:bg-secondary">
                <Link to="/login">Login</Link>
              </Button>
              <Button asChild className="btn-lift rounded-lg bg-accent px-6 font-semibold text-accent-foreground shadow-accent-glow hover:bg-accent hover:shadow-accent-glow-hover">
                <Link to="/signup">Get Started Free</Link>
              </Button>
            </>
          )}
        </div>

        {/* Mobile slide-in drawer */}
        <Sheet open={open} onOpenChange={setOpen}>
          <SheetTrigger asChild>
            <button className="lg:hidden p-2 -mr-2" aria-label="Open menu">
              <Menu className="h-6 w-6" />
            </button>
          </SheetTrigger>
          <SheetContent side="right" className="w-[80vw] max-w-sm p-0 flex flex-col">
            <SheetHeader className="border-b border-border p-4 text-left">
              <SheetTitle asChild>
                <Logo iconSize={26} textClassName="text-lg" />
              </SheetTitle>
              {user && (
                <div className="flex items-center gap-3 mt-3 pt-3 border-t border-border">
                  <div className="flex h-10 w-10 items-center justify-center rounded-full bg-primary/20 text-sm font-semibold text-primary">
                    {profile?.full_name?.[0]?.toUpperCase() || 'U'}
                  </div>
                  <div className="min-w-0">
                    <p className="text-sm font-medium truncate">{profile?.full_name || 'User'}</p>
                    <p className="text-xs text-muted-foreground truncate">{user.email}</p>
                  </div>
                </div>
              )}
            </SheetHeader>
            <div className="flex-1 overflow-y-auto p-4 space-y-1">
              <Link to="/explore" onClick={closeAnd()} className="block rounded-lg px-3 py-3 text-sm font-medium hover:bg-secondary">Explore Courses</Link>
              <a href="/#standard-bundle" onClick={closeAnd()} className="block rounded-lg px-3 py-3 text-sm font-medium hover:bg-secondary">Standard Bundle</a>
              <a href="/#for-creators" onClick={closeAnd()} className="block rounded-lg px-3 py-3 text-sm font-medium hover:bg-secondary">For Creators</a>
              <a href="/#how-it-works" onClick={closeAnd()} className="block rounded-lg px-3 py-3 text-sm font-medium hover:bg-secondary">How It Works</a>
              {user && (
                <>
                  <div className="my-2 h-px bg-border" />
                  <Link to="/dashboard" onClick={closeAnd()} className="flex items-center gap-2 rounded-lg px-3 py-3 text-sm font-medium text-primary hover:bg-secondary">
                    <LayoutDashboard className="h-4 w-4" /> Dashboard
                  </Link>
                  <Link to="/profile" onClick={closeAnd()} className="flex items-center gap-2 rounded-lg px-3 py-3 text-sm font-medium hover:bg-secondary">
                    <User className="h-4 w-4" /> Profile
                  </Link>
                </>
              )}
            </div>
            <div className="border-t border-border p-4 space-y-2">
              <ThemeToggle />
              {user ? (
                <Button onClick={closeAnd(handleLogout)} variant="outline" className="w-full justify-start gap-2 text-destructive">
                  <LogOut className="h-4 w-4" /> Log Out
                </Button>
              ) : (
                <>
                  <Button asChild variant="outline" className="w-full">
                    <Link to="/login" onClick={closeAnd()}>Login</Link>
                  </Button>
                  <Button asChild className="w-full bg-accent hover:bg-accent/90 text-accent-foreground">
                    <Link to="/signup" onClick={closeAnd()}>Get Started Free</Link>
                  </Button>
                </>
              )}
            </div>
          </SheetContent>
        </Sheet>
      </div>
    </nav>
  );
};

export default LandingNavbar;
