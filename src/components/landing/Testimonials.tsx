import { Star } from 'lucide-react';

const testimonials = [
  {
    name: 'Priya S., Delhi',
    role: 'Student',
    quote: 'I enrolled in the Standard Bundle and completed it in 2 weeks. Already earned ₹375 by referring 5 friends. The certificate looks so professional!',
  },
  {
    name: 'Rahul M., Mumbai',
    role: 'Creator',
    quote: 'Uploaded my content creation course in 2 days. Got my first 12 enrollments within a week. Backupshala handles everything — payments, invoices, commissions.',
  },
  {
    name: 'Anjali K., Bangalore',
    role: 'Student & Referrer',
    quote: 'Started as a student, now I refer Backupshala to everyone in my network. Earned ₹2,250 in commissions last month just by sharing.',
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
        * Testimonials are illustrative. Results vary based on effort and network size.
      </p>
    </div>
  </section>
);

export default Testimonials;
