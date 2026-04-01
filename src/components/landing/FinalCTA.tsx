import { Link } from 'react-router-dom';
import { Button } from '@/components/ui/button';

const FinalCTA = () => (
  <section className="border-t border-border bg-primary py-16 md:py-24">
    <div className="container mx-auto px-4 text-center">
      <h2 className="font-heading text-3xl font-700 text-primary-foreground md:text-4xl">
        Ready to Build Your Backup Plan?
      </h2>
      <p className="mt-3 text-lg text-primary-foreground/80">
        Join thousands of students learning practical digital skills.
      </p>
      <Button asChild size="lg" className="mt-8 bg-accent hover:bg-accent/90 text-accent-foreground rounded-pill px-10 text-base font-semibold shadow-lg">
        <Link to="/signup">Start for ₹249</Link>
      </Button>
    </div>
  </section>
);

export default FinalCTA;
