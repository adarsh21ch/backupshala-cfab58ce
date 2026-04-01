import { Link } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { Award, Users, BookOpen } from 'lucide-react';

const Hero = () => {
  return (
    <section className="relative overflow-hidden py-16 md:py-24">
      <div className="container mx-auto px-4">
        <div className="grid items-center gap-12 lg:grid-cols-2">
          <div className="animate-fade-in">
            <div className="mb-4 inline-flex items-center gap-2 rounded-pill border border-primary/20 bg-primary/5 px-4 py-1.5">
              <span className="h-2 w-2 rounded-full bg-primary" />
              <span className="text-sm font-medium text-primary">India's most affordable skill platform</span>
            </div>
            <h1 className="font-heading text-4xl font-800 leading-tight md:text-6xl">
              Learn. Earn.{' '}
              <span className="text-primary">Grow.</span>
            </h1>
            <p className="mt-2 font-heading text-xl text-muted-foreground md:text-2xl">
              Your Digital Backup Starts Here.
            </p>
            <p className="mt-4 max-w-lg text-base text-muted-foreground md:text-lg">
              5 practical digital skill courses for <span className="font-semibold text-foreground">₹249</span>. Learn video editing, content creation, personal branding, sales, and more. Get certified. Refer friends. Earn commissions.
            </p>
            <div className="mt-8 flex flex-col gap-3 sm:flex-row">
              <Button asChild size="lg" className="bg-accent hover:bg-accent/90 text-accent-foreground rounded-pill px-8 text-base font-semibold shadow-lg shadow-accent/25">
                <Link to="/signup">Start Learning — ₹249</Link>
              </Button>
              <Button asChild variant="outline" size="lg" className="rounded-pill px-8 text-base">
                <a href="#courses">See What's Inside</a>
              </Button>
            </div>
          </div>

          <div className="relative hidden lg:block">
            <div className="animate-fade-in rounded-2xl border border-border bg-card p-6 shadow-xl" style={{ animationDelay: '0.2s' }}>
              <div className="mb-4 flex items-center gap-3">
                <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-primary/10">
                  <Award className="h-5 w-5 text-primary" />
                </div>
                <div>
                  <p className="font-heading text-sm font-semibold">Certificate of Completion</p>
                  <p className="text-xs text-muted-foreground">Shareable on LinkedIn & WhatsApp</p>
                </div>
              </div>
              <div className="mb-4 flex items-center gap-3">
                <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-accent/10">
                  <Users className="h-5 w-5 text-accent" />
                </div>
                <div>
                  <p className="font-heading text-sm font-semibold">₹75 per referral</p>
                  <p className="text-xs text-muted-foreground">Earn by sharing with friends</p>
                </div>
              </div>
              <div className="flex items-center gap-3">
                <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-primary/10">
                  <BookOpen className="h-5 w-5 text-primary" />
                </div>
                <div>
                  <p className="font-heading text-sm font-semibold">5 courses included</p>
                  <p className="text-xs text-muted-foreground">Video editing, branding, sales & more</p>
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
