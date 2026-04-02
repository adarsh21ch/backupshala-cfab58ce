import { Link } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { Check, Star } from 'lucide-react';
import { Progress } from '@/components/ui/progress';

const includes = [
  'Video Editing — learn CapCut and short-form editing',
  'Content Creation & Instagram Growth',
  'Personal Branding fundamentals',
  'Sales & Communication skills',
  'Freelancing — find clients and earn online',
  'Private Telegram Community access',
  'Certificate of Completion (verifiable)',
  'Refer friends, earn ₹75 per referral',
];

const StandardBundleSpotlight = () => (
  <section id="standard-bundle" className="py-16 md:py-24">
    <div className="container mx-auto px-4">
      <div className="grid items-center gap-12 lg:grid-cols-2">
        {/* Left */}
        <div>
          <div className="mb-4 inline-flex items-center gap-2 rounded-pill bg-primary/10 px-4 py-1.5">
            <Star className="h-4 w-4 text-primary" />
            <span className="text-sm font-semibold text-primary">Backupshala Official</span>
          </div>
          <h2 className="font-heading text-3xl font-800 md:text-4xl">
            Start Your Digital Journey for Just ₹249
          </h2>
          <p className="mt-3 text-muted-foreground md:text-lg">
            Our flagship bundle includes everything a beginner needs to build real digital skills — curated resources, expert guidance, and community access.
          </p>
          <ul className="mt-6 space-y-3">
            {includes.map((item, i) => (
              <li key={i} className="flex items-start gap-2 text-sm">
                <Check className="mt-0.5 h-4 w-4 shrink-0 text-primary" />
                <span>{item}</span>
              </li>
            ))}
          </ul>
          <div className="mt-8 flex flex-col gap-3 sm:flex-row">
            <Button asChild size="lg" className="bg-primary hover:bg-primary/90 text-primary-foreground rounded-pill px-8 font-semibold">
              <Link to="/c/backupshala/backupshala-standard-bundle">Enroll Now — ₹249</Link>
            </Button>
            <Button asChild variant="outline" size="lg" className="rounded-pill px-8">
              <Link to="/c/backupshala/backupshala-standard-bundle">Preview the Course</Link>
            </Button>
          </div>
          <p className="mt-3 text-xs text-muted-foreground">Includes 18% GST. GST invoice emailed on enrollment.</p>
        </div>

        {/* Right — visual card */}
        <div className="relative mx-auto w-full max-w-sm">
          <div className="absolute -right-2 -top-2 z-10 rounded-sm bg-accent px-3 py-1 text-xs font-bold text-accent-foreground shadow">
            Most Popular
          </div>
          <div className="rounded-2xl bg-gradient-to-br from-primary to-primary/80 p-8 text-primary-foreground shadow-2xl">
            <div className="mb-2 inline-flex items-center gap-1 rounded-pill bg-primary-foreground/20 px-3 py-1 text-xs font-semibold">
              <Star className="h-3 w-3" /> Official Course
            </div>
            <h3 className="font-heading text-xl font-800">Backupshala Standard Bundle</h3>
            <p className="mt-4 font-heading text-4xl font-800">₹249</p>
            <p className="mt-1 text-sm opacity-80">7 modules included</p>
            <p className="text-sm opacity-80">Certificate + Community</p>
            <div className="mt-6">
              <div className="flex items-center justify-between text-xs opacity-80 mb-1">
                <span>Your progress</span>
                <span>0%</span>
              </div>
              <Progress value={0} className="h-2 bg-primary-foreground/20" />
            </div>
          </div>
        </div>
      </div>
    </div>
  </section>
);

export default StandardBundleSpotlight;
