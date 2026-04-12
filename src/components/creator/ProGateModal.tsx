import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Star } from 'lucide-react';
import { Link } from 'react-router-dom';

interface ProGateModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  featureName: string;
  featureDescription: string;
}

const ProGateModal = ({ open, onOpenChange, featureName, featureDescription }: ProGateModalProps) => (
  <Dialog open={open} onOpenChange={onOpenChange}>
    <DialogContent className="bg-card border-border max-w-sm text-center">
      <DialogHeader>
        <div className="mx-auto flex h-14 w-14 items-center justify-center rounded-2xl bg-accent/10 mb-2">
          <Star className="h-7 w-7 text-accent" />
        </div>
        <DialogTitle className="font-heading text-lg">This is a Creator Pro feature</DialogTitle>
        <DialogDescription className="text-sm text-muted-foreground mt-2">
          <span className="font-semibold text-foreground">{featureName}</span> — {featureDescription}
        </DialogDescription>
      </DialogHeader>
      <div className="space-y-3 mt-2">
        <Button asChild className="w-full rounded-lg bg-accent hover:bg-accent/90 text-accent-foreground font-semibold">
          <Link to="/creator/upgrade">Upgrade to Creator Pro — ₹499/month</Link>
        </Button>
        <Button variant="ghost" onClick={() => onOpenChange(false)} className="w-full text-sm text-muted-foreground">
          Maybe later
        </Button>
      </div>
    </DialogContent>
  </Dialog>
);

export default ProGateModal;
