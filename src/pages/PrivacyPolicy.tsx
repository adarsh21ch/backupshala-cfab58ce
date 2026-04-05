import { Link } from 'react-router-dom';

const PrivacyPolicy = () => (
  <div className="min-h-screen bg-background">
    <header className="border-b border-border bg-card py-4">
      <div className="container mx-auto px-4">
        <Link to="/" className="inline-flex items-center">
          <span className="font-heading text-xl font-800"><span className="text-accent">Backup</span><span className="text-primary">shala</span></span>
        </Link>
      </div>
    </header>
    <main className="container mx-auto max-w-3xl px-4 py-12">
      <h1 className="font-heading text-3xl font-800 mb-2">Privacy Policy</h1>
      <p className="text-sm text-muted-foreground mb-8">Last updated: {new Date().toLocaleDateString('en-IN', { day: 'numeric', month: 'long', year: 'numeric' })}</p>

      <div className="prose prose-sm dark:prose-invert max-w-none space-y-6">
        <section>
          <h2 className="font-heading text-lg font-700">1. Information We Collect</h2>
          <p className="text-muted-foreground">We collect the following personal information when you use Backupshala:</p>
          <ul className="list-disc pl-6 text-muted-foreground space-y-1">
            <li>Full name, email address, and phone number (provided during signup)</li>
            <li>Payment information processed securely through Razorpay</li>
            <li>Course enrollment and completion data</li>
            <li>Referral information (referrer email)</li>
            <li>Profile photos uploaded by users</li>
            <li>Device information and usage analytics</li>
          </ul>
        </section>

        <section>
          <h2 className="font-heading text-lg font-700">2. How We Use Your Information</h2>
          <ul className="list-disc pl-6 text-muted-foreground space-y-1">
            <li>To deliver course content and track your learning progress</li>
            <li>To process payments and generate invoices</li>
            <li>To calculate and pay referral commissions</li>
            <li>To send transactional emails (enrollment confirmations, invoices, certificates)</li>
            <li>To improve our platform and user experience</li>
            <li>To prevent fraud and ensure platform security</li>
          </ul>
        </section>

        <section>
          <h2 className="font-heading text-lg font-700">3. Third-Party Services</h2>
          <p className="text-muted-foreground">We share data with the following third-party services as necessary:</p>
          <ul className="list-disc pl-6 text-muted-foreground space-y-1">
            <li><strong>Razorpay</strong> — for processing payments securely</li>
            <li><strong>Resend</strong> — for sending transactional emails</li>
          </ul>
          <p className="text-muted-foreground">We do not sell your personal data to any third party.</p>
        </section>

        <section>
          <h2 className="font-heading text-lg font-700">4. Data Retention</h2>
          <p className="text-muted-foreground">We retain your personal data for as long as your account is active. If you request account deletion, we will remove your personal data within 30 days, except where retention is required by law (e.g., payment records for tax compliance).</p>
        </section>

        <section>
          <h2 className="font-heading text-lg font-700">5. Your Rights</h2>
          <ul className="list-disc pl-6 text-muted-foreground space-y-1">
            <li><strong>Access:</strong> You can request a copy of your personal data at any time.</li>
            <li><strong>Correction:</strong> You can update your profile information from your dashboard.</li>
            <li><strong>Deletion:</strong> You can request account deletion by contacting us.</li>
          </ul>
        </section>

        <section>
          <h2 className="font-heading text-lg font-700">6. Contact Us</h2>
          <p className="text-muted-foreground">For privacy-related inquiries, contact us at <a href="mailto:privacy@backupshala.com" className="text-primary hover:underline">privacy@backupshala.com</a>.</p>
        </section>
      </div>
    </main>
  </div>
);

export default PrivacyPolicy;
