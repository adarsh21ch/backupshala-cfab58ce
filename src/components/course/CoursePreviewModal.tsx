import { useEffect, useState } from 'react';
import { Dialog, DialogContent, DialogTitle } from '@/components/ui/dialog';
import { Drawer, DrawerContent, DrawerTitle } from '@/components/ui/drawer';
import { Button } from '@/components/ui/button';
import BackupshalaVideoPlayer from '@/components/video/BackupshalaVideoPlayer';
import { Lock, X } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { useIsMobile } from '@/hooks/use-mobile';
import { useAuth } from '@/contexts/AuthContext';
import { formatPrice } from '@/lib/format';

interface PreviewModule {
  id: string;
  title: string;
  video_asset_id?: string | null;
  video_url?: string | null;
  module_type?: string | null;
}

interface CoursePreviewModalProps {
  open: boolean;
  onClose: () => void;
  module: PreviewModule | null;
  courseTitle: string;
  enrollPath: string;
  enrollPrice: number;
  watermarkText?: string;
}

const CoursePreviewModal = ({
  open, onClose, module, courseTitle, enrollPath, enrollPrice, watermarkText = 'Backupshala',
}: CoursePreviewModalProps) => {
  const isMobile = useIsMobile();
  const navigate = useNavigate();
  const { user } = useAuth();
  const [showCta, setShowCta] = useState(false);

  // Auto-show CTA after 10 minutes
  useEffect(() => {
    if (!open) { setShowCta(false); return; }
    const timer = setTimeout(() => setShowCta(true), 10 * 60 * 1000);
    return () => clearTimeout(timer);
  }, [open]);

  const handleEnrollClick = () => {
    if (!user) {
      navigate(`/signup?redirect=${encodeURIComponent(enrollPath)}`);
    } else {
      navigate(enrollPath);
    }
    onClose();
  };

  const Body = (
    <div className="space-y-3">
      <div className="flex items-start justify-between gap-3 px-1">
        <div className="min-w-0">
          <p className="text-[10px] font-bold uppercase tracking-wider text-primary">Free Preview</p>
          <h3 className="font-heading text-base font-700 truncate">{module?.title || 'Preview'}</h3>
          <p className="text-xs text-muted-foreground truncate">From: {courseTitle}</p>
        </div>
        <button
          onClick={onClose}
          aria-label="Close preview"
          className="rounded-full bg-secondary hover:bg-secondary/70 p-1.5 shrink-0"
        >
          <X className="h-4 w-4" />
        </button>
      </div>

      <div className="relative">
        {module?.video_asset_id ? (
          <BackupshalaVideoPlayer
            assetId={module.video_asset_id}
            isPreview
            allowSeek
            allowSpeedChange
            showWatermark
            watermarkText={watermarkText}
            onEnded={() => setShowCta(true)}
          />
        ) : module?.video_url && !module.video_url.includes('placeholder') ? (
          (() => {
            const url = module.video_url;
            const isEmbed = /youtube\.com\/embed|player\.vimeo\.com|youtu\.be|vimeo\.com\/\d+/.test(url);
            return (
              <div className="relative aspect-video w-full overflow-hidden rounded-xl border border-border bg-black">
                {isEmbed ? (
                  <iframe
                    src={url}
                    title={module.title}
                    className="h-full w-full"
                    allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
                    allowFullScreen
                  />
                ) : (
                  <video
                    src={url}
                    controls
                    playsInline
                    className="h-full w-full object-contain"
                    controlsList="nodownload"
                    onEnded={() => setShowCta(true)}
                  />
                )}
                <div className="pointer-events-none absolute bottom-12 right-3 text-white text-sm font-bold opacity-60" style={{ textShadow: '0 1px 3px rgba(0,0,0,0.8)' }}>
                  {watermarkText}
                </div>
              </div>
            );
          })()
        ) : (
          <div className="aspect-video w-full rounded-xl border border-border bg-secondary flex items-center justify-center">
            <p className="text-sm text-muted-foreground">Preview unavailable</p>
          </div>
        )}

        {/* CTA overlay (after end / 10-min timer) */}
        {showCta && (
          <div className="absolute inset-0 flex items-end rounded-xl overflow-hidden">
            <div className="w-full bg-gradient-to-t from-background via-background/95 to-background/40 p-5 text-center space-y-3">
              <p className="font-heading text-lg font-700">Enjoying this preview?</p>
              <p className="text-sm text-muted-foreground">Enroll now for full access to all modules.</p>
              <div className="flex flex-col sm:flex-row gap-2 justify-center">
                <Button onClick={handleEnrollClick} className="bg-accent hover:bg-accent/90 text-accent-foreground font-semibold">
                  Enroll Now — {formatPrice(enrollPrice)}
                </Button>
                <Button variant="outline" onClick={() => setShowCta(false)}>
                  Continue preview
                </Button>
              </div>
            </div>
          </div>
        )}
      </div>

      <div className="flex items-center justify-between gap-3 px-1">
        <p className="text-[11px] text-muted-foreground flex items-center gap-1">
          <Lock className="h-3 w-3" /> Other modules require enrollment
        </p>
        <Button size="sm" onClick={handleEnrollClick} className="bg-primary hover:bg-primary/90 font-semibold">
          Enroll — {formatPrice(enrollPrice)}
        </Button>
      </div>
    </div>
  );

  if (isMobile) {
    return (
      <Drawer open={open} onOpenChange={(o) => !o && onClose()}>
        <DrawerContent className="max-h-[92vh]">
          <DrawerTitle className="sr-only">Course preview: {module?.title || ''}</DrawerTitle>
          <div className="overflow-y-auto p-4">{Body}</div>
        </DrawerContent>
      </Drawer>
    );
  }

  return (
    <Dialog open={open} onOpenChange={(o) => !o && onClose()}>
      <DialogContent className="sm:max-w-[800px] p-4">
        <DialogTitle className="sr-only">Course preview: {module?.title || ''}</DialogTitle>
        {Body}
      </DialogContent>
    </Dialog>
  );
};

export default CoursePreviewModal;
