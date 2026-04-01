import { Award, Shield, Share2 } from 'lucide-react';

const CertificatePreview = () => (
  <section className="border-t border-border py-16 md:py-24">
    <div className="container mx-auto px-4">
      <div className="grid items-center gap-12 lg:grid-cols-2">
        <div>
          <h2 className="font-heading text-3xl font-700 md:text-4xl">
            Earn a Certificate You'll Actually Be{' '}
            <span className="text-primary">Proud Of</span>
          </h2>
          <p className="mt-4 text-muted-foreground">
            Complete all courses and receive a verified digital certificate with a unique code. Share it on LinkedIn, WhatsApp, or anywhere — and anyone can verify it.
          </p>
          <div className="mt-6 space-y-3">
            {[
              { icon: Award, text: 'Professional certificate with your full name' },
              { icon: Shield, text: 'Unique code verifiable at backupshala.com/verify' },
              { icon: Share2, text: 'One-tap sharing to WhatsApp and LinkedIn' },
            ].map((item, i) => (
              <div key={i} className="flex items-center gap-3">
                <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-primary/10">
                  <item.icon className="h-4 w-4 text-primary" />
                </div>
                <span className="text-sm">{item.text}</span>
              </div>
            ))}
          </div>
        </div>
        <div className="rounded-2xl border-2 border-primary/20 bg-card p-8 shadow-lg">
          <div className="text-center">
            <p className="font-heading text-sm font-600 tracking-widest text-primary">BACKUPSHALA</p>
            <p className="mt-4 font-heading text-xl font-700">Certificate of Completion</p>
            <p className="mt-2 text-sm text-muted-foreground">This is to certify that</p>
            <p className="mt-2 font-heading text-2xl font-700 text-primary">Your Name Here</p>
            <p className="mt-2 text-sm text-muted-foreground">has successfully completed the</p>
            <p className="mt-1 font-heading text-base font-600">Complete Digital Skills Bundle</p>
            <div className="mt-4 flex items-center justify-center gap-2">
              <span className="rounded-pill bg-primary/10 px-3 py-1 font-mono text-xs text-primary">CERT-2025-XXXX</span>
            </div>
          </div>
        </div>
      </div>
    </div>
  </section>
);

export default CertificatePreview;
