import { Link } from 'react-router-dom';
import { Helmet } from 'react-helmet-async';
import { Check, Sparkles, ShieldCheck, Award, Zap } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { usePlatformSettings } from '@/hooks/usePlatformSettings';
import { supabase } from '@/integrations/supabase/client';
import { useQuery } from '@tanstack/react-query';
import Logo from '@/components/Logo';

const Advanced = () => {
  const { data: parsed, isLoading } = usePlatformSettings();
  const advancedLabel = isLoading ? '—' : `₹${parsed.advanced_price.toLocaleString('en-IN')}`;
  const basicLabel = isLoading ? '—' : `₹${parsed.basic_price.toLocaleString('en-IN')}`;

  // Resolve advanced course id from settings
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
    'Everything in Standard Bundle (Basic) — included free',
    'Advanced earning frameworks & deep playbooks',
    'Live mentor sessions + private community',
    'Priority support & 1:1 guidance slots',
    'Advanced certification on completion',
    'Lifetime access to all course updates',
  ];

  return (
    <div className="min-h-screen bg-[#0b1020] text-slate-100">
      <Helmet>
        <title>Advanced Course — Backupshala | Master Digital Skills</title>
        <meta
          name="description"
          content={`Backupshala Advanced — the complete program. ${advancedLabel} one-time. Includes the Standard Bundle (${basicLabel} value) free.`}
        />
        <link rel="canonical" href="https://backupshala.com/advanced" />
      </Helmet>

      {/* Top bar */}
      <header className="border-b border-white/10 bg-[#0b1020]/80 backdrop-blur sticky top-0 z-30">
        <div className="container mx-auto px-4 h-14 flex items-center justify-between">
          <Link to="/" className="flex items-center gap-2">
            <Logo iconSize={28} iconOnly />
            <span className="font-semibold">Backupshala</span>
          </Link>
          <div className="flex items-center gap-2">
            <Link to="/login" className="text-sm text-slate-300 hover:text-white">Sign in</Link>
            <Link to={enrollHref}>
              <Button size="sm" className="bg-amber-500 hover:bg-amber-400 text-slate-950 font-semibold">
                Enroll
              </Button>
            </Link>
          </div>
        </div>
      </header>

      {/* Hero */}
      <section className="container mx-auto px-4 pt-16 pb-12">
        <div className="max-w-3xl mx-auto text-center space-y-5">
          <span className="inline-flex items-center gap-1.5 rounded-full border border-amber-400/30 bg-amber-400/10 px-3 py-1 text-xs font-medium text-amber-300">
            <Sparkles className="h-3.5 w-3.5" /> Advanced Program
          </span>
          <h1 className="text-4xl md:text-6xl font-bold tracking-tight font-display">
            Go from learner to <span className="text-amber-400">earner</span>
          </h1>
          <p className="text-lg text-slate-300">
            The complete advanced course. Frameworks, mentorship, and certification — built for serious students who want results.
          </p>

          <div className="flex flex-col sm:flex-row gap-3 justify-center pt-4">
            <Link to={enrollHref}>
              <Button size="lg" className="bg-amber-500 hover:bg-amber-400 text-slate-950 font-semibold w-full sm:w-auto">
                Enroll for {advancedLabel}
              </Button>
            </Link>
            <Link to="/">
              <Button size="lg" variant="outline" className="border-white/20 bg-white/5 hover:bg-white/10 text-white w-full sm:w-auto">
                Back to home
              </Button>
            </Link>
          </div>
          <p className="text-xs text-slate-400">One-time payment · Inclusive of GST · Lifetime access</p>
        </div>
      </section>

      {/* Includes Basic callout */}
      <section className="container mx-auto px-4 py-6">
        <div className="max-w-3xl mx-auto rounded-2xl border border-amber-400/20 bg-gradient-to-br from-amber-500/10 to-transparent p-6 flex items-start gap-4">
          <div className="rounded-xl bg-amber-500/20 p-2.5">
            <Award className="h-5 w-5 text-amber-300" />
          </div>
          <div>
            <p className="font-semibold text-white">Includes everything in the Standard Bundle</p>
            <p className="text-sm text-slate-300 mt-1">
              The Basic course ({basicLabel} value) is added to your account automatically — free — when you enroll in Advanced.
            </p>
          </div>
        </div>
      </section>

      {/* Features */}
      <section className="container mx-auto px-4 py-12">
        <div className="max-w-3xl mx-auto">
          <h2 className="text-2xl md:text-3xl font-bold mb-6">What you get</h2>
          <ul className="grid sm:grid-cols-2 gap-3">
            {features.map((f) => (
              <li key={f} className="flex items-start gap-3 rounded-xl border border-white/10 bg-white/5 p-4">
                <Check className="h-5 w-5 text-amber-400 shrink-0 mt-0.5" />
                <span className="text-sm text-slate-200">{f}</span>
              </li>
            ))}
          </ul>
        </div>
      </section>

      {/* Trust strip */}
      <section className="container mx-auto px-4 py-8">
        <div className="max-w-3xl mx-auto grid grid-cols-1 sm:grid-cols-3 gap-3 text-center">
          <div className="rounded-xl border border-white/10 bg-white/5 p-4">
            <ShieldCheck className="h-5 w-5 text-amber-400 mx-auto mb-2" />
            <p className="text-xs text-slate-300">Secure Razorpay payment</p>
          </div>
          <div className="rounded-xl border border-white/10 bg-white/5 p-4">
            <Zap className="h-5 w-5 text-amber-400 mx-auto mb-2" />
            <p className="text-xs text-slate-300">Instant access after payment</p>
          </div>
          <div className="rounded-xl border border-white/10 bg-white/5 p-4">
            <Award className="h-5 w-5 text-amber-400 mx-auto mb-2" />
            <p className="text-xs text-slate-300">Verified certificate</p>
          </div>
        </div>
      </section>

      {/* Final CTA */}
      <section className="container mx-auto px-4 py-16">
        <div className="max-w-2xl mx-auto text-center rounded-3xl border border-amber-400/20 bg-gradient-to-br from-amber-500/10 via-transparent to-amber-500/5 p-8 md:p-12">
          <h2 className="text-3xl md:text-4xl font-bold mb-3">Ready to go Advanced?</h2>
          <p className="text-slate-300 mb-6">Join the program and get the Standard Bundle free.</p>
          <Link to={enrollHref}>
            <Button size="lg" className="bg-amber-500 hover:bg-amber-400 text-slate-950 font-semibold">
              Enroll for {advancedLabel}
            </Button>
          </Link>
          <p className="text-xs text-slate-400 mt-3">Inclusive of GST · One-time payment</p>
        </div>
      </section>

      <footer className="border-t border-white/10 py-8 text-center text-xs text-slate-400">
        © {new Date().getFullYear()} Backupshala. All rights reserved.
      </footer>
    </div>
  );
};

export default Advanced;
