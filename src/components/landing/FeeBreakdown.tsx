import { ArrowRight } from 'lucide-react';

const FeeBreakdown = () => (
  <section className="py-16 md:py-24">
    <div className="container mx-auto px-4">
      <div className="text-center mb-12">
        <h2 className="font-heading text-3xl font-700">How the Platform Fee Works</h2>
        <p className="mt-2 text-muted-foreground">Transparent pricing for a ₹249 course with 30% referral commission</p>
      </div>
      <div className="mx-auto max-w-2xl">
        <div className="flex flex-col items-center gap-3 md:flex-row md:gap-2">
          {[
            { label: 'Student pays', amount: '₹249', color: 'bg-foreground text-background', sub: 'Incl. 18% GST' },
            { label: 'Platform fee (15%)', amount: '₹37', color: 'bg-accent/10 text-accent', sub: 'Backupshala' },
            { label: 'Referrer earns (30%)', amount: '₹75', color: 'bg-primary/10 text-primary', sub: 'Commission' },
            { label: 'Creator receives (55%)', amount: '₹137', color: 'bg-primary text-primary-foreground', sub: 'Net payout' },
          ].map((item, i) => (
            <div key={i} className="flex items-center gap-2 w-full md:w-auto">
              {i > 0 && <ArrowRight className="hidden md:block h-4 w-4 text-muted-foreground shrink-0" />}
              <div className={`flex-1 md:flex-none rounded-xl ${item.color} p-4 text-center min-w-[140px]`}>
                <p className="text-xs opacity-80">{item.label}</p>
                <p className="font-heading text-xl font-700">{item.amount}</p>
                <p className="text-[10px] opacity-60">{item.sub}</p>
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  </section>
);

export default FeeBreakdown;
