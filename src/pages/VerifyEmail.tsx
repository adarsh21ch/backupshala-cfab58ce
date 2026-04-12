import { useState } from 'react';
import { Link } from 'react-router-dom';
import { supabase } from '@/integrations/supabase/client';
import { Button } from '@/components/ui/button';
import { useToast } from '@/hooks/use-toast';
import { MailCheck, Loader2, RefreshCw } from 'lucide-react';

const VerifyEmail = () => {
  const [resending, setResending] = useState(false);
  const { toast } = useToast();

  // Try to get email from URL params or session
  const params = new URLSearchParams(window.location.search);
  const email = params.get('email') || '';

  const handleResend = async () => {
    if (!email) {
      toast({ title: 'No email found', description: 'Please sign up again.', variant: 'destructive' });
      return;
    }
    setResending(true);
    try {
      const { error } = await supabase.auth.resend({ type: 'signup', email });
      if (error) throw error;
      toast({ title: 'Verification email sent!', description: 'Check your inbox and spam folder.' });
    } catch (err: any) {
      toast({ title: 'Failed to resend', description: err.message, variant: 'destructive' });
    } finally {
      setResending(false);
    }
  };

  return (
    <div className="flex min-h-screen items-center justify-center bg-background px-4">
      <div className="w-full max-w-md text-center">
        <Link to="/" className="inline-flex items-center mb-6">
          <span className="font-heading text-2xl font-800">
            <span className="text-primary">Backup</span>
            <span className="text-accent">shala</span>
          </span>
        </Link>

        <div className="rounded-xl border border-border bg-card p-8 shadow-warm">
          <div className="mx-auto mb-6 flex h-16 w-16 items-center justify-center rounded-full bg-primary/10">
            <MailCheck className="h-8 w-8 text-primary" />
          </div>

          <h1 className="font-heading text-2xl font-700 mb-2">Check your email</h1>
          <p className="text-muted-foreground text-sm mb-1">
            We've sent a verification link to
          </p>
          {email && (
            <p className="font-semibold text-foreground mb-4">{email}</p>
          )}
          <p className="text-muted-foreground text-sm mb-6">
            Click the link in the email to verify your account and start learning. Don't forget to check your spam folder.
          </p>

          <Button
            onClick={handleResend}
            disabled={resending || !email}
            variant="outline"
            className="w-full rounded-lg mb-3"
          >
            {resending ? (
              <Loader2 className="h-4 w-4 animate-spin mr-2" />
            ) : (
              <RefreshCw className="h-4 w-4 mr-2" />
            )}
            Resend verification email
          </Button>

          <div className="mt-4 space-y-2 text-sm text-muted-foreground">
            <p>
              Already verified?{' '}
              <Link to="/login" className="text-primary hover:underline font-medium">
                Login here
              </Link>
            </p>
            <p>
              Wrong email?{' '}
              <Link to="/signup" className="text-primary hover:underline font-medium">
                Sign up again
              </Link>
            </p>
          </div>
        </div>
      </div>
    </div>
  );
};

export default VerifyEmail;
