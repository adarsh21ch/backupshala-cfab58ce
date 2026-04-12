import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { MessageSquare, Send, ChevronDown, ChevronUp, Trash2, Badge } from 'lucide-react';
import { toast } from 'sonner';
import { timeAgo } from '@/lib/format';

interface CourseDiscussionsProps {
  courseId: string;
  moduleId?: string;
  creatorId: string;
}

const CourseDiscussions = ({ courseId, moduleId, creatorId }: CourseDiscussionsProps) => {
  const { user } = useAuth();
  const queryClient = useQueryClient();
  const [newQuestion, setNewQuestion] = useState('');
  const [replyTo, setReplyTo] = useState<string | null>(null);
  const [replyText, setReplyText] = useState('');
  const [expandedThreads, setExpandedThreads] = useState<Set<string>>(new Set());

  const { data: discussions, isLoading } = useQuery({
    queryKey: ['course-discussions', courseId, moduleId],
    queryFn: async () => {
      let query = supabase
        .from('course_discussions')
        .select('*, profiles(full_name, avatar_url)')
        .eq('course_id', courseId)
        .eq('is_deleted', false)
        .order('created_at', { ascending: false });
      if (moduleId) {
        query = query.or(`module_id.eq.${moduleId},module_id.is.null`);
      }
      const { data } = await query;
      return data || [];
    },
    enabled: !!courseId,
  });

  const topLevel = discussions?.filter(d => !d.parent_id) || [];
  const getReplies = (parentId: string) => discussions?.filter(d => d.parent_id === parentId) || [];

  const postMutation = useMutation({
    mutationFn: async ({ content, parentId }: { content: string; parentId?: string }) => {
      const { error } = await supabase.from('course_discussions').insert({
        course_id: courseId,
        user_id: user!.id,
        module_id: moduleId || null,
        parent_id: parentId || null,
        content: content.trim(),
      });
      if (error) throw error;

      // Notify creator if this is a new top-level question
      if (!parentId && user!.id !== creatorId) {
        await supabase.from('notifications').insert({
          user_id: creatorId,
          title: '💬 New discussion question',
          message: content.slice(0, 100),
          type: 'discussion',
          action_url: `/courses/${courseId}`,
        });
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['course-discussions', courseId] });
      setNewQuestion('');
      setReplyTo(null);
      setReplyText('');
    },
    onError: (err: any) => toast.error(err.message || 'Failed to post'),
  });

  const deleteMutation = useMutation({
    mutationFn: async (discussionId: string) => {
      const { error } = await supabase
        .from('course_discussions')
        .update({ is_deleted: true })
        .eq('id', discussionId);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['course-discussions', courseId] });
      toast.success('Post deleted');
    },
  });

  const toggleThread = (id: string) => {
    setExpandedThreads(prev => {
      const next = new Set(prev);
      next.has(id) ? next.delete(id) : next.add(id);
      return next;
    });
  };

  const isCreator = user?.id === creatorId;

  return (
    <div className="space-y-4">
      {/* New question */}
      <div className="space-y-2">
        <Textarea
          value={newQuestion}
          onChange={e => setNewQuestion(e.target.value.slice(0, 1000))}
          placeholder="Ask a question about this course..."
          className="bg-secondary border-border rounded-lg text-sm min-h-[80px]"
        />
        <div className="flex justify-between items-center">
          <span className="text-[10px] text-muted-foreground">{newQuestion.length}/1000</span>
          <Button
            size="sm"
            disabled={!newQuestion.trim() || postMutation.isPending}
            onClick={() => postMutation.mutate({ content: newQuestion })}
            className="rounded-lg gap-1"
          >
            <Send className="h-3 w-3" /> Post Question
          </Button>
        </div>
      </div>

      {isLoading ? (
        <p className="text-sm text-muted-foreground text-center py-8">Loading discussions...</p>
      ) : topLevel.length === 0 ? (
        <div className="text-center py-8">
          <MessageSquare className="h-8 w-8 mx-auto text-muted-foreground/40 mb-2" />
          <p className="text-sm text-muted-foreground">No discussions yet. Be the first to ask!</p>
        </div>
      ) : (
        <div className="space-y-3">
          {topLevel.map(post => {
            const replies = getReplies(post.id);
            const isExpanded = expandedThreads.has(post.id);
            const postProfile = post.profiles as any;
            const isPostCreator = post.user_id === creatorId;

            return (
              <div key={post.id} className="rounded-xl border border-border bg-card p-4 space-y-3">
                <div className="flex items-start gap-3">
                  <div className="h-8 w-8 rounded-full bg-primary/10 flex items-center justify-center text-xs font-bold text-primary shrink-0">
                    {postProfile?.full_name?.[0]?.toUpperCase() || '?'}
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2">
                      <span className="text-sm font-medium">{postProfile?.full_name || 'Student'}</span>
                      {isPostCreator && (
                        <span className="rounded-full bg-accent/10 text-accent px-2 py-0.5 text-[10px] font-semibold">Creator</span>
                      )}
                      <span className="text-[10px] text-muted-foreground">{timeAgo(post.created_at)}</span>
                    </div>
                    <p className="text-sm text-foreground mt-1 whitespace-pre-wrap">{post.content}</p>
                  </div>
                  {(isCreator || post.user_id === user?.id) && (
                    <Button variant="ghost" size="sm" onClick={() => deleteMutation.mutate(post.id)} className="text-destructive h-7 w-7 p-0 shrink-0">
                      <Trash2 className="h-3 w-3" />
                    </Button>
                  )}
                </div>

                {/* Reply count + expand */}
                <div className="flex items-center gap-3">
                  {replies.length > 0 && (
                    <button onClick={() => toggleThread(post.id)} className="flex items-center gap-1 text-xs text-primary hover:underline">
                      {isExpanded ? <ChevronUp className="h-3 w-3" /> : <ChevronDown className="h-3 w-3" />}
                      {replies.length} {replies.length === 1 ? 'reply' : 'replies'}
                    </button>
                  )}
                  <button onClick={() => setReplyTo(replyTo === post.id ? null : post.id)} className="text-xs text-muted-foreground hover:text-foreground">
                    Reply
                  </button>
                </div>

                {/* Replies */}
                {isExpanded && replies.map(reply => {
                  const replyProfile = reply.profiles as any;
                  const isReplyCreator = reply.user_id === creatorId;
                  return (
                    <div key={reply.id} className="ml-8 flex items-start gap-3 border-l-2 border-border pl-4">
                      <div className="h-6 w-6 rounded-full bg-secondary flex items-center justify-center text-[10px] font-bold shrink-0">
                        {replyProfile?.full_name?.[0]?.toUpperCase() || '?'}
                      </div>
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2">
                          <span className="text-xs font-medium">{replyProfile?.full_name || 'Student'}</span>
                          {isReplyCreator && (
                            <span className="rounded-full bg-accent/10 text-accent px-1.5 py-0.5 text-[9px] font-semibold">Creator</span>
                          )}
                          <span className="text-[10px] text-muted-foreground">{timeAgo(reply.created_at)}</span>
                        </div>
                        <p className="text-xs text-foreground mt-0.5 whitespace-pre-wrap">{reply.content}</p>
                      </div>
                    </div>
                  );
                })}

                {/* Reply input */}
                {replyTo === post.id && (
                  <div className="ml-8 flex gap-2">
                    <Textarea
                      value={replyText}
                      onChange={e => setReplyText(e.target.value.slice(0, 1000))}
                      placeholder="Write a reply..."
                      className="bg-secondary border-border rounded-lg text-xs min-h-[60px] flex-1"
                    />
                    <Button
                      size="sm"
                      disabled={!replyText.trim() || postMutation.isPending}
                      onClick={() => { postMutation.mutate({ content: replyText, parentId: post.id }); setExpandedThreads(prev => new Set(prev).add(post.id)); }}
                      className="rounded-lg self-end"
                    >
                      <Send className="h-3 w-3" />
                    </Button>
                  </div>
                )}
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
};

export default CourseDiscussions;
