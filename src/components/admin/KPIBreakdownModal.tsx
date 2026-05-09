import { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Tabs, TabsList, TabsTrigger, TabsContent } from '@/components/ui/tabs';
import { formatINR } from '@/lib/format';

export type KPIMetric = 'users' | 'creators' | 'enrollments' | 'courses' | 'revenue';
type Period = 'daily' | 'weekly' | 'monthly' | 'yearly';

interface Props {
  metric: KPIMetric;
  onClose: () => void;
}

const METRIC_LABELS: Record<KPIMetric, string> = {
  users: 'User Registrations',
  creators: 'Creator Signups',
  enrollments: 'Enrollments',
  courses: 'New Creator Courses',
  revenue: 'Revenue',
};

function getDateRanges(period: Period): { label: string; start: Date }[] {
  const now = new Date();
  if (period === 'daily') {
    return Array.from({ length: 7 }, (_, i) => {
      const d = new Date(now);
      d.setDate(d.getDate() - (6 - i));
      d.setHours(0, 0, 0, 0);
      return { label: d.toLocaleDateString('en-IN', { weekday: 'short', day: 'numeric', month: 'short' }), start: d };
    });
  }
  if (period === 'weekly') {
    return Array.from({ length: 8 }, (_, i) => {
      const d = new Date(now);
      d.setDate(d.getDate() - (7 - i) * 7);
      d.setHours(0, 0, 0, 0);
      return { label: `Week of ${d.toLocaleDateString('en-IN', { day: 'numeric', month: 'short' })}`, start: d };
    });
  }
  if (period === 'monthly') {
    return Array.from({ length: 6 }, (_, i) => {
      const d = new Date(now.getFullYear(), now.getMonth() - (5 - i), 1);
      return { label: d.toLocaleDateString('en-IN', { month: 'short', year: 'numeric' }), start: d };
    });
  }
  return Array.from({ length: 3 }, (_, i) => {
    const d = new Date(now.getFullYear() - (2 - i), 0, 1);
    return { label: d.getFullYear().toString(), start: d };
  });
}

function getEnd(period: Period, start: Date): Date {
  const end = new Date(start);
  if (period === 'daily') end.setDate(end.getDate() + 1);
  else if (period === 'weekly') end.setDate(end.getDate() + 7);
  else if (period === 'monthly') end.setMonth(end.getMonth() + 1);
  else end.setFullYear(end.getFullYear() + 1);
  return end;
}

async function fetchRange(metric: KPIMetric, start: Date, end: Date): Promise<number> {
  const startISO = start.toISOString();
  const endISO = end.toISOString();
  if (metric === 'users') {
    const { count } = await supabase.from('profiles').select('*', { count: 'exact', head: true })
      .gte('created_at', startISO).lt('created_at', endISO);
    return count ?? 0;
  }
  if (metric === 'creators') {
    const { count } = await supabase.from('profiles').select('*', { count: 'exact', head: true })
      .eq('is_creator', true).gte('created_at', startISO).lt('created_at', endISO);
    return count ?? 0;
  }
  if (metric === 'enrollments') {
    const { count } = await supabase.from('enrollments').select('*', { count: 'exact', head: true })
      .gte('enrolled_at', startISO).lt('enrolled_at', endISO);
    return count ?? 0;
  }
  if (metric === 'courses') {
    const { count } = await supabase.from('courses').select('*', { count: 'exact', head: true })
      .eq('is_platform_course', false).gte('created_at', startISO).lt('created_at', endISO);
    return count ?? 0;
  }
  // revenue
  const { data } = await supabase.from('payments').select('amount_total')
    .in('status', ['paid', 'success']).gte('created_at', startISO).lt('created_at', endISO);
  return (data ?? []).reduce((s, p: { amount_total: number | null }) => s + Number(p.amount_total ?? 0), 0);
}

export function KPIBreakdownModal({ metric, onClose }: Props) {
  const [period, setPeriod] = useState<Period>('daily');
  const isRevenue = metric === 'revenue';

  const { data: rows, isLoading } = useQuery({
    queryKey: ['kpi-breakdown', metric, period],
    queryFn: async () => {
      const ranges = getDateRanges(period);
      const results = await Promise.all(
        ranges.map(({ start }) => fetchRange(metric, start, getEnd(period, start)))
      );
      return ranges.map((r, i) => ({ label: r.label, value: results[i] }));
    },
    staleTime: 60_000,
  });

  const maxValue = Math.max(...((rows ?? []).map((r) => r.value)), 1);
  const fmt = (v: number) => (isRevenue ? formatINR(v) : v.toLocaleString('en-IN'));

  return (
    <Dialog open onOpenChange={(o) => !o && onClose()}>
      <DialogContent className="max-w-2xl">
        <DialogHeader>
          <DialogTitle className="font-heading">{METRIC_LABELS[metric]} — Breakdown</DialogTitle>
        </DialogHeader>

        <Tabs value={period} onValueChange={(v) => setPeriod(v as Period)}>
          <TabsList className="grid grid-cols-4 w-full">
            <TabsTrigger value="daily">Daily</TabsTrigger>
            <TabsTrigger value="weekly">Weekly</TabsTrigger>
            <TabsTrigger value="monthly">Monthly</TabsTrigger>
            <TabsTrigger value="yearly">Yearly</TabsTrigger>
          </TabsList>

          {(['daily', 'weekly', 'monthly', 'yearly'] as Period[]).map((p) => (
            <TabsContent key={p} value={p} className="mt-4">
              {isLoading ? (
                <div className="py-12 text-center text-sm text-muted-foreground">Loading…</div>
              ) : (
                <div className="space-y-2">
                  {(rows ?? []).map((row) => (
                    <div key={row.label} className="grid grid-cols-[140px_1fr_90px] items-center gap-3">
                      <span className="text-xs text-muted-foreground truncate">{row.label}</span>
                      <div className="h-6 rounded bg-muted relative overflow-hidden">
                        <div
                          className="h-full bg-accent transition-all"
                          style={{ width: `${(row.value / maxValue) * 100}%` }}
                        />
                      </div>
                      <span className="text-sm font-semibold text-right">{fmt(row.value)}</span>
                    </div>
                  ))}
                  {(rows ?? []).every((r) => r.value === 0) && (
                    <p className="text-center text-sm text-muted-foreground py-6">No data in this period</p>
                  )}
                </div>
              )}
            </TabsContent>
          ))}
        </Tabs>
      </DialogContent>
    </Dialog>
  );
}

export default KPIBreakdownModal;
