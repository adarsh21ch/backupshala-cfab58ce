import { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Download, X } from 'lucide-react';

const InstallPrompt = () => {
  const [show, setShow] = useState(false);
  const [deferredPrompt, setDeferredPrompt] = useState<any>(null);

  useEffect(() => {
    // Don't show in iframe (Lovable preview)
    try { if (window.self !== window.top) return; } catch { return; }
    if (window.location.hostname.includes('id-preview--')) return;

    const dismissed = localStorage.getItem('bsInstallDismissed');
    if (dismissed) return;

    const handler = (e: any) => {
      e.preventDefault();
      setDeferredPrompt(e);
    };
    window.addEventListener('beforeinstallprompt', handler);

    // Show after 30s delay
    const timer = setTimeout(() => {
      if (deferredPrompt || (window as any).__bsInstallPrompt) {
        setShow(true);
      }
    }, 30000);

    return () => {
      window.removeEventListener('beforeinstallprompt', handler);
      clearTimeout(timer);
    };
  }, [deferredPrompt]);

  // Also store the prompt globally since the event might fire before component mounts
  useEffect(() => {
    const handler = (e: any) => {
      e.preventDefault();
      (window as any).__bsInstallPrompt = e;
      setDeferredPrompt(e);
    };
    window.addEventListener('beforeinstallprompt', handler);
    return () => window.removeEventListener('beforeinstallprompt', handler);
  }, []);

  useEffect(() => {
    if (deferredPrompt) {
      const timer = setTimeout(() => setShow(true), 30000);
      return () => clearTimeout(timer);
    }
  }, [deferredPrompt]);

  const handleInstall = async () => {
    const prompt = deferredPrompt || (window as any).__bsInstallPrompt;
    if (!prompt) return;
    prompt.prompt();
    const result = await prompt.userChoice;
    if (result.outcome === 'accepted') {
      setShow(false);
    }
  };

  const handleDismiss = () => {
    setShow(false);
    localStorage.setItem('bsInstallDismissed', 'true');
  };

  if (!show) return null;

  return (
    <div className="fixed bottom-20 left-4 right-4 z-50 sm:left-auto sm:right-4 sm:max-w-sm lg:bottom-4">
      <div className="rounded-xl border border-border bg-card p-4 shadow-lg flex items-center gap-3">
        <div className="h-10 w-10 rounded-lg bg-primary/10 flex items-center justify-center shrink-0">
          <Download className="h-5 w-5 text-primary" />
        </div>
        <div className="flex-1 min-w-0">
          <p className="text-sm font-semibold">Install Backupshala</p>
          <p className="text-xs text-muted-foreground">Get faster access on your phone</p>
        </div>
        <div className="flex gap-1.5 shrink-0">
          <Button size="sm" onClick={handleInstall} className="rounded-lg text-xs">Install</Button>
          <Button size="sm" variant="ghost" onClick={handleDismiss} className="h-8 w-8 p-0">
            <X className="h-4 w-4" />
          </Button>
        </div>
      </div>
    </div>
  );
};

export default InstallPrompt;
