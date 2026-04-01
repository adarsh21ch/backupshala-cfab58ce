import { Link } from 'react-router-dom';

const Terms = () => (
  <div className="min-h-screen bg-background">
    <header className="border-b border-border bg-card py-4">
      <div className="container mx-auto px-4">
        <Link to="/" className="inline-flex items-center">
          <span className="font-heading text-xl font-800"><span className="text-primary">Backup</span><span className="text-accent">shala</span></span>
        </Link>
      </div>
    </header>
    <main className="container mx-auto max-w-3xl px-4 py-12">
      <h1 className="font-heading text-3xl font-800 mb-2">Terms of Service</h1>
      <p className="text-sm text-muted-foreground mb-8">Last updated: {new Date().toLocaleDateString('en-IN', { day: 'numeric', month: 'long', year: 'numeric' })}</p>

      <div className="prose prose-sm dark:prose-invert max-w-none space-y-6">
        <section>
          <h2 className="font-heading text-lg font-700">1. Platform Usage</h2>
          <p className="text-muted-foreground">Backupshala is an online education platform that connects creators with students. By using our platform, you agree to these terms. You must be at least 18 years old or have parental consent to use this platform.</p>
        </section>

        <section>
          <h2 className="font-heading text-lg font-700">2. Creator Responsibilities</h2>
          <ul className="list-disc pl-6 text-muted-foreground space-y-1">
            <li>Creators must provide accurate, original content that does not infringe on any intellectual property rights.</li>
            <li>Course content must meet quality standards set by Backupshala.</li>
            <li>Creators are responsible for the accuracy of information in their courses.</li>
            <li>Creators must not upload harmful, misleading, or inappropriate content.</li>
          </ul>
        </section>

        <section>
          <h2 className="font-heading text-lg font-700">3. Student Responsibilities</h2>
          <ul className="list-disc pl-6 text-muted-foreground space-y-1">
            <li>Students must not share, redistribute, or resell course content.</li>
            <li>Students must not use automated tools to access or download content.</li>
            <li>Students are responsible for maintaining the confidentiality of their account credentials.</li>
          </ul>
        </section>

        <section>
          <h2 className="font-heading text-lg font-700">4. Payments & Refunds</h2>
          <p className="text-muted-foreground">All payments are processed in Indian Rupees (INR) through Razorpay. Prices include applicable GST (18%). Refunds are governed by our <Link to="/refund-policy" className="text-primary hover:underline">Refund Policy</Link>.</p>
        </section>

        <section>
          <h2 className="font-heading text-lg font-700">5. Commission & Payouts</h2>
          <p className="text-muted-foreground">Referral commissions are credited to wallets upon successful enrollment. Payouts can be requested when the wallet balance reaches ₹500 or more. Payouts are processed within 7–10 business days.</p>
        </section>

        <section>
          <h2 className="font-heading text-lg font-700">6. Prohibited Content</h2>
          <p className="text-muted-foreground">The following is strictly prohibited: hate speech, harassment, spam, misleading claims, plagiarized content, illegal activities, and content that violates any applicable laws.</p>
        </section>

        <section>
          <h2 className="font-heading text-lg font-700">7. Account Termination</h2>
          <p className="text-muted-foreground">We reserve the right to suspend or terminate accounts that violate these terms. Enrolled students retain access to courses they have already paid for, even if a creator's account is suspended.</p>
        </section>

        <section>
          <h2 className="font-heading text-lg font-700">8. Governing Law</h2>
          <p className="text-muted-foreground">These terms are governed by the laws of India. Any disputes shall be subject to the exclusive jurisdiction of the courts in India.</p>
        </section>
      </div>
    </main>
  </div>
);

export default Terms;
