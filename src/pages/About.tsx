import { Link } from 'react-router-dom';
import LandingNavbar from '@/components/landing/Navbar';
import Footer from '@/components/landing/Footer';
import { Button } from '@/components/ui/button';
import { Target, Scale, Users } from 'lucide-react';
import BackButton from '@/components/BackButton';
import { usePlatformSettings } from '@/hooks/usePlatformSettings';
import { formatINR } from '@/lib/format';

const values = [
  { icon: Target, title: 'Affordable', desc: 'World-class skills at Indian prices' },
  { icon: Scale, title: 'Legal & Transparent', desc: 'GST invoices on every transaction' },
  { icon: Users, title: 'Community First', desc: 'We grow together' },
];

const About = () => {
  const { data } = usePlatformSettings();
  const priceLabel = formatINR(data.basic_price);

  return (
    <div className="min-h-screen">
      <LandingNavbar />
      <section className="py-16 md:py-24">
        <div className="container mx-auto px-4 max-w-2xl">
          <BackButton fallback="/" />
          <h1 className="font-heading text-4xl font-800 mb-6">About Backupshala</h1>
          <div className="prose prose-sm text-muted-foreground space-y-4">
            <p>Backupshala is an independent Indian digital skills education platform. We believe every person deserves access to practical, income-generating skills at an affordable price.</p>
            <p>Our name means "a school that gives you your backup plan" — and that's exactly what we do. Whether you want to learn video editing, content creation, personal branding, or freelancing — we have you covered.</p>
            <p>For just {priceLabel}, our Standard Bundle gives you access to curated resources from across the internet, expert guidance, a private community, and a verified certificate of completion.</p>
            <p>For creators and educators, Backupshala provides the complete legal infrastructure to sell your courses, manage your students, and receive automatic commission payouts — all compliant with Indian law.</p>
            <p>We are based in India, built for India.</p>
            <div className="mt-4 rounded-lg border border-border bg-card p-4 text-sm not-prose">
              <p className="font-semibold text-foreground mb-2">Legal & Business Information</p>
              <p className="text-muted-foreground">Backupshala is a product of <strong>Nevorai Technologies</strong>, a proprietorship based in Madhya Pradesh, India.</p>
              <ul className="mt-2 space-y-0.5 text-muted-foreground text-xs">
                <li>Legal Name: Nevorai Technologies</li>
                <li>GSTIN: 23CBCPC3986J1ZN</li>
                <li>State: Madhya Pradesh, India</li>
                <li>Email: support@backupshala.com</li>
              </ul>
            </div>
          </div>

          <div className="mt-16">
            <h2 className="font-heading text-2xl font-700 mb-6 text-center">Our Values</h2>
            <div className="grid gap-6 sm:grid-cols-3">
              {values.map((v, i) => (
                <div key={i} className="rounded-xl border border-border bg-card p-6 text-center">
                  <v.icon className="mx-auto h-8 w-8 text-primary mb-3" />
                  <h3 className="font-heading text-base font-600">{v.title}</h3>
                  <p className="mt-1 text-sm text-muted-foreground">{v.desc}</p>
                </div>
              ))}
            </div>
          </div>

          <div className="mt-12 text-center">
            <Button asChild size="lg" className="bg-primary hover:bg-primary/90 text-primary-foreground rounded-pill px-8 font-semibold">
              <Link to="/c/backupshala/backupshala-standard-bundle">Start Learning for {priceLabel}</Link>
            </Button>
          </div>
        </div>
      </section>
      <Footer />
    </div>
  );
};

export default About;
