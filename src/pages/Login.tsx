import { useState } from 'react';
import { Link, useNavigate, useSearchParams } from 'react-router-dom';
import { supabase } from '@/integrations/supabase/client';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { useToast } from '@/hooks/use-toast';
import { Loader2 } from 'lucide-react';

const Login = () => {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [forgotMode, setForgotMode] = useState(false);
  const [resetSent, setResetSent] = useState(false);
  const { toast } = useToast();
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const redirect = searchParams.get('redirect') || '/dashboard';

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!email || !password) {
      toast({ title: 'Please fill in all fields', variant: 'destructive' });
      return;
    }
    setLoading(true);
    try {
      const { error } = await supabase.auth.signInWithPassword({ email: email.toLowerCase().trim(), password });
      if (error) throw error;
      navigate(redirect);
    } catch (error: any) {
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
        redirectTo: `${window.location.origin}/login`,
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
    <div className="flex min-h-screen items-center justify-center bg-background px-4">
      <div className="w-full max-w-md">
        <div className="mb-8 text-center">
          <Link to="/" className="inline-flex items-center">
            <span className="font-heading text-2xl font-800"><span className="text-primary">Backup</span><span className="text-accent">shala</span></span>
          </Link>
          <h1 className="mt-4 font-heading text-2xl font-700">
            {forgotMode ? 'Reset Password' : 'Welcome back'}
          </h1>
          <p className="mt-1 text-sm text-muted-foreground">
            {forgotMode ? 'Enter your email to receive a reset link' : 'Log in to continue'}
          </p>
        </div>

        {forgotMode ? (
          <form onSubmit={handleForgotPassword} className="space-y-4 rounded-xl border border-border bg-card p-6 shadow-sm">
            <div>
              <Label htmlFor="email">Email Address</Label>
              <Input id="email" type="email" placeholder="you@example.com" value={email} onChange={e => setEmail(e.target.value)} className="mt-1 rounded-lg" />
            </div>
            {resetSent ? (
              <p className="text-sm text-primary text-center">✓ Check your email for the reset link.</p>
            ) : (
              <Button type="submit" disabled={loading} className="w-full bg-primary hover:bg-primary/90 rounded-md font-semibold">
                {loading ? <Loader2 className="h-4 w-4 animate-spin" /> : 'Send Reset Link'}
              </Button>
            )}
            <button type="button" onClick={() => { setForgotMode(false); setResetSent(false); }} className="w-full text-center text-sm text-primary hover:underline">
              ← Back to Login
            </button>
          </form>
        ) : (
          <form onSubmit={handleSubmit} className="space-y-4 rounded-xl border border-border bg-card p-6 shadow-sm">
            <div>
              <Label htmlFor="email">Email Address</Label>
              <Input id="email" type="email" placeholder="you@example.com" value={email} onChange={e => setEmail(e.target.value)} className="mt-1 rounded-lg" />
            </div>
            <div>
              <div className="flex items-center justify-between">
                <Label htmlFor="password">Password</Label>
                <button type="button" onClick={() => setForgotMode(true)} className="text-xs text-primary hover:underline">Forgot password?</button>
              </div>
              <Input id="password" type="password" placeholder="Your password" value={password} onChange={e => setPassword(e.target.value)} className="mt-1 rounded-lg" />
            </div>
            <Button type="submit" disabled={loading} className="w-full bg-primary hover:bg-primary/90 rounded-md font-semibold">
              {loading ? <Loader2 className="h-4 w-4 animate-spin" /> : 'Log In'}
            </Button>
          </form>
        )}

        <p className="mt-4 text-center text-sm text-muted-foreground">
          Don't have an account?{' '}
          <Link to="/signup" className="font-medium text-primary hover:underline">Sign Up</Link>
        </p>
      </div>
    </div>
  );
};

export default Login;
