import { Link } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { CheckCircle } from 'lucide-react';

const features = [
  '₹249 One-time access fee',
  '5+ Digital skill courses',
  'Verified certificate',
  'Community access',
  'Referral program available',
];

const Hero = () => {
  return (
    <section className="relative overflow-hidden py-16 md:py-24">
      <div className="container mx-auto px-4">
        <div className="grid items-center gap-12 lg:grid-cols-2">
          <div className="animate-fade-in">
            <div className="mb-5 inline-flex items-center gap-2 rounded-full border border-primary/20 bg-primary/5 px-4 py-1.5">
              <span className="h-2 w-2 rounded-full bg-primary" />
              <span className="text-sm font-medium text-primary">Digital Skills Learning Platform</span>
            </div>

            <h1 className="font-heading text-4xl font-800 leading-tight md:text-5xl lg:text-6xl">
              Learn Digital Skills.{' '}
              <span className="bg-gradient-to-r from-accent to-accent/70 bg-clip-text text-transparent">
                Get Certified.
              </span>{' '}
              Grow Your Career.
            </h1>

            <p className="mt-5 max-w-lg text-base text-muted-foreground md:text-lg leading-relaxed">
              Affordable digital skills courses by expert creators. Enroll, learn at your pace, and earn a verified certificate on completion.
            </p>

            <div className="mt-8 flex flex-col gap-3 sm:flex-row">
              <Button asChild size="lg" className="bg-accent hover:bg-accent/90 text-accent-foreground rounded-xl px-8 text-base font-semibold shadow-lg shadow-accent/20">
                <Link to="/c/backupshala/backupshala-standard-bundle">Explore Standard Bundle — ₹249</Link>
              </Button>
              <Button asChild variant="outline" size="lg" className="rounded-xl px-8 text-base">
                <Link to="/explore">Browse Courses</Link>
              </Button>
            </div>
          </div>

          <div className="relative hidden lg:block">
            <div className="animate-fade-in rounded-2xl border border-border bg-card p-6 shadow-xl" style={{ animationDelay: '0.2s' }}>
              <h3 className="font-heading text-base font-700 mb-4">What you get</h3>
              <div className="space-y-3.5">
                {features.map(f => (
                  <div key={f} className="flex items-center gap-3">
                    <div className="flex h-6 w-6 items-center justify-center rounded-full bg-primary/10">
                      <CheckCircle className="h-3.5 w-3.5 text-primary" />
                    </div>
                    <span className="text-sm font-medium">{f}</span>
                  </div>
                ))}
              </div>
              <div className="mt-5 rounded-xl bg-accent/5 border border-accent/20 px-4 py-3">
                <p className="text-xs text-muted-foreground">Trusted by <span className="font-semibold text-foreground">500+</span> learners • <span className="font-semibold text-foreground">10+</span> Courses</p>
              </div>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
};

export default Hero;
