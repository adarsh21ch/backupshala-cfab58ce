import { useState } from 'react';
import { Link, useNavigate, useSearchParams } from 'react-router-dom';
import { supabase } from '@/integrations/supabase/client';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { useToast } from '@/hooks/use-toast';
import { Eye, EyeOff, Loader2 } from 'lucide-react';

const Signup = () => {
  const [searchParams] = useSearchParams();
  const refParam = searchParams.get('ref') || '';
  const courseParam = searchParams.get('course') || '';
  const creatorParam = searchParams.get('creator') || '';

  const [form, setForm] = useState({ fullName: '', email: '', phone: '', password: '', confirmPassword: '', referrerEmail: refParam });
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const [errors, setErrors] = useState<Record<string, string>>({});
  const { toast } = useToast();
  const navigate = useNavigate();

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
      toast({ title: 'Account created! 🎉', description: 'Welcome to Backupshala.' });
      if (courseParam && creatorParam) {
        navigate(`/c/${creatorParam}/${courseParam}`);
      } else {
        navigate('/explore');
      }
    } catch (error: any) {
      toast({ title: 'Signup failed', description: error.message, variant: 'destructive' });
    } finally {
      setLoading(false);
    }
  };

  const strength = getPasswordStrength();

  return (
    <div className="flex min-h-screen items-center justify-center bg-background px-4 py-8">
      <div className="w-full max-w-md">
        <div className="mb-8 text-center">
          <Link to="/" className="inline-flex items-center">
            <span className="font-heading text-2xl font-800"><span className="text-primary">Backup</span><span className="text-accent">shala</span></span>
          </Link>
          <h1 className="mt-4 font-heading text-2xl font-700">Create your account</h1>
          <p className="mt-1 text-sm text-muted-foreground">Join Backupshala — a digital skills learning platform</p>
        </div>

        <form onSubmit={handleSubmit} className="space-y-4 rounded-xl border border-border bg-card p-6 shadow-sm">
          <div>
            <Label htmlFor="fullName">Full Name</Label>
            <Input id="fullName" placeholder="Your full name" value={form.fullName} onChange={e => setForm(f => ({ ...f, fullName: e.target.value }))} className="mt-1 rounded-lg" />
            {errors.fullName && <p className="mt-1 text-xs text-destructive">{errors.fullName}</p>}
          </div>
          <div>
            <Label htmlFor="email">Email Address</Label>
            <Input id="email" type="email" placeholder="you@example.com" value={form.email} onChange={e => setForm(f => ({ ...f, email: e.target.value }))} className="mt-1 rounded-lg" />
            {errors.email && <p className="mt-1 text-xs text-destructive">{errors.email}</p>}
          </div>
          <div>
            <Label htmlFor="phone">Phone Number</Label>
            <Input id="phone" placeholder="9876543210" maxLength={10} value={form.phone} onChange={e => setForm(f => ({ ...f, phone: e.target.value.replace(/\D/g, '') }))} className="mt-1 rounded-lg" />
            {errors.phone && <p className="mt-1 text-xs text-destructive">{errors.phone}</p>}
          </div>
          <div>
            <Label htmlFor="password">Password</Label>
            <div className="relative mt-1">
              <Input id="password" type={showPassword ? 'text' : 'password'} placeholder="Min 8 characters" value={form.password} onChange={e => setForm(f => ({ ...f, password: e.target.value }))} className="rounded-lg pr-10" />
              <button type="button" onClick={() => setShowPassword(!showPassword)} className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground">
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
            <Label htmlFor="confirmPassword">Confirm Password</Label>
            <Input id="confirmPassword" type="password" placeholder="Re-enter password" value={form.confirmPassword} onChange={e => setForm(f => ({ ...f, confirmPassword: e.target.value }))} className="mt-1 rounded-lg" />
            {errors.confirmPassword && <p className="mt-1 text-xs text-destructive">{errors.confirmPassword}</p>}
          </div>
          <div>
            <Label htmlFor="referrerEmail">Referral code or referrer email (optional)</Label>
            <Input
              id="referrerEmail" type="email" placeholder="friend@example.com"
              value={form.referrerEmail}
              onChange={e => setForm(f => ({ ...f, referrerEmail: e.target.value }))}
              readOnly={!!refParam}
              className={`mt-1 rounded-lg ${refParam ? 'opacity-60' : ''}`}
            />
            <p className="mt-1 text-xs text-muted-foreground">
              If someone referred you, enter their email here. Otherwise leave blank.
            </p>
            {errors.referrerEmail && <p className="mt-1 text-xs text-destructive">{errors.referrerEmail}</p>}
          </div>
          <p className="text-[10px] text-muted-foreground text-center mt-3">
            By creating an account, you agree to our{' '}
            <Link to="/terms" className="text-primary hover:underline">Terms of Service</Link>,{' '}
            <Link to="/privacy-policy" className="text-primary hover:underline">Privacy Policy</Link>, and{' '}
            <Link to="/community-guidelines" className="text-primary hover:underline">Community Guidelines</Link>.
          </p>
          <Button type="submit" disabled={loading} className="w-full bg-accent hover:bg-accent/90 text-accent-foreground rounded-md font-semibold">
            {loading ? <Loader2 className="h-4 w-4 animate-spin" /> : 'Create Account'}
          </Button>
        </form>

        <p className="mt-4 text-center text-sm text-muted-foreground">
          Already have an account?{' '}
          <Link to="/login" className="font-medium text-primary hover:underline">Login</Link>
        </p>
      </div>
    </div>
  );
};

export default Signup;
