import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Send } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { toast } from 'sonner';
import { VIDEO_CATEGORIES, VIDEO_LANGUAGES } from '@/lib/videoTypes';

interface VideoRequestFormProps {
  onSuccess?: () => void;
}

const VideoRequestForm = ({ onSuccess }: VideoRequestFormProps) => {
  const { user } = useAuth();
  const [youtubeUrl, setYoutubeUrl] = useState('');
  const [videoTitle, setVideoTitle] = useState('');
  const [category, setCategory] = useState('General');
  const [language, setLanguage] = useState('English');
  const [reason, setReason] = useState('');
  const [submitting, setSubmitting] = useState(false);

  const handleSubmit = async () => {
    if (!youtubeUrl.trim() || !videoTitle.trim()) {
      toast.error('YouTube URL and video title are required');
      return;
    }
    if (!youtubeUrl.match(/^https?:\/\/(www\.)?(youtube\.com|youtu\.be)\//)) {
      toast.error('Please enter a valid YouTube URL');
      return;
    }
    if (!user) { toast.error('Please log in'); return; }

    setSubmitting(true);
    try {
      const { error } = await supabase.from('video_requests').insert({
        requested_by: user.id,
        youtube_url: youtubeUrl.trim(),
        video_title: videoTitle.trim(),
        category,
        language,
        reason: reason.trim() || null,
      });
      if (error) throw error;
      toast.success('Request submitted! Admin will process it within 24-48 hours.');
      setYoutubeUrl(''); setVideoTitle(''); setReason(''); setCategory('General'); setLanguage('English');
      onSuccess?.();
    } catch (err: any) {
      toast.error(err.message || 'Failed to submit request');
    }
    setSubmitting(false);
  };

  return (
    <Card className="bg-card border-border max-w-lg">
      <CardHeader>
        <CardTitle className="text-base">Request New Video</CardTitle>
        <p className="text-xs text-muted-foreground">Can't find what you need? Ask admin to upload it.</p>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="space-y-1.5">
          <Label className="text-sm">YouTube Video URL *</Label>
          <Input value={youtubeUrl} onChange={e => setYoutubeUrl(e.target.value)} placeholder="https://youtube.com/watch?v=..." className="bg-secondary border-border" />
        </div>
        <div className="space-y-1.5">
          <Label className="text-sm">Video Title *</Label>
          <Input value={videoTitle} onChange={e => setVideoTitle(e.target.value)} placeholder="What should this video be called?" className="bg-secondary border-border" />
        </div>
        <div className="grid grid-cols-2 gap-3">
          <div className="space-y-1.5">
            <Label className="text-sm">Category *</Label>
            <Select value={category} onValueChange={setCategory}>
              <SelectTrigger className="bg-secondary border-border"><SelectValue /></SelectTrigger>
              <SelectContent>{VIDEO_CATEGORIES.map(c => <SelectItem key={c} value={c}>{c}</SelectItem>)}</SelectContent>
            </Select>
          </div>
          <div className="space-y-1.5">
            <Label className="text-sm">Language *</Label>
            <Select value={language} onValueChange={setLanguage}>
              <SelectTrigger className="bg-secondary border-border"><SelectValue /></SelectTrigger>
              <SelectContent>{VIDEO_LANGUAGES.map(l => <SelectItem key={l} value={l}>{l}</SelectItem>)}</SelectContent>
            </Select>
          </div>
        </div>
        <div className="space-y-1.5">
          <Label className="text-sm">Why do you need this? (optional)</Label>
          <Textarea value={reason} onChange={e => setReason(e.target.value)} placeholder="I want to use this for my content creation module..." className="bg-secondary border-border" rows={3} />
        </div>
        <Button onClick={handleSubmit} disabled={submitting} className="w-full bg-primary hover:bg-primary/90">
          <Send className="h-4 w-4 mr-2" /> {submitting ? 'Submitting...' : 'Submit Request'}
        </Button>
        <p className="text-xs text-muted-foreground text-center">ℹ️ Requests are processed within 24-48 hours. You'll receive a notification when ready.</p>
      </CardContent>
    </Card>
  );
};

export default VideoRequestForm;
