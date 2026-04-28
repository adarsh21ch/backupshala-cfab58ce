import { Link } from 'react-router-dom';

const ContentPolicy = () => (
  <div className="min-h-screen bg-background">
    <header className="border-b border-border bg-card py-4">
      <div className="container mx-auto px-4">
        <Link to="/" className="inline-flex items-center">
          <span className="font-heading text-xl font-800"><span className="text-foreground">Backup</span><span className="text-accent">shala</span></span>
        </Link>
      </div>
    </header>
    <main className="container mx-auto max-w-3xl px-4 py-12">
      <h1 className="font-heading text-3xl font-800 mb-2">Content Upload Policy</h1>
      <p className="text-sm text-muted-foreground mb-8">Last updated: {new Date().toLocaleDateString('en-IN', { day: 'numeric', month: 'long', year: 'numeric' })}</p>

      <div className="prose prose-sm dark:prose-invert max-w-none space-y-6">
        <section>
          <h2 className="font-heading text-lg font-700">1. Purpose</h2>
          <p className="text-muted-foreground">This policy governs what content creators may upload, publish, and promote on Backupshala. All creators must comply with this policy at all times.</p>
        </section>

        <section>
          <h2 className="font-heading text-lg font-700">2. Acceptable Content</h2>
          <ul className="list-disc pl-6 text-muted-foreground space-y-1">
            <li>Original educational content created by you or content you have explicit rights to use</li>
            <li>Properly licensed media (images, music, video clips) with attribution where required</li>
            <li>Course descriptions that accurately represent the content and learning outcomes</li>
            <li>Pricing that reflects the actual value of the content provided</li>
          </ul>
        </section>

        <section>
          <h2 className="font-heading text-lg font-700">3. Prohibited Content</h2>
          <ul className="list-disc pl-6 text-muted-foreground space-y-1">
            <li><strong>Copyright infringement:</strong> Content copied from other creators, platforms, or sources without proper licensing</li>
            <li><strong>Misleading claims:</strong> Promises of guaranteed income, returns, or specific financial outcomes</li>
            <li><strong>Illegal content:</strong> Content that promotes illegal activities, violence, or harmful behavior</li>
            <li><strong>Adult content:</strong> Sexually explicit or pornographic material</li>
            <li><strong>Hate speech:</strong> Content targeting individuals or groups based on race, religion, gender, caste, or other protected characteristics</li>
            <li><strong>Spam:</strong> Repetitive, low-quality, or auto-generated content</li>
            <li><strong>Malware:</strong> Files containing viruses, malware, or harmful code</li>
            <li><strong>Financial fraud:</strong> Content promoting pyramid schemes, MLM, money circulation, or ponzi-like structures</li>
            <li><strong>Gambling/betting:</strong> Content promoting gambling, betting, or speculative financial activities</li>
            <li><strong>Personal data:</strong> Content that exposes personal information of third parties without consent</li>
          </ul>
        </section>

        <section>
          <h2 className="font-heading text-lg font-700">4. Upload Guidelines</h2>
          <ul className="list-disc pl-6 text-muted-foreground space-y-1">
            <li>Video files must be in MP4 format, under 2GB per file</li>
            <li>Thumbnails should be clear, professional, and not misleading</li>
            <li>Course titles and descriptions must accurately represent the content</li>
            <li>All resources (links, PDFs, etc.) must be to legitimate, safe sources</li>
          </ul>
        </section>

        <section>
          <h2 className="font-heading text-lg font-700">5. Moderation & Enforcement</h2>
          <ul className="list-disc pl-6 text-muted-foreground space-y-1">
            <li>All content is subject to review before and after publication</li>
            <li>Backupshala may remove content that violates this policy without prior notice</li>
            <li>Repeat violations may result in account suspension or permanent ban</li>
            <li>Creators may appeal moderation decisions by contacting <a href="mailto:support@backupshala.com" className="text-primary hover:underline">support@backupshala.com</a></li>
          </ul>
        </section>

        <section>
          <h2 className="font-heading text-lg font-700">6. Reporting Violations</h2>
          <p className="text-muted-foreground">If you find content on Backupshala that violates this policy, please report it to <a href="mailto:support@backupshala.com" className="text-primary hover:underline">support@backupshala.com</a> with the course name and details of the violation.</p>
        </section>
      </div>
    </main>
  </div>
);

export default ContentPolicy;
