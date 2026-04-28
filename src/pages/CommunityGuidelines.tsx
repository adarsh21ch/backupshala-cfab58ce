import { Link } from 'react-router-dom';

const CommunityGuidelines = () => (
  <div className="min-h-screen bg-background">
    <header className="border-b border-border bg-card py-4">
      <div className="container mx-auto px-4">
        <Link to="/" className="inline-flex items-center">
          <span className="font-heading text-xl font-800"><span className="text-foreground">Backup</span><span className="text-accent">shala</span></span>
        </Link>
      </div>
    </header>
    <main className="container mx-auto max-w-3xl px-4 py-12">
      <h1 className="font-heading text-3xl font-800 mb-2">Community Guidelines</h1>
      <p className="text-sm text-muted-foreground mb-8">Last updated: {new Date().toLocaleDateString('en-IN', { day: 'numeric', month: 'long', year: 'numeric' })}</p>

      <div className="prose prose-sm dark:prose-invert max-w-none space-y-6">
        <section>
          <h2 className="font-heading text-lg font-700">1. Be Respectful</h2>
          <p className="text-muted-foreground">Treat all community members with respect. Harassment, bullying, personal attacks, and hate speech of any kind are not tolerated. This includes comments, messages, reviews, and any other interactions on the platform.</p>
        </section>

        <section>
          <h2 className="font-heading text-lg font-700">2. Keep It Educational</h2>
          <p className="text-muted-foreground">Backupshala communities exist for learning and professional growth. Keep discussions relevant to the course topic. Off-topic promotional content, spam, and unsolicited advertising are not allowed.</p>
        </section>

        <section>
          <h2 className="font-heading text-lg font-700">3. No Misleading Claims</h2>
          <ul className="list-disc pl-6 text-muted-foreground space-y-1">
            <li>Do not make guarantees about income, results, or outcomes</li>
            <li>Do not share exaggerated or fabricated success stories</li>
            <li>Do not promote "get rich quick" schemes or misleading financial opportunities</li>
            <li>Share your genuine experience — both successes and challenges</li>
          </ul>
        </section>

        <section>
          <h2 className="font-heading text-lg font-700">4. Protect Privacy</h2>
          <ul className="list-disc pl-6 text-muted-foreground space-y-1">
            <li>Do not share personal information (phone numbers, addresses, financial details) of other members</li>
            <li>Do not share screenshots of private conversations without consent</li>
            <li>Do not doxx or reveal the real identity of anonymous members</li>
          </ul>
        </section>

        <section>
          <h2 className="font-heading text-lg font-700">5. No Piracy or Copyright Infringement</h2>
          <p className="text-muted-foreground">Do not share, redistribute, or resell course content. Do not share links to pirated material or tools that facilitate piracy. Course content is for enrolled students only.</p>
        </section>

        <section>
          <h2 className="font-heading text-lg font-700">6. Prohibited Activities</h2>
          <ul className="list-disc pl-6 text-muted-foreground space-y-1">
            <li>Spamming or excessive self-promotion</li>
            <li>Impersonating other users, creators, or Backupshala staff</li>
            <li>Sharing malware, phishing links, or unsafe content</li>
            <li>Promoting illegal activities or substances</li>
            <li>Soliciting money or donations from other members</li>
          </ul>
        </section>

        <section>
          <h2 className="font-heading text-lg font-700">7. Enforcement</h2>
          <p className="text-muted-foreground">Violations may result in warnings, temporary suspensions, or permanent bans depending on severity. Backupshala reserves the right to remove any user or content that violates these guidelines.</p>
        </section>

        <section>
          <h2 className="font-heading text-lg font-700">8. Reporting</h2>
          <p className="text-muted-foreground">Report violations to <a href="mailto:support@backupshala.com" className="text-primary hover:underline">support@backupshala.com</a>. We review all reports and take appropriate action.</p>
        </section>
      </div>
    </main>
  </div>
);

export default CommunityGuidelines;
