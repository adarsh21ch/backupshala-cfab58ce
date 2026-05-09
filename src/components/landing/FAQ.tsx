import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from '@/components/ui/accordion';
import { usePlatformSettings } from '@/hooks/usePlatformSettings';

const buildFaqs = (minPayout: number, platformFee: number, creatorMax: number) => [
  { q: 'What is Backupshala?', a: 'Backupshala is a digital skills learning platform where expert creators publish courses and learners can enroll, learn, and earn verified certificates. All payments are processed through Razorpay with GST invoices generated for every transaction.' },
  { q: 'How does the referral program work?', a: `When you refer a friend to any course on Backupshala, they enter your email address during signup. If they enroll in a course, you may earn a referral commission as set by that course's creator. Commission amounts vary by course and are not guaranteed — they depend on actual enrollments. Minimum payout threshold is ₹${minPayout}.` },
  { q: 'How do I become a creator?', a: 'Click \'For Creators\' in the navigation and fill out a quick application. Tell us about your expertise, your first course, and set your pricing. All applications are reviewed within 24-48 hours. Creators must agree to our Creator Agreement and Content Upload Policy before publishing.' },
  { q: 'When do creators get paid?', a: `Creator earnings are calculated after each confirmed enrollment. You can request a payout when your wallet balance reaches ₹${minPayout} or more. Payouts are processed within 7-10 business days via bank transfer or UPI.` },
  { q: 'Can I set my own course price?', a: `Yes. Creators can set any price from ₹99 to ₹9,999. You also set the referral commission percentage — anywhere from 0% to ${creatorMax}%. The remaining ${platformFee}% is Backupshala's platform fee. Pricing can be changed anytime (changes apply to new enrollments only).` },
  { q: 'What is the platform fee?', a: `Backupshala charges a ${platformFee}% platform fee on every enrollment. This covers payment processing, GST invoice generation, referral commission management, certificate generation, and platform maintenance. There are no monthly fees, no setup fees, and no hidden charges.` },
  { q: 'What is the Backupshala Standard Bundle?', a: 'The Standard Bundle is our own course — curated by the Backupshala team. You get access to modules covering video editing, content creation, personal branding, sales, communication, and freelancing. Includes community access and a verified certificate on completion.' },
  { q: 'Does Backupshala guarantee any income or results?', a: 'No. Backupshala is an education platform and does not guarantee any specific income, results, or outcomes. Course content is for educational purposes only. Individual results depend on effort, skill, and market conditions. Referral commissions depend on actual course enrollments and are not guaranteed.' },
];

const FAQ = () => {
  const { data } = usePlatformSettings();
  const platformFee = data.platform_fee_percent;
  const creatorMax = Math.max(0, 100 - platformFee);
  const faqs = buildFaqs(data.min_payout_amount, platformFee, creatorMax);

  return (
    <section id="faq" className="py-16 md:py-24">
      <div className="container mx-auto px-4 max-w-2xl">
        <div className="text-center mb-12">
          <h2 className="font-heading text-3xl font-700">Frequently Asked Questions</h2>
        </div>
        <Accordion type="single" collapsible className="space-y-2">
          {faqs.map((faq, i) => (
            <AccordionItem key={i} value={`faq-${i}`} className="rounded-xl border border-border bg-card px-4">
              <AccordionTrigger className="text-sm font-medium text-left">{faq.q}</AccordionTrigger>
              <AccordionContent className="text-sm text-muted-foreground">{faq.a}</AccordionContent>
            </AccordionItem>
          ))}
        </Accordion>
      </div>
    </section>
  );
};

export default FAQ;
