import { Link } from 'react-router-dom';

const Footer = () => (
  <footer className="border-t border-border bg-card py-12">
    <div className="container mx-auto px-4">
      <div className="grid gap-8 md:grid-cols-4">
        <div>
          <span className="font-heading text-xl font-800"><span className="text-primary">Backup</span><span className="text-accent">shala</span></span>
          <p className="mt-2 text-sm text-muted-foreground">Your backup plan starts here.</p>
        </div>
        <div>
          <p className="font-heading text-sm font-600 mb-3">Platform</p>
          <div className="flex flex-col gap-2">
            <Link to="/explore" className="text-sm text-muted-foreground hover:text-foreground">Explore Courses</Link>
            <Link to="/verify" className="text-sm text-muted-foreground hover:text-foreground">Verify Certificate</Link>
          </div>
        </div>
        <div>
          <p className="font-heading text-sm font-600 mb-3">Account</p>
          <div className="flex flex-col gap-2">
            <Link to="/login" className="text-sm text-muted-foreground hover:text-foreground">Login</Link>
            <Link to="/signup" className="text-sm text-muted-foreground hover:text-foreground">Sign Up</Link>
          </div>
        </div>
        <div>
          <p className="font-heading text-sm font-600 mb-3">Legal</p>
          <div className="flex flex-col gap-2">
            <span className="text-sm text-muted-foreground">Privacy Policy</span>
            <span className="text-sm text-muted-foreground">Refund Policy</span>
            <span className="text-sm text-muted-foreground">Terms of Service</span>
          </div>
        </div>
      </div>
      <div className="mt-8 border-t border-border pt-6 text-center text-xs text-muted-foreground">
        © {new Date().getFullYear()} Backupshala. All rights reserved.
      </div>
    </div>
  </footer>
);

export default Footer;
