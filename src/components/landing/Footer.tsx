import { Link } from 'react-router-dom';
import Logo from '@/components/Logo';

const Footer = () => (
  <footer className="border-t border-border bg-card py-12">
    <div className="container mx-auto px-4">
      <div className="grid gap-8 sm:grid-cols-2 lg:grid-cols-5">
        <div>
          <Logo iconSize={28} textClassName="text-xl" />
          <p className="mt-2 text-sm text-muted-foreground">A digital skills learning platform.</p>
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
          <p className="font-heading text-sm font-600 mb-3">For Creators</p>
          <div className="flex flex-col gap-2">
            <Link to="/creator/onboarding" className="text-sm text-muted-foreground hover:text-foreground">Become a Creator</Link>
            <Link to="/creator-agreement" className="text-sm text-muted-foreground hover:text-foreground">Creator Agreement</Link>
            <Link to="/content-policy" className="text-sm text-muted-foreground hover:text-foreground">Content Upload Policy</Link>
            <a href="/#faq" className="text-sm text-muted-foreground hover:text-foreground">FAQ</a>
          </div>
        </div>
        <div>
          <p className="font-heading text-sm font-600 mb-3">For Learners</p>
          <div className="flex flex-col gap-2">
            <Link to="/dashboard" className="text-sm text-muted-foreground hover:text-foreground">My Dashboard</Link>
            <Link to="/dashboard/certificates" className="text-sm text-muted-foreground hover:text-foreground">My Certificates</Link>
            <Link to="/verify" className="text-sm text-muted-foreground hover:text-foreground">Verify Certificate</Link>
            <Link to="/community-guidelines" className="text-sm text-muted-foreground hover:text-foreground">Community Guidelines</Link>
          </div>
        </div>
        <div>
          <p className="font-heading text-sm font-600 mb-3">Legal & Support</p>
          <div className="flex flex-col gap-2">
            <Link to="/about" className="text-sm text-muted-foreground hover:text-foreground">About Backupshala</Link>
            <Link to="/contact" className="text-sm text-muted-foreground hover:text-foreground">Contact Us</Link>
            <Link to="/terms" className="text-sm text-muted-foreground hover:text-foreground">Terms of Service</Link>
            <Link to="/privacy-policy" className="text-sm text-muted-foreground hover:text-foreground">Privacy Policy</Link>
            <Link to="/refund-policy" className="text-sm text-muted-foreground hover:text-foreground">Refund Policy</Link>
            <Link to="/cancellation-policy" className="text-sm text-muted-foreground hover:text-foreground">Cancellation Policy</Link>
            <Link to="/shipping-policy" className="text-sm text-muted-foreground hover:text-foreground">Shipping &amp; Delivery</Link>
          </div>
        </div>
      </div>
      <div className="mt-8 border-t border-border pt-6 text-center text-xs text-muted-foreground space-y-1">
        <p>Backupshala is a digital learning marketplace. We do not guarantee any income, results, or specific outcomes. All course content is provided by independent creators.</p>
        <p className="pt-2">© {new Date().getFullYear()} Nevorai Technologies. All rights reserved.</p>
        <p>Backupshala is a product of Nevorai Technologies.</p>
        <p>GSTIN: 23CBCPC3986J1ZN | Madhya Pradesh, India</p>
      </div>
    </div>
  </footer>
);

export default Footer;
