import { Link } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { Check, Star, Award } from 'lucide-react';
import { Progress } from '@/components/ui/progress';

const includes = [
  'Video Editing — learn CapCut and short-form editing',
  'Content Creation & Instagram Growth',
  'Personal Branding fundamentals',
  'Sales & Communication skills',
  'Freelancing — finding clients and working online',
  'Community access for enrolled learners',
  'Certificate of Completion (verifiable)',
  'Refer & earn — share courses, earn commissions',
];

const StandardBundleSpotlight = () => (
  <section id="standard-bundle" className="py-16 md:py-24">
    <div className="container mx-auto px-4">
      <div className="grid items-center gap-12 lg:grid-cols-2">
        {/* Left */}
        <div>
          <div className="mb-4 inline-flex items-center gap-2 rounded-full bg-primary/10 px-4 py-1.5">
            <Star className="h-4 w-4 text-primary" />
            <span className="text-sm font-semibold text-primary">Backupshala Official</span>
          </div>
          <h2 className="font-heading text-3xl font-bold tracking-tight md:text-4xl">
            Start Your Digital Skills Journey for ₹249
          </h2>
          <p className="mt-3 text-muted-foreground md:text-lg">
            Our flagship bundle includes everything a beginner needs to build practical digital skills — curated resources, expert guidance, and community access.
          </p>
          <ul className="mt-6 space-y-2">
            {includes.map((item, i) => (
              <li
                key={i}
                className="flex items-start gap-3 rounded-lg px-2 py-1.5 text-sm transition-colors hover:bg-secondary/60"
              >
                <span className="mt-0.5 flex h-5 w-5 shrink-0 items-center justify-center rounded-full bg-primary/15">
                  <Check className="h-3 w-3 text-primary" strokeWidth={3} />
                </span>
                <span>{item}</span>
              </li>
            ))}
          </ul>
          <div className="mt-8 flex flex-col gap-3 sm:flex-row">
            <Button
              asChild
              size="lg"
              className="btn-lift rounded-xl bg-primary px-8 font-semibold text-primary-foreground shadow-soft hover:bg-primary/90"
            >
              <Link to="/c/backupshala/backupshala-standard-bundle">Enroll Now — ₹249</Link>
            </Button>
            <Button asChild variant="outline" size="lg" className="rounded-xl border-[1.5px] px-8">
              <Link to="/c/backupshala/backupshala-standard-bundle">Preview the Course</Link>
            </Button>
          </div>
          <p className="mt-3 text-xs text-muted-foreground">
            Price includes 18% GST. GST invoice emailed on enrollment.
          </p>
        </div>

        {/* Right — premium course card */}
        <div className="relative mx-auto w-full max-w-sm">
          {/* Floating badges */}
          <div className="absolute -left-3 -top-3 z-20 hidden rounded-full bg-card px-3 py-1.5 text-xs font-semibold text-foreground shadow-soft-hover sm:flex sm:items-center sm:gap-1">
            <Star className="h-3 w-3 fill-warning text-warning" /> Most Popular
          </div>
          <div className="absolute -right-3 -bottom-3 z-20 hidden rounded-full bg-card px-3 py-1.5 text-xs font-semibold text-foreground shadow-soft-hover sm:flex sm:items-center sm:gap-1">
            <Award className="h-3 w-3 text-primary" /> Certificate Included
          </div>

          <div
            className="relative overflow-hidden rounded-[20px] p-8 text-white shadow-soft-hover"
            style={{
              background: 'linear-gradient(135deg, #16A34A 0%, #0F7A35 100%)',
            }}
          >
            {/* Dot pattern overlay */}
            <div className="dot-pattern pointer-events-none absolute inset-0 opacity-60" />

            <div className="relative">
              <div className="mb-3 inline-flex items-center gap-1 rounded-full bg-white/20 px-3 py-1 text-xs font-semibold backdrop-blur-sm">
                <Star className="h-3 w-3" /> Official Course
              </div>
              <h3 className="font-heading text-2xl font-bold leading-tight">
                Backupshala Standard Bundle
              </h3>
              <p className="mt-5 font-heading text-5xl font-extrabold tracking-tight">₹249</p>
              <p className="mt-1 text-sm opacity-80">7 modules · Certificate · Community</p>

              <div className="mt-6">
                <div className="mb-1 flex items-center justify-between text-xs opacity-80">
                  <span>Your progress</span>
                  <span>0%</span>
                </div>
                <Progress value={0} className="h-2 bg-white/25" />
              </div>

              <Button
                asChild
                size="lg"
                className="btn-lift mt-6 w-full rounded-xl bg-white font-semibold text-primary shadow-md hover:bg-white/95"
              >
                <Link to="/c/backupshala/backupshala-standard-bundle">Enroll Now</Link>
              </Button>
            </div>
          </div>
        </div>
      </div>
    </div>
  </section>
);

export default StandardBundleSpotlight;
