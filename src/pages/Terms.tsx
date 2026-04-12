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
          <h2 className="font-heading text-lg font-700">1. Platform Overview</h2>
          <p className="text-muted-foreground">Backupshala is a digital skills learning marketplace that connects course creators with learners. The Platform facilitates course hosting, payments, certificate issuance, and referral management. Backupshala is a <strong>platform provider</strong> — not a guarantor of results, income, or outcomes.</p>
        </section>

        <section>
          <h2 className="font-heading text-lg font-700">2. Eligibility</h2>
          <p className="text-muted-foreground">You must be at least 18 years old (or have parental/guardian consent) to use this platform. By creating an account, you represent that the information you provide is accurate and complete.</p>
        </section>

        <section>
          <h2 className="font-heading text-lg font-700">3. Creator Responsibilities</h2>
          <ul className="list-disc pl-6 text-muted-foreground space-y-1">
            <li>Creators must provide accurate, original content that does not infringe on any intellectual property rights.</li>
            <li>Creators are solely responsible for the accuracy, legality, and quality of their course content.</li>
            <li>Creators must not upload harmful, misleading, illegal, or inappropriate content.</li>
            <li>Creators must comply with the <Link to="/creator-agreement" className="text-primary hover:underline">Creator Agreement</Link> and <Link to="/content-policy" className="text-primary hover:underline">Content Upload Policy</Link>.</li>
            <li>Creators must not make guarantees about income, financial returns, or specific outcomes.</li>
          </ul>
        </section>

        <section>
          <h2 className="font-heading text-lg font-700">4. Student Responsibilities</h2>
          <ul className="list-disc pl-6 text-muted-foreground space-y-1">
            <li>Students must not share, redistribute, or resell course content.</li>
            <li>Students must not use automated tools to access or download content.</li>
            <li>Students are responsible for maintaining the confidentiality of their account credentials.</li>
            <li>Students must comply with the <Link to="/community-guidelines" className="text-primary hover:underline">Community Guidelines</Link>.</li>
          </ul>
        </section>

        <section>
          <h2 className="font-heading text-lg font-700">5. Payments & Refunds</h2>
          <p className="text-muted-foreground">All payments are processed in Indian Rupees (INR) through Razorpay. Prices include applicable GST (18%). Refunds are governed by our <Link to="/refund-policy" className="text-primary hover:underline">Refund Policy</Link>. Cancellations are governed by our <Link to="/cancellation-policy" className="text-primary hover:underline">Cancellation Policy</Link>.</p>
        </section>

        <section>
          <h2 className="font-heading text-lg font-700">6. Referral Program</h2>
          <ul className="list-disc pl-6 text-muted-foreground space-y-1">
            <li>The referral program allows users to earn commissions when people they refer enroll in courses.</li>
            <li>Commission percentages are set by individual course creators and may vary.</li>
            <li>Referral commissions are <strong>not guaranteed income</strong>. They depend on actual course enrollments.</li>
            <li>Commissions are credited to your wallet upon successful enrollment. Payouts require a minimum balance of ₹500.</li>
            <li>Backupshala reserves the right to reverse commissions in case of refunds, fraud, or policy violations.</li>
            <li>The referral program is not an employment, investment, or money-making scheme. It is a standard affiliate-style commission.</li>
          </ul>
        </section>

        <section>
          <h2 className="font-heading text-lg font-700">7. Prohibited Content & Activities</h2>
          <p className="text-muted-foreground">The following is strictly prohibited on Backupshala:</p>
          <ul className="list-disc pl-6 text-muted-foreground space-y-1">
            <li>Hate speech, harassment, threats, or discriminatory behavior</li>
            <li>Plagiarized, pirated, or copyrighted content without authorization</li>
            <li>Misleading income claims or "guaranteed earning" promises</li>
            <li>Pyramid schemes, MLM promotion, or money circulation</li>
            <li>Spam, phishing, or any form of fraud</li>
            <li>Illegal activities, gambling, betting, or regulated financial promotion</li>
            <li>Adult, violent, or harmful content</li>
          </ul>
        </section>

        <section>
          <h2 className="font-heading text-lg font-700">8. Account Termination</h2>
          <p className="text-muted-foreground">We reserve the right to suspend or terminate accounts that violate these terms without prior notice. Enrolled students retain access to courses they have already paid for, even if a creator's account is suspended.</p>
        </section>

        <section>
          <h2 className="font-heading text-lg font-700">9. Disclaimer of Warranties</h2>
          <p className="text-muted-foreground">Backupshala provides the platform "as is" without warranties of any kind. We do not guarantee the accuracy, completeness, or usefulness of any course content. Course content is created by independent creators and does not represent the views of Backupshala. <strong>Backupshala does not guarantee any specific income, financial results, employment, or outcomes from using the platform.</strong></p>
        </section>

        <section>
          <h2 className="font-heading text-lg font-700">10. Limitation of Liability</h2>
          <p className="text-muted-foreground">Backupshala shall not be liable for any indirect, incidental, special, or consequential damages arising from your use of the platform. Our total liability is limited to the amount you paid for the specific course in question.</p>
        </section>

        <section>
          <h2 className="font-heading text-lg font-700">11. Governing Law</h2>
          <p className="text-muted-foreground">These terms are governed by the laws of India. Any disputes shall be subject to the exclusive jurisdiction of the courts in India.</p>
        </section>

        <section>
          <h2 className="font-heading text-lg font-700">12. Contact</h2>
          <p className="text-muted-foreground">For questions about these Terms, contact <a href="mailto:support@backupshala.com" className="text-primary hover:underline">support@backupshala.com</a>.</p>
        </section>
      </div>
    </main>
  </div>
);

export default Terms;
