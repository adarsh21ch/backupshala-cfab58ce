import { Lock, ChevronRight, MessageCircle, Phone, Video, Clock, CheckCircle, ArrowLeft } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Link } from 'react-router-dom';

interface SequentialLockScreenProps {
  previousModuleTitle: string;
  previousModuleId: string;
  courseId: string;
  currentModuleIndex: number;
  totalModules: number;
}

export const SequentialLockScreen = ({
  previousModuleTitle,
  previousModuleId,
  courseId,
  currentModuleIndex,
  totalModules,
}: SequentialLockScreenProps) => {
  const progress = Math.round(((currentModuleIndex) / totalModules) * 100);

  return (
    <div className="flex flex-col items-center justify-center py-12 text-center space-y-6">
      <div className="flex h-16 w-16 items-center justify-center rounded-2xl bg-muted">
        <Lock className="h-8 w-8 text-muted-foreground" />
      </div>
      <div>
        <h2 className="font-heading text-xl font-700">Module Locked</h2>
        <p className="mt-2 text-sm text-muted-foreground">
          Complete the previous module to unlock this one.
        </p>
      </div>
      <div className="w-full max-w-sm rounded-xl border border-border bg-card p-4 text-left">
        <div className="flex items-center gap-2 text-sm">
          <ArrowLeft className="h-4 w-4 text-muted-foreground" />
          <span className="font-medium">Previous: {previousModuleTitle}</span>
        </div>
        <p className="mt-1 text-xs text-muted-foreground">Complete this module first</p>
        <Button asChild size="sm" className="mt-3 w-full rounded-lg bg-accent hover:bg-accent/90 text-accent-foreground">
          <Link to={`/courses/${courseId}/module/${previousModuleId}`}>
            Go to Previous Module <ChevronRight className="h-4 w-4 ml-1" />
          </Link>
        </Button>
      </div>
      <div className="w-full max-w-sm">
        <div className="flex items-center justify-between text-xs text-muted-foreground mb-1">
          <span>Progress: Module {currentModuleIndex + 1} of {totalModules}</span>
          <span>{progress}%</span>
        </div>
        <div className="h-2 rounded-full bg-secondary overflow-hidden">
          <div className="h-full rounded-full bg-primary transition-all" style={{ width: `${progress}%` }} />
        </div>
      </div>
    </div>
  );
};

interface MentorGateScreenProps {
  mentorName?: string | null;
  mentorPhone?: string | null;
  mentorEmail: string;
  gateMessage: string;
  contactType: string;
  zoomLink?: string | null;
  onContact: (method: string) => void;
  onAlreadyContacted: () => void;
  isLoading?: boolean;
}

export const MentorGateScreen = ({
  mentorName,
  mentorPhone,
  mentorEmail,
  gateMessage,
  contactType,
  zoomLink,
  onContact,
  onAlreadyContacted,
  isLoading,
}: MentorGateScreenProps) => {
  const showWhatsApp = contactType === 'whatsapp' || contactType === 'both';
  const showCall = contactType === 'call' || contactType === 'both';
  const showZoom = contactType === 'zoom';

  const whatsappUrl = mentorPhone
    ? `https://wa.me/91${mentorPhone.replace(/\D/g, '')}?text=Hi${mentorName ? ` ${mentorName}` : ''}, I completed a module and need approval to continue.`
    : '#';

  const callUrl = mentorPhone ? `tel:+91${mentorPhone.replace(/\D/g, '')}` : '#';

  return (
    <div className="flex flex-col items-center justify-center py-8 text-center space-y-6">
      <div className="space-y-2">
        <h2 className="font-heading text-xl font-700">🎉 Great work! Module Complete!</h2>
        <div className="border-t border-border" />
      </div>

      <div className="space-y-3">
        <h3 className="font-heading text-lg font-600 flex items-center justify-center gap-2">
          👥 Next Step: Talk to Your Mentor
        </h3>
        <p className="text-sm text-muted-foreground max-w-md">
          Your creator has set up a mentor check-in before you can access the next module.
        </p>
      </div>

      {gateMessage && (
        <div className="w-full max-w-md rounded-xl border border-accent/20 bg-accent/5 p-4">
          <p className="text-sm italic text-foreground">"{gateMessage}"</p>
        </div>
      )}

      {mentorName && (
        <p className="text-sm text-muted-foreground">
          Your mentor: <span className="font-medium text-foreground">{mentorName}</span>
        </p>
      )}

      <div className="flex flex-wrap gap-3 justify-center">
        {showWhatsApp && (
          <Button
            onClick={() => {
              window.open(whatsappUrl, '_blank');
              onContact('whatsapp');
            }}
            disabled={isLoading}
            className="rounded-lg bg-[#25D366] hover:bg-[#25D366]/90 text-white"
          >
            <MessageCircle className="h-4 w-4 mr-2" /> WhatsApp Mentor
          </Button>
        )}
        {showCall && (
          <Button
            onClick={() => {
              window.open(callUrl, '_blank');
              onContact('call');
            }}
            disabled={isLoading}
            variant="outline"
            className="rounded-lg"
          >
            <Phone className="h-4 w-4 mr-2" /> Call Mentor
          </Button>
        )}
        {showZoom && zoomLink && (
          <Button
            onClick={() => {
              window.open(zoomLink, '_blank');
              onContact('zoom');
            }}
            disabled={isLoading}
            className="rounded-lg bg-[#2D8CFF] hover:bg-[#2D8CFF]/90 text-white"
          >
            <Video className="h-4 w-4 mr-2" /> Join Zoom Call
          </Button>
        )}
      </div>

      <button
        onClick={onAlreadyContacted}
        disabled={isLoading}
        className="text-xs text-muted-foreground hover:text-foreground underline"
      >
        I have already contacted my mentor
      </button>
    </div>
  );
};

interface WaitingMentorScreenProps {
  moduleName: string;
  status: string;
  contactedAt?: string | null;
  courseId: string;
}

export const WaitingMentorScreen = ({
  moduleName,
  status,
  contactedAt,
  courseId,
}: WaitingMentorScreenProps) => {
  const timeAgo = contactedAt
    ? getTimeAgo(new Date(contactedAt))
    : null;

  return (
    <div className="flex flex-col items-center justify-center py-12 text-center space-y-6">
      <div className="flex h-16 w-16 items-center justify-center rounded-2xl bg-accent/10">
        <Clock className="h-8 w-8 text-accent animate-pulse" />
      </div>
      <div>
        <h2 className="font-heading text-xl font-700">⏳ Waiting for Mentor Approval</h2>
        <p className="mt-2 text-sm text-muted-foreground">
          You have contacted your mentor. They will unlock the next module after your call.
        </p>
      </div>
      <div className="w-full max-w-sm rounded-xl border border-border bg-card p-4 text-left space-y-2">
        <p className="text-sm"><span className="text-muted-foreground">Module:</span> <span className="font-medium">{moduleName}</span></p>
        <p className="text-sm"><span className="text-muted-foreground">Status:</span> <span className="font-medium text-accent capitalize">{status}</span></p>
        {timeAgo && <p className="text-sm"><span className="text-muted-foreground">Contacted:</span> <span className="font-medium">{timeAgo}</span></p>}
      </div>
      <div className="space-y-2">
        <p className="text-xs text-muted-foreground">While you wait, you can:</p>
        <div className="flex flex-wrap gap-2 justify-center">
          <Button asChild variant="outline" size="sm" className="rounded-lg">
            <Link to={`/courses/${courseId}`}>📚 Review Previous Modules</Link>
          </Button>
        </div>
      </div>
    </div>
  );
};

function getTimeAgo(date: Date): string {
  const now = new Date();
  const diffMs = now.getTime() - date.getTime();
  const diffMins = Math.floor(diffMs / 60000);
  if (diffMins < 60) return `${diffMins} minutes ago`;
  const diffHours = Math.floor(diffMins / 60);
  if (diffHours < 24) return `${diffHours} hours ago`;
  const diffDays = Math.floor(diffHours / 24);
  return `${diffDays} days ago`;
}
