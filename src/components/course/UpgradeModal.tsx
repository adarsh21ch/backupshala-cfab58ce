import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Check, Lock, Loader2 } from 'lucide-react';
import { formatPrice } from '@/lib/format';

interface Module {
  id: string;
  title: string;
  module_tier?: string | null;
}

interface Props {
  open: boolean;
  onClose: () => void;
  onConfirm: () => void;
  upgradePrice: number;
  modules: Module[];
  paying: boolean;
  courseTitle: string;
}

const UpgradeModal = ({ open, onClose, onConfirm, upgradePrice, modules, paying, courseTitle }: Props) => {
  const basicMods = modules.filter(m => (m.module_tier || 'basic') === 'basic');
  const advancedMods = modules.filter(m => m.module_tier === 'advanced');

  return (
    <Dialog open={open} onOpenChange={(o) => !o && !paying && onClose()}>
      <DialogContent className="bg-card border-border max-w-lg">
        <DialogHeader>
          <DialogTitle className="font-heading text-xl">Upgrade to Advanced</DialogTitle>
        </DialogHeader>
        <div className="space-y-4">
          <p className="text-sm text-muted-foreground">
            Unlock all advanced modules in <span className="font-semibold text-foreground">{courseTitle}</span> with a one-time payment.
          </p>

          <div className="grid gap-3 sm:grid-cols-2">
            <div className="rounded-lg border border-border p-3">
              <p className="text-[10px] font-bold uppercase tracking-wider text-primary mb-2">You already have</p>
              <ul className="space-y-1.5 max-h-40 overflow-y-auto">
                {basicMods.map(m => (
                  <li key={m.id} className="flex items-start gap-2 text-xs">
                    <Check className="h-3 w-3 text-primary shrink-0 mt-0.5" />
                    <span className="truncate">{m.title}</span>
                  </li>
                ))}
                {basicMods.length === 0 && <li className="text-xs text-muted-foreground">No basic modules yet.</li>}
              </ul>
            </div>
            <div className="rounded-lg border-2 border-accent/40 bg-accent/5 p-3">
              <p className="text-[10px] font-bold uppercase tracking-wider text-accent mb-2">You'll unlock</p>
              <ul className="space-y-1.5 max-h-40 overflow-y-auto">
                {advancedMods.map(m => (
                  <li key={m.id} className="flex items-start gap-2 text-xs">
                    <Lock className="h-3 w-3 text-accent shrink-0 mt-0.5" />
                    <span className="truncate font-medium">{m.title}</span>
                  </li>
                ))}
                {advancedMods.length === 0 && <li className="text-xs text-muted-foreground">No advanced modules yet.</li>}
              </ul>
            </div>
          </div>

          <div className="rounded-lg bg-secondary/40 p-3 flex items-center justify-between">
            <span className="text-sm text-muted-foreground">One-time payment</span>
            <span className="font-heading text-2xl font-extrabold text-accent">{formatPrice(upgradePrice)}</span>
          </div>
        </div>
        <DialogFooter className="flex-col-reverse sm:flex-row gap-2">
          <Button variant="outline" onClick={onClose} disabled={paying} className="rounded-lg">Cancel</Button>
          <Button
            onClick={onConfirm}
            disabled={paying}
            className="rounded-lg bg-accent hover:bg-accent/90 text-accent-foreground font-semibold"
          >
            {paying && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}
            Pay {formatPrice(upgradePrice)} & Unlock
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
};

export default UpgradeModal;
