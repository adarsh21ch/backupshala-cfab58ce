import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from '@/components/ui/accordion';
import { PlayCircle, Lock, Clock } from 'lucide-react';

interface Props {
  courseId?: string;
}

const AdvancedCurriculum = ({ courseId }: Props) => {
  const { data: modules, isLoading } = useQuery({
    queryKey: ['advanced-curriculum', courseId],
    queryFn: async () => {
      if (!courseId) return [];
      const { data: mods } = await supabase
        .from('modules')
        .select('id, title, description, order_index, duration_minutes, is_preview')
        .eq('course_id', courseId)
        .order('order_index', { ascending: true });
      if (!mods?.length) return [];
      const { data: chapters } = await supabase
        .from('course_chapters')
        .select('id, title, module_id, chapter_order, duration_minutes, is_preview')
        .eq('course_id', courseId)
        .eq('is_published', true)
        .order('chapter_order', { ascending: true });
      return mods.map((m) => ({
        ...m,
        chapters: (chapters || []).filter((c) => c.module_id === m.id),
      }));
    },
    enabled: !!courseId,
  });

  // Fallback static preview when no course is configured yet
  const fallback = [
    {
      id: 'fb-1',
      title: 'Advanced Earning Frameworks',
      description: 'Proven systems to monetize digital skills predictably',
      duration_minutes: 95,
      chapters: [
        { id: '1', title: 'Choosing your high-income skill', is_preview: true },
        { id: '2', title: 'Pricing & packaging your services', is_preview: false },
        { id: '3', title: 'Building your first ₹50k/month pipeline', is_preview: false },
      ],
    },
    {
      id: 'fb-2',
      title: 'Client Acquisition Playbook',
      description: 'Land paying clients without cold-calling',
      duration_minutes: 120,
      chapters: [
        { id: '4', title: 'Crafting an irresistible offer', is_preview: false },
        { id: '5', title: 'Outreach scripts that convert', is_preview: false },
        { id: '6', title: 'Closing high-ticket deals', is_preview: false },
      ],
    },
    {
      id: 'fb-3',
      title: 'Scaling & Mentorship',
      description: 'Live sessions, 1:1 guidance, and community',
      duration_minutes: 80,
      chapters: [
        { id: '7', title: 'Personal brand for premium pricing', is_preview: false },
        { id: '8', title: 'Outsourcing & scaling income', is_preview: false },
      ],
    },
  ];

  const list = modules && modules.length > 0 ? modules : fallback;
  const totalMinutes = list.reduce((sum, m: any) => sum + (m.duration_minutes || 0), 0);

  return (
    <section id="curriculum" className="container mx-auto px-4 py-20">
      <div className="max-w-4xl mx-auto">
        <div className="text-center mb-10">
          <span className="inline-block text-xs uppercase tracking-widest text-amber-400 font-bold mb-3">Curriculum</span>
          <h2 className="font-heading text-3xl md:text-4xl font-bold mb-3">What you'll master</h2>
          <p className="text-slate-400">
            {list.length} modules · {Math.round(totalMinutes / 60) || '8'}+ hours of premium content
          </p>
        </div>

        {isLoading ? (
          <div className="space-y-3">
            {[1, 2, 3].map((i) => (
              <div key={i} className="h-16 rounded-xl bg-white/5 animate-pulse" />
            ))}
          </div>
        ) : (
          <Accordion type="single" collapsible defaultValue={list[0]?.id} className="space-y-3">
            {list.map((m: any, idx: number) => (
              <AccordionItem
                key={m.id}
                value={m.id}
                className="rounded-xl border border-white/10 bg-white/[0.03] px-5 hover:border-amber-400/30 transition-colors data-[state=open]:border-amber-400/40 data-[state=open]:bg-amber-400/[0.04]"
              >
                <AccordionTrigger className="hover:no-underline py-5">
                  <div className="flex items-center gap-4 text-left flex-1">
                    <span className="font-heading text-2xl font-extrabold text-amber-400/80 w-8">
                      {String(idx + 1).padStart(2, '0')}
                    </span>
                    <div className="flex-1">
                      <p className="font-semibold text-white">{m.title}</p>
                      <p className="text-xs text-slate-400 mt-0.5">
                        {m.chapters?.length || 0} lessons
                        {m.duration_minutes ? ` · ${m.duration_minutes} min` : ''}
                      </p>
                    </div>
                  </div>
                </AccordionTrigger>
                <AccordionContent className="pb-5 pl-12 space-y-2">
                  {m.description && <p className="text-sm text-slate-400 mb-3">{m.description}</p>}
                  {m.chapters?.length ? (
                    m.chapters.map((c: any) => (
                      <div
                        key={c.id}
                        className="flex items-center gap-3 rounded-lg border border-white/5 bg-white/[0.02] px-3 py-2.5"
                      >
                        {c.is_preview ? (
                          <PlayCircle className="h-4 w-4 text-amber-400 shrink-0" />
                        ) : (
                          <Lock className="h-4 w-4 text-slate-500 shrink-0" />
                        )}
                        <span className="text-sm text-slate-200 flex-1">{c.title}</span>
                        {c.duration_minutes ? (
                          <span className="inline-flex items-center gap-1 text-[11px] text-slate-500">
                            <Clock className="h-3 w-3" /> {c.duration_minutes}m
                          </span>
                        ) : null}
                        {c.is_preview && (
                          <span className="text-[10px] font-bold uppercase text-amber-400">Preview</span>
                        )}
                      </div>
                    ))
                  ) : (
                    <p className="text-xs text-slate-500">Lessons coming soon.</p>
                  )}
                </AccordionContent>
              </AccordionItem>
            ))}
          </Accordion>
        )}
      </div>
    </section>
  );
};

export default AdvancedCurriculum;
