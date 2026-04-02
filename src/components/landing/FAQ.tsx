import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from '@/components/ui/accordion';

const faqs = [
  { q: 'Is this legal in India?', a: 'Yes, completely. Backupshala is a registered education platform. All payments are processed through Razorpay to our business account. Every transaction generates a GST invoice. Commissions are paid for course sales — not for recruiting members. This is standard affiliate marketing combined with digital course sales, fully compliant with Indian law.' },
  { q: 'How do commissions work?', a: 'When you refer a friend to any course on Backupshala, tell them to enter YOUR email address when they sign up. When they enroll in any course, you automatically earn the commission percentage set by that course\'s creator — directly added to your wallet. Minimum payout is ₹500, transferred to your bank account or UPI within 3-5 business days.' },
  { q: 'How do I become a creator?', a: 'Click \'For Creators\' in the navigation and fill out a quick 4-step application. Tell us your name, category, bio, your first course details, and set your price and commission. We review all applications within 24-48 hours. Once approved, you can publish your course and start earning immediately.' },
  { q: 'When do I get paid?', a: 'Commission earnings and creator earnings are added to your wallet instantly after each enrollment is confirmed. You can request a payout anytime your wallet balance is ₹500 or more. Payouts are processed within 3-5 business days via bank transfer or UPI.' },
  { q: 'Can I set my own course price?', a: 'Yes. Creators can set any price from ₹99 to ₹9,999. You also set your own referral commission percentage — anywhere from 0% to 85% of the enrollment fee. The remaining 15% is Backupshala\'s platform fee. You can change your price and commission anytime (changes apply to new enrollments only).' },
  { q: 'What is the platform fee?', a: 'Backupshala charges a 15% platform fee on every enrollment. This covers payment processing, GST invoice generation, commission management, certificate generation, and platform maintenance. There are no monthly fees, no setup fees, and no hidden charges. You only pay when you earn.' },
  { q: 'What is the Backupshala Standard Bundle?', a: 'The Standard Bundle is our own flagship course — created and curated by the Backupshala team. For ₹249, you get access to 6 modules covering video editing, content creation, personal branding, sales, communication, and freelancing — all taught through curated YouTube resources, podcast links, and expert guides. Plus private community access and a verified certificate on completion.' },
];

const FAQ = () => (
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

export default FAQ;
