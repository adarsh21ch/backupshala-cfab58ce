import LandingNavbar from '@/components/landing/Navbar';
import Hero from '@/components/landing/Hero';
import HowItWorks from '@/components/landing/HowItWorks';
import CoursesSection from '@/components/landing/CoursesSection';
import CertificatePreview from '@/components/landing/CertificatePreview';
import ReferEarn from '@/components/landing/ReferEarn';
import Testimonials from '@/components/landing/Testimonials';
import FinalCTA from '@/components/landing/FinalCTA';
import Footer from '@/components/landing/Footer';

const Index = () => (
  <div className="min-h-screen">
    <LandingNavbar />
    <Hero />
    <HowItWorks />
    <CoursesSection />
    <CertificatePreview />
    <ReferEarn />
    <Testimonials />
    <FinalCTA />
    <Footer />
  </div>
);

export default Index;
