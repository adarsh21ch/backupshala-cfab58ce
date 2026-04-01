import { Star } from 'lucide-react';

const testimonials = [
  { name: 'Priya Sharma', role: 'College Student, Delhi', text: 'I learned video editing in just one week and already started freelancing on Instagram. Best ₹249 I ever spent!' },
  { name: 'Rahul Verma', role: 'Working Professional, Pune', text: 'The personal branding course changed how I present myself online. Got 3 freelance leads within a month.' },
  { name: 'Sneha Patel', role: 'Homemaker, Ahmedabad', text: 'I referred 15 friends and earned ₹1,125. The courses are simple to follow and really practical.' },
];

const Testimonials = () => (
  <section className="border-t border-border py-16 md:py-24">
    <div className="container mx-auto px-4">
      <h2 className="text-center font-heading text-3xl font-700 md:text-4xl">What Students Say</h2>
      <div className="mt-12 grid gap-6 md:grid-cols-3">
        {testimonials.map((t, i) => (
          <div key={i} className="rounded-2xl border border-border bg-card p-6 shadow-sm">
            <div className="mb-3 flex gap-1">
              {[...Array(5)].map((_, j) => (
                <Star key={j} className="h-4 w-4 fill-accent text-accent" />
              ))}
            </div>
            <p className="text-sm text-muted-foreground">"{t.text}"</p>
            <div className="mt-4">
              <p className="font-heading text-sm font-600">{t.name}</p>
              <p className="text-xs text-muted-foreground">{t.role}</p>
            </div>
          </div>
        ))}
      </div>
    </div>
  </section>
);

export default Testimonials;
