import { Upload, Tag, Shield } from 'lucide-react';
import { Link } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { useAuth } from '@/contexts/AuthContext';

const benefits = [
  { icon: Upload, title: 'Upload Your Course', desc: 'Create modules, add videos, and publish your knowledge.' },
  { icon: Tag, title: 'Set Your Own Price', desc: 'You choose the price. You choose the referral commission %.' },
  { icon: Shield, title: 'We Handle the Rest', desc: 'Payments, GST invoices, commission payouts — all handled legally by Backupshala.' },
];

const ForCreators = () => {
  const { user, profile } = useAuth();
  const ctaLink = user ? '/creator/onboarding' : '/signup';
  const ctaText = user && profile?.is_creator && profile?.creator_approved ? 'Go to Creator Dashboard' : 'Become a Creator — Free';
  const ctaHref = user && profile?.is_creator && profile?.creator_approved ? '/creator/dashboard' : ctaLink;

  return (
    <section id="for-creators" className="bg-secondary/30 py-16 md:py-24">
      <div className="container mx-auto px-4">
        <div className="text-center mb-12">
          <p className="text-sm font-semibold text-accent mb-1">FOR CREATORS</p>
          <h2 className="font-heading text-3xl font-700">Host. Sell. Scale.</h2>
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
        <div className="mt-10 text-center">
          <Button asChild size="lg" className="rounded-md bg-accent hover:bg-accent/90 text-accent-foreground font-semibold px-8">
            <Link to={ctaHref}>{ctaText}</Link>
          </Button>
        </div>
      </div>
    </section>
  );
};

export default ForCreators;
