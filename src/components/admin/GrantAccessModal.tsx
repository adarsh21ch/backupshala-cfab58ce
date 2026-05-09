import { useState } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Switch } from '@/components/ui/switch';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { usePlatformSettings } from '@/hooks/usePlatformSettings';
import { toast } from 'sonner';
import { Loader2, Gift } from 'lucide-react';

interface Props {
  studentId: string;
  studentName: string;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onGranted?: () => void;
}

type CourseChoice = 'basic' | 'advanced' | 'both';
type Duration = '1m' | '3m' | '6m' | '1y' | 'lifetime';

const durationToDate = (d: Duration): Date | null => {
  if (d === 'lifetime') return null;
  const now = new Date();
  if (d === '1m') now.setMonth(now.getMonth() + 1);
  if (d === '3m') now.setMonth(now.getMonth() + 3);
  if (d === '6m') now.setMonth(now.getMonth() + 6);
  if (d === '1y') now.setFullYear(now.getFullYear() + 1);
  return now;
};

const GrantAccessModal = ({ studentId, studentName, open, onOpenChange, onGranted }: Props) => {
  const { user } = useAuth();
  const { data: settings, getSetting } = usePlatformSettings();
  const basicCourseId = getSetting('basic_course_id');
  const advancedCourseId = getSetting('advanced_course_id');

  const [choice, setChoice] = useState<CourseChoice>('basic');
  const [duration, setDuration] = useState<Duration>('1y');
  const [reason, setReason] = useState('');
  const [notify, setNotify] = useState(true);
  const [saving, setSaving] = useState(false);

  const handleGrant = async () => {
    if (!reason.trim()) {
      toast.error('Please provide a reason for the audit log');
      return;
    }
    if (choice !== 'advanced' && !basicCourseId) {
      toast.error('Basic course not configured in platform settings');
      return;
    }
    if (choice !== 'basic' && !advancedCourseId) {
      toast.error('Advanced course not configured. Set advanced_course_id in admin settings first.');
      return;
    }

    setSaving(true);
    try {
      const expires = durationToDate(duration);
      const courseIds: string[] = [];
      if (choice === 'basic' || choice === 'both') courseIds.push(basicCourseId);
      if (choice === 'advanced' || choice === 'both') {
        if (basicCourseId && !courseIds.includes(basicCourseId)) courseIds.push(basicCourseId); // advanced auto-grants basic
        courseIds.push(advancedCourseId);
      }

      // Fetch course titles for notifications
      const { data: coursesData } = await supabase
        .from('courses')
        .select('id, title')
        .in('id', courseIds);
      const titleMap: Record<string, string> = {};
      (coursesData || []).forEach((c: any) => { titleMap[c.id] = c.title; });

      // Insert/upsert enrollments — skip if already enrolled
      const { data: existing } = await supabase
        .from('enrollments')
        .select('course_id')
        .eq('student_id', studentId)
        .in('course_id', courseIds);
      const existingIds = new Set((existing || []).map((e: any) => e.course_id));

      const newRows = courseIds
        .filter(id => !existingIds.has(id))
        .map(id => ({
          student_id: studentId,
          course_id: id,
          amount_paid: 0,
          granted_by_admin: true,
          access_expires_at: expires ? expires.toISOString() : null,
          grant_reason: reason.trim(),
          tier: id === advancedCourseId ? 'advanced' : 'basic',
        }));

      if (newRows.length > 0) {
        const { error: insErr } = await supabase.from('enrollments').insert(newRows);
        if (insErr) throw insErr;
      }

      // Audit log
      await supabase.from('admin_audit_log').insert({
        admin_id: user!.id,
        action: 'admin_granted_course_access',
        target_type: 'student',
        target_id: studentId,
        details: {
          student_id: studentId,
          course_ids: courseIds,
          duration,
          access_expires_at: expires?.toISOString() ?? null,
          reason: reason.trim(),
          choice,
        },
      });

      // Notification
      if (notify) {
        const title = courseIds.map(id => titleMap[id]).filter(Boolean).join(' & ');
        const expiryText = expires
          ? `Your access expires on ${expires.toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' })}.`
          : 'You have lifetime access.';
        await supabase.from('notifications').insert({
          user_id: studentId,
          title: '🎁 Course access granted',
          message: `Backupshala has given you access to: ${title}. ${expiryText}`,
          type: 'success',
          action_url: '/dashboard',
        });
      }

      toast.success(
        newRows.length === 0
          ? 'Student already had access to all selected courses'
          : `Granted access to ${newRows.length} course${newRows.length > 1 ? 's' : ''}`
      );
      onGranted?.();
      onOpenChange(false);
      // reset
      setReason('');
      setChoice('basic');
      setDuration('1y');
    } catch (e: any) {
      console.error(e);
      toast.error(e.message || 'Failed to grant access');
    } finally {
      setSaving(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-lg">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Gift className="h-5 w-5 text-primary" />
            Grant Course Access
          </DialogTitle>
          <DialogDescription>
            Grant free access to <span className="font-semibold text-foreground">{studentName}</span>.
            This is logged in the audit trail.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-5 py-2">
          <div>
            <Label className="text-sm font-semibold">Select Course</Label>
            <RadioGroup value={choice} onValueChange={(v) => setChoice(v as CourseChoice)} className="mt-2 space-y-2">
              <label className="flex items-center gap-3 rounded-lg border border-border p-3 cursor-pointer hover:bg-muted/50">
                <RadioGroupItem value="basic" />
                <div className="flex-1">
                  <div className="text-sm font-medium">Basic Course</div>
                  <div className="text-xs text-muted-foreground">₹{settings.basic_price} value</div>
                </div>
              </label>
              <label className="flex items-center gap-3 rounded-lg border border-border p-3 cursor-pointer hover:bg-muted/50">
                <RadioGroupItem value="advanced" />
                <div className="flex-1">
                  <div className="text-sm font-medium">Advanced Course</div>
                  <div className="text-xs text-muted-foreground">₹{settings.advanced_price} value · auto-includes Basic</div>
                </div>
              </label>
              <label className="flex items-center gap-3 rounded-lg border border-border p-3 cursor-pointer hover:bg-muted/50">
                <RadioGroupItem value="both" />
                <div className="flex-1">
                  <div className="text-sm font-medium">Both Courses</div>
                  <div className="text-xs text-muted-foreground">Basic + Advanced explicit grant</div>
                </div>
              </label>
            </RadioGroup>
          </div>

          <div>
            <Label className="text-sm font-semibold">Access Duration</Label>
            <Select value={duration} onValueChange={(v) => setDuration(v as Duration)}>
              <SelectTrigger className="mt-2"><SelectValue /></SelectTrigger>
              <SelectContent>
                <SelectItem value="1m">1 Month</SelectItem>
                <SelectItem value="3m">3 Months</SelectItem>
                <SelectItem value="6m">6 Months</SelectItem>
                <SelectItem value="1y">1 Year (recommended)</SelectItem>
                <SelectItem value="lifetime">Lifetime</SelectItem>
              </SelectContent>
            </Select>
          </div>

          <div>
            <Label className="text-sm font-semibold">Reason (required)</Label>
            <Textarea
              value={reason}
              onChange={(e) => setReason(e.target.value)}
              placeholder="e.g. Beta tester, Compensation for refund, Partner access…"
              className="mt-2 min-h-[70px]"
              maxLength={500}
            />
          </div>

          <div className="flex items-center justify-between rounded-lg border border-border p-3">
            <div>
              <div className="text-sm font-medium">Notify student</div>
              <div className="text-xs text-muted-foreground">Sends an in-app notification</div>
            </div>
            <Switch checked={notify} onCheckedChange={setNotify} />
          </div>
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)} disabled={saving}>Cancel</Button>
          <Button onClick={handleGrant} disabled={saving || !reason.trim()}>
            {saving && <Loader2 className="h-4 w-4 animate-spin mr-2" />}
            Grant Access
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
};

export default GrantAccessModal;
