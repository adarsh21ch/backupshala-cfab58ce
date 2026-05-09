import { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { Cookie } from 'lucide-react';

const CookieConsent = () => {
  const [visible, setVisible] = useState(false);

  useEffect(() => {
    const consent = localStorage.getItem('cookieConsent');
    if (!consent) setVisible(true);
  }, []);

  const handleAccept = () => {
    localStorage.setItem('cookieConsent', 'true');
    setVisible(false);
  };

  if (!visible) return null;

  return (
    <div className="fixed inset-x-0 z-50 p-4 print:hidden bottom-16 md:bottom-0">
      <div className="mx-auto max-w-3xl rounded-xl border border-border bg-card p-4 shadow-warm-lg flex flex-col sm:flex-row items-start sm:items-center gap-3">
        <Cookie className="h-5 w-5 text-accent shrink-0 mt-0.5 sm:mt-0" />
        <p className="text-sm text-muted-foreground flex-1">
          We use cookies to improve your experience. By continuing, you agree to our{' '}
          <Link to="/privacy-policy" className="text-primary hover:underline">Privacy Policy</Link>.
        </p>
        <div className="flex gap-2 shrink-0">
          <Button variant="ghost" size="sm" asChild>
            <Link to="/privacy-policy">Learn More</Link>
          </Button>
          <Button size="sm" onClick={handleAccept} className="bg-accent hover:bg-accent/90 text-accent-foreground">
            Accept
          </Button>
        </div>
      </div>
    </div>
  );
};

export default CookieConsent;
