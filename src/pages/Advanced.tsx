import { Link } from 'react-router-dom';
import { Helmet } from 'react-helmet-async';
import { Check, Award, Users, GraduationCap, Star } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { usePricingTiers } from '@/hooks/usePricingTiers';
import { supabase } from '@/integrations/supabase/client';
import { useQuery } from '@tanstack/react-query';
import LandingNavbar from '@/components/landing/Navbar';
import AdvancedHero from '@/components/advanced/AdvancedHero';
import AdvancedCurriculum from '@/components/advanced/AdvancedCurriculum';
import AdvancedComparison from '@/components/advanced/AdvancedComparison';
import AdvancedTestimonials from '@/components/advanced/AdvancedTestimonials';
import AdvancedFAQ from '@/components/advanced/AdvancedFAQ';
import AdvancedStickyBar from '@/components/advanced/AdvancedStickyBar';

const Advanced = () => {
  const { data: tiers, isLoading } = usePricingTiers();
  const advancedTier = tiers?.find(t => t.slug === 'advanced');
  const entryTier = (tiers || []).filter(t => t.status === 'live').sort((a, b) => a.price - b.price)[0];
  const fmt = (n?: number) => (n == null ? '—' : `₹${n.toLocaleString('en-IN')}`);
  const advancedLabel = isLoading ? '—' : fmt(advancedTier?.price);
  const basicLabel = isLoading ? '—' : fmt(entryTier?.price);
  // Suggested value = ~2x advanced for crossed-out anchor pricing
  const suggestedValue = isLoading || !advancedTier
    ? ''
    : `₹${(advancedTier.price * 2).toLocaleString('en-IN')}`;

  const { data: advancedCourseId } = useQuery({
    queryKey: ['advanced-course-id'],
    queryFn: async () => {
      const { data } = await supabase
        .from('platform_settings')
        .select('value')
        .eq('key', 'advanced_course_id')
        .maybeSingle();
      return data?.value as string | undefined;
    },
  });

  const enrollHref = advancedCourseId ? `/courses/${advancedCourseId}` : '/login';

  const features = [
    { icon: Award, title: 'Standard Bundle included', desc: `Get the ${basicLabel} Starter course free with Advanced enrolment.` },
    { icon: GraduationCap, title: 'Advanced playbooks', desc: 'Deep frameworks proven to convert students into earners.' },
    { icon: Users, title: 'Live mentor sessions', desc: 'Weekly live calls + private community access.' },
    { icon: Star, title: '1:1 priority support', desc: 'Dedicated guidance slots when you need help.' },
    { icon: Check, title: 'Verified certificate', desc: 'Public verify URL — share on LinkedIn & resumes.' },
    { icon: Award, title: 'Lifetime updates', desc: 'Every future module added to your account, free.' },
  ];

  return (
    <div className="min-h-screen bg-[#0b1020] text-slate-100 pb-20 md:pb-16">
      <Helmet>
        <title>Advanced Course — Backupshala | Master Digital Skills</title>
        <meta
          name="description"
          content={`Backupshala Advanced — the complete program. ${advancedLabel} one-time. Includes the Standard Bundle (${basicLabel} value) free.`}
        />
        <link rel="canonical" href="https://backupshala.com/advanced" />
      </Helmet>

      <LandingNavbar />

      <AdvancedHero
        enrollHref={enrollHref}
        advancedLabel={advancedLabel}
        basicLabel={basicLabel}
        suggestedValueLabel={suggestedValue}
      />

      {/* Trust strip */}
      <section className="container mx-auto px-4 -mt-2">
        <div className="max-w-4xl mx-auto grid grid-cols-3 gap-3 text-center rounded-2xl border border-white/10 bg-white/[0.03] p-5">
          <div>
            <p className="font-heading text-2xl md:text-3xl font-extrabold text-amber-400">1,200+</p>
            <p className="text-[11px] text-slate-400 mt-0.5">Students enrolled</p>
          </div>
          <div className="border-x border-white/10">
            <p className="font-heading text-2xl md:text-3xl font-extrabold text-amber-400">4.8★</p>
            <p className="text-[11px] text-slate-400 mt-0.5">Average rating</p>
          </div>
          <div>
            <p className="font-heading text-2xl md:text-3xl font-extrabold text-amber-400">800+</p>
            <p className="text-[11px] text-slate-400 mt-0.5">Certificates issued</p>
          </div>
        </div>
      </section>

      <AdvancedCurriculum courseId={advancedCourseId} />

      {/* What you get */}
      <section className="container mx-auto px-4 py-20">
        <div className="max-w-5xl mx-auto">
          <div className="text-center mb-10">
            <span className="inline-block text-xs uppercase tracking-widest text-amber-400 font-bold mb-3">
              Inside the program
            </span>
            <h2 className="font-heading text-3xl md:text-4xl font-bold mb-3">What you get</h2>
            <p className="text-slate-400">Everything you need to turn skills into income.</p>
          </div>
          <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
            {features.map((f) => (
              <div
                key={f.title}
                className="group rounded-2xl border border-white/10 bg-gradient-to-br from-white/[0.04] to-transparent p-6 hover:border-amber-400/40 hover:-translate-y-0.5 transition-all"
              >
                <div className="h-10 w-10 rounded-xl bg-amber-400/15 border border-amber-400/30 flex items-center justify-center mb-4 group-hover:bg-amber-400/25 transition-colors">
                  <f.icon className="h-5 w-5 text-amber-400" />
                </div>
                <p className="font-semibold text-white mb-1.5">{f.title}</p>
                <p className="text-sm text-slate-400 leading-relaxed">{f.desc}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      <AdvancedComparison
        basicLabel={basicLabel}
        advancedLabel={advancedLabel}
        enrollHref={enrollHref}
      />

      <AdvancedTestimonials />

      <AdvancedFAQ basicLabel={basicLabel} advancedLabel={advancedLabel} />

      {/* Final CTA */}
      <section className="container mx-auto px-4 py-16">
        <div className="max-w-3xl mx-auto text-center relative overflow-hidden rounded-3xl border border-amber-400/30 bg-gradient-to-br from-amber-500/15 via-transparent to-orange-500/10 p-10 md:p-14">
          <div className="absolute -top-20 left-1/2 -translate-x-1/2 h-40 w-[120%] bg-amber-400/20 blur-3xl rounded-full" />
          <div className="relative">
            <span className="inline-block text-xs uppercase tracking-widest text-amber-400 font-bold mb-3">
              Limited spots
            </span>
            <h2 className="font-heading text-3xl md:text-5xl font-extrabold mb-4">
              Ready to go Advanced?
            </h2>
            <p className="text-slate-300 mb-8 max-w-lg mx-auto">
              Join 1,200+ students already learning and earning. Standard Bundle included free.
            </p>
            <Link to={enrollHref}>
              <Button
                size="lg"
                className="bg-amber-500 hover:bg-amber-400 text-slate-950 font-bold text-base shadow-[0_10px_40px_-10px_rgba(245,158,11,0.6)]"
              >
                Enroll for {advancedLabel} →
              </Button>
            </Link>
            <p className="text-xs text-slate-400 mt-4">
              Inclusive of GST · One-time payment · 7-day money-back guarantee
            </p>
          </div>
        </div>
      </section>

      <footer className="border-t border-white/10 py-8 text-center text-xs text-slate-400">
        © {new Date().getFullYear()} Backupshala. All rights reserved.
      </footer>

      <AdvancedStickyBar enrollHref={enrollHref} advancedLabel={advancedLabel} />
    </div>
  );
};

export default Advanced;
