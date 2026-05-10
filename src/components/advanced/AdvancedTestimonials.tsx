import { Star, Quote } from 'lucide-react';

// TODO: move to DB-backed testimonials table later
const testimonials = [
  {
    name: 'Priya Sharma',
    role: 'Freelance Designer · Pune',
    quote:
      'Within 6 weeks of finishing the Advanced program, I closed my first ₹40k client. The mentor sessions changed everything for me.',
    rating: 5,
    initial: 'P',
  },
  {
    name: 'Rahul Verma',
    role: 'Content Creator · Delhi',
    quote:
      'The frameworks are gold. I went from posting random videos to building a real audience that pays. Worth 10x the price.',
    rating: 5,
    initial: 'R',
  },
  {
    name: 'Anjali Kumari',
    role: 'Student → Earner · Patna',
    quote:
      'I was sceptical about online courses, but Backupshala Advanced delivered. The 1:1 guidance helped me land my first remote job.',
    rating: 5,
    initial: 'A',
  },
];

const AdvancedTestimonials = () => {
  return (
    <section className="container mx-auto px-4 py-20">
      <div className="max-w-5xl mx-auto">
        <div className="text-center mb-12">
          <span className="inline-block text-xs uppercase tracking-widest text-amber-400 font-bold mb-3">
            Student Stories
          </span>
          <h2 className="font-heading text-3xl md:text-4xl font-bold mb-3">
            Real results from real students
          </h2>
          <p className="text-slate-400">Join 1,200+ students already earning with digital skills.</p>
        </div>

        <div className="grid gap-5 md:grid-cols-3">
          {testimonials.map((t) => (
            <div
              key={t.name}
              className="relative rounded-2xl border border-white/10 bg-gradient-to-br from-white/[0.04] to-transparent p-6 hover:border-amber-400/30 transition-colors"
            >
              <Quote className="absolute top-4 right-4 h-8 w-8 text-amber-400/15" />
              <div className="flex gap-1 mb-3">
                {Array.from({ length: t.rating }).map((_, i) => (
                  <Star key={i} className="h-4 w-4 fill-amber-400 text-amber-400" />
                ))}
              </div>
              <p className="text-sm text-slate-200 leading-relaxed">"{t.quote}"</p>
              <div className="mt-5 flex items-center gap-3 pt-4 border-t border-white/5">
                <div className="h-10 w-10 rounded-full bg-gradient-to-br from-amber-400 to-orange-500 flex items-center justify-center font-bold text-slate-950">
                  {t.initial}
                </div>
                <div>
                  <p className="text-sm font-semibold text-white">{t.name}</p>
                  <p className="text-xs text-slate-400">{t.role}</p>
                </div>
              </div>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
};

export default AdvancedTestimonials;
