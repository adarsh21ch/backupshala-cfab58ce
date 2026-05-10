import { Link } from 'react-router-dom';
import { Sparkles, ShieldCheck, Infinity as InfinityIcon, Receipt } from 'lucide-react';
import { Button } from '@/components/ui/button';

interface Props {
  enrollHref: string;
  advancedLabel: string;
  basicLabel: string;
  suggestedValueLabel: string;
}

const AdvancedHero = ({ enrollHref, advancedLabel, basicLabel, suggestedValueLabel }: Props) => {
  return (
    <section className="relative overflow-hidden">
      {/* Radial glow */}
      <div
        className="pointer-events-none absolute inset-0 -z-0"
        style={{
          background:
            'radial-gradient(ellipse 80% 60% at 50% 0%, rgba(245,158,11,0.18), transparent 60%)',
        }}
      />
      {/* Subtle grid */}
      <div
        className="pointer-events-none absolute inset-0 -z-0 opacity-[0.04]"
        style={{
          backgroundImage:
            'linear-gradient(rgba(255,255,255,0.6) 1px, transparent 1px), linear-gradient(90deg, rgba(255,255,255,0.6) 1px, transparent 1px)',
          backgroundSize: '40px 40px',
        }}
      />

      <div className="container relative mx-auto px-4 pt-16 pb-16 md:pt-24 md:pb-20">
        <div className="grid gap-12 md:grid-cols-[1.15fr_1fr] md:items-center">
          {/* Left: copy */}
          <div className="space-y-6 animate-fade-in">
            <span className="relative inline-flex items-center gap-1.5 rounded-full border border-amber-400/40 bg-amber-400/10 px-3 py-1 text-xs font-semibold text-amber-300">
              <span className="absolute inset-0 -z-10 rounded-full bg-amber-400/20 blur-md animate-pulse" />
              <Sparkles className="h-3.5 w-3.5" /> Advanced Program
            </span>

            <h1 className="font-heading text-5xl md:text-6xl lg:text-7xl font-extrabold tracking-tight leading-[1.05]">
              Go from learner to{' '}
              <span className="bg-gradient-to-r from-amber-300 via-amber-400 to-orange-400 bg-clip-text text-transparent">
                earner
              </span>
            </h1>

            <p className="text-lg text-slate-300 max-w-xl">
              The complete advanced program. Frameworks, mentorship, and a verified certificate —
              built for serious students who want real results.
            </p>

            <div className="flex flex-col sm:flex-row gap-3 pt-2">
              <Link to={enrollHref}>
                <Button
                  size="lg"
                  className="bg-amber-500 hover:bg-amber-400 text-slate-950 font-bold w-full sm:w-auto shadow-[0_10px_40px_-10px_rgba(245,158,11,0.6)]"
                >
                  Enroll for {advancedLabel}
                </Button>
              </Link>
              <a href="#curriculum">
                <Button
                  size="lg"
                  variant="outline"
                  className="border-white/20 bg-white/5 hover:bg-white/10 text-white w-full sm:w-auto"
                >
                  See curriculum
                </Button>
              </a>
            </div>

            <div className="flex flex-wrap gap-x-5 gap-y-2 pt-1 text-xs text-slate-400">
              <span className="inline-flex items-center gap-1.5"><ShieldCheck className="h-3.5 w-3.5 text-amber-400" /> Razorpay secured</span>
              <span className="inline-flex items-center gap-1.5"><InfinityIcon className="h-3.5 w-3.5 text-amber-400" /> Lifetime access</span>
              <span className="inline-flex items-center gap-1.5"><Receipt className="h-3.5 w-3.5 text-amber-400" /> GST invoice</span>
            </div>
          </div>

          {/* Right: floating price card */}
          <div className="relative animate-fade-in">
            <div className="absolute -inset-4 rounded-[2rem] bg-gradient-to-br from-amber-400/30 via-orange-500/10 to-transparent blur-2xl" />
            <div className="relative rounded-3xl border border-amber-400/30 bg-gradient-to-br from-slate-900/90 to-slate-950/90 p-7 backdrop-blur-xl shadow-2xl">
              <div className="flex items-center justify-between">
                <span className="text-xs uppercase tracking-widest text-amber-300/80 font-semibold">Advanced Program</span>
                <span className="rounded-full bg-amber-400/15 border border-amber-400/30 px-2.5 py-0.5 text-[10px] font-bold uppercase text-amber-300">
                  Best Value
                </span>
              </div>

              <div className="mt-4 flex items-baseline gap-3">
                <span className="font-heading text-5xl md:text-6xl font-extrabold text-white">
                  {advancedLabel}
                </span>
                {suggestedValueLabel && (
                  <span className="text-base text-slate-500 line-through">{suggestedValueLabel}</span>
                )}
              </div>
              <p className="text-xs text-slate-400 mt-1">One-time payment · Inclusive of GST</p>

              <div className="mt-5 rounded-xl border border-emerald-400/20 bg-emerald-400/5 px-3 py-2.5">
                <p className="text-xs text-emerald-300 font-semibold">
                  ✨ Includes Standard Bundle ({basicLabel} value) — FREE
                </p>
              </div>

              <Link to={enrollHref} className="block mt-5">
                <Button
                  size="lg"
                  className="w-full bg-amber-500 hover:bg-amber-400 text-slate-950 font-bold text-base"
                >
                  Enroll Now →
                </Button>
              </Link>

              <ul className="mt-5 space-y-2 text-xs text-slate-300">
                <li className="flex items-center gap-2">✓ Instant access after payment</li>
                <li className="flex items-center gap-2">✓ Verified certificate on completion</li>
                <li className="flex items-center gap-2">✓ Mentor sessions + community</li>
              </ul>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
};

export default AdvancedHero;
