import { useState } from 'react';
import { Link } from 'react-router-dom';
import { supabase } from '@/integrations/supabase/client';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { toast } from 'sonner';
import { Loader2, Mail, Clock } from 'lucide-react';
import BackButton from '@/components/BackButton';

const subjects = ['Payment Issue', 'Course Issue', 'Creator Support', 'Technical Issue', 'Other'];

const Contact = () => {
  const [form, setForm] = useState({ name: '', email: '', subject: '', message: '' });
  const [loading, setLoading] = useState(false);
  const [submitted, setSubmitted] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!form.name.trim() || !form.email.trim() || !form.subject || !form.message.trim()) {
      toast.error('Please fill in all fields');
      return;
    }
    if (form.message.length > 2000) {
      toast.error('Message must be under 2000 characters');
      return;
    }
    setLoading(true);
    const { error } = await supabase.from('contact_submissions' as any).insert({
      name: form.name.trim().slice(0, 100),
      email: form.email.trim().slice(0, 255),
      subject: form.subject,
      message: form.message.trim().slice(0, 2000),
    } as any);
    if (error) {
      toast.error('Failed to submit. Please try again.');
    } else {
      setSubmitted(true);
    }
    setLoading(false);
  };

  return (
    <div className="min-h-screen bg-background">
      <header className="border-b border-border bg-card py-4">
        <div className="container mx-auto px-4">
          <Link to="/" className="inline-flex items-center">
            <span className="font-heading text-xl font-800"><span className="text-foreground">Backup</span><span className="text-accent">shala</span></span>
          </Link>
        </div>
      </header>
      <main className="container mx-auto max-w-lg px-4 py-12">
        <BackButton fallback="/" />
        <h1 className="font-heading text-3xl font-800 mb-2">Contact Us</h1>
        <div className="flex items-center gap-4 text-sm text-muted-foreground mb-8">
          <span className="flex items-center gap-1"><Mail className="h-4 w-4" /> support@backupshala.com</span>
          <span className="flex items-center gap-1"><Clock className="h-4 w-4" /> 24–48 hours</span>
        </div>

        {submitted ? (
          <div className="rounded-xl border border-primary/30 bg-primary/5 p-8 text-center">
            <p className="font-heading text-xl font-700 text-primary mb-2">Message Sent! ✓</p>
            <p className="text-sm text-muted-foreground">We've received your message and will respond within 24–48 hours.</p>
            <Button asChild className="mt-6 rounded-md"><Link to="/">Go Home</Link></Button>
          </div>
        ) : (
          <form onSubmit={handleSubmit} className="space-y-4 rounded-xl border border-border bg-card p-6">
            <div>
              <Label>Name</Label>
              <Input value={form.name} onChange={e => setForm(f => ({ ...f, name: e.target.value }))} placeholder="Your name" maxLength={100} className="mt-1 rounded-lg" />
            </div>
            <div>
              <Label>Email</Label>
              <Input type="email" value={form.email} onChange={e => setForm(f => ({ ...f, email: e.target.value }))} placeholder="you@example.com" maxLength={255} className="mt-1 rounded-lg" />
            </div>
            <div>
              <Label>Subject</Label>
              <Select value={form.subject} onValueChange={v => setForm(f => ({ ...f, subject: v }))}>
                <SelectTrigger className="mt-1 rounded-lg"><SelectValue placeholder="Select a subject" /></SelectTrigger>
                <SelectContent>
                  {subjects.map(s => <SelectItem key={s} value={s}>{s}</SelectItem>)}
                </SelectContent>
              </Select>
            </div>
            <div>
              <Label>Message</Label>
              <Textarea value={form.message} onChange={e => setForm(f => ({ ...f, message: e.target.value }))} placeholder="Describe your issue or question..." className="mt-1 rounded-lg min-h-[120px]" maxLength={2000} />
              <p className="mt-1 text-xs text-muted-foreground text-right">{form.message.length}/2000</p>
            </div>
            <Button type="submit" disabled={loading} className="w-full rounded-md bg-primary hover:bg-primary/90">
              {loading ? <Loader2 className="h-4 w-4 animate-spin" /> : 'Send Message'}
            </Button>
          </form>
        )}
      </main>
    </div>
  );
};

export default Contact;
