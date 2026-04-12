import { Star } from 'lucide-react';

const testimonials = [
  {
    name: 'Priya S., Delhi',
    role: 'Student',
    quote: 'I enrolled in the Standard Bundle and completed it in 2 weeks. The certificate looks professional and the content was very practical.',
  },
  {
    name: 'Rahul M., Mumbai',
    role: 'Creator',
    quote: 'Uploaded my content creation course in 2 days. Got my first enrollments within a week. Backupshala handles payments, invoices, and delivery.',
  },
  {
    name: 'Anjali K., Bangalore',
    role: 'Student',
    quote: 'The digital skills courses helped me learn video editing and freelancing basics. Great value for the price.',
  },
];

const Testimonials = () => (
  <section className="py-16 md:py-24">
    <div className="container mx-auto px-4">
      <div className="text-center mb-12">
        <h2 className="font-heading text-3xl font-700">What Our Users Say</h2>
      </div>
      <div className="grid gap-6 sm:grid-cols-3">
        {testimonials.map((t, i) => (
          <div key={i} className="rounded-xl border border-border bg-card p-6">
            <div className="flex gap-0.5 mb-3">
              {[...Array(5)].map((_, j) => (
                <Star key={j} className="h-4 w-4 fill-accent text-accent" />
              ))}
            </div>
            <p className="text-sm text-muted-foreground italic">"{t.quote}"</p>
            <div className="mt-4 border-t border-border pt-3">
              <p className="font-heading text-sm font-600">{t.name}</p>
              <p className="text-xs text-muted-foreground">{t.role}</p>
            </div>
          </div>
        ))}
      </div>
      <p className="mt-6 text-center text-xs text-muted-foreground">
        * These testimonials are illustrative examples. Individual experiences and results vary. Backupshala does not guarantee any specific outcome.
      </p>
    </div>
  </section>
);

export default Testimonials;
