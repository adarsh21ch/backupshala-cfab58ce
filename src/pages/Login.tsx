import { useState } from 'react';
import { Link, useNavigate, useSearchParams } from 'react-router-dom';
import { supabase } from '@/integrations/supabase/client';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { useToast } from '@/hooks/use-toast';
import { Eye, EyeOff, Loader2, Lock } from 'lucide-react';
import iconSrc from '@/assets/backupshala-icon.png';

const Login = () => {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const [forgotMode, setForgotMode] = useState(false);
  const [resetSent, setResetSent] = useState(false);
  const [failedAttempts, setFailedAttempts] = useState(0);
  const [lockedUntil, setLockedUntil] = useState<number | null>(null);
  const { toast } = useToast();
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const redirect = searchParams.get('redirect') || '/dashboard';

  const isLocked = lockedUntil && Date.now() < lockedUntil;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (isLocked) {
      toast({ title: 'Too many attempts. Please wait 30 seconds.', variant: 'destructive' });
      return;
    }
    if (!email || !password) {
      toast({ title: 'Please fill in all fields', variant: 'destructive' });
      return;
    }
    setLoading(true);
    try {
      const { error } = await supabase.auth.signInWithPassword({ email: email.toLowerCase().trim(), password });
      if (error) throw error;
      setFailedAttempts(0);
      navigate(redirect);
    } catch (error: any) {
      const newAttempts = failedAttempts + 1;
      setFailedAttempts(newAttempts);
      if (newAttempts >= 3) {
        setLockedUntil(Date.now() + 30000);
        setTimeout(() => { setLockedUntil(null); setFailedAttempts(0); }, 30000);
      }
      toast({ title: 'Login failed', description: error.message, variant: 'destructive' });
    } finally {
      setLoading(false);
    }
  };

  const handleForgotPassword = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!email) {
      toast({ title: 'Enter your email address', variant: 'destructive' });
      return;
    }
    setLoading(true);
    try {
      const { error } = await supabase.auth.resetPasswordForEmail(email.toLowerCase().trim(), {
        redirectTo: `${window.location.origin}/reset-password`,
      });
      if (error) throw error;
      setResetSent(true);
      toast({ title: 'Reset link sent! Check your email.' });
    } catch (error: any) {
      toast({ title: 'Failed', description: error.message, variant: 'destructive' });
    } finally {
      setLoading(false);
    }
  };

  return (
    <div
      className="relative flex min-h-screen items-center justify-center px-4 py-10
                 bg-hero-gradient
                 dark:bg-[radial-gradient(ellipse_at_50%_40%,#1A1208_0%,#0D0F12_60%)]"
    >
      <div className="w-full max-w-[400px]">
        <div className="rounded-[20px] border border-border bg-card p-8 shadow-[0_8px_40px_rgba(0,0,0,0.10)] dark:shadow-[0_8px_40px_rgba(0,0,0,0.5)]">
          <div className="text-center mb-6">
            <Link to="/" className="inline-flex flex-col items-center gap-3">
              <img src={iconSrc} alt="Backupshala" width={56} height={56} className="select-none" draggable={false} />
              <span className="font-heading text-[28px] font-bold tracking-tight leading-none">
                <span className="text-foreground">Backup</span><span className="text-accent">shala</span>
              </span>
            </Link>
          </div>

          <div className="text-center mb-6">
            <h1 className="font-heading text-[26px] font-bold">
              {forgotMode ? 'Reset password' : 'Welcome back'}
            </h1>
            <p className="mt-1 text-sm text-muted-foreground">
              {forgotMode ? 'Enter your email to receive a reset link' : 'Log in to continue'}
            </p>
          </div>

          {forgotMode ? (
            <form onSubmit={handleForgotPassword} className="space-y-4">
              <div>
                <Label htmlFor="email">Email address</Label>
                <Input id="email" type="email" placeholder="you@example.com" value={email} onChange={e => setEmail(e.target.value)} className="mt-1.5 h-11 rounded-[10px]" />
              </div>
              {resetSent ? (
                <p className="text-sm text-primary text-center">✓ Check your email for the reset link.</p>
              ) : (
                <Button type="submit" disabled={loading} className="w-full h-11 bg-accent hover:bg-accent/90 text-accent-foreground rounded-[10px] font-semibold shadow-accent-glow hover:shadow-accent-glow-hover transition-shadow">
                  {loading ? <Loader2 className="h-4 w-4 animate-spin" /> : 'Send reset link'}
                </Button>
              )}
              <button type="button" onClick={() => { setForgotMode(false); setResetSent(false); }} className="w-full text-center text-sm text-accent hover:underline">
                ← Back to login
              </button>
            </form>
          ) : (
            <form onSubmit={handleSubmit} className="space-y-4">
              <div>
                <Label htmlFor="email">Email address</Label>
                <Input id="email" type="email" placeholder="you@example.com" autoComplete="email" value={email} onChange={e => setEmail(e.target.value)} className="mt-1.5 h-11 rounded-[10px]" />
              </div>
              <div>
                <div className="flex items-center justify-between">
                  <Label htmlFor="password">Password</Label>
                  <button type="button" onClick={() => setForgotMode(true)} className="text-xs text-accent hover:underline">Forgot password?</button>
                </div>
                <div className="relative mt-1.5">
                  <Input
                    id="password"
                    type={showPassword ? 'text' : 'password'}
                    placeholder="Your password"
                    autoComplete="current-password"
                    value={password}
                    onChange={e => setPassword(e.target.value)}
                    className="h-11 rounded-[10px] pr-10"
                  />
                  <button
                    type="button"
                    onClick={() => setShowPassword(s => !s)}
                    className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
                    aria-label={showPassword ? 'Hide password' : 'Show password'}
                  >
                    {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                  </button>
                </div>
              </div>
              <Button type="submit" disabled={loading || !!isLocked} className="w-full h-11 bg-accent hover:bg-accent/90 text-accent-foreground rounded-[10px] font-semibold shadow-accent-glow hover:shadow-accent-glow-hover transition-shadow">
                {isLocked ? 'Too many attempts — wait 30s' : loading ? <Loader2 className="h-4 w-4 animate-spin" /> : 'Log in'}
              </Button>
            </form>
          )}

          <p className="mt-5 text-center text-sm text-muted-foreground">
            Don't have an account?{' '}
            <Link to="/signup" className="font-semibold text-accent hover:underline">Sign up</Link>
          </p>

          <div className="mt-6 pt-5 border-t border-border flex items-center justify-center gap-1.5 text-[11px] text-muted-foreground">
            <Lock className="h-3 w-3" />
            <span>Secured authentication</span>
          </div>
        </div>
      </div>
    </div>
  );
};

export default Login;
