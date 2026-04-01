import { UserPlus, Play, Award } from 'lucide-react';

const steps = [
  { icon: UserPlus, title: 'Create Account', desc: 'Sign up in 30 seconds and pay ₹249', color: 'bg-primary/10 text-primary' },
  { icon: Play, title: 'Learn at Your Own Pace', desc: 'Watch video modules anytime, anywhere', color: 'bg-accent/10 text-accent' },
  { icon: Award, title: 'Get Certified & Earn', desc: 'Download your certificate and refer friends for ₹75 each', color: 'bg-primary/10 text-primary' },
];

const HowItWorks = () => (
  <section id="how-it-works" className="border-t border-border py-16 md:py-24">
    <div className="container mx-auto px-4 text-center">
      <h2 className="font-heading text-3xl font-700 md:text-4xl">How It Works</h2>
      <p className="mt-2 text-muted-foreground">Three simple steps to your digital future</p>
      <div className="mt-12 grid gap-8 md:grid-cols-3">
        {steps.map((s, i) => (
          <div key={i} className="flex flex-col items-center gap-4">
            <div className="relative">
              <div className={`flex h-16 w-16 items-center justify-center rounded-2xl ${s.color}`}>
                <s.icon className="h-7 w-7" />
              </div>
              <span className="absolute -right-2 -top-2 flex h-7 w-7 items-center justify-center rounded-full bg-accent text-xs font-bold text-accent-foreground">
                {i + 1}
              </span>
            </div>
            <h3 className="font-heading text-lg font-600">{s.title}</h3>
            <p className="max-w-xs text-sm text-muted-foreground">{s.desc}</p>
          </div>
        ))}
      </div>
    </div>
  </section>
);

export default HowItWorks;
