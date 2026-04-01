import { useAuth } from '@/contexts/AuthContext';
import DashboardLayout from '@/components/dashboard/DashboardLayout';
import { Button } from '@/components/ui/button';
import { Copy, Check, IndianRupee, TrendingUp } from 'lucide-react';
import { useState } from 'react';
import { formatPrice } from '@/lib/format';

const ReferEarn = () => {
  const { profile } = useAuth();
  const [copied, setCopied] = useState<'email' | 'msg' | null>(null);

  const referralMsg = `Hey! I'm learning on Backupshala — a platform where you learn from expert creators and earn by referring friends. Sign up at backupshala.com/signup?ref=${encodeURIComponent(profile?.email || '')} and start your journey! 🚀`;

  const copyToClipboard = async (text: string, type: 'email' | 'msg') => {
    await navigator.clipboard.writeText(text);
    setCopied(type);
    setTimeout(() => setCopied(null), 2000);
  };

  return (
    <DashboardLayout>
      <div className="space-y-6 max-w-2xl">
        <h1 className="font-heading text-2xl font-700">Refer & Earn</h1>

        <div className="rounded-lg border border-border bg-card p-4">
          <p className="text-xs text-muted-foreground">You were referred by</p>
          <p className="text-sm font-medium">{profile?.referrer_email}</p>
        </div>

        <div className="rounded-xl border border-border bg-card p-6 space-y-4">
          <h2 className="font-heading text-base font-600">Share Backupshala</h2>
          <p className="text-sm text-muted-foreground">When friends sign up with your email as referrer and enroll in a course, you earn the commission set by the course creator.</p>
          <div>
            <p className="text-xs text-muted-foreground mb-1">Your email</p>
            <div className="flex items-center gap-2">
              <div className="flex-1 rounded-lg border border-primary/30 bg-primary/5 px-4 py-2.5 font-mono text-sm text-primary">{profile?.email}</div>
              <Button variant="outline" size="sm" onClick={() => copyToClipboard(profile?.email || '', 'email')} className="rounded-md">
                {copied === 'email' ? <Check className="h-4 w-4 text-primary" /> : <Copy className="h-4 w-4" />}
              </Button>
            </div>
          </div>
          <div>
            <p className="text-xs text-muted-foreground mb-1">Share message</p>
            <div className="rounded-lg border border-border bg-secondary/50 p-3 text-xs text-muted-foreground">{referralMsg}</div>
            <Button variant="outline" size="sm" onClick={() => copyToClipboard(referralMsg, 'msg')} className="mt-2 rounded-md">
              {copied === 'msg' ? <><Check className="h-4 w-4 text-primary mr-1" /> Copied!</> : <><Copy className="h-4 w-4 mr-1" /> Copy Message</>}
            </Button>
          </div>
        </div>

        <div className="grid grid-cols-2 gap-4">
          <div className="rounded-lg border border-border bg-card p-4 text-center">
            <IndianRupee className="mx-auto h-5 w-5 text-primary mb-1" />
            <p className="font-heading text-xl font-700 text-primary">{formatPrice(profile?.wallet_balance || 0)}</p>
            <p className="text-xs text-muted-foreground">Wallet Balance</p>
          </div>
          <div className="rounded-lg border border-border bg-card p-4 text-center">
            <TrendingUp className="mx-auto h-5 w-5 text-accent mb-1" />
            <p className="font-heading text-xl font-700">{formatPrice(profile?.total_earned || 0)}</p>
            <p className="text-xs text-muted-foreground">Total Earned</p>
          </div>
        </div>

        <p className="text-xs text-muted-foreground text-center">Min payout: ₹500. Payout requests available in next update.</p>
      </div>
    </DashboardLayout>
  );
};

export default ReferEarn;
