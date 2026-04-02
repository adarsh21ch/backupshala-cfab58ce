import { Upload, Scale, SlidersHorizontal } from 'lucide-react';
import { Link } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { useAuth } from '@/contexts/AuthContext';

const benefits = [
  { icon: Upload, title: 'Video or Resource Courses', desc: 'Upload video lessons OR create a resource bundle with curated YouTube links, podcast episodes, and articles. Both formats supported.' },
  { icon: Scale, title: 'Legal, GST-Compliant Payments', desc: 'Every enrollment is processed through Razorpay to your account. GST invoices auto-generated. Commissions auto-paid. 100% legal.' },
  { icon: SlidersHorizontal, title: 'Your Price, Your Commission', desc: 'Set your course price from ₹99 to ₹9,999. Set referral commission from 0% to 85%. Change anytime. We take only 15%.' },
];

const ForCreators = () => {
  const { user, profile } = useAuth();
  const ctaHref = user && profile?.is_creator && profile?.creator_approved ? '/creator/dashboard' : user ? '/creator/onboarding' : '/signup';

  return (
    <section id="for-creators" className="bg-secondary/30 py-16 md:py-24">
      <div className="container mx-auto px-4">
        <div className="text-center mb-12">
          <p className="text-sm font-semibold text-accent mb-1">FOR CREATORS</p>
          <h2 className="font-heading text-3xl font-700">Have Knowledge? Turn It Into Income.</h2>
          <p className="mt-2 text-muted-foreground max-w-xl mx-auto">Join creators who are already earning on Backupshala. Upload your course, set your price, and let us handle everything else.</p>
        </div>
        <div className="grid gap-6 sm:grid-cols-3">
          {benefits.map((b, i) => (
            <div key={i} className="rounded-xl border border-border bg-card p-6 text-center">
              <div className="mx-auto mb-4 flex h-12 w-12 items-center justify-center rounded-xl bg-accent/10">
                <b.icon className="h-6 w-6 text-accent" />
              </div>
              <h3 className="font-heading text-base font-600">{b.title}</h3>
              <p className="mt-2 text-sm text-muted-foreground">{b.desc}</p>
            </div>
          ))}
        </div>

        {/* Earnings example */}
        <div className="mt-12 mx-auto max-w-lg rounded-xl border border-border bg-card p-6">
          <p className="font-heading text-sm font-600 mb-3">Example: If your course is ₹999 at 30% commission:</p>
          <div className="space-y-1 text-sm text-muted-foreground">
            <p>100 enrollments × ₹999 = <span className="text-foreground font-medium">₹99,900</span> total</p>
            <p>Platform fee (15%) = ₹14,985</p>
            <p>Referral commissions (30%) = ₹29,970</p>
            <p className="text-primary font-semibold pt-1 border-t border-border mt-2">You receive = ₹54,945</p>
          </div>
          <p className="mt-3 text-xs text-muted-foreground">And if you also personally referred some students — you earn the referral commission too.</p>
        </div>

        <div className="mt-10 text-center">
          <Button asChild size="lg" className="rounded-md bg-accent hover:bg-accent/90 text-accent-foreground font-semibold px-8">
            <Link to={ctaHref}>Apply to Become a Creator →</Link>
          </Button>
        </div>
      </div>
    </section>
  );
};

export default ForCreators;
