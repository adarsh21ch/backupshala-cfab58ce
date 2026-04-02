import { Link } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { BookOpen, IndianRupee, GraduationCap } from 'lucide-react';

const Hero = () => {
  return (
    <section className="relative overflow-hidden py-16 md:py-24">
      <div className="container mx-auto px-4">
        <div className="grid items-center gap-12 lg:grid-cols-2">
          <div className="animate-fade-in">
            <div className="mb-4 inline-flex items-center gap-2 rounded-pill border border-primary/20 bg-primary/5 px-4 py-1.5">
              <span className="h-2 w-2 rounded-full bg-primary" />
              <span className="text-sm font-medium text-primary">India's #1 Learn, Earn & Teach Platform</span>
            </div>
            <h1 className="font-heading text-4xl font-800 leading-tight md:text-6xl">
              Teach. Learn. Earn.
            </h1>
            <p className="mt-2 font-heading text-xl text-primary md:text-2xl font-700">
              Your Digital Backup Starts Here.
            </p>
            <p className="mt-4 max-w-lg text-base text-muted-foreground md:text-lg">
              Whether you want to learn digital skills, teach your expertise, or earn by referring friends — Backupshala is built for you. Start for just ₹249.
            </p>
            <div className="mt-8 flex flex-col gap-3 sm:flex-row">
              <Button asChild size="lg" className="bg-accent hover:bg-accent/90 text-accent-foreground rounded-pill px-8 text-base font-semibold shadow-lg shadow-accent/25">
                <Link to="/c/backupshala/backupshala-standard-bundle">Start Learning — ₹249</Link>
              </Button>
              <Button asChild variant="outline" size="lg" className="rounded-pill px-8 text-base">
                <a href="#for-creators">Become a Creator</a>
              </Button>
            </div>
          </div>

          <div className="relative hidden lg:block">
            <div className="animate-fade-in rounded-2xl border border-border bg-card p-6 shadow-xl" style={{ animationDelay: '0.2s' }}>
              <div className="mb-4 flex items-center gap-3">
                <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-primary/10">
                  <BookOpen className="h-5 w-5 text-primary" />
                </div>
                <div>
                  <p className="font-heading text-sm font-semibold">📚 Standard Bundle at ₹249</p>
                  <p className="text-xs text-muted-foreground">Curated resources + certificate</p>
                </div>
              </div>
              <div className="mb-4 flex items-center gap-3">
                <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-accent/10">
                  <IndianRupee className="h-5 w-5 text-accent" />
                </div>
                <div>
                  <p className="font-heading text-sm font-semibold">₹ Earn ₹75 per referral</p>
                  <p className="text-xs text-muted-foreground">Share and earn automatically</p>
                </div>
              </div>
              <div className="flex items-center gap-3">
                <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-primary/10">
                  <GraduationCap className="h-5 w-5 text-primary" />
                </div>
                <div>
                  <p className="font-heading text-sm font-semibold">🎓 Creator Marketplace</p>
                  <p className="text-xs text-muted-foreground">Sell your own course, set your price</p>
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
