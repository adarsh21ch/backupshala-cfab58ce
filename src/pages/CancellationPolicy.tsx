import { Link } from 'react-router-dom';

const CancellationPolicy = () => (
  <div className="min-h-screen bg-background">
    <header className="border-b border-border bg-card py-4">
      <div className="container mx-auto px-4">
        <Link to="/" className="inline-flex items-center">
          <span className="font-heading text-xl font-800"><span className="text-foreground">Backup</span><span className="text-accent">shala</span></span>
        </Link>
      </div>
    </header>
    <main className="container mx-auto max-w-3xl px-4 py-12">
      <h1 className="font-heading text-3xl font-800 mb-2">Cancellation Policy</h1>
      <p className="text-sm text-muted-foreground mb-8">Last updated: {new Date().toLocaleDateString('en-IN', { day: 'numeric', month: 'long', year: 'numeric' })}</p>

      <div className="prose prose-sm dark:prose-invert max-w-none space-y-6">
        <section>
          <h2 className="font-heading text-lg font-700">1. Course Enrollment Cancellation</h2>
          <p className="text-muted-foreground">Once a course enrollment payment is completed, access is granted immediately. Cancellation of an enrollment is subject to our <Link to="/refund-policy" className="text-primary hover:underline">Refund Policy</Link>.</p>
        </section>

        <section>
          <h2 className="font-heading text-lg font-700">2. Refund-Based Cancellation</h2>
          <p className="text-muted-foreground">If you wish to cancel your enrollment and request a refund, you must do so within 7 days of purchase and have completed less than 20% of the course content. See our <Link to="/refund-policy" className="text-primary hover:underline">Refund Policy</Link> for complete details.</p>
        </section>

        <section>
          <h2 className="font-heading text-lg font-700">3. Creator Account Cancellation</h2>
          <ul className="list-disc pl-6 text-muted-foreground space-y-1">
            <li>Creators may request to deactivate their account by contacting <a href="mailto:support@backupshala.com" className="text-primary hover:underline">support@backupshala.com</a>.</li>
            <li>Upon deactivation, your courses will be unpublished. Existing enrolled students retain access to courses they have paid for.</li>
            <li>Any pending payouts will be processed before account closure, subject to a 30-day verification period.</li>
          </ul>
        </section>

        <section>
          <h2 className="font-heading text-lg font-700">4. User Account Deletion</h2>
          <ul className="list-disc pl-6 text-muted-foreground space-y-1">
            <li>Users may request account deletion by contacting <a href="mailto:support@backupshala.com" className="text-primary hover:underline">support@backupshala.com</a>.</li>
            <li>Upon deletion, personal data will be removed within 30 days, except where retention is required by law (e.g., payment records for tax/GST compliance).</li>
            <li>Course access and certificates issued are retained for verification purposes even after account deletion.</li>
          </ul>
        </section>

        <section>
          <h2 className="font-heading text-lg font-700">5. Platform-Initiated Cancellation</h2>
          <p className="text-muted-foreground">Backupshala reserves the right to cancel or suspend any account, enrollment, or course that violates the <Link to="/terms" className="text-primary hover:underline">Terms of Service</Link>, <Link to="/creator-agreement" className="text-primary hover:underline">Creator Agreement</Link>, or any other platform policy.</p>
        </section>

        <section>
          <h2 className="font-heading text-lg font-700">6. Contact</h2>
          <p className="text-muted-foreground">For cancellation requests, email <a href="mailto:support@backupshala.com" className="text-primary hover:underline">support@backupshala.com</a> with your registered email address and reason for cancellation.</p>
        </section>
      </div>
    </main>
  </div>
);

export default CancellationPolicy;
