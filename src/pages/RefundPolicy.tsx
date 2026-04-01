import { Link } from 'react-router-dom';

const RefundPolicy = () => (
  <div className="min-h-screen bg-background">
    <header className="border-b border-border bg-card py-4">
      <div className="container mx-auto px-4">
        <Link to="/" className="inline-flex items-center">
          <span className="font-heading text-xl font-800"><span className="text-primary">Backup</span><span className="text-accent">shala</span></span>
        </Link>
      </div>
    </header>
    <main className="container mx-auto max-w-3xl px-4 py-12">
      <h1 className="font-heading text-3xl font-800 mb-2">Refund Policy</h1>
      <p className="text-sm text-muted-foreground mb-8">Last updated: {new Date().toLocaleDateString('en-IN', { day: 'numeric', month: 'long', year: 'numeric' })}</p>

      <div className="prose prose-sm dark:prose-invert max-w-none space-y-6">
        <section>
          <h2 className="font-heading text-lg font-700">1. Refund Window</h2>
          <p className="text-muted-foreground">We offer a <strong>7-day refund policy</strong> on all course enrollments from the date of purchase.</p>
        </section>

        <section>
          <h2 className="font-heading text-lg font-700">2. Eligibility</h2>
          <p className="text-muted-foreground">To be eligible for a refund, you must have completed <strong>less than 20%</strong> of the course content (modules).</p>
        </section>

        <section>
          <h2 className="font-heading text-lg font-700">3. How to Request a Refund</h2>
          <p className="text-muted-foreground">To request a refund, email <a href="mailto:support@backupshala.com" className="text-primary hover:underline">support@backupshala.com</a> with the following details:</p>
          <ul className="list-disc pl-6 text-muted-foreground space-y-1">
            <li>Your registered email address</li>
            <li>Course name</li>
            <li>Invoice number</li>
            <li>Reason for refund</li>
          </ul>
        </section>

        <section>
          <h2 className="font-heading text-lg font-700">4. Processing Time</h2>
          <p className="text-muted-foreground">Approved refunds are processed within <strong>7–10 business days</strong> to your original payment method.</p>
        </section>

        <section>
          <h2 className="font-heading text-lg font-700">5. Commission Reversal</h2>
          <p className="text-muted-foreground">Referral commissions paid on refunded orders will be reversed from the referrer's wallet balance.</p>
        </section>

        <section>
          <h2 className="font-heading text-lg font-700">6. Promotional Purchases</h2>
          <p className="text-muted-foreground">Courses purchased during promotional offers may have different refund terms as specified at the time of purchase.</p>
        </section>
      </div>
    </main>
  </div>
);

export default RefundPolicy;
