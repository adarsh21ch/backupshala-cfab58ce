import { Link } from 'react-router-dom';
import { Button } from '@/components/ui/button';

const CreatorCTA = () => (
  <section className="bg-primary py-16 md:py-20">
    <div className="container mx-auto px-4 text-center">
      <h2 className="font-heading text-2xl font-700 text-primary-foreground md:text-3xl">
        Already running enrollments informally?
      </h2>
      <p className="mt-3 text-primary-foreground/80 max-w-lg mx-auto">
        Make it legal with Backupshala. We handle payments, GST invoicing, and commission payouts — so you can focus on teaching.
      </p>
      <Button asChild size="lg" className="mt-6 rounded-md bg-accent hover:bg-accent/90 text-accent-foreground font-semibold px-8">
        <Link to="/signup">Become a Creator</Link>
      </Button>
    </div>
  </section>
);

export default CreatorCTA;
