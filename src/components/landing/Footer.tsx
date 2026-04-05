import { Link } from 'react-router-dom';

const Footer = () => (
  <footer className="border-t border-border bg-card py-12">
    <div className="container mx-auto px-4">
      <div className="grid gap-8 sm:grid-cols-2 lg:grid-cols-5">
        <div>
          <span className="font-heading text-xl font-800"><span className="text-accent">Backup</span><span className="text-primary">shala</span></span>
          <p className="mt-2 text-sm text-muted-foreground">Your backup plan starts here.</p>
        </div>
        <div>
          <p className="font-heading text-sm font-600 mb-3">Platform</p>
          <div className="flex flex-col gap-2">
            <Link to="/explore" className="text-sm text-muted-foreground hover:text-foreground">Explore Courses</Link>
            <Link to="/c/backupshala/backupshala-standard-bundle" className="text-sm text-muted-foreground hover:text-foreground">Standard Bundle</Link>
            <a href="/#how-it-works" className="text-sm text-muted-foreground hover:text-foreground">How It Works</a>
            <a href="/#platform-fee" className="text-sm text-muted-foreground hover:text-foreground">Pricing</a>
          </div>
        </div>
        <div>
          <p className="font-heading text-sm font-600 mb-3">Creators</p>
          <div className="flex flex-col gap-2">
            <Link to="/creator/onboarding" className="text-sm text-muted-foreground hover:text-foreground">Become a Creator</Link>
            <Link to="/creator/dashboard" className="text-sm text-muted-foreground hover:text-foreground">Creator Dashboard</Link>
            <Link to="/refund-policy" className="text-sm text-muted-foreground hover:text-foreground">Payout Policy</Link>
            <a href="/#faq" className="text-sm text-muted-foreground hover:text-foreground">Creator FAQ</a>
          </div>
        </div>
        <div>
          <p className="font-heading text-sm font-600 mb-3">Students</p>
          <div className="flex flex-col gap-2">
            <Link to="/dashboard" className="text-sm text-muted-foreground hover:text-foreground">My Dashboard</Link>
            <Link to="/dashboard/certificates" className="text-sm text-muted-foreground hover:text-foreground">My Certificates</Link>
            <Link to="/refer" className="text-sm text-muted-foreground hover:text-foreground">Refer & Earn</Link>
            <Link to="/verify" className="text-sm text-muted-foreground hover:text-foreground">Verify Certificate</Link>
          </div>
        </div>
        <div>
          <p className="font-heading text-sm font-600 mb-3">Company</p>
          <div className="flex flex-col gap-2">
            <Link to="/about" className="text-sm text-muted-foreground hover:text-foreground">About Backupshala</Link>
            <Link to="/contact" className="text-sm text-muted-foreground hover:text-foreground">Contact Us</Link>
            <Link to="/privacy-policy" className="text-sm text-muted-foreground hover:text-foreground">Privacy Policy</Link>
            <Link to="/terms" className="text-sm text-muted-foreground hover:text-foreground">Terms of Service</Link>
            <Link to="/refund-policy" className="text-sm text-muted-foreground hover:text-foreground">Refund Policy</Link>
          </div>
        </div>
      </div>
      <div className="mt-8 border-t border-border pt-6 text-center text-xs text-muted-foreground">
        © {new Date().getFullYear()} Backupshala. All rights reserved. | Made in India 🇮🇳
      </div>
    </div>
  </footer>
);

export default Footer;
