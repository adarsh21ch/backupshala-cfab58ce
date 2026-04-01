import { IndianRupee, Users, TrendingUp } from 'lucide-react';

const ReferEarn = () => (
  <section id="refer" className="border-t border-border bg-secondary/30 py-16 md:py-24">
    <div className="container mx-auto px-4">
      <div className="text-center">
        <h2 className="font-heading text-3xl font-700 md:text-4xl">
          Refer a Friend, Earn <span className="text-primary">₹75</span>
        </h2>
        <p className="mt-2 max-w-lg mx-auto text-muted-foreground">
          They enter your email when signing up — that's it. No special links. No complicated tracking.
        </p>
      </div>
      <div className="mt-12 grid gap-6 md:grid-cols-3">
        {[
          { icon: Users, value: '5 referrals', label: '= ₹375 earned', color: 'text-primary' },
          { icon: TrendingUp, value: '10 referrals', label: '= ₹750 earned', color: 'text-accent' },
          { icon: IndianRupee, value: '20 referrals', label: '= ₹1,500 earned', color: 'text-primary' },
        ].map((item, i) => (
          <div key={i} className="rounded-2xl border border-border bg-card p-6 text-center shadow-sm">
            <div className="mx-auto mb-3 flex h-12 w-12 items-center justify-center rounded-xl bg-primary/10">
              <item.icon className={`h-6 w-6 ${item.color}`} />
            </div>
            <p className="font-heading text-2xl font-700">{item.value}</p>
            <p className="text-sm font-medium text-muted-foreground">{item.label}</p>
          </div>
        ))}
      </div>
    </div>
  </section>
);

export default ReferEarn;
