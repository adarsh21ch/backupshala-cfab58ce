import { Link } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { GraduationCap, Rocket } from 'lucide-react';

const CreatorCTA = () => (
  <section className="py-16 md:py-24">
    <div className="container mx-auto px-4">
      <h2 className="font-heading text-3xl font-700 text-center mb-10">Ready to Start?</h2>
      <div className="grid gap-6 md:grid-cols-2 max-w-3xl mx-auto">
        {/* Students */}
        <div className="rounded-2xl border border-primary/20 bg-primary/5 p-8 text-center">
          <GraduationCap className="mx-auto h-10 w-10 text-primary mb-4" />
          <h3 className="font-heading text-xl font-700">Start Learning</h3>
          <p className="mt-2 text-sm text-muted-foreground">Enroll in the Standard Bundle for ₹249 and begin your digital skills journey today.</p>
          <Button asChild size="lg" className="mt-6 bg-primary hover:bg-primary/90 text-primary-foreground font-semibold px-8 rounded-pill w-full">
            <Link to="/c/backupshala/backupshala-standard-bundle">Get the Bundle — ₹249</Link>
          </Button>
        </div>
        {/* Creators */}
        <div className="rounded-2xl border border-accent/20 bg-accent/5 p-8 text-center">
          <Rocket className="mx-auto h-10 w-10 text-accent mb-4" />
          <h3 className="font-heading text-xl font-700">Start Teaching</h3>
          <p className="mt-2 text-sm text-muted-foreground">Upload your course, set your price, and start earning from your knowledge.</p>
          <Button asChild size="lg" className="mt-6 bg-accent hover:bg-accent/90 text-accent-foreground font-semibold px-8 rounded-pill w-full">
            <Link to="/creator/onboarding">Become a Creator — Free</Link>
          </Button>
        </div>
      </div>
    </div>
  </section>
);

export default CreatorCTA;
