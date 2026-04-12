import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { Button } from '@/components/ui/button';
import { CheckCircle, XCircle, RotateCcw } from 'lucide-react';
import { toast } from 'sonner';

interface ModuleQuizProps {
  moduleId: string;
  courseId: string;
  onPass: () => void;
}

interface Question {
  question: string;
  options: string[];
  correctIndex: number;
}

const ModuleQuiz = ({ moduleId, courseId, onPass }: ModuleQuizProps) => {
  const { user } = useAuth();
  const queryClient = useQueryClient();
  const [answers, setAnswers] = useState<Record<number, number>>({});
  const [submitted, setSubmitted] = useState(false);
  const [score, setScore] = useState(0);

  const { data: quiz } = useQuery({
    queryKey: ['module-quiz', moduleId],
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

  const { data: bestAttempt } = useQuery({
    queryKey: ['quiz-best', user?.id, moduleId],
    queryFn: async () => {
      const { data } = await supabase
        .from('quiz_attempts')
        .select('*')
        .eq('user_id', user!.id)
        .eq('module_id', moduleId)
        .eq('passed', true)
        .maybeSingle();
      return data;
    },
    enabled: !!user && !!moduleId,
  });

  const submitMutation = useMutation({
    mutationFn: async () => {
      const questions: Question[] = quiz?.questions as any || [];
      let correct = 0;
      questions.forEach((q, i) => {
        if (answers[i] === q.correctIndex) correct++;
      });
      const pct = Math.round((correct / questions.length) * 100);
      const passed = pct >= (quiz?.passing_score || 60);

      await supabase.from('quiz_attempts').insert({
        user_id: user!.id,
        module_id: moduleId,
        score: pct,
        passed,
      });

      // Track streak
      if (passed) {
        const today = new Date().toISOString().split('T')[0];
        await supabase.from('learning_streaks').upsert({
          user_id: user!.id,
          streak_date: today,
          modules_completed: 1,
        }, { onConflict: 'user_id,streak_date' });
      }

      return { pct, passed };
    },
    onSuccess: ({ pct, passed }) => {
      setScore(pct);
      setSubmitted(true);
      queryClient.invalidateQueries({ queryKey: ['quiz-best', user?.id, moduleId] });
      if (passed) {
        toast.success(`Passed with ${pct}%! 🎉`);
        onPass();
      } else {
        toast.error(`Score: ${pct}%. Need ${quiz?.passing_score || 60}% to pass.`);
      }
    },
  });

  if (!quiz || !quiz.questions || (quiz.questions as any[]).length === 0) return null;
  if (bestAttempt) {
    return (
      <div className="rounded-xl border border-primary/30 bg-primary/5 p-4 flex items-center gap-3">
        <CheckCircle className="h-5 w-5 text-primary" />
        <div>
          <p className="text-sm font-medium text-primary">Quiz passed!</p>
          <p className="text-xs text-muted-foreground">Score: {bestAttempt.score}%</p>
        </div>
      </div>
    );
  }

  const questions: Question[] = quiz.questions as any;
  const passingScore = quiz.passing_score || 60;
  const allAnswered = Object.keys(answers).length === questions.length;

  const reset = () => { setAnswers({}); setSubmitted(false); setScore(0); };

  return (
    <div className="rounded-xl border border-border bg-card p-5 space-y-4">
      <div className="flex items-center justify-between">
        <h3 className="font-heading text-sm font-600">📝 Module Quiz</h3>
        <span className="text-[10px] text-muted-foreground">Pass: {passingScore}%</span>
      </div>

      {questions.map((q, qi) => (
        <div key={qi} className="space-y-2">
          <p className="text-sm font-medium">{qi + 1}. {q.question}</p>
          <div className="grid gap-1.5">
            {q.options.map((opt, oi) => {
              const selected = answers[qi] === oi;
              const isCorrect = submitted && oi === q.correctIndex;
              const isWrong = submitted && selected && oi !== q.correctIndex;
              return (
                <button
                  key={oi}
                  onClick={() => !submitted && setAnswers({ ...answers, [qi]: oi })}
                  disabled={submitted}
                  className={`text-left rounded-lg border px-3 py-2 text-sm transition-colors ${
                    isCorrect ? 'border-primary bg-primary/10 text-primary' :
                    isWrong ? 'border-destructive bg-destructive/10 text-destructive' :
                    selected ? 'border-accent bg-accent/10' :
                    'border-border hover:border-muted-foreground/40'
                  }`}
                >
                  <span className="font-medium mr-2">{String.fromCharCode(65 + oi)}.</span>{opt}
                  {isCorrect && <CheckCircle className="h-3 w-3 inline ml-2" />}
                  {isWrong && <XCircle className="h-3 w-3 inline ml-2" />}
                </button>
              );
            })}
          </div>
        </div>
      ))}

      {!submitted ? (
        <Button
          onClick={() => submitMutation.mutate()}
          disabled={!allAnswered || submitMutation.isPending}
          className="w-full rounded-lg"
        >
          Submit Quiz
        </Button>
      ) : (
        <div className="space-y-2">
          <div className={`rounded-lg p-3 text-center ${score >= passingScore ? 'bg-primary/10 text-primary' : 'bg-destructive/10 text-destructive'}`}>
            <p className="text-sm font-medium">Score: {score}%</p>
            <p className="text-xs">{score >= passingScore ? 'Passed! ✅' : `Need ${passingScore}% to pass`}</p>
          </div>
          {score < passingScore && (
            <Button variant="outline" onClick={reset} className="w-full gap-2 rounded-lg">
              <RotateCcw className="h-4 w-4" /> Try Again
            </Button>
          )}
        </div>
      )}
    </div>
  );
};

export default ModuleQuiz;
