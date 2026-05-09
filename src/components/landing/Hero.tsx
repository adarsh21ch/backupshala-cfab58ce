import { Link } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { CheckCircle2, Star } from 'lucide-react';
import { usePlatformSettings } from '@/hooks/usePlatformSettings';

const avatars = [
  { initial: 'A', bg: 'bg-primary/80' },
  { initial: 'R', bg: 'bg-accent/80' },
  { initial: 'S', bg: 'bg-info/80' },
  { initial: 'M', bg: 'bg-warning/80' },
];

const Hero = () => {
  const { data: settings, isLoading } = usePlatformSettings();
  const priceLabel = isLoading ? '—' : `₹${settings.basic_price}`;
  const features = [
    `${priceLabel} One-time access fee`,
    '5+ Digital skill courses',
    'Verified certificate on completion',
    'Community access included',
    'Refer & earn rewards',
  ];
  return (
    <section className="relative overflow-hidden bg-hero-gradient py-16 md:py-24">
      {/* Subtle radial glow behind text */}
      <div
        aria-hidden
        className="pointer-events-none absolute inset-0 z-0"
        style={{
          background:
            'radial-gradient(ellipse 60% 50% at 25% 30%, rgba(249,115,22,0.08), transparent 70%)',
        }}
      />

      <div className="container relative z-10 mx-auto px-4">
        <div className="grid items-center gap-12 lg:grid-cols-2">
          {/* Left */}
          <div className="animate-fade-in">
            <div className="mb-6 inline-flex items-center gap-2 rounded-full border border-accent/30 bg-card/90 px-4 py-1.5 shadow-soft backdrop-blur-sm">
              <span className="pulse-dot h-2 w-2 rounded-full bg-primary" />
              <span className="text-sm font-medium text-foreground/80">
                Digital Skills Learning Platform
              </span>
            </div>

            <h1
              className="font-heading font-bold leading-[1.05] tracking-tight"
              style={{ fontSize: 'clamp(2.25rem, 6vw, 4.25rem)' }}
            >
              Learn Digital Skills.{' '}
              <span className="text-gradient-accent">Get Certified.</span>{' '}
              Grow Your Career.
            </h1>

            <p className="mt-6 max-w-lg text-base text-muted-foreground md:text-lg leading-relaxed">
              The school for your backup plan. Learn skills that earn while you prepare for your main goal.
            </p>

            <div className="mt-8 flex flex-col gap-3 sm:flex-row">
              <Button
                asChild
                size="lg"
                className="btn-lift w-full sm:w-auto rounded-xl bg-accent px-8 text-base font-semibold text-accent-foreground shadow-accent-glow hover:bg-accent hover:shadow-accent-glow-hover"
              >
                <Link to="/c/backupshala/backupshala-standard-bundle">
                  Explore Standard Bundle — {priceLabel}
                </Link>
              </Button>
              <Button
                asChild
                variant="outline"
                size="lg"
                className="w-full sm:w-auto rounded-xl border-[1.5px] px-8 text-base hover:bg-secondary"
              >
                <Link to="/explore">Browse Courses</Link>
              </Button>
            </div>
          </div>

          {/* Right — premium floating card */}
          <div className="relative hidden lg:block">
            <div
              className="animate-fade-in lift-hover relative overflow-hidden rounded-[20px] border border-border bg-card p-7 shadow-soft-hover"
              style={{ animationDelay: '0.15s' }}
            >
              {/* Saffron top accent */}
              <div className="absolute inset-x-0 top-0 h-[3px] bg-gradient-to-r from-accent via-accent to-accent/60" />

              <h3 className="font-heading text-base font-bold mb-5">What you get</h3>
              <div className="space-y-3.5">
                {features.map((f) => (
                  <div key={f} className="flex items-center gap-3">
                    <div className="flex h-6 w-6 items-center justify-center rounded-full bg-primary text-primary-foreground shadow-sm">
                      <CheckCircle2 className="h-3.5 w-3.5" strokeWidth={2.5} />
                    </div>
                    <span className="text-sm font-medium text-foreground/90">{f}</span>
                  </div>
                ))}
              </div>

              {/* Trusted by */}
              <div className="mt-6 flex items-center gap-3 rounded-xl border border-border bg-secondary/50 px-4 py-3">
                <div className="flex -space-x-2">
                  {avatars.map((a, i) => (
                    <div
                      key={i}
                      className={`flex h-7 w-7 items-center justify-center rounded-full ${a.bg} text-[11px] font-bold text-white ring-2 ring-card`}
                    >
                      {a.initial}
                    </div>
                  ))}
                </div>
                <div className="min-w-0 flex-1">
                  <p className="text-xs leading-tight text-muted-foreground">
                    Trusted by <span className="font-semibold text-foreground">500+</span> learners
                  </p>
                  <div className="mt-0.5 flex items-center gap-1">
                    <div className="flex">
                      {Array.from({ length: 5 }).map((_, i) => (
                        <Star key={i} className="h-3 w-3 fill-warning text-warning" />
                      ))}
                    </div>
                    <span className="text-[11px] font-semibold text-foreground">4.8</span>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
};

export default Hero;
