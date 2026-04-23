import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Switch } from '@/components/ui/switch';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Slider } from '@/components/ui/slider';
import { Video } from 'lucide-react';

interface VideoSettingsSectionProps {
  values: Record<string, string>;
  setVal: (key: string, value: string) => void;
}

const POSITIONS = [
  { value: 'bottom-right', label: 'Bottom Right' },
  { value: 'bottom-left', label: 'Bottom Left' },
  { value: 'top-right', label: 'Top Right' },
  { value: 'top-left', label: 'Top Left' },
];

const SIZES = [
  { value: 'small', label: 'Small' },
  { value: 'medium', label: 'Medium' },
  { value: 'large', label: 'Large' },
];

const positionStyle: Record<string, string> = {
  'bottom-right': 'bottom-3 right-3',
  'bottom-left': 'bottom-3 left-3',
  'top-right': 'top-3 right-3',
  'top-left': 'top-3 left-3',
};

const sizeStyle: Record<string, string> = {
  small: 'text-[10px]',
  medium: 'text-sm',
  large: 'text-lg',
};

const VideoSettingsSection = ({ values, setVal }: VideoSettingsSectionProps) => {
  const enabled = values.video_watermark_enabled === 'true';
  const text = values.video_watermark_text || 'Backupshala';
  const position = values.video_watermark_position || 'bottom-right';
  const opacity = Number(values.video_watermark_opacity) || 60;
  const size = values.video_watermark_size || 'medium';

  return (
    <Card className="bg-card border-border">
      <CardHeader>
        <CardTitle className="text-base flex items-center gap-2">
          <Video className="h-4 w-4" /> Video & Player Settings
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-6">
        {/* === Watermark === */}
        <div className="space-y-4">
          <h3 className="text-sm font-semibold uppercase tracking-wider text-muted-foreground">Watermark</h3>

          <div className="flex items-start justify-between gap-4 rounded-lg border border-border bg-secondary/40 p-3">
            <div>
              <Label className="text-sm font-medium">Enable watermark</Label>
              <p className="text-xs text-muted-foreground mt-0.5">Show a watermark over every video</p>
            </div>
            <Switch checked={enabled} onCheckedChange={v => setVal('video_watermark_enabled', v ? 'true' : 'false')} />
          </div>

          <div className="space-y-1.5">
            <Label className="text-sm">Watermark text</Label>
            <Input
              value={text}
              onChange={e => setVal('video_watermark_text', e.target.value)}
              className="bg-secondary border-border"
              placeholder="Backupshala"
            />
          </div>

          <div className="grid sm:grid-cols-2 gap-4">
            <div className="space-y-1.5">
              <Label className="text-sm">Position</Label>
              <Select value={position} onValueChange={v => setVal('video_watermark_position', v)}>
                <SelectTrigger className="bg-secondary border-border"><SelectValue /></SelectTrigger>
                <SelectContent>
                  {POSITIONS.map(p => <SelectItem key={p.value} value={p.value}>{p.label}</SelectItem>)}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-1.5">
              <Label className="text-sm">Size</Label>
              <Select value={size} onValueChange={v => setVal('video_watermark_size', v)}>
                <SelectTrigger className="bg-secondary border-border"><SelectValue /></SelectTrigger>
                <SelectContent>
                  {SIZES.map(s => <SelectItem key={s.value} value={s.value}>{s.label}</SelectItem>)}
                </SelectContent>
              </Select>
            </div>
          </div>

          <div className="space-y-1.5">
            <div className="flex justify-between items-center">
              <Label className="text-sm">Opacity</Label>
              <span className="text-xs text-muted-foreground">{opacity}%</span>
            </div>
            <Slider
              value={[opacity]}
              min={10}
              max={80}
              step={5}
              onValueChange={(v) => setVal('video_watermark_opacity', String(v[0]))}
            />
          </div>

          {/* Live preview */}
          <div>
            <Label className="text-sm">Live preview</Label>
            <div className="mt-2 relative aspect-video w-full max-w-md rounded-lg bg-black overflow-hidden border border-border">
              <div className="absolute inset-0 flex items-center justify-center text-white/50 text-xs">Video preview</div>
              {enabled && (
                <div
                  className={`absolute pointer-events-none text-white font-bold ${positionStyle[position]} ${sizeStyle[size]}`}
                  style={{ opacity: opacity / 100, textShadow: '0 1px 3px rgba(0,0,0,0.8)' }}
                >
                  {text}
                </div>
              )}
            </div>
          </div>
        </div>

        {/* === Defaults === */}
        <div className="space-y-4 border-t border-border pt-6">
          <h3 className="text-sm font-semibold uppercase tracking-wider text-muted-foreground">Default player behaviour</h3>

          <div className="flex items-start justify-between gap-4 rounded-lg border border-border bg-secondary/40 p-3">
            <div>
              <Label className="text-sm font-medium">Allow forward seeking</Label>
              <p className="text-xs text-muted-foreground mt-0.5">When off, students cannot skip past unwatched parts</p>
            </div>
            <Switch
              checked={values.allow_video_seeking_forward === 'true'}
              onCheckedChange={v => setVal('allow_video_seeking_forward', v ? 'true' : 'false')}
            />
          </div>

          <div className="flex items-start justify-between gap-4 rounded-lg border border-border bg-secondary/40 p-3">
            <div>
              <Label className="text-sm font-medium">Allow speed control</Label>
              <p className="text-xs text-muted-foreground mt-0.5">Show 0.5x → 2x speed selector in player</p>
            </div>
            <Switch
              checked={values.allow_video_speed_control === 'true'}
              onCheckedChange={v => setVal('allow_video_speed_control', v ? 'true' : 'false')}
            />
          </div>

          <div className="grid sm:grid-cols-2 gap-4">
            <div className="space-y-1.5">
              <Label className="text-sm">Min watch % to complete</Label>
              <Input
                type="number"
                value={values.min_watch_percentage_to_complete ?? '80'}
                onChange={e => setVal('min_watch_percentage_to_complete', e.target.value)}
                min={1}
                max={100}
                className="bg-secondary border-border"
              />
              <p className="text-xs text-muted-foreground">Students must watch this % to mark a module complete</p>
            </div>
            <div className="space-y-1.5">
              <Label className="text-sm">Max free preview modules per course</Label>
              <Input
                type="number"
                value={values.max_preview_modules_per_course ?? '2'}
                onChange={e => setVal('max_preview_modules_per_course', e.target.value)}
                min={1}
                max={10}
                className="bg-secondary border-border"
              />
              <p className="text-xs text-muted-foreground">Creators can mark up to this many modules as free preview</p>
            </div>
          </div>
        </div>
      </CardContent>
    </Card>
  );
};

export default VideoSettingsSection;
