import { useAuth } from '@/contexts/AuthContext';
import CreatorDashboardLayout from '@/components/dashboard/CreatorDashboardLayout';
import { supabase } from '@/integrations/supabase/client';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { useToast } from '@/hooks/use-toast';
import { useState } from 'react';
import { Loader2, ExternalLink } from 'lucide-react';

const CATEGORIES = ['Video Editing', 'Content Creation', 'Personal Branding', 'Sales & Communication', 'Freelancing', 'Business Skills', 'Digital Marketing', 'Other'];

const CreatorProfileEdit = () => {
  const { profile, refreshProfile } = useAuth();
  const { toast } = useToast();
  const [displayName, setDisplayName] = useState(profile?.creator_display_name || '');
  const [creatorSlug, setCreatorSlug] = useState(profile?.creator_slug || '');
  const [bio, setBio] = useState(profile?.bio || '');
  const [category, setCategory] = useState(profile?.creator_category || '');
  const [website, setWebsite] = useState(profile?.creator_website || '');
  const [instagram, setInstagram] = useState(profile?.creator_instagram || '');
  const [youtube, setYoutube] = useState(profile?.creator_youtube || '');
  const [saving, setSaving] = useState(false);

  const handleSave = async () => {
    if (!displayName.trim() || !creatorSlug.trim()) {
      toast({ title: 'Display name and slug are required', variant: 'destructive' });
      return;
    }
    setSaving(true);
    const { error } = await supabase.from('profiles').update({
      creator_display_name: displayName.trim(),
      creator_slug: creatorSlug.trim(),
      bio: bio.trim(),
      creator_category: category || null,
      creator_website: website.trim() || null,
      creator_instagram: instagram.trim() || null,
      creator_youtube: youtube.trim() || null,
    }).eq('id', profile!.id);
    if (error) {
      toast({ title: 'Failed', description: error.message.includes('unique') ? 'Slug already taken' : error.message, variant: 'destructive' });
    } else {
      toast({ title: 'Profile updated ✓' });
      await refreshProfile();
    }
    setSaving(false);
  };

  const profileUrl = `${window.location.origin}/c/${creatorSlug}`;

  return (
    <CreatorDashboardLayout>
      <div className="space-y-6 max-w-lg">
        <h1 className="font-heading text-2xl font-700">Creator Profile</h1>

        <div className="rounded-xl border border-border bg-card p-6 space-y-4">
          <div>
            <Label>Display Name *</Label>
            <Input value={displayName} onChange={e => setDisplayName(e.target.value)} className="mt-1 rounded-lg" />
          </div>
          <div>
            <Label>Creator Slug *</Label>
            <Input value={creatorSlug} onChange={e => setCreatorSlug(e.target.value.toLowerCase().replace(/[^a-z0-9-]/g, ''))} className="mt-1 rounded-lg font-mono text-xs" />
            <p className="mt-1 text-xs text-muted-foreground">{profileUrl}</p>
          </div>
          <div>
            <Label>Bio</Label>
            <Textarea value={bio} onChange={e => setBio(e.target.value)} placeholder="Tell students about your expertise..." className="mt-1 rounded-lg min-h-[100px]" />
          </div>
          <div>
            <Label>Category</Label>
            <Select value={category} onValueChange={setCategory}>
              <SelectTrigger className="mt-1 rounded-lg"><SelectValue placeholder="Select" /></SelectTrigger>
              <SelectContent>{CATEGORIES.map(c => <SelectItem key={c} value={c}>{c}</SelectItem>)}</SelectContent>
            </Select>
          </div>
          <div>
            <Label>Website</Label>
            <Input value={website} onChange={e => setWebsite(e.target.value)} placeholder="https://..." className="mt-1 rounded-lg" />
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <Label>Instagram</Label>
              <Input value={instagram} onChange={e => setInstagram(e.target.value)} placeholder="@handle" className="mt-1 rounded-lg" />
            </div>
            <div>
              <Label>YouTube</Label>
              <Input value={youtube} onChange={e => setYoutube(e.target.value)} placeholder="Channel URL" className="mt-1 rounded-lg" />
            </div>
          </div>

          <div className="flex gap-2">
            <Button onClick={handleSave} disabled={saving} className="rounded-md bg-primary hover:bg-primary/90">
              {saving ? <Loader2 className="h-4 w-4 animate-spin" /> : 'Save Changes'}
            </Button>
            <Button asChild variant="outline" className="rounded-md">
              <a href={profileUrl} target="_blank" rel="noreferrer"><ExternalLink className="h-4 w-4 mr-1" /> Preview</a>
            </Button>
          </div>
        </div>
      </div>
    </CreatorDashboardLayout>
  );
};

export default CreatorProfileEdit;
