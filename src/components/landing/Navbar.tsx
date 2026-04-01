import { Link } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { Menu, X } from 'lucide-react';
import { useState } from 'react';

const LandingNavbar = () => {
  const [open, setOpen] = useState(false);

  return (
    <nav className="sticky top-0 z-50 border-b border-border bg-background/80 backdrop-blur-md">
      <div className="container mx-auto flex h-16 items-center justify-between px-4">
        <Link to="/" className="flex items-center gap-1">
          <span className="font-heading text-2xl font-800 text-primary">Backup</span>
          <span className="font-heading text-2xl font-800 text-accent">shala</span>
        </Link>

        <div className="hidden items-center gap-6 md:flex">
          <Link to="/explore" className="text-sm font-medium text-muted-foreground hover:text-foreground transition-colors">Explore Courses</Link>
          <a href="#how-it-works" className="text-sm font-medium text-muted-foreground hover:text-foreground transition-colors">How It Works</a>
          <a href="#for-creators" className="text-sm font-medium text-muted-foreground hover:text-foreground transition-colors">For Creators</a>
          <Link to="/login" className="text-sm font-medium text-foreground">Login</Link>
          <Button asChild className="bg-accent hover:bg-accent/90 text-accent-foreground rounded-md px-6">
            <Link to="/signup">Get Started</Link>
          </Button>
        </div>

        <button className="md:hidden" onClick={() => setOpen(!open)}>
          {open ? <X className="h-6 w-6" /> : <Menu className="h-6 w-6" />}
        </button>
      </div>

      {open && (
        <div className="border-t border-border bg-background px-4 py-4 md:hidden">
          <div className="flex flex-col gap-3">
            <Link to="/explore" onClick={() => setOpen(false)} className="text-sm font-medium text-muted-foreground">Explore Courses</Link>
            <a href="#how-it-works" onClick={() => setOpen(false)} className="text-sm font-medium text-muted-foreground">How It Works</a>
            <a href="#for-creators" onClick={() => setOpen(false)} className="text-sm font-medium text-muted-foreground">For Creators</a>
            <Link to="/login" onClick={() => setOpen(false)} className="text-sm font-medium text-foreground">Login</Link>
            <Button asChild className="bg-accent hover:bg-accent/90 text-accent-foreground rounded-md w-full">
              <Link to="/signup">Get Started</Link>
            </Button>
          </div>
        </div>
      )}
    </nav>
  );
};

export default LandingNavbar;
