import { useState, useEffect } from 'react';
import { Link, useNavigate, useSearchParams } from 'react-router-dom';
import { supabase } from '@/integrations/supabase/client';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { useToast } from '@/hooks/use-toast';
import { Eye, EyeOff, Loader2, UserCheck } from 'lucide-react';
import { getStoredRef, lookupReferrer } from '@/lib/referralTracking';

const Signup = () => {
  const [searchParams] = useSearchParams();
  const refParam = searchParams.get('ref') || '';
  const courseParam = searchParams.get('course') || '';
  const creatorParam = searchParams.get('creator') || '';

  const [form, setForm] = useState({ fullName: '', email: '', phone: '', password: '', confirmPassword: '', referrerEmail: refParam });
  const [referrerInfo, setReferrerInfo] = useState<{ name: string; username: string } | null>(null);
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const [errors, setErrors] = useState<Record<string, string>>({});
  const { toast } = useToast();
  const navigate = useNavigate();

  // Resolve ?ref=username (URL or localStorage) to a referrer profile, then prefill referrer_email
  useEffect(() => {
    (async () => {
      const refUsername = refParam || getStoredRef();
      if (!refUsername) return;
      const r = await lookupReferrer(refUsername);
      if (r) {
        setReferrerInfo({ name: r.full_name, username: r.username });
        // Look up the referrer's email so the legacy referrer_email field stays in sync
        const { data: refProfile } = await supabase
          .from('profiles').select('email').eq('id', r.id).maybeSingle();
        if (refProfile?.email) setForm(f => ({ ...f, referrerEmail: refProfile.email }));
      }
    })();
  }, [refParam]);


  const validate = () => {
    const e: Record<string, string> = {};
    if (!form.fullName.trim()) e.fullName = 'Full name is required';
    if (!form.email.trim()) e.email = 'Email is required';
    else if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(form.email)) e.email = 'Invalid email format';
    if (!form.phone.trim()) e.phone = 'Phone number is required';
    else if (!/^[6-9]\d{9}$/.test(form.phone)) e.phone = 'Enter a valid 10-digit Indian phone number';
    if (!form.password) e.password = 'Password is required';
    else if (form.password.length < 8) e.password = 'Password must be at least 8 characters';
    if (form.password !== form.confirmPassword) e.confirmPassword = 'Passwords do not match';
    if (form.referrerEmail.trim() && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(form.referrerEmail)) e.referrerEmail = 'Invalid email format';
    if (form.referrerEmail.trim() && form.referrerEmail.toLowerCase() === form.email.toLowerCase()) e.referrerEmail = 'You cannot refer yourself';
    setErrors(e);
    return Object.keys(e).length === 0;
  };

  const getPasswordStrength = () => {
    const p = form.password;
    if (!p) return { label: '', color: '', width: '0%' };
    let score = 0;
    if (p.length >= 8) score++;
    if (/[A-Z]/.test(p)) score++;
    if (/[0-9]/.test(p)) score++;
    if (/[^A-Za-z0-9]/.test(p)) score++;
    if (score <= 1) return { label: 'Weak', color: 'bg-destructive', width: '25%' };
    if (score === 2) return { label: 'Fair', color: 'bg-accent', width: '50%' };
    if (score === 3) return { label: 'Good', color: 'bg-primary/70', width: '75%' };
    return { label: 'Strong', color: 'bg-primary', width: '100%' };
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!validate()) return;
    setLoading(true);
    try {
      const { error } = await supabase.auth.signUp({
        email: form.email.toLowerCase().trim(),
        password: form.password,
        options: {
          data: {
            full_name: form.fullName.trim(),
            phone: form.phone.trim(),
            referrer_email: form.referrerEmail.trim() ? form.referrerEmail.toLowerCase().trim() : 'none@backupshala.com',
          },
          emailRedirectTo: window.location.origin,
        },
      });
      if (error) throw error;
      toast({ title: 'Account created! 🎉', description: 'Please verify your email to get started.' });
      navigate(`/verify-email?email=${encodeURIComponent(form.email.toLowerCase().trim())}`);
    } catch (error: any) {
      toast({ title: 'Signup failed', description: error.message, variant: 'destructive' });
    } finally {
      setLoading(false);
    }
  };

  const strength = getPasswordStrength();

  return (
    <div
      className="relative flex min-h-screen items-center justify-center px-4 py-10
                 bg-hero-gradient
                 dark:bg-[radial-gradient(ellipse_at_50%_40%,#1A1208_0%,#0D0F12_60%)]"
    >
      <div className="w-full max-w-[440px]">
        <div className="rounded-[20px] border border-border bg-card p-8 shadow-[0_8px_40px_rgba(0,0,0,0.10)] dark:shadow-[0_8px_40px_rgba(0,0,0,0.5)]">
          <div className="text-center mb-6">
            <Link to="/" className="inline-flex items-center">
              <span className="font-heading text-[28px] font-bold tracking-tight">
                <span className="text-foreground">Backup</span><span className="text-accent">shala</span>
              </span>
            </Link>
            <p className="mt-1.5 text-[13px] text-muted-foreground">The school for your backup plan</p>
          </div>

          <div className="text-center mb-6">
            <h1 className="font-heading text-[26px] font-bold">Create your account</h1>
            <p className="mt-1 text-sm text-muted-foreground">Join Backupshala — start learning today</p>
          </div>

          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <Label htmlFor="fullName">Full name</Label>
              <Input id="fullName" placeholder="Your full name" value={form.fullName} onChange={e => setForm(f => ({ ...f, fullName: e.target.value }))} className="mt-1.5 h-11 rounded-[10px]" />
              {errors.fullName && <p className="mt-1 text-xs text-destructive">{errors.fullName}</p>}
            </div>
            <div>
              <Label htmlFor="email">Email address</Label>
              <Input id="email" type="email" placeholder="you@example.com" value={form.email} onChange={e => setForm(f => ({ ...f, email: e.target.value }))} className="mt-1.5 h-11 rounded-[10px]" />
              {errors.email && <p className="mt-1 text-xs text-destructive">{errors.email}</p>}
            </div>
            <div>
              <Label htmlFor="phone">Phone number</Label>
              <Input id="phone" placeholder="9876543210" maxLength={10} value={form.phone} onChange={e => setForm(f => ({ ...f, phone: e.target.value.replace(/\D/g, '') }))} className="mt-1.5 h-11 rounded-[10px]" />
              {errors.phone && <p className="mt-1 text-xs text-destructive">{errors.phone}</p>}
            </div>
            <div>
              <Label htmlFor="password">Password</Label>
              <div className="relative mt-1.5">
                <Input id="password" type={showPassword ? 'text' : 'password'} placeholder="Min 8 characters" value={form.password} onChange={e => setForm(f => ({ ...f, password: e.target.value }))} className="h-11 rounded-[10px] pr-10" />
                <button type="button" onClick={() => setShowPassword(!showPassword)} className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground" aria-label={showPassword ? 'Hide password' : 'Show password'}>
                  {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                </button>
              </div>
              {form.password && (
                <div className="mt-2">
                  <div className="h-1.5 w-full rounded-full bg-muted">
                    <div className={`h-full rounded-full transition-all ${strength.color}`} style={{ width: strength.width }} />
                  </div>
                  <p className="mt-1 text-xs text-muted-foreground">{strength.label}</p>
                </div>
              )}
              {errors.password && <p className="mt-1 text-xs text-destructive">{errors.password}</p>}
            </div>
            <div>
              <Label htmlFor="confirmPassword">Confirm password</Label>
              <Input id="confirmPassword" type="password" placeholder="Re-enter password" value={form.confirmPassword} onChange={e => setForm(f => ({ ...f, confirmPassword: e.target.value }))} className="mt-1.5 h-11 rounded-[10px]" />
              {errors.confirmPassword && <p className="mt-1 text-xs text-destructive">{errors.confirmPassword}</p>}
            </div>
            {referrerInfo ? (
              <div className="rounded-[10px] border border-primary/30 bg-primary/5 p-3 flex items-center gap-2">
                <UserCheck className="h-4 w-4 text-primary shrink-0" />
                <p className="text-xs">
                  Referred by <span className="font-semibold text-primary">@{referrerInfo.username}</span>
                  {referrerInfo.name ? ` · ${referrerInfo.name}` : ''}
                </p>
              </div>
            ) : (
              <div>
                <Label htmlFor="referrerEmail">Referred by (optional)</Label>
                <Input
                  id="referrerEmail" type="email" placeholder="friend@example.com"
                  value={form.referrerEmail}
                  onChange={e => setForm(f => ({ ...f, referrerEmail: e.target.value }))}
                  readOnly={!!refParam}
                  className={`mt-1.5 h-11 rounded-[10px] ${refParam ? 'opacity-60' : ''}`}
                />
                {errors.referrerEmail && <p className="mt-1 text-xs text-destructive">{errors.referrerEmail}</p>}
              </div>
            )}
            <Button type="submit" disabled={loading} className="w-full h-11 bg-accent hover:bg-accent/90 text-accent-foreground rounded-[10px] font-semibold shadow-accent-glow hover:shadow-accent-glow-hover transition-shadow">
              {loading ? <Loader2 className="h-4 w-4 animate-spin" /> : 'Create account'}
            </Button>
            <p className="text-[11px] text-muted-foreground text-center pt-1">
              By signing up you agree to our{' '}
              <Link to="/terms" className="text-accent hover:underline">Terms</Link> and{' '}
              <Link to="/privacy-policy" className="text-accent hover:underline">Privacy Policy</Link>.
            </p>
          </form>

          <p className="mt-5 text-center text-sm text-muted-foreground">
            Already have an account?{' '}
            <Link to="/login" className="font-semibold text-accent hover:underline">Log in</Link>
          </p>
        </div>
      </div>
    </div>
  );
};

export default Signup;
