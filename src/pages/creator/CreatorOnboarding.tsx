import { useAuth } from '@/contexts/AuthContext';
import { supabase } from '@/integrations/supabase/client';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { useToast } from '@/hooks/use-toast';
import { useState, useEffect } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { Loader2, ChevronRight, ChevronLeft, Check } from 'lucide-react';
import { formatPrice } from '@/lib/format';

const CATEGORIES = ['Video Editing', 'Content Creation', 'Personal Branding', 'Sales & Communication', 'Freelancing', 'Business Skills', 'Digital Marketing', 'Other'];
const LEVELS = ['Beginner', 'Intermediate', 'Advanced'];
const LANGUAGES = ['English', 'Hindi', 'Hinglish'];

const CreatorOnboarding = () => {
  const { user, profile, refreshProfile } = useAuth();
  const { toast } = useToast();
  const navigate = useNavigate();
  const [step, setStep] = useState(1);
  const [submitting, setSubmitting] = useState(false);

  // Step 1 — About You
  const [displayName, setDisplayName] = useState('');
  const [category, setCategory] = useState('');
  const [bio, setBio] = useState('');
  const [website, setWebsite] = useState('');
  const [instagram, setInstagram] = useState('');
  const [youtube, setYoutube] = useState('');

  // Step 2 — Course Info
  const [courseTitle, setCourseTitle] = useState('');
  const [courseDesc, setCourseDesc] = useState('');
  const [courseCategory, setCourseCategory] = useState('');
  const [courseLanguage, setCourseLanguage] = useState('English');
  const [courseLevel, setCourseLevel] = useState('Beginner');
  const [whatYouLearn, setWhatYouLearn] = useState<string[]>(['']);
  const [requirements, setRequirements] = useState<string[]>(['']);

  // Step 3 — Pricing
  const [price, setPrice] = useState('249');
  const [commissionPercent, setCommissionPercent] = useState(30);

  // Load from localStorage
  useEffect(() => {
    const saved = localStorage.getItem('creator-onboarding');
    if (saved) {
      try {
        const d = JSON.parse(saved);
        if (d.displayName) setDisplayName(d.displayName);
        if (d.category) setCategory(d.category);
        if (d.bio) setBio(d.bio);
        if (d.website) setWebsite(d.website);
        if (d.instagram) setInstagram(d.instagram);
        if (d.youtube) setYoutube(d.youtube);
        if (d.courseTitle) setCourseTitle(d.courseTitle);
        if (d.courseDesc) setCourseDesc(d.courseDesc);
        if (d.courseCategory) setCourseCategory(d.courseCategory);
        if (d.courseLanguage) setCourseLanguage(d.courseLanguage);
        if (d.courseLevel) setCourseLevel(d.courseLevel);
        if (d.whatYouLearn) setWhatYouLearn(d.whatYouLearn);
        if (d.requirements) setRequirements(d.requirements);
        if (d.price) setPrice(d.price);
        if (d.commissionPercent) setCommissionPercent(d.commissionPercent);
        if (d.step) setStep(d.step);
      } catch {}
    }
  }, []);

  // Save to localStorage on change
  useEffect(() => {
    localStorage.setItem('creator-onboarding', JSON.stringify({
      displayName, category, bio, website, instagram, youtube,
      courseTitle, courseDesc, courseCategory, courseLanguage, courseLevel,
      whatYouLearn, requirements, price, commissionPercent, step,
    }));
  }, [displayName, category, bio, website, instagram, youtube, courseTitle, courseDesc, courseCategory, courseLanguage, courseLevel, whatYouLearn, requirements, price, commissionPercent, step]);

  const priceNum = Number(price) || 0;
  const platformFee = Math.round(priceNum * 0.15);
  const commissionAmt = Math.round(priceNum * (commissionPercent / 100));
  const creatorReceives = priceNum - platformFee - commissionAmt;

  const generateSlug = (title: string) => title.toLowerCase().replace(/[^a-z0-9\s-]/g, '').replace(/\s+/g, '-').replace(/-+/g, '-').trim();

  const handleSubmit = async () => {
    setSubmitting(true);
    try {
      const creatorSlug = generateSlug(displayName || profile?.full_name || 'creator');
      const courseSlug = generateSlug(courseTitle);

      // Update profile to creator
      const { error: profileErr } = await supabase.from('profiles').update({
        is_creator: true,
        creator_approved: false,
        creator_display_name: displayName.trim(),
        creator_category: category,
        creator_slug: creatorSlug,
        bio: bio.trim(),
        creator_website: website.trim() || null,
        creator_instagram: instagram.trim() || null,
        creator_youtube: youtube.trim() || null,
      }).eq('id', user!.id);
      if (profileErr) throw profileErr;

      // Create course
      const { error: courseErr } = await supabase.from('courses').insert({
        creator_id: user!.id,
        title: courseTitle.trim(),
        slug: courseSlug,
        short_description: courseDesc.trim(),
        category: courseCategory,
        language: courseLanguage,
        level: courseLevel,
        price: priceNum,
        commission_percent: commissionPercent,
        what_you_learn: whatYouLearn.filter(w => w.trim()),
        requirements: requirements.filter(r => r.trim()),
        status: 'pending_review',
      });
      if (courseErr) throw courseErr;

      localStorage.removeItem('creator-onboarding');
      await refreshProfile();
      toast({ title: 'Application submitted! 🎉', description: 'We will review within 24-48 hours.' });
      navigate('/dashboard');
    } catch (err: any) {
      toast({ title: 'Failed', description: err.message, variant: 'destructive' });
    } finally {
      setSubmitting(false);
    }
  };

  // If already a creator
  if (profile?.is_creator && profile?.creator_approved) {
    return (
      <div className="dark min-h-screen bg-background text-foreground flex items-center justify-center p-4">
        <div className="max-w-md text-center">
          <Check className="mx-auto h-16 w-16 text-primary mb-4" />
          <h1 className="font-heading text-2xl font-700">You're already a creator!</h1>
          <Button asChild className="mt-6 rounded-md"><Link to="/creator/dashboard">Go to Creator Dashboard</Link></Button>
        </div>
      </div>
    );
  }

  if (profile?.is_creator && !profile?.creator_approved) {
    return (
      <div className="dark min-h-screen bg-background text-foreground flex items-center justify-center p-4">
        <div className="max-w-md text-center">
          <div className="mx-auto h-16 w-16 rounded-full bg-accent/10 flex items-center justify-center mb-4">
            <Loader2 className="h-8 w-8 text-accent animate-spin" />
          </div>
          <h1 className="font-heading text-2xl font-700">Application Under Review</h1>
          <p className="mt-2 text-sm text-muted-foreground">We'll notify you within 24-48 hours.</p>
          <Button asChild variant="outline" className="mt-6 rounded-md"><Link to="/dashboard">Back to Dashboard</Link></Button>
        </div>
      </div>
    );
  }

  return (
    <div className="dark min-h-screen bg-background text-foreground">
      <div className="container mx-auto max-w-2xl px-4 py-8">
        {/* Header */}
        <div className="mb-8 text-center">
          <Link to="/" className="inline-flex items-center gap-1">
            <span className="font-heading text-2xl font-800"><span className="text-primary">Backup</span><span className="text-accent">shala</span></span>
          </Link>
          <h1 className="mt-4 font-heading text-2xl font-700">Become a Creator</h1>
          <p className="mt-1 text-sm text-muted-foreground">Share your expertise, earn from every enrollment</p>
        </div>

        {/* Step indicator */}
        <div className="flex items-center justify-center gap-2 mb-8">
          {[1, 2, 3, 4].map(s => (
            <div key={s} className="flex items-center gap-2">
              <div className={`flex h-8 w-8 items-center justify-center rounded-full text-xs font-semibold ${step >= s ? 'bg-primary text-primary-foreground' : 'bg-secondary text-muted-foreground'}`}>
                {step > s ? '✓' : s}
              </div>
              {s < 4 && <div className={`h-0.5 w-8 ${step > s ? 'bg-primary' : 'bg-border'}`} />}
            </div>
          ))}
        </div>

        <div className="rounded-xl border border-border bg-card p-6">
          {/* Step 1 */}
          {step === 1 && (
            <div className="space-y-4">
              <h2 className="font-heading text-lg font-600">About You</h2>
              <div>
                <Label>Creator Display Name *</Label>
                <Input value={displayName} onChange={e => setDisplayName(e.target.value)} placeholder="Your brand/display name" className="mt-1 rounded-lg" />
              </div>
              <div>
                <Label>Category *</Label>
                <Select value={category} onValueChange={setCategory}>
                  <SelectTrigger className="mt-1 rounded-lg"><SelectValue placeholder="Select category" /></SelectTrigger>
                  <SelectContent>{CATEGORIES.map(c => <SelectItem key={c} value={c}>{c}</SelectItem>)}</SelectContent>
                </Select>
              </div>
              <div>
                <Label>Bio * (min 100 characters)</Label>
                <Textarea value={bio} onChange={e => setBio(e.target.value)} placeholder="Tell students about your expertise..." className="mt-1 rounded-lg min-h-[100px]" />
                <p className="mt-1 text-xs text-muted-foreground">{bio.length}/100 characters</p>
              </div>
              <div>
                <Label>Website (optional)</Label>
                <Input value={website} onChange={e => setWebsite(e.target.value)} placeholder="https://yoursite.com" className="mt-1 rounded-lg" />
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <Label>Instagram (optional)</Label>
                  <Input value={instagram} onChange={e => setInstagram(e.target.value)} placeholder="@handle" className="mt-1 rounded-lg" />
                </div>
                <div>
                  <Label>YouTube (optional)</Label>
                  <Input value={youtube} onChange={e => setYoutube(e.target.value)} placeholder="Channel URL" className="mt-1 rounded-lg" />
                </div>
              </div>
              <div className="flex justify-end">
                <Button onClick={() => {
                  if (!displayName.trim() || !category || bio.length < 100) { toast({ title: 'Fill all required fields (bio min 100 chars)', variant: 'destructive' }); return; }
                  setStep(2);
                }} className="rounded-md">Next <ChevronRight className="h-4 w-4 ml-1" /></Button>
              </div>
            </div>
          )}

          {/* Step 2 */}
          {step === 2 && (
            <div className="space-y-4">
              <h2 className="font-heading text-lg font-600">Your First Course</h2>
              <div>
                <Label>Course Title *</Label>
                <Input value={courseTitle} onChange={e => setCourseTitle(e.target.value)} placeholder="e.g. Video Editing for Beginners" className="mt-1 rounded-lg" />
              </div>
              <div>
                <Label>Short Description * (max 150 chars)</Label>
                <Textarea value={courseDesc} onChange={e => setCourseDesc(e.target.value.slice(0, 150))} placeholder="One-liner about your course" className="mt-1 rounded-lg" />
                <p className="mt-1 text-xs text-muted-foreground">{courseDesc.length}/150</p>
              </div>
              <div className="grid grid-cols-3 gap-3">
                <div>
                  <Label>Category *</Label>
                  <Select value={courseCategory} onValueChange={setCourseCategory}>
                    <SelectTrigger className="mt-1 rounded-lg"><SelectValue placeholder="Select" /></SelectTrigger>
                    <SelectContent>{CATEGORIES.map(c => <SelectItem key={c} value={c}>{c}</SelectItem>)}</SelectContent>
                  </Select>
                </div>
                <div>
                  <Label>Language</Label>
                  <Select value={courseLanguage} onValueChange={setCourseLanguage}>
                    <SelectTrigger className="mt-1 rounded-lg"><SelectValue /></SelectTrigger>
                    <SelectContent>{LANGUAGES.map(l => <SelectItem key={l} value={l}>{l}</SelectItem>)}</SelectContent>
                  </Select>
                </div>
                <div>
                  <Label>Level</Label>
                  <Select value={courseLevel} onValueChange={setCourseLevel}>
                    <SelectTrigger className="mt-1 rounded-lg"><SelectValue /></SelectTrigger>
                    <SelectContent>{LEVELS.map(l => <SelectItem key={l} value={l}>{l}</SelectItem>)}</SelectContent>
                  </Select>
                </div>
              </div>
              <div>
                <Label>What Students Will Learn</Label>
                {whatYouLearn.map((item, i) => (
                  <div key={i} className="flex gap-2 mt-1">
                    <Input value={item} onChange={e => { const arr = [...whatYouLearn]; arr[i] = e.target.value; setWhatYouLearn(arr); }} placeholder={`Point ${i + 1}`} className="rounded-lg" />
                    {whatYouLearn.length > 1 && <Button variant="ghost" size="sm" onClick={() => setWhatYouLearn(whatYouLearn.filter((_, j) => j !== i))}>×</Button>}
                  </div>
                ))}
                {whatYouLearn.length < 8 && <Button variant="ghost" size="sm" onClick={() => setWhatYouLearn([...whatYouLearn, ''])} className="mt-1 text-xs">+ Add point</Button>}
              </div>
              <div>
                <Label>Requirements</Label>
                {requirements.map((item, i) => (
                  <div key={i} className="flex gap-2 mt-1">
                    <Input value={item} onChange={e => { const arr = [...requirements]; arr[i] = e.target.value; setRequirements(arr); }} placeholder={`Requirement ${i + 1}`} className="rounded-lg" />
                    {requirements.length > 1 && <Button variant="ghost" size="sm" onClick={() => setRequirements(requirements.filter((_, j) => j !== i))}>×</Button>}
                  </div>
                ))}
                {requirements.length < 5 && <Button variant="ghost" size="sm" onClick={() => setRequirements([...requirements, ''])} className="mt-1 text-xs">+ Add requirement</Button>}
              </div>
              <div className="flex justify-between">
                <Button variant="outline" onClick={() => setStep(1)} className="rounded-md"><ChevronLeft className="h-4 w-4 mr-1" /> Back</Button>
                <Button onClick={() => {
                  if (!courseTitle.trim() || !courseDesc.trim() || !courseCategory) { toast({ title: 'Fill all required fields', variant: 'destructive' }); return; }
                  setStep(3);
                }} className="rounded-md">Next <ChevronRight className="h-4 w-4 ml-1" /></Button>
              </div>
            </div>
          )}

          {/* Step 3 */}
          {step === 3 && (
            <div className="space-y-4">
              <h2 className="font-heading text-lg font-600">Pricing & Commission</h2>
              <div>
                <Label>Course Price (₹) *</Label>
                <Input type="number" value={price} onChange={e => setPrice(e.target.value)} min={99} max={9999} className="mt-1 rounded-lg" />
                <p className="mt-1 text-xs text-muted-foreground">Min ₹99, Max ₹9,999</p>
              </div>
              <div>
                <Label>Referral Commission: {commissionPercent}%</Label>
                <input type="range" min={10} max={50} value={commissionPercent} onChange={e => setCommissionPercent(Number(e.target.value))}
                  className="mt-2 w-full accent-primary" />
                <div className="flex justify-between text-xs text-muted-foreground">
                  <span>10%</span><span>50%</span>
                </div>
                <p className="mt-1 text-xs text-muted-foreground">Higher commission = more referrals = more students</p>
              </div>
              {priceNum >= 99 && (
                <div className="rounded-lg border border-border bg-secondary/30 p-4 space-y-2">
                  <h3 className="text-sm font-medium">Price Breakdown</h3>
                  <div className="flex justify-between text-sm"><span className="text-muted-foreground">Student pays</span><span className="font-semibold">{formatPrice(priceNum)}</span></div>
                  <div className="flex justify-between text-sm"><span className="text-muted-foreground">Platform fee (15%)</span><span className="text-destructive">-{formatPrice(platformFee)}</span></div>
                  <div className="flex justify-between text-sm"><span className="text-muted-foreground">Referrer commission ({commissionPercent}%)</span><span className="text-destructive">-{formatPrice(commissionAmt)}</span></div>
                  <div className="border-t border-border pt-2 flex justify-between text-sm"><span className="font-medium">You receive</span><span className="font-bold text-primary">{formatPrice(creatorReceives)}</span></div>
                </div>
              )}
              <div className="flex justify-between">
                <Button variant="outline" onClick={() => setStep(2)} className="rounded-md"><ChevronLeft className="h-4 w-4 mr-1" /> Back</Button>
                <Button onClick={() => {
                  if (priceNum < 99 || priceNum > 9999) { toast({ title: 'Price must be ₹99-₹9,999', variant: 'destructive' }); return; }
                  setStep(4);
                }} className="rounded-md">Review <ChevronRight className="h-4 w-4 ml-1" /></Button>
              </div>
            </div>
          )}

          {/* Step 4 — Review */}
          {step === 4 && (
            <div className="space-y-4">
              <h2 className="font-heading text-lg font-600">Review & Submit</h2>
              <div className="space-y-3">
                <div className="rounded-lg border border-border p-4">
                  <h3 className="text-xs text-muted-foreground mb-1">Creator Profile</h3>
                  <p className="text-sm font-medium">{displayName}</p>
                  <p className="text-xs text-muted-foreground">{category} • {bio.slice(0, 80)}…</p>
                </div>
                <div className="rounded-lg border border-border p-4">
                  <h3 className="text-xs text-muted-foreground mb-1">Course</h3>
                  <p className="text-sm font-medium">{courseTitle}</p>
                  <p className="text-xs text-muted-foreground">{courseCategory} • {courseLevel} • {courseLanguage}</p>
                  <p className="text-xs text-muted-foreground mt-1">{courseDesc}</p>
                </div>
                <div className="rounded-lg border border-border p-4">
                  <h3 className="text-xs text-muted-foreground mb-1">Pricing</h3>
                  <p className="text-sm font-medium">{formatPrice(priceNum)} • Commission {commissionPercent}%</p>
                  <p className="text-xs text-primary">You receive {formatPrice(creatorReceives)} per enrollment</p>
                </div>
              </div>
              <p className="text-xs text-muted-foreground">Our team reviews applications within 24-48 hours. You'll be notified by email.</p>
              <div className="flex justify-between">
                <Button variant="outline" onClick={() => setStep(3)} className="rounded-md"><ChevronLeft className="h-4 w-4 mr-1" /> Back</Button>
                <Button onClick={handleSubmit} disabled={submitting} className="rounded-md bg-accent hover:bg-accent/90 text-accent-foreground font-semibold">
                  {submitting ? <Loader2 className="h-4 w-4 animate-spin" /> : 'Submit for Review'}
                </Button>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default CreatorOnboarding;
