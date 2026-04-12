import { Link } from 'react-router-dom';

const CreatorAgreement = () => (
  <div className="min-h-screen bg-background">
    <header className="border-b border-border bg-card py-4">
      <div className="container mx-auto px-4">
        <Link to="/" className="inline-flex items-center">
          <span className="font-heading text-xl font-800"><span className="text-primary">Backup</span><span className="text-accent">shala</span></span>
        </Link>
      </div>
    </header>
    <main className="container mx-auto max-w-3xl px-4 py-12">
      <h1 className="font-heading text-3xl font-800 mb-2">Creator Agreement</h1>
      <p className="text-sm text-muted-foreground mb-8">Last updated: {new Date().toLocaleDateString('en-IN', { day: 'numeric', month: 'long', year: 'numeric' })}</p>

      <div className="prose prose-sm dark:prose-invert max-w-none space-y-6">
        <section>
          <h2 className="font-heading text-lg font-700">1. Agreement Overview</h2>
          <p className="text-muted-foreground">This Creator Agreement ("Agreement") is a legally binding contract between you ("Creator") and Backupshala ("Platform"). By applying to become a creator or publishing any course on the platform, you agree to all terms outlined in this document.</p>
        </section>

        <section>
          <h2 className="font-heading text-lg font-700">2. Creator Eligibility</h2>
          <ul className="list-disc pl-6 text-muted-foreground space-y-1">
            <li>You must be at least 18 years old.</li>
            <li>You must provide accurate personal and professional information.</li>
            <li>Backupshala reserves the right to approve or reject any creator application at its sole discretion.</li>
            <li>Approval may be revoked at any time if you violate this Agreement or any platform policy.</li>
          </ul>
        </section>

        <section>
          <h2 className="font-heading text-lg font-700">3. Content Ownership & Licensing</h2>
          <ul className="list-disc pl-6 text-muted-foreground space-y-1">
            <li>You retain ownership of the content you upload.</li>
            <li>By publishing on Backupshala, you grant the Platform a non-exclusive, worldwide license to host, display, distribute, and promote your course content on the platform and in marketing materials.</li>
            <li>You must only upload content you own or have proper license to use. You are solely responsible for any copyright, trademark, or intellectual property claims related to your content.</li>
            <li>Backupshala is not responsible for verifying your content's originality but reserves the right to remove any content suspected of infringement.</li>
          </ul>
        </section>

        <section>
          <h2 className="font-heading text-lg font-700">4. Prohibited Content</h2>
          <p className="text-muted-foreground">Creators must not upload, publish, or promote:</p>
          <ul className="list-disc pl-6 text-muted-foreground space-y-1">
            <li>Copyrighted material without proper authorization</li>
            <li>Misleading, false, or deceptive content</li>
            <li>Content that promises guaranteed income, returns, or financial results</li>
            <li>Hate speech, harassment, threats, or discriminatory content</li>
            <li>Adult, violent, or illegal content</li>
            <li>Spam, phishing, or scam-related content</li>
            <li>Content that promotes illegal activities, gambling, or financial fraud</li>
            <li>Content that infringes on any third party's intellectual property rights</li>
          </ul>
        </section>

        <section>
          <h2 className="font-heading text-lg font-700">5. Pricing & Revenue</h2>
          <ul className="list-disc pl-6 text-muted-foreground space-y-1">
            <li>Creators set their own course prices (₹99 to ₹9,999) and referral commission percentages (0% to 85%).</li>
            <li>Backupshala charges a platform fee (currently 15%) on each enrollment. This may change with prior notice.</li>
            <li>Creator earnings = Course Price − Platform Fee − Referral Commission.</li>
            <li>Earnings are credited to your wallet and can be withdrawn when the balance reaches ₹500 or more.</li>
            <li>Payouts are processed within 7-10 business days via UPI or bank transfer.</li>
            <li>Backupshala does not guarantee any minimum earnings, enrollments, or results.</li>
          </ul>
        </section>

        <section>
          <h2 className="font-heading text-lg font-700">6. Course Review & Moderation</h2>
          <ul className="list-disc pl-6 text-muted-foreground space-y-1">
            <li>All courses are subject to review before being published.</li>
            <li>Backupshala may reject, unpublish, or remove courses at any time for policy violations.</li>
            <li>Backupshala may edit course metadata (title, description, tags) for compliance or discoverability.</li>
            <li>Creators will be notified of any moderation actions taken on their courses.</li>
          </ul>
        </section>

        <section>
          <h2 className="font-heading text-lg font-700">7. Refunds</h2>
          <p className="text-muted-foreground">Backupshala's <Link to="/refund-policy" className="text-primary hover:underline">Refund Policy</Link> governs all refund requests. If a refund is issued, the corresponding creator earnings and referral commissions will be reversed.</p>
        </section>

        <section>
          <h2 className="font-heading text-lg font-700">8. Account Suspension & Termination</h2>
          <ul className="list-disc pl-6 text-muted-foreground space-y-1">
            <li>Backupshala may suspend or terminate a creator's account for violating this Agreement or any platform policy.</li>
            <li>Upon termination, existing enrolled students retain access to courses they have paid for.</li>
            <li>Pending payouts may be withheld if violations are under investigation.</li>
          </ul>
        </section>

        <section>
          <h2 className="font-heading text-lg font-700">9. Disclaimer</h2>
          <p className="text-muted-foreground">Backupshala is a platform that connects creators and learners. The Platform does not guarantee any specific results, income, or outcomes from creating or selling courses. Creators are independent content providers, not employees or agents of Backupshala.</p>
        </section>

        <section>
          <h2 className="font-heading text-lg font-700">10. Governing Law</h2>
          <p className="text-muted-foreground">This Agreement is governed by the laws of India. Any disputes shall be subject to the exclusive jurisdiction of the courts in India.</p>
        </section>

        <section>
          <h2 className="font-heading text-lg font-700">11. Contact</h2>
          <p className="text-muted-foreground">For questions about this Agreement, contact <a href="mailto:support@backupshala.com" className="text-primary hover:underline">support@backupshala.com</a>.</p>
        </section>
      </div>
    </main>
  </div>
);

export default CreatorAgreement;
