import { useState } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Copy, Check, MessageCircle } from 'lucide-react';
import { toast } from 'sonner';
import { useAuth } from '@/contexts/AuthContext';
import { Link } from 'react-router-dom';
import { formatPrice } from '@/lib/format';

interface ShareCourseModalProps {
  open: boolean;
  onClose: () => void;
  courseTitle: string;
  coursePath: string; // e.g. /c/<creator-slug>/<course-slug>
  estimatedCommission?: number;
}

const ShareCourseModal = ({ open, onClose, courseTitle, coursePath, estimatedCommission }: ShareCourseModalProps) => {
  const { user, profile } = useAuth();
  const [copied, setCopied] = useState(false);

  const refKey = profile?.creator_slug || (profile?.email ? encodeURIComponent(profile.email) : '');
  const link = user && refKey
    ? `${window.location.origin}${coursePath}?ref=${refKey}`
    : `${window.location.origin}${coursePath}`;

  const whatsappMsg = `I found a great course on Backupshala! Check it out:\n\n"${courseTitle}"\n${link}`;

  const copyLink = async () => {
    try {
      await navigator.clipboard.writeText(link);
      setCopied(true);
      toast.success('Link copied!');
      setTimeout(() => setCopied(false), 2000);
    } catch {
      toast.error('Could not copy link');
    }
  };

  const shareWhatsApp = () => {
    window.open(`https://wa.me/?text=${encodeURIComponent(whatsappMsg)}`, '_blank');
  };

  return (
    <Dialog open={open} onOpenChange={(v) => { if (!v) onClose(); }}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle>Share this course</DialogTitle>
          <DialogDescription>
            {user
              ? `Share "${courseTitle}" and earn when someone enrolls.`
              : 'Sign up to get your personal referral link and earn commissions.'}
          </DialogDescription>
        </DialogHeader>

        {!user ? (
          <div className="space-y-3">
            <div className="rounded-lg border border-border bg-secondary/30 p-3 text-xs text-muted-foreground break-all">
              {link}
            </div>
            <Button asChild className="w-full bg-primary hover:bg-primary/90">
              <Link to={`/signup?redirect=${encodeURIComponent(coursePath)}`}>Sign up free to get your referral link</Link>
            </Button>
          </div>
        ) : (
          <div className="space-y-4">
            <div className="rounded-lg border border-primary/30 bg-primary/5 px-3 py-2.5 font-mono text-xs text-primary break-all">
              {link}
            </div>
            <div className="flex flex-col gap-2 sm:flex-row">
              <Button onClick={copyLink} variant="outline" className="flex-1">
                {copied ? <><Check className="h-4 w-4 mr-2" /> Copied</> : <><Copy className="h-4 w-4 mr-2" /> Copy Link</>}
              </Button>
              <Button onClick={shareWhatsApp} className="flex-1 bg-[#25D366] hover:bg-[#25D366]/90 text-white">
                <MessageCircle className="h-4 w-4 mr-2" /> WhatsApp
              </Button>
            </div>
            {estimatedCommission != null && estimatedCommission > 0 && (
              <p className="rounded-lg border border-accent/30 bg-accent/5 px-3 py-2 text-xs text-center">
                You earn up to <span className="font-bold text-accent">{formatPrice(estimatedCommission)}</span> when someone buys via your link.
              </p>
            )}
            <p className="text-[10px] text-center text-muted-foreground">
              Referral commission comes from the platform fee — it never reduces the creator's earnings.
            </p>
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
};

export default ShareCourseModal;
