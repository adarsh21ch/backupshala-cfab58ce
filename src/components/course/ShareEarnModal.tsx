import { useState } from 'react';
import { Drawer, DrawerContent, DrawerHeader, DrawerTitle, DrawerDescription } from '@/components/ui/drawer';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Copy, Check, MessageCircle, Share2 } from 'lucide-react';
import { toast } from 'sonner';
import { useAuth } from '@/contexts/AuthContext';
import { supabase } from '@/integrations/supabase/client';
import { buildCourseRefLink } from '@/lib/referralTracking';
import { useIsMobile } from '@/hooks/use-mobile';
import { useQueryClient, useMutation } from '@tanstack/react-query';
import { formatPrice } from '@/lib/format';

interface ShareEarnModalProps {
  open: boolean;
  onOpenChange: (v: boolean) => void;
  course: {
    id: string;
    title: string;
    slug: string;
    price: number;
    short_description?: string | null;
    is_platform_course?: boolean;
    platform_fee_percent?: number;
    profiles?: { creator_slug?: string | null } | null;
  };
  estimatedEarning: number;
}

const ShareEarnModal = ({ open, onOpenChange, course, estimatedEarning }: ShareEarnModalProps) => {
  const { user, profile, refreshProfile } = useAuth();
  const isMobile = useIsMobile();
  const qc = useQueryClient();
  const [copied, setCopied] = useState(false);
  const [usernameInput, setUsernameInput] = useState('');

  const setUsernameMutation = useMutation({
    mutationFn: async (uname: string) => {
      const clean = uname.trim().toLowerCase().replace(/[^a-z0-9_]/g, '');
      if (clean.length < 3 || clean.length > 20) throw new Error('Username must be 3-20 chars (letters, numbers, _)');

      // uniqueness check
      const { data: existing } = await supabase
        .from('profiles').select('id').ilike('username', clean).neq('id', user!.id).maybeSingle();
      if (existing) throw new Error('That username is taken — try another');

      const { error } = await supabase.from('profiles').update({ username: clean }).eq('id', user!.id);
      if (error) throw error;
      return clean;
    },
    onSuccess: async () => {
      toast.success('Username saved! Your referral link is ready');
      await refreshProfile();
      qc.invalidateQueries();
    },
    onError: (e: any) => toast.error(e.message),
  });

  const username = profile?.username;
  const creatorSlug = course.profiles?.creator_slug || 'creator';
  const link = username ? buildCourseRefLink(creatorSlug, course.slug, username) : '';

  const copy = async () => {
    if (!link) return;
    await navigator.clipboard.writeText(link);
    setCopied(true);
    toast.success('Link copied!');
    setTimeout(() => setCopied(false), 2000);
  };

  const shareWA = () => {
    if (!link) return;
    const msg = `Hey! Check out this course on Backupshala: ${course.title}\n\n${course.short_description || ''}\n\nBuy it here: ${link}\n\n(I earn a small commission if you buy through my link)`;
    window.open(`https://wa.me/?text=${encodeURIComponent(msg)}`, '_blank');
  };

  const nativeShare = async () => {
    if (!link) return;
    if (navigator.share) {
      try {
        await navigator.share({ title: course.title, text: course.short_description || '', url: link });
      } catch {/* user cancelled */}
    } else {
      copy();
    }
  };

  const Body = (
    <div className="space-y-5 px-4 pb-6">
      <div className="rounded-xl bg-primary/10 border border-primary/20 p-4 text-center">
        <p className="text-xs text-muted-foreground">You earn per sale</p>
        <p className="font-heading text-3xl font-800 text-primary">{formatPrice(estimatedEarning)}</p>
        <p className="mt-1 text-[11px] text-muted-foreground">
          Course price: {formatPrice(course.price)} · Commission credited within 24h, available after 7-day hold.
        </p>
      </div>

      {!username ? (
        <div className="space-y-3 rounded-lg border border-warning/30 bg-warning/5 p-4">
          <div>
            <p className="text-sm font-medium">Set your username to get your referral link</p>
            <p className="text-xs text-muted-foreground mt-0.5">3-20 chars · letters, numbers, underscore</p>
          </div>
          <div className="flex gap-2">
            <Input
              value={usernameInput}
              onChange={e => setUsernameInput(e.target.value)}
              placeholder="e.g. adarsh_k"
              autoComplete="off"
            />
            <Button
              onClick={() => setUsernameMutation.mutate(usernameInput)}
              disabled={setUsernameMutation.isPending || usernameInput.length < 3}
            >
              Save
            </Button>
          </div>
        </div>
      ) : (
        <>
          <div>
            <p className="text-xs text-muted-foreground mb-2">Your referral link for this course</p>
            <div className="rounded-lg border border-primary/30 bg-primary/5 px-3 py-3 font-mono text-xs text-primary break-all">
              {link}
            </div>
          </div>

          <div className="grid grid-cols-3 gap-2">
            <Button onClick={shareWA} className="bg-[#25D366] hover:bg-[#25D366]/90 text-white h-12 flex-col gap-0.5">
              <MessageCircle className="h-4 w-4" />
              <span className="text-[10px]">WhatsApp</span>
            </Button>
            <Button onClick={copy} variant="outline" className="h-12 flex-col gap-0.5">
              {copied ? <Check className="h-4 w-4" /> : <Copy className="h-4 w-4" />}
              <span className="text-[10px]">{copied ? 'Copied' : 'Copy'}</span>
            </Button>
            <Button onClick={nativeShare} variant="outline" className="h-12 flex-col gap-0.5">
              <Share2 className="h-4 w-4" />
              <span className="text-[10px]">Share</span>
            </Button>
          </div>
        </>
      )}
    </div>
  );

  if (isMobile) {
    return (
      <Drawer open={open} onOpenChange={onOpenChange}>
        <DrawerContent>
          <DrawerHeader className="text-left">
            <DrawerTitle>Share & Earn {formatPrice(estimatedEarning)}</DrawerTitle>
            <DrawerDescription>Every sale through your link earns you commission</DrawerDescription>
          </DrawerHeader>
          {Body}
        </DrawerContent>
      </Drawer>
    );
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Share this course and earn {formatPrice(estimatedEarning)}</DialogTitle>
          <DialogDescription>Every sale through your link earns you commission</DialogDescription>
        </DialogHeader>
        {Body}
      </DialogContent>
    </Dialog>
  );
};

export default ShareEarnModal;
