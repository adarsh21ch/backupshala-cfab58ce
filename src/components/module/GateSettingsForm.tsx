import { Switch } from '@/components/ui/switch';
import { Label } from '@/components/ui/label';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Button } from '@/components/ui/button';
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group';
import { Lock, Mic, Users, Star } from 'lucide-react';
import { Link } from 'react-router-dom';

interface GateSettingsFormProps {
  isPro: boolean;
  isSequential: boolean;
  setIsSequential: (v: boolean) => void;
  hasAudioNote: boolean;
  setHasAudioNote: (v: boolean) => void;
  audioNoteLabel: string;
  setAudioNoteLabel: (v: string) => void;
  audioNotePosition: string;
  setAudioNotePosition: (v: string) => void;
  hasMentorGate: boolean;
  setHasMentorGate: (v: boolean) => void;
  mentorGateMessage: string;
  setMentorGateMessage: (v: string) => void;
  mentorContactType: string;
  setMentorContactType: (v: string) => void;
  zoomLink: string;
  setZoomLink: (v: string) => void;
}

const GateSettingsForm = ({
  isPro,
  isSequential, setIsSequential,
  hasAudioNote, setHasAudioNote,
  audioNoteLabel, setAudioNoteLabel,
  audioNotePosition, setAudioNotePosition,
  hasMentorGate, setHasMentorGate,
  mentorGateMessage, setMentorGateMessage,
  mentorContactType, setMentorContactType,
  zoomLink, setZoomLink,
}: GateSettingsFormProps) => {
  if (!isPro) {
    return (
      <div className="rounded-xl border border-border bg-card p-6 text-center space-y-4">
        <div className="flex items-center justify-between">
          <h3 className="font-heading text-base font-600 flex items-center gap-2">
            <Lock className="h-4 w-4" /> Gate Settings
          </h3>
          <span className="rounded-full bg-accent/10 px-2 py-0.5 text-[10px] font-semibold text-accent">Pro Feature</span>
        </div>
        <p className="text-sm text-muted-foreground">
          Control how students progress through your course. Upgrade to Creator Pro to unlock:
        </p>
        <div className="text-left space-y-2">
          {[
            '✓ Sequential module locking',
            '✓ Audio notes between modules',
            '✓ Mentor approval gates',
            '✓ Student progress dashboard',
          ].map(f => (
            <p key={f} className="text-sm text-muted-foreground">{f}</p>
          ))}
        </div>
        <Button asChild className="rounded-lg bg-accent hover:bg-accent/90 text-accent-foreground">
          <Link to="/creator/upgrade">Upgrade to Creator Pro — ₹999/month</Link>
        </Button>
      </div>
    );
  }

  return (
    <div className="rounded-xl border border-border bg-card p-6 space-y-6">
      <div className="flex items-center justify-between">
        <h3 className="font-heading text-base font-600 flex items-center gap-2">
          <Lock className="h-4 w-4 text-primary" /> Gate Settings
        </h3>
        <span className="rounded-full bg-primary/10 px-2 py-0.5 text-[10px] font-semibold text-primary">Pro ✓</span>
      </div>

      {/* Sequential Lock */}
      <div className="space-y-2">
        <div className="flex items-center justify-between">
          <div>
            <Label className="text-sm font-semibold">🔒 Sequential Lock</Label>
            <p className="text-xs text-muted-foreground">Students must complete the previous module before accessing this one.</p>
          </div>
          <Switch checked={isSequential} onCheckedChange={setIsSequential} />
        </div>
      </div>

      <div className="border-t border-border" />

      {/* Audio Note */}
      <div className="space-y-3">
        <div className="flex items-center justify-between">
          <div>
            <Label className="text-sm font-semibold">🎙️ Audio Note</Label>
            <p className="text-xs text-muted-foreground">Attach a short audio message for students.</p>
          </div>
          <Switch checked={hasAudioNote} onCheckedChange={setHasAudioNote} />
        </div>
        {hasAudioNote && (
          <div className="pl-1 space-y-3">
            <div className="flex gap-3">
              <button
                onClick={() => setAudioNotePosition('before')}
                className={`rounded-lg border-2 px-4 py-2 text-xs font-medium transition-all ${audioNotePosition === 'before' ? 'border-accent bg-accent/5 text-accent' : 'border-border'}`}
              >
                Before video
              </button>
              <button
                onClick={() => setAudioNotePosition('after')}
                className={`rounded-lg border-2 px-4 py-2 text-xs font-medium transition-all ${audioNotePosition === 'after' ? 'border-accent bg-accent/5 text-accent' : 'border-border'}`}
              >
                After video
              </button>
            </div>
            <div>
              <Label className="text-xs">Audio Note Label</Label>
              <Input
                value={audioNoteLabel}
                onChange={e => setAudioNoteLabel(e.target.value)}
                placeholder="Message from your mentor"
                className="mt-1 rounded-lg text-xs"
              />
            </div>
            <div className="rounded-lg border border-dashed border-border p-6 text-center">
              <Mic className="h-8 w-8 mx-auto text-muted-foreground/40 mb-2" />
              <p className="text-xs text-muted-foreground">Audio upload coming soon</p>
              <p className="text-[10px] text-muted-foreground">MP3, M4A, WAV — Max 50MB</p>
            </div>
          </div>
        )}
      </div>

      <div className="border-t border-border" />

      {/* Mentor Gate */}
      <div className="space-y-3">
        <div className="flex items-center justify-between">
          <div>
            <Label className="text-sm font-semibold">👥 Mentor Gate</Label>
            <p className="text-xs text-muted-foreground">After completing this module, students must contact their mentor before accessing the next.</p>
          </div>
          <Switch checked={hasMentorGate} onCheckedChange={setHasMentorGate} />
        </div>
        {hasMentorGate && (
          <div className="pl-1 space-y-3">
            <div>
              <Label className="text-xs">Message to student</Label>
              <Textarea
                value={mentorGateMessage}
                onChange={e => setMentorGateMessage(e.target.value)}
                placeholder="Schedule a 15-minute call with your mentor to discuss your progress and get access to the next module."
                className="mt-1 rounded-lg text-xs min-h-[80px]"
              />
            </div>
            <div>
              <Label className="text-xs mb-2 block">Contact method</Label>
              <RadioGroup value={mentorContactType} onValueChange={setMentorContactType} className="space-y-2">
                <div className="flex items-center gap-2">
                  <RadioGroupItem value="whatsapp" id="ct-wa" />
                  <label htmlFor="ct-wa" className="text-xs">WhatsApp only</label>
                </div>
                <div className="flex items-center gap-2">
                  <RadioGroupItem value="call" id="ct-call" />
                  <label htmlFor="ct-call" className="text-xs">Call only</label>
                </div>
                <div className="flex items-center gap-2">
                  <RadioGroupItem value="both" id="ct-both" />
                  <label htmlFor="ct-both" className="text-xs">Both WhatsApp and Call</label>
                </div>
                <div className="flex items-center gap-2">
                  <RadioGroupItem value="zoom" id="ct-zoom" />
                  <label htmlFor="ct-zoom" className="text-xs">Zoom (paste link below)</label>
                </div>
              </RadioGroup>
              {mentorContactType === 'zoom' && (
                <Input
                  value={zoomLink}
                  onChange={e => setZoomLink(e.target.value)}
                  placeholder="https://zoom.us/j/..."
                  className="mt-2 rounded-lg text-xs"
                />
              )}
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

export default GateSettingsForm;
