import { useAuth } from '@/contexts/AuthContext';
import DashboardLayout from '@/components/dashboard/DashboardLayout';
import { supabase } from '@/integrations/supabase/client';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { useToast } from '@/hooks/use-toast';
import { useState, useRef } from 'react';
import { Lock, Loader2, Upload, Camera } from 'lucide-react';
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
  const [uploading, setUploading] = useState(false);
  const fileRef = useRef<HTMLInputElement>(null);

  const handleSave = async () => {
    setSaving(true);
    const { error } = await supabase.from('profiles').update({
      full_name: fullName.trim(),
      phone: phone.trim(),
      bio: bio.trim(),
    }).eq('id', profile!.id);
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

  const handleAvatarUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    if (file.size > 5 * 1024 * 1024) { toast({ title: 'Max 5MB', variant: 'destructive' }); return; }
    if (!['image/jpeg', 'image/png', 'image/webp'].includes(file.type)) {
      toast({ title: 'Only JPG, PNG, WebP', variant: 'destructive' }); return;
    }
    setUploading(true);
    const ext = file.name.split('.').pop();
    const path = `${profile!.id}/avatar.${ext}`;
    const { error: uploadErr } = await supabase.storage.from('avatars').upload(path, file, { upsert: true });
    if (uploadErr) { toast({ title: 'Upload failed', variant: 'destructive' }); setUploading(false); return; }
    const { data: urlData } = supabase.storage.from('avatars').getPublicUrl(path);
    await supabase.from('profiles').update({ avatar_url: urlData.publicUrl }).eq('id', profile!.id);
    await refreshProfile();
    toast({ title: 'Avatar updated ✓' });
    setUploading(false);
  };

  return (
    <DashboardLayout>
      <div className="space-y-6 max-w-lg">
        <h1 className="font-heading text-2xl font-700">Profile</h1>

        {/* Avatar */}
        <div className="flex items-center gap-4">
          <div className="relative">
            <div className="flex h-16 w-16 items-center justify-center rounded-full bg-primary/20 text-xl font-bold text-primary overflow-hidden">
              {profile?.avatar_url ? (
                <img src={profile.avatar_url} alt="" className="h-full w-full object-cover" />
              ) : (
                profile?.full_name?.[0]?.toUpperCase() || 'U'
              )}
            </div>
            <button
              onClick={() => fileRef.current?.click()}
              className="absolute -bottom-1 -right-1 flex h-6 w-6 items-center justify-center rounded-full bg-primary text-primary-foreground"
              disabled={uploading}
            >
              {uploading ? <Loader2 className="h-3 w-3 animate-spin" /> : <Camera className="h-3 w-3" />}
            </button>
            <input ref={fileRef} type="file" accept="image/jpeg,image/png,image/webp" className="hidden" onChange={handleAvatarUpload} />
          </div>
          <div>
            <p className="font-heading text-base font-600">{profile?.full_name}</p>
            <p className="text-xs text-muted-foreground">{profile?.email}</p>
          </div>
        </div>

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
            <Textarea value={bio} onChange={e => setBio(e.target.value)} placeholder="Tell us about yourself" className="mt-1 rounded-lg min-h-[80px]" />
          </div>
          <div>
            <Label className="flex items-center gap-1"><Lock className="h-3 w-3" /> Email</Label>
            <Input value={profile?.email || ''} disabled className="mt-1 rounded-lg opacity-60" />
          </div>
          <div>
            <Label className="flex items-center gap-1"><Lock className="h-3 w-3" /> Referrer's Email</Label>
            <Input value={profile?.referrer_email || ''} disabled className="mt-1 rounded-lg opacity-60" />
            <p className="mt-1 text-xs text-muted-foreground">Permanently linked at signup. Cannot be changed.</p>
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
