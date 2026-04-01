import { useAuth } from '@/contexts/AuthContext';
import DashboardLayout from '@/components/dashboard/DashboardLayout';
import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { Link } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { Progress } from '@/components/ui/progress';
import { Award, Download, Share2, CheckCircle } from 'lucide-react';
import { useRef } from 'react';

const Certificate = () => {
  const { user, profile } = useAuth();
  const certRef = useRef<HTMLDivElement>(null);

  const { data: certificate } = useQuery({
    queryKey: ['certificate', user?.id],
    queryFn: async () => {
      const { data } = await supabase.from('certificates').select('*').eq('user_id', user!.id).maybeSingle();
      return data;
    },
    enabled: !!user,
  });

  const { data: courses } = useQuery({
    queryKey: ['courses'],
    queryFn: async () => {
      const { data } = await supabase.from('courses').select('*, modules(*)').eq('is_published', true).order('order_index');
      return data || [];
    },
  });

  const { data: completions } = useQuery({
    queryKey: ['completions', user?.id],
    queryFn: async () => {
      const { data } = await supabase.from('module_completions').select('*').eq('user_id', user!.id);
      return data || [];
    },
    enabled: !!user,
  });

  const completedModuleIds = new Set(completions?.map(c => c.module_id) || []);
  const totalModules = courses?.reduce((sum, c) => sum + (c.modules?.length || 0), 0) || 0;
  const totalCompleted = completions?.length || 0;
  const overallProgress = totalModules > 0 ? Math.round((totalCompleted / totalModules) * 100) : 0;

  const handleDownload = async () => {
    if (!certRef.current) return;
    try {
      const { default: html2canvas } = await import('html2canvas');
      const canvas = await html2canvas(certRef.current, { scale: 2, backgroundColor: '#ffffff' });
      const link = document.createElement('a');
      link.download = `Backupshala-Certificate-${certificate?.certificate_code}.png`;
      link.href = canvas.toDataURL('image/png');
      link.click();
    } catch {
      // html2canvas not available
    }
  };

  const handleShare = () => {
    const msg = encodeURIComponent(
      `I just earned my Digital Skills Certificate from Backupshala! 🎓 Verify at backupshala.com/verify/${certificate?.certificate_code} — enroll for just ₹249 at backupshala.com`
    );
    window.open(`https://wa.me/?text=${msg}`, '_blank');
  };

  if (!certificate) {
    return (
      <DashboardLayout>
        <div className="space-y-6">
          <h1 className="font-heading text-2xl font-700">Certificate</h1>
          <div className="rounded-2xl border border-border bg-card p-8 text-center">
            <Award className="mx-auto h-16 w-16 text-muted-foreground/30 mb-4" />
            <h2 className="font-heading text-xl font-600">You're {overallProgress}% of the way there!</h2>
            <p className="mt-2 text-sm text-muted-foreground">Complete all modules to earn your certificate.</p>
            <div className="mt-6 space-y-3 max-w-md mx-auto">
              {courses?.map(course => {
                const mods = course.modules || [];
                const completed = mods.filter((m: any) => completedModuleIds.has(m.id)).length;
                const prog = mods.length > 0 ? Math.round((completed / mods.length) * 100) : 0;
                return (
                  <div key={course.id}>
                    <div className="flex items-center justify-between text-xs mb-1">
                      <span className="truncate">{course.title}</span>
                      <span className="text-muted-foreground">{completed}/{mods.length}</span>
                    </div>
                    <Progress value={prog} className="h-1.5" />
                  </div>
                );
              })}
            </div>
            <Button asChild className="mt-6 rounded-pill bg-accent hover:bg-accent/90 text-accent-foreground">
              <Link to="/courses">Continue Learning</Link>
            </Button>
          </div>
        </div>
      </DashboardLayout>
    );
  }

  return (
    <DashboardLayout>
      <div className="space-y-6">
        <h1 className="font-heading text-2xl font-700">Your Certificate 🎓</h1>

        {/* Certificate card */}
        <div ref={certRef} className="mx-auto max-w-2xl rounded-2xl border-2 border-primary/20 bg-white p-8 md:p-12 text-center" style={{ color: '#1c1917' }}>
          <p className="font-heading text-sm font-700 tracking-[0.2em]" style={{ color: '#16a34a' }}>BACKUPSHALA</p>
          <div className="my-4 border-t border-b py-4" style={{ borderColor: '#e7e5e4' }}>
            <p className="font-heading text-2xl font-700">Certificate of Completion</p>
          </div>
          <p className="text-sm" style={{ color: '#78716c' }}>This is to certify that</p>
          <p className="mt-2 font-heading text-3xl font-800" style={{ color: '#16a34a' }}>{profile?.full_name}</p>
          <p className="mt-2 text-sm" style={{ color: '#78716c' }}>has successfully completed the</p>
          <p className="mt-1 font-heading text-lg font-600">Complete Digital Skills Bundle</p>
          <div className="mt-4 space-y-1">
            {courses?.map(c => (
              <div key={c.id} className="flex items-center justify-center gap-2 text-xs" style={{ color: '#78716c' }}>
                <CheckCircle className="h-3 w-3" style={{ color: '#16a34a' }} />
                {c.title}
              </div>
            ))}
          </div>
          <div className="mt-6">
            <p className="text-xs" style={{ color: '#78716c' }}>
              Completed on {new Date(certificate.issued_at).toLocaleDateString('en-IN', { day: 'numeric', month: 'long', year: 'numeric' })}
            </p>
            <p className="mt-1 font-mono text-sm font-500" style={{ color: '#16a34a' }}>{certificate.certificate_code}</p>
          </div>
        </div>

        <div className="flex flex-col items-center gap-3 sm:flex-row sm:justify-center">
          <Button onClick={handleDownload} className="rounded-pill bg-primary hover:bg-primary/90">
            <Download className="h-4 w-4 mr-2" /> Download Certificate
          </Button>
          <Button onClick={handleShare} variant="outline" className="rounded-pill">
            <Share2 className="h-4 w-4 mr-2" /> Share on WhatsApp
          </Button>
        </div>

        <p className="text-center text-xs text-muted-foreground">
          <Link to={`/verify/${certificate.certificate_code}`} className="text-primary hover:underline">
            Verify this certificate
          </Link>
        </p>
      </div>
    </DashboardLayout>
  );
};

export default Certificate;
