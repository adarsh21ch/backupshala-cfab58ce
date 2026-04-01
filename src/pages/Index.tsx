import LandingNavbar from '@/components/landing/Navbar';
import Hero from '@/components/landing/Hero';
import HowItWorks from '@/components/landing/HowItWorks';
import ForStudents from '@/components/landing/ForStudents';
import ForCreators from '@/components/landing/ForCreators';
import FeeBreakdown from '@/components/landing/FeeBreakdown';
import CoursesSection from '@/components/landing/CoursesSection';
import CreatorCTA from '@/components/landing/CreatorCTA';
import FAQ from '@/components/landing/FAQ';
import Footer from '@/components/landing/Footer';

const Index = () => (
  <div className="min-h-screen">
    <LandingNavbar />
    <Hero />
    <HowItWorks />
    <ForStudents />
    <CoursesSection />
    <FeeBreakdown />
    <ForCreators />
    <CreatorCTA />
    <FAQ />
    <Footer />
  </div>
);

export default Index;
