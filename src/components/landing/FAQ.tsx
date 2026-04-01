import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from '@/components/ui/accordion';

const faqs = [
  { q: 'Is this legal in India?', a: 'Yes. Backupshala is a legally operated course marketplace. All payments are processed through Razorpay with proper GST invoicing. Creator payouts and referral commissions are tracked transparently.' },
  { q: 'How do commissions work?', a: 'When a student signs up, they enter the email of the person who referred them. When that student enrolls in any course, the referrer earns the commission percentage set by the course creator (typically 10-50%).' },
  { q: 'How do I become a creator?', a: 'Sign up for a free account, then apply to become a creator. Submit your first course details and pricing. Our team reviews applications within 24-48 hours.' },
  { q: 'When do I get paid?', a: 'Commissions and creator earnings are credited to your wallet instantly after each enrollment. You can request a payout once your balance reaches ₹500. Payouts are processed within 3-5 business days.' },
  { q: 'Can I set my own course price?', a: 'Yes! Creators set their own price (₹99-₹9,999) and their own referral commission percentage (10-50%). You\'re in full control.' },
  { q: 'What is the platform fee?', a: 'Backupshala charges 15% of each enrollment as a platform fee. This covers payment processing, GST invoicing, infrastructure, and support. The fee is automatically deducted before payouts.' },
];

const FAQ = () => (
  <section className="py-16 md:py-24">
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

export default FAQ;
