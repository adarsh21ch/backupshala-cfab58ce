import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from '@/components/ui/accordion';
import { ShieldCheck } from 'lucide-react';

interface Props {
  basicLabel: string;
  advancedLabel: string;
}

const AdvancedFAQ = ({ basicLabel, advancedLabel }: Props) => {
  const faqs = [
    {
      q: 'Do I get the Standard Bundle for free?',
      a: `Yes. When you enroll in Advanced (${advancedLabel}), the Standard Bundle (${basicLabel} value) is automatically added to your account at no extra cost.`,
    },
    {
      q: 'Is there a refund policy?',
      a: 'Yes. We offer a 7-day money-back guarantee. If you complete fewer than 20% of the lessons and feel the course isn\'t for you, request a refund — no questions asked.',
    },
    {
      q: 'How long do I have access?',
      a: 'Lifetime access. You get all current modules plus every future update at no additional cost.',
    },
    {
      q: 'Will I get a certificate?',
      a: 'Yes — you receive a verified certificate of completion (with a public verify URL) once you finish all required modules and pass the final assessment.',
    },
    {
      q: 'Are the mentor sessions live?',
      a: 'Yes. We host weekly live sessions plus 1:1 guidance slots for Advanced students. Recordings are available if you can\'t attend live.',
    },
    {
      q: 'How does payment work? Is it secure?',
      a: 'Payments are processed by Razorpay (PCI-DSS certified). UPI, cards, net banking and wallets are all supported. You receive a GST invoice by email immediately after payment.',
    },
    {
      q: 'Can I switch to Advanced after buying Basic?',
      a: 'Absolutely. You only pay the difference (upgrade price), and your Basic progress carries over.',
    },
  ];

  return (
    <section className="container mx-auto px-4 py-20">
      <div className="max-w-3xl mx-auto">
        <div className="text-center mb-10">
          <span className="inline-block text-xs uppercase tracking-widest text-amber-400 font-bold mb-3">FAQ</span>
          <h2 className="font-heading text-3xl md:text-4xl font-bold mb-3">Questions, answered</h2>
          <p className="text-slate-400">Everything you need to know before enrolling.</p>
        </div>

        <Accordion type="single" collapsible className="space-y-3">
          {faqs.map((f, i) => (
            <AccordionItem
              key={i}
              value={`item-${i}`}
              className="rounded-xl border border-white/10 bg-white/[0.03] px-5 hover:border-amber-400/30 transition-colors"
            >
              <AccordionTrigger className="hover:no-underline py-4 text-left text-white font-semibold">
                {f.q}
              </AccordionTrigger>
              <AccordionContent className="pb-4 text-sm text-slate-300 leading-relaxed">
                {f.a}
              </AccordionContent>
            </AccordionItem>
          ))}
        </Accordion>

        {/* Money-back guarantee badge */}
        <div className="mt-10 rounded-2xl border border-emerald-400/20 bg-gradient-to-br from-emerald-500/10 via-transparent to-transparent p-6 flex items-center gap-5">
          <div className="shrink-0 h-14 w-14 rounded-full bg-emerald-400/15 border border-emerald-400/30 flex items-center justify-center">
            <ShieldCheck className="h-7 w-7 text-emerald-400" />
          </div>
          <div>
            <p className="font-heading text-lg font-bold text-white">7-day money-back guarantee</p>
            <p className="text-sm text-slate-300 mt-0.5">
              Try Advanced risk-free. If it's not for you, get a full refund within 7 days.
            </p>
          </div>
        </div>
      </div>
    </section>
  );
};

export default AdvancedFAQ;
