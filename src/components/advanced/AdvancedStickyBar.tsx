import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { Award } from 'lucide-react';

interface Props {
  enrollHref: string;
  advancedLabel: string;
}

const AdvancedStickyBar = ({ enrollHref, advancedLabel }: Props) => {
  const [visible, setVisible] = useState(false);

  useEffect(() => {
    const onScroll = () => {
      // Show after scrolling past ~600px (past hero)
      setVisible(window.scrollY > 600);
    };
    onScroll();
    window.addEventListener('scroll', onScroll, { passive: true });
    return () => window.removeEventListener('scroll', onScroll);
  }, []);

  return (
    <div
      className={`fixed inset-x-0 bottom-0 z-40 transition-all duration-300 ${
        visible ? 'translate-y-0 opacity-100' : 'translate-y-full opacity-0 pointer-events-none'
      }`}
    >
      <div className="border-t border-amber-400/30 bg-slate-950/95 backdrop-blur-xl shadow-[0_-10px_40px_-10px_rgba(0,0,0,0.6)]">
        <div className="container mx-auto px-4 py-3 flex items-center justify-between gap-3">
          <div className="flex items-center gap-3 min-w-0">
            <div className="hidden sm:flex h-10 w-10 rounded-full bg-amber-400/15 border border-amber-400/30 items-center justify-center shrink-0">
              <Award className="h-5 w-5 text-amber-400" />
            </div>
            <div className="min-w-0">
              <p className="text-sm font-semibold text-white truncate">Backupshala Advanced</p>
              <p className="text-[11px] text-slate-400 truncate">
                One-time · Lifetime access · Includes Standard Bundle
              </p>
            </div>
          </div>
          <div className="flex items-center gap-3 shrink-0">
            <span className="hidden md:inline font-heading text-lg font-extrabold text-amber-400">
              {advancedLabel}
            </span>
            <Link to={enrollHref}>
              <Button className="bg-amber-500 hover:bg-amber-400 text-slate-950 font-bold">
                <span className="md:hidden">Enroll {advancedLabel}</span>
                <span className="hidden md:inline">Enroll Now →</span>
              </Button>
            </Link>
          </div>
        </div>
      </div>
    </div>
  );
};

export default AdvancedStickyBar;
