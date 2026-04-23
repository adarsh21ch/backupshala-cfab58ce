import CreatorDashboardLayout from '@/components/dashboard/CreatorDashboardLayout';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import { Switch } from '@/components/ui/switch';
import { Slider } from '@/components/ui/slider';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { toast } from 'sonner';
import { useState, useEffect } from 'react';
import { Save, Film } from 'lucide-react';

interface VideoSettings {
  min_watch_percentage_to_complete: number;
  allow_speed_control: boolean;
  allow_forward_seeking: boolean;
  video_watermark_enabled: boolean;
}

const defaults: VideoSettings = {
  min_watch_percentage_to_complete: 80,
  allow_speed_control: true,
  allow_forward_seeking: true,
  video_watermark_enabled: false,
};

const CreatorSettings = () => {
  const { user } = useAuth();
  const qc = useQueryClient();
  const [settings, setSettings] = useState<VideoSettings>(defaults);

  const { data, isLoading } = useQuery({
    queryKey: ['creator-video-settings', user?.id],
    queryFn: async () => {
      const { data } = await supabase
        .from('creator_video_settings')
        .select('*')
        .eq('creator_id', user!.id)
        .maybeSingle();
      return data;
    },
    enabled: !!user,
  });

  useEffect(() => {
    if (data) {
      setSettings({
        min_watch_percentage_to_complete: data.min_watch_percentage_to_complete,
        allow_speed_control: data.allow_speed_control,
        allow_forward_seeking: data.allow_forward_seeking,
        video_watermark_enabled: data.video_watermark_enabled,
      });
    }
  }, [data]);

  const saveMutation = useMutation({
    mutationFn: async () => {
      if (data) {
        await supabase
          .from('creator_video_settings')
          .update({ ...settings, updated_at: new Date().toISOString() })
          .eq('creator_id', user!.id);
      } else {
        await supabase
          .from('creator_video_settings')
          .insert({ creator_id: user!.id, ...settings });
      }
    },
    onSuccess: () => {
      toast.success('Video settings saved!');
      qc.invalidateQueries({ queryKey: ['creator-video-settings'] });
    },
    onError: () => toast.error('Failed to save settings'),
  });

  return (
    <CreatorDashboardLayout>
      <div className="space-y-6 max-w-2xl">
        <h1 className="text-2xl font-heading font-bold">Settings</h1>

        <Card className="bg-card border-border">
          <CardHeader>
            <CardTitle className="text-base flex items-center gap-2">
              <Film className="h-4 w-4 text-primary" /> Video Settings
            </CardTitle>
            <p className="text-xs text-muted-foreground">Control how students watch videos in your courses</p>
          </CardHeader>
          <CardContent className="space-y-5">
            {/* Completion Threshold */}
            <div className="space-y-2">
              <Label className="text-sm">Completion Threshold</Label>
              <p className="text-xs text-muted-foreground">
                Students must watch {settings.min_watch_percentage_to_complete}% to mark a module complete
              </p>
              <Slider
                value={[settings.min_watch_percentage_to_complete]}
                min={50} max={100} step={5}
                onValueChange={([v]) => setSettings(prev => ({ ...prev, min_watch_percentage_to_complete: v }))}
                className="w-full"
              />
            </div>

            {/* Allow Speed Control */}
            <div className="flex items-center justify-between">
              <div>
                <Label className="text-sm">Allow Speed Control</Label>
                <p className="text-xs text-muted-foreground">Students can change playback speed when enabled</p>
              </div>
              <Switch
                checked={settings.allow_speed_control}
                onCheckedChange={c => setSettings(prev => ({ ...prev, allow_speed_control: c }))}
              />
            </div>

            {/* Allow Forward Seeking */}
            <div className="flex items-center justify-between">
              <div>
                <Label className="text-sm">Allow Forward Seeking</Label>
                <p className="text-xs text-muted-foreground">Students can skip ahead in the video when enabled</p>
              </div>
              <Switch
                checked={settings.allow_forward_seeking}
                onCheckedChange={c => setSettings(prev => ({ ...prev, allow_forward_seeking: c }))}
              />
            </div>

            {/* Watermark — platform-controlled, not editable by creator */}
            <div className="rounded-lg border border-border bg-secondary/30 p-3">
              <p className="text-sm font-medium">Video Watermark</p>
              <p className="text-xs text-muted-foreground mt-0.5">
                The "Backupshala" watermark is always shown on your course videos to protect your content. This is a platform-wide policy and cannot be disabled.
              </p>
            </div>

            <Button
              onClick={() => saveMutation.mutate()}
              disabled={saveMutation.isPending}
              className="bg-primary hover:bg-primary/90"
            >
              <Save className="h-4 w-4 mr-2" /> Save Video Settings
            </Button>
          </CardContent>
        </Card>
      </div>
    </CreatorDashboardLayout>
  );
};

export default CreatorSettings;
