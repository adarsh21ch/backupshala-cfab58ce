import { useState, useEffect } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Plus, Trash2, Save } from 'lucide-react';
import { toast } from 'sonner';

interface Question {
  question: string;
  options: string[];
  correctIndex: number;
}

interface QuizBuilderProps {
  moduleId: string;
}

const QuizBuilder = ({ moduleId }: QuizBuilderProps) => {
  const queryClient = useQueryClient();
  const [questions, setQuestions] = useState<Question[]>([]);
  const [passingScore, setPassingScore] = useState(60);

  const { data: existing } = useQuery({
    queryKey: ['quiz-builder', moduleId],
    queryFn: async () => {
      const { data } = await supabase
        .from('module_quizzes')
        .select('*')
        .eq('module_id', moduleId)
        .maybeSingle();
      return data;
    },
    enabled: !!moduleId,
  });

  useEffect(() => {
    if (existing) {
      setQuestions(existing.questions as any || []);
      setPassingScore(existing.passing_score || 60);
    }
  }, [existing]);

  const saveMutation = useMutation({
    mutationFn: async () => {
      const { error } = await supabase
        .from('module_quizzes')
        .upsert({
          module_id: moduleId,
          questions: questions as any,
          passing_score: passingScore,
          updated_at: new Date().toISOString(),
        }, { onConflict: 'module_id' });
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['quiz-builder', moduleId] });
      toast.success('Quiz saved!');
    },
    onError: (err: any) => toast.error(err.message),
  });

  const addQuestion = () => {
    if (questions.length >= 5) { toast.error('Max 5 questions'); return; }
    setQuestions([...questions, { question: '', options: ['', '', '', ''], correctIndex: 0 }]);
  };

  const updateQuestion = (qi: number, field: string, value: any) => {
    const updated = [...questions];
    (updated[qi] as any)[field] = value;
    setQuestions(updated);
  };

  const updateOption = (qi: number, oi: number, value: string) => {
    const updated = [...questions];
    updated[qi].options[oi] = value;
    setQuestions(updated);
  };

  const removeQuestion = (qi: number) => {
    setQuestions(questions.filter((_, i) => i !== qi));
  };

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <Label className="text-sm font-semibold">Quiz Questions ({questions.length}/5)</Label>
        <div className="flex gap-2">
          <Button variant="outline" size="sm" onClick={addQuestion} disabled={questions.length >= 5} className="gap-1 text-xs">
            <Plus className="h-3 w-3" /> Add Question
          </Button>
          {questions.length > 0 && (
            <Button size="sm" onClick={() => saveMutation.mutate()} disabled={saveMutation.isPending} className="gap-1 text-xs">
              <Save className="h-3 w-3" /> Save Quiz
            </Button>
          )}
        </div>
      </div>

      {questions.length > 0 && (
        <div className="flex items-center gap-2">
          <Label className="text-xs">Passing Score:</Label>
          <Input
            type="number"
            min={1}
            max={100}
            value={passingScore}
            onChange={e => setPassingScore(Number(e.target.value))}
            className="w-20 text-xs rounded-lg"
          />
          <span className="text-xs text-muted-foreground">%</span>
        </div>
      )}

      {questions.map((q, qi) => (
        <div key={qi} className="rounded-lg border border-border p-4 space-y-3">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold text-muted-foreground">Question {qi + 1}</span>
            <Button variant="ghost" size="sm" onClick={() => removeQuestion(qi)} className="text-destructive h-7 w-7 p-0">
              <Trash2 className="h-3 w-3" />
            </Button>
          </div>
          <Input
            value={q.question}
            onChange={e => updateQuestion(qi, 'question', e.target.value)}
            placeholder="Enter question..."
            className="rounded-lg text-sm"
          />
          <div className="space-y-2">
            {q.options.map((opt, oi) => (
              <div key={oi} className="flex items-center gap-2">
                <button
                  onClick={() => updateQuestion(qi, 'correctIndex', oi)}
                  className={`h-5 w-5 rounded-full border-2 flex items-center justify-center shrink-0 ${
                    q.correctIndex === oi ? 'border-primary bg-primary' : 'border-border'
                  }`}
                >
                  {q.correctIndex === oi && <span className="text-[8px] text-primary-foreground">✓</span>}
                </button>
                <Input
                  value={opt}
                  onChange={e => updateOption(qi, oi, e.target.value)}
                  placeholder={`Option ${String.fromCharCode(65 + oi)}`}
                  className="rounded-lg text-xs flex-1"
                />
              </div>
            ))}
            <p className="text-[10px] text-muted-foreground">Click the circle to mark the correct answer</p>
          </div>
        </div>
      ))}

      {questions.length === 0 && (
        <div className="rounded-lg border border-dashed border-border p-6 text-center">
          <p className="text-xs text-muted-foreground">No quiz questions yet. Add up to 5 MCQ questions.</p>
          <p className="text-[10px] text-muted-foreground mt-1">Students must pass the quiz to mark the module as complete.</p>
        </div>
      )}
    </div>
  );
};

export default QuizBuilder;
