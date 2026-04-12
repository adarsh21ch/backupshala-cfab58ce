import LandingNavbar from '@/components/landing/Navbar';
import Hero from '@/components/landing/Hero';
import StatsBar from '@/components/landing/StatsBar';
import StandardBundleSpotlight from '@/components/landing/StandardBundleSpotlight';
import HowItWorks from '@/components/landing/HowItWorks';
import ForStudents from '@/components/landing/ForStudents';
import CoursesSection from '@/components/landing/CoursesSection';
import FeeBreakdown from '@/components/landing/FeeBreakdown';
import ForCreators from '@/components/landing/ForCreators';
import Testimonials from '@/components/landing/Testimonials';
import CreatorCTA from '@/components/landing/CreatorCTA';
import FAQ from '@/components/landing/FAQ';
import Footer from '@/components/landing/Footer';
import SEOHead from '@/components/SEOHead';

const Index = () => (
  <div className="min-h-screen">
    <SEOHead title="Backupshala — Learn Digital Skills from Expert Creators" description="India's course marketplace for video editing, content creation, freelancing & more. Learn from expert creators, earn certificates, and grow your skills." path="/" />
    <LandingNavbar />
    <Hero />
    <StatsBar />
    <StandardBundleSpotlight />
    <HowItWorks />
    <ForStudents />
    <CoursesSection />
    <FeeBreakdown />
    <ForCreators />
    <Testimonials />
    <CreatorCTA />
    <FAQ />
    <Footer />
  </div>
);

export default Index;
