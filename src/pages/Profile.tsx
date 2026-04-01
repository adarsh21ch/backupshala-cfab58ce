import { useAuth } from '@/contexts/AuthContext';
import DashboardLayout from '@/components/dashboard/DashboardLayout';
import { supabase } from '@/integrations/supabase/client';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { useToast } from '@/hooks/use-toast';
import { useState } from 'react';
import { Lock, Loader2 } from 'lucide-react';
import { Link } from 'react-router-dom';

const Profile = () => {
  const { profile, refreshProfile } = useAuth();
  const { toast } = useToast();
  const [fullName, setFullName] = useState(profile?.full_name || '');
  const [phone, setPhone] = useState(profile?.phone || '');
  const [bio, setBio] = useState(profile?.bio || '');
  const [saving, setSaving] = useState(false);
  const [newPassword, setNewPassword] = useState('');
  const [changingPw, setChangingPw] = useState(false);

  const handleSave = async () => {
    setSaving(true);
    const { error } = await supabase.from('profiles').update({ full_name: fullName.trim(), phone: phone.trim(), bio: bio.trim() }).eq('id', profile!.id);
    if (error) toast({ title: 'Failed to update', variant: 'destructive' });
    else { toast({ title: 'Profile updated ✓' }); await refreshProfile(); }
    setSaving(false);
  };

  const handlePasswordChange = async () => {
    if (newPassword.length < 8) { toast({ title: 'Min 8 characters', variant: 'destructive' }); return; }
    setChangingPw(true);
    const { error } = await supabase.auth.updateUser({ password: newPassword });
    if (error) toast({ title: 'Failed', description: error.message, variant: 'destructive' });
    else { toast({ title: 'Password updated ✓' }); setNewPassword(''); }
    setChangingPw(false);
  };

  return (
    <DashboardLayout>
      <div className="space-y-6 max-w-lg">
        <h1 className="font-heading text-2xl font-700">Profile</h1>

        <div className="rounded-xl border border-border bg-card p-6 space-y-4">
          <div>
            <Label>Full Name</Label>
            <Input value={fullName} onChange={e => setFullName(e.target.value)} className="mt-1 rounded-lg" />
          </div>
          <div>
            <Label>Phone Number</Label>
            <Input value={phone} onChange={e => setPhone(e.target.value.replace(/\D/g, ''))} maxLength={10} className="mt-1 rounded-lg" />
          </div>
          <div>
            <Label>Bio</Label>
            <Input value={bio} onChange={e => setBio(e.target.value)} placeholder="Tell us about yourself" className="mt-1 rounded-lg" />
          </div>
          <div>
            <Label className="flex items-center gap-1"><Lock className="h-3 w-3" /> Email</Label>
            <Input value={profile?.email || ''} disabled className="mt-1 rounded-lg opacity-60" />
          </div>
          <div>
            <Label className="flex items-center gap-1"><Lock className="h-3 w-3" /> Referrer's Email</Label>
            <Input value={profile?.referrer_email || ''} disabled className="mt-1 rounded-lg opacity-60" />
            <p className="mt-1 text-xs text-muted-foreground">Permanently linked at signup.</p>
          </div>
          <Button onClick={handleSave} disabled={saving} className="rounded-md bg-primary hover:bg-primary/90">
            {saving ? <Loader2 className="h-4 w-4 animate-spin" /> : 'Save Changes'}
          </Button>
        </div>

        <div className="rounded-xl border border-border bg-card p-6 space-y-4">
          <h2 className="font-heading text-base font-600">Change Password</h2>
          <div>
            <Label>New Password</Label>
            <Input type="password" value={newPassword} onChange={e => setNewPassword(e.target.value)} placeholder="Min 8 characters" className="mt-1 rounded-lg" />
          </div>
          <Button onClick={handlePasswordChange} disabled={changingPw} variant="outline" className="rounded-md">
            {changingPw ? <Loader2 className="h-4 w-4 animate-spin" /> : 'Update Password'}
          </Button>
        </div>

        <div className="rounded-xl border border-border bg-card p-6">
          <h2 className="font-heading text-base font-600 mb-2">Creator Status</h2>
          {profile?.is_creator && profile?.creator_approved ? (
            <div>
              <p className="text-sm text-primary font-medium">✓ Approved Creator</p>
              <Button asChild variant="link" className="p-0 h-auto text-sm"><Link to="/creator/dashboard">Go to Creator Dashboard →</Link></Button>
            </div>
          ) : profile?.is_creator && !profile?.creator_approved ? (
            <p className="text-sm text-accent">Your creator application is under review.</p>
          ) : (
            <div>
              <p className="text-sm text-muted-foreground">Want to share your knowledge?</p>
              <Button asChild variant="link" className="p-0 h-auto text-sm"><Link to="/creator/onboarding">Become a Creator →</Link></Button>
            </div>
          )}
        </div>

        <p className="text-xs text-muted-foreground">
          Member since {profile?.created_at ? new Date(profile.created_at).toLocaleDateString('en-IN', { day: 'numeric', month: 'long', year: 'numeric' }) : '—'}
        </p>
      </div>
    </DashboardLayout>
  );
};

export default Profile;
