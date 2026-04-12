import { useState } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import CreatorDashboardLayout from '@/components/dashboard/CreatorDashboardLayout';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Megaphone, Plus } from 'lucide-react';
import { toast } from 'sonner';
import { timeAgo } from '@/lib/format';

const CreatorAnnouncements = () => {
  const { user } = useAuth();
  const queryClient = useQueryClient();
  const [dialogOpen, setDialogOpen] = useState(false);
  const [title, setTitle] = useState('');
  const [content, setContent] = useState('');
  const [courseId, setCourseId] = useState('all');

  const { data: announcements, isLoading } = useQuery({
    queryKey: ['creator-announcements', user?.id],
    queryFn: async () => {
      const { data } = await supabase
        .from('creator_announcements')
        .select('*, courses(title)')
        .eq('creator_id', user!.id)
        .order('created_at', { ascending: false });
      return data || [];
    },
    enabled: !!user,
  });

  const { data: courses } = useQuery({
    queryKey: ['creator-courses-list', user?.id],
    queryFn: async () => {
      const { data } = await supabase
        .from('courses')
        .select('id, title')
        .eq('creator_id', user!.id)
        .eq('status', 'published');
      return data || [];
    },
    enabled: !!user,
  });

  const postMutation = useMutation({
    mutationFn: async () => {
      const { error } = await supabase.from('creator_announcements').insert({
        creator_id: user!.id,
        course_id: courseId === 'all' ? null : courseId,
        title: title.trim(),
        content: content.trim(),
      });
      if (error) throw error;

      // Notify enrolled students
      const targetCourseId = courseId === 'all' ? null : courseId;
      let enrollQuery = supabase.from('enrollments').select('student_id');
      if (targetCourseId) {
        enrollQuery = enrollQuery.eq('course_id', targetCourseId);
      } else {
        const courseIds = courses?.map(c => c.id) || [];
        if (courseIds.length > 0) enrollQuery = enrollQuery.in('course_id', courseIds);
      }
      const { data: enrollments } = await enrollQuery;
      const uniqueStudents = [...new Set(enrollments?.map(e => e.student_id) || [])];

      if (uniqueStudents.length > 0) {
        const notifications = uniqueStudents.slice(0, 100).map(sid => ({
          user_id: sid,
          title: `📢 ${title.trim()}`,
          message: content.slice(0, 100),
          type: 'announcement',
        }));
        await supabase.from('notifications').insert(notifications);
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['creator-announcements'] });
      toast.success('Announcement posted!');
      setDialogOpen(false);
      setTitle(''); setContent(''); setCourseId('all');
    },
    onError: (err: any) => toast.error(err.message),
  });

  return (
    <CreatorDashboardLayout>
      <div className="space-y-6">
        <div className="flex items-center justify-between">
          <h1 className="font-heading text-2xl font-700">Announcements</h1>
          <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
            <DialogTrigger asChild>
              <Button className="gap-2 rounded-lg"><Plus className="h-4 w-4" /> New Announcement</Button>
            </DialogTrigger>
            <DialogContent className="bg-card border-border">
              <DialogHeader><DialogTitle>Post Announcement</DialogTitle></DialogHeader>
              <div className="space-y-4">
                <div>
                  <Label className="text-sm">Send To</Label>
                  <Select value={courseId} onValueChange={setCourseId}>
                    <SelectTrigger className="mt-1 rounded-lg"><SelectValue /></SelectTrigger>
                    <SelectContent>
                      <SelectItem value="all">All My Students</SelectItem>
                      {courses?.map(c => <SelectItem key={c.id} value={c.id}>{c.title}</SelectItem>)}
                    </SelectContent>
                  </Select>
                </div>
                <div>
                  <Label className="text-sm">Title *</Label>
                  <Input value={title} onChange={e => setTitle(e.target.value)} maxLength={100} className="mt-1 rounded-lg" />
                </div>
                <div>
                  <Label className="text-sm">Message *</Label>
                  <Textarea value={content} onChange={e => setContent(e.target.value)} maxLength={500} className="mt-1 rounded-lg min-h-[100px]" />
                  <p className="text-[10px] text-muted-foreground mt-1">{content.length}/500</p>
                </div>
                <Button onClick={() => postMutation.mutate()} disabled={!title.trim() || !content.trim() || postMutation.isPending} className="w-full rounded-lg">
                  Post Announcement
                </Button>
              </div>
            </DialogContent>
          </Dialog>
        </div>

        {isLoading ? (
          <p className="text-sm text-muted-foreground">Loading...</p>
        ) : !announcements?.length ? (
          <div className="rounded-xl border border-dashed border-border p-8 text-center">
            <Megaphone className="h-10 w-10 mx-auto text-muted-foreground/40 mb-3" />
            <p className="text-sm text-muted-foreground">No announcements yet. Post one to reach your students!</p>
          </div>
        ) : (
          <div className="space-y-3">
            {announcements.map((a: any) => (
              <div key={a.id} className="rounded-xl border border-border bg-card p-4">
                <div className="flex items-start justify-between">
                  <div>
                    <h3 className="text-sm font-semibold">{a.title}</h3>
                    <p className="text-xs text-muted-foreground mt-0.5">
                      {a.courses?.title || 'All courses'} • {timeAgo(a.created_at)}
                    </p>
                  </div>
                </div>
                <p className="text-sm text-muted-foreground mt-2">{a.content}</p>
              </div>
            ))}
          </div>
        )}
      </div>
    </CreatorDashboardLayout>
  );
};

export default CreatorAnnouncements;
