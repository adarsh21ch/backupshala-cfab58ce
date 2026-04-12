import { useState, useEffect, useCallback } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { Textarea } from '@/components/ui/textarea';
import { StickyNote, Save } from 'lucide-react';

interface ModuleNotesProps {
  moduleId: string;
}

const ModuleNotes = ({ moduleId }: ModuleNotesProps) => {
  const { user } = useAuth();
  const queryClient = useQueryClient();
  const [content, setContent] = useState('');
  const [saveStatus, setSaveStatus] = useState<'saved' | 'saving' | 'unsaved'>('saved');

  const { data: note } = useQuery({
    queryKey: ['module-note', user?.id, moduleId],
    queryFn: async () => {
      const { data } = await supabase
        .from('user_module_notes')
        .select('*')
        .eq('user_id', user!.id)
        .eq('module_id', moduleId)
        .maybeSingle();
      return data;
    },
    enabled: !!user && !!moduleId,
  });

  useEffect(() => {
    if (note) setContent(note.content || '');
    else setContent('');
  }, [note, moduleId]);

  const saveMutation = useMutation({
    mutationFn: async (text: string) => {
      const { error } = await supabase
        .from('user_module_notes')
        .upsert({
          user_id: user!.id,
          module_id: moduleId,
          content: text,
          updated_at: new Date().toISOString(),
        }, { onConflict: 'user_id,module_id' });
      if (error) throw error;
    },
    onSuccess: () => {
      setSaveStatus('saved');
      queryClient.invalidateQueries({ queryKey: ['module-note', user?.id, moduleId] });
    },
    onError: () => setSaveStatus('unsaved'),
  });

  // Debounced auto-save
  useEffect(() => {
    if (!user || content === (note?.content || '')) return;
    setSaveStatus('unsaved');
    const timer = setTimeout(() => {
      setSaveStatus('saving');
      saveMutation.mutate(content);
    }, 1000);
    return () => clearTimeout(timer);
  }, [content]);

  return (
    <div className="space-y-2">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <StickyNote className="h-4 w-4 text-warning" />
          <span className="text-sm font-medium">My Notes</span>
        </div>
        <span className="text-[10px] text-muted-foreground">
          {saveStatus === 'saving' ? '⏳ Saving...' : saveStatus === 'saved' ? '✓ Saved' : '● Unsaved'}
        </span>
      </div>
      <Textarea
        value={content}
        onChange={e => setContent(e.target.value)}
        placeholder="Type your notes here... they auto-save."
        className="bg-secondary border-border rounded-lg text-sm min-h-[120px] resize-y"
      />
    </div>
  );
};

export default ModuleNotes;
