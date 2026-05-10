import { Check, X } from 'lucide-react';
import { Fragment } from 'react';
import { Link } from 'react-router-dom';
import { Button } from '@/components/ui/button';

interface Props {
  basicLabel: string;
  advancedLabel: string;
  enrollHref: string;
}

const rows: { label: string; basic: boolean | string; advanced: boolean | string }[] = [
  { label: 'Standard Bundle (Basic) course', basic: true, advanced: 'Included free' },
  { label: 'Advanced earning frameworks', basic: false, advanced: true },
  { label: 'Live mentor sessions', basic: false, advanced: true },
  { label: 'Private community access', basic: 'Limited', advanced: 'Full access' },
  { label: '1:1 guidance slots', basic: false, advanced: true },
  { label: 'Priority support', basic: false, advanced: true },
  { label: 'Certificate of completion', basic: 'Standard', advanced: 'Advanced (verified)' },
  { label: 'Lifetime updates', basic: true, advanced: true },
];

const Cell = ({ value }: { value: boolean | string }) => {
  if (value === true) return <Check className="h-5 w-5 text-emerald-400 mx-auto" />;
  if (value === false) return <X className="h-5 w-5 text-slate-600 mx-auto" />;
  return <span className="text-xs text-slate-300">{value}</span>;
};

const AdvancedComparison = ({ basicLabel, advancedLabel, enrollHref }: Props) => {
  return (
    <section className="container mx-auto px-4 py-20">
      <div className="max-w-4xl mx-auto">
        <div className="text-center mb-10">
          <span className="inline-block text-xs uppercase tracking-widest text-amber-400 font-bold mb-3">Compare</span>
          <h2 className="font-heading text-3xl md:text-4xl font-bold mb-3">Basic vs Advanced</h2>
          <p className="text-slate-400">See exactly what you get when you upgrade.</p>
        </div>

        <div className="overflow-hidden rounded-2xl border border-white/10 bg-white/[0.02]">
          <div className="grid grid-cols-[1.5fr_1fr_1fr] text-sm">
            {/* Header */}
            <div className="border-b border-white/10 px-5 py-5 text-xs uppercase tracking-wider text-slate-500 font-semibold">
              Feature
            </div>
            <div className="border-b border-white/10 px-5 py-5 text-center">
              <p className="text-xs uppercase tracking-wider text-slate-400 font-semibold">Standard</p>
              <p className="font-heading text-xl font-bold mt-1">{basicLabel}</p>
            </div>
            <div className="relative border-b border-amber-400/40 bg-amber-400/[0.06] px-5 py-5 text-center">
              <span className="absolute -top-2 left-1/2 -translate-x-1/2 rounded-full bg-amber-400 px-3 py-0.5 text-[10px] font-bold uppercase text-slate-950">
                Recommended
              </span>
              <p className="text-xs uppercase tracking-wider text-amber-300 font-bold">Advanced</p>
              <p className="font-heading text-xl font-bold mt-1 text-amber-300">{advancedLabel}</p>
            </div>

            {/* Rows */}
            {rows.map((row, i) => (
              <Fragment key={i}>
                <div
                  className={`px-5 py-4 text-slate-200 ${
                    i < rows.length - 1 ? 'border-b border-white/5' : ''
                  }`}
                >
                  {row.label}
                </div>
                <div
                  className={`flex items-center justify-center px-5 py-4 ${
                    i < rows.length - 1 ? 'border-b border-white/5' : ''
                  }`}
                >
                  <Cell value={row.basic} />
                </div>
                <div
                  className={`flex items-center justify-center bg-amber-400/[0.04] px-5 py-4 ${
                    i < rows.length - 1 ? 'border-b border-amber-400/10' : ''
                  }`}
                >
                  <Cell value={row.advanced} />
                </div>
              </Fragment>
            ))}
          </div>

          <div className="bg-amber-400/[0.06] border-t border-amber-400/20 p-5 text-center">
            <Link to={enrollHref}>
              <Button className="bg-amber-500 hover:bg-amber-400 text-slate-950 font-bold">
                Upgrade to Advanced — {advancedLabel}
              </Button>
            </Link>
          </div>
        </div>
      </div>
    </section>
  );
};

export default AdvancedComparison;
