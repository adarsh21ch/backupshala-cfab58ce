import SEOHead from '@/components/SEOHead';
import LandingNavbar from '@/components/landing/Navbar';
import Footer from '@/components/landing/Footer';
import BackButton from '@/components/BackButton';
import PricingTiers from '@/components/pricing/PricingTiers';

const Pricing = () => {
  return (
    <div className="min-h-screen flex flex-col">
      <SEOHead
        title="Pricing — Backupshala Plans"
        description="Simple, transparent, GST-inclusive pricing for Backupshala. Pick a plan and start learning today."
        path="/pricing"
      />
      <LandingNavbar />
      <main className="flex-1">
        <div className="container mx-auto px-4 pt-6">
          <BackButton fallback="/" />
        </div>
        <PricingTiers />
      </main>
      <Footer />
    </div>
  );
};

export default Pricing;
