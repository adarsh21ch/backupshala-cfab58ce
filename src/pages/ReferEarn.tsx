import { useAuth } from '@/contexts/AuthContext';
import DashboardLayout from '@/components/dashboard/DashboardLayout';
import { Button } from '@/components/ui/button';
import { Copy, Check, Users, IndianRupee, TrendingUp } from 'lucide-react';
import { useState } from 'react';

const ReferEarn = () => {
  const { profile } = useAuth();
  const [copied, setCopied] = useState<'email' | 'msg' | null>(null);

  const referralMsg = `Hey! I just enrolled in Backupshala — a digital skills platform where you learn video editing, content creation, personal branding and more for just ₹249. You also get a certificate! When you sign up at backupshala.com — enter my email ${profile?.email} as your referrer. Let's learn together 🚀`;

  const copyToClipboard = async (text: string, type: 'email' | 'msg') => {
    await navigator.clipboard.writeText(text);
    setCopied(type);
    setTimeout(() => setCopied(null), 2000);
  };

  return (
    <DashboardLayout>
      <div className="space-y-6 max-w-2xl">
        <h1 className="font-heading text-2xl font-700">Refer & Earn</h1>

        {/* Referrer info */}
        <div className="rounded-xl border border-border bg-card p-4">
          <p className="text-xs text-muted-foreground">You were referred by</p>
          <p className="text-sm font-medium">{profile?.referrer_email}</p>
        </div>

        {/* Share section */}
        <div className="rounded-2xl border border-border bg-card p-6 space-y-4">
          <h2 className="font-heading text-base font-600">Share Backupshala with friends</h2>
          <p className="text-sm text-muted-foreground">When they sign up, they enter YOUR email address. That's all it takes — you earn ₹75 per enrollment.</p>

          <div>
            <p className="text-xs text-muted-foreground mb-1">Your email (share this)</p>
            <div className="flex items-center gap-2">
              <div className="flex-1 rounded-lg border border-primary/30 bg-primary/5 px-4 py-2.5 font-mono text-sm text-primary">
                {profile?.email}
              </div>
              <Button variant="outline" size="sm" onClick={() => copyToClipboard(profile?.email || '', 'email')} className="rounded-pill">
                {copied === 'email' ? <Check className="h-4 w-4 text-primary" /> : <Copy className="h-4 w-4" />}
              </Button>
            </div>
          </div>

          <div>
            <p className="text-xs text-muted-foreground mb-1">Pre-written message</p>
            <div className="rounded-lg border border-border bg-secondary/50 p-3 text-xs text-muted-foreground">{referralMsg}</div>
            <Button variant="outline" size="sm" onClick={() => copyToClipboard(referralMsg, 'msg')} className="mt-2 rounded-pill">
              {copied === 'msg' ? <><Check className="h-4 w-4 text-primary mr-1" /> Copied!</> : <><Copy className="h-4 w-4 mr-1" /> Copy Message</>}
            </Button>
          </div>
        </div>

        {/* Stats */}
        <div className="grid grid-cols-2 gap-4">
          <div className="rounded-xl border border-border bg-card p-4 text-center">
            <IndianRupee className="mx-auto h-5 w-5 text-primary mb-1" />
            <p className="font-heading text-xl font-700 text-primary">₹{profile?.wallet_balance || 0}</p>
            <p className="text-xs text-muted-foreground">Wallet Balance</p>
          </div>
          <div className="rounded-xl border border-border bg-card p-4 text-center">
            <TrendingUp className="mx-auto h-5 w-5 text-accent mb-1" />
            <p className="font-heading text-xl font-700">₹75</p>
            <p className="text-xs text-muted-foreground">Per Referral</p>
          </div>
        </div>

        <p className="text-xs text-muted-foreground text-center">
          Minimum payout: ₹500. Payout requests will be available in the next update.
        </p>
      </div>
    </DashboardLayout>
  );
};

export default ReferEarn;
