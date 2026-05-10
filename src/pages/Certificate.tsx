import { useAuth } from '@/contexts/AuthContext';
import DashboardLayout from '@/components/dashboard/DashboardLayout';
import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { Link } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { Award, Download, Share2, ExternalLink } from 'lucide-react';
import { Skeleton } from '@/components/ui/skeleton';
import { Progress } from '@/components/ui/progress';
import BackButton from '@/components/BackButton';
import { downloadCertificatePdf } from '@/lib/certificatePdf';
import { usePlatformSettings } from '@/hooks/usePlatformSettings';

const Certificate = () => {
  const { user, profile } = useAuth();
  const { getSetting } = usePlatformSettings();

  const { data: certificates, isLoading } = useQuery({
    queryKey: ['my-certificates', user?.id],
    queryFn: async () => {
      const { data } = await supabase
        .from('certificates')
        .select('*, courses(title, thumbnail_url), creator:profiles!certificates_creator_id_fkey(full_name, creator_display_name)')
        .eq('student_id', user!.id)
        .order('issued_at', { ascending: false });
      return data || [];
    },
    enabled: !!user,
  });

  // Get nearest-to-completion course for empty state
  const { data: nearestCourse } = useQuery({
    queryKey: ['nearest-completion', user?.id],
    queryFn: async () => {
      const { data: enrollments } = await supabase
        .from('enrollments')
        .select('course_id, courses(title, total_modules)')
        .eq('student_id', user!.id)
        .eq('is_completed', false);
      if (!enrollments?.length) return null;
      const { data: completions } = await supabase
        .from('module_completions')
        .select('course_id')
        .eq('student_id', user!.id);
      const countByCourse = completions?.reduce((acc: Record<string, number>, c) => {
        acc[c.course_id] = (acc[c.course_id] || 0) + 1;
        return acc;
      }, {}) || {};
      let best: any = null;
      let bestProgress = -1;
      for (const e of enrollments as any[]) {
        const total = e.courses?.total_modules || 0;
        if (total === 0) continue;
        const done = countByCourse[e.course_id] || 0;
        const pct = done / total;
        if (pct > bestProgress) { bestProgress = pct; best = { ...e, done, total, pct }; }
      }
      return best;
    },
    enabled: !!user && (!certificates || certificates.length === 0),
  });

  const handleDownload = async (cert: any) => {
    try {
      await downloadCertificatePdf({
        studentName: profile?.full_name || 'Student',
        courseTitle: cert.courses?.title || 'Course',
        creatorName: cert.creator?.creator_display_name || cert.creator?.full_name || 'Creator',
        issuedAt: cert.issued_at,
        certificateCode: cert.certificate_code,
        bodyLine: getSetting('certificate_body_line', 'has successfully completed'),
        signatureUrl: getSetting('certificate_signature_url', '') || null,
      });
    } catch (e) {
      console.error('Cert PDF error', e);
    }
  };

  const handleShare = (cert: any) => {
    const msg = encodeURIComponent(
      `🎓 I earned a certificate for "${(cert as any).courses?.title}" on Backupshala!\n\nVerify: ${window.location.origin}/verify/${cert.certificate_code}`
    );
    window.open(`https://wa.me/?text=${msg}`, '_blank');
  };

  return (
    <DashboardLayout>
      <div className="space-y-6">
        <BackButton fallback="/dashboard" />
        <h1 className="font-heading text-2xl font-700">My Certificates 🎓</h1>

        {isLoading ? (
          <div className="grid gap-6 sm:grid-cols-2">
            {[...Array(2)].map((_, i) => <Skeleton key={i} className="h-64 rounded-xl" />)}
          </div>
        ) : certificates && certificates.length > 0 ? (
          <div className="grid gap-6 sm:grid-cols-2">
            {certificates.map((cert: any) => (
              <div key={cert.id} className="rounded-xl border border-border bg-card overflow-hidden">
                {cert.courses?.thumbnail_url && (
                  <div className="relative h-32 overflow-hidden">
                    <img src={cert.courses.thumbnail_url} alt="" className="w-full h-full object-cover opacity-40" />
                    <div className="absolute inset-0 flex items-center justify-center">
                      <Award className="h-12 w-12 text-accent" />
                    </div>
                  </div>
                )}
                <div className="p-5 space-y-3">
                  <h3 className="font-heading text-base font-600">{cert.courses?.title}</h3>
                  <p className="text-xs text-muted-foreground">
                    by {cert.creator?.creator_display_name || cert.creator?.full_name}
                  </p>
                  <p className="text-xs text-muted-foreground">
                    Earned {new Date(cert.issued_at).toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' })}
                  </p>
                  <p className="font-mono text-xs text-primary">{cert.certificate_code}</p>
                  <div className="flex gap-2">
                    <Button onClick={() => handleDownload(cert)} size="sm" className="flex-1 rounded-md">
                      <Download className="h-3 w-3 mr-1" /> Download
                    </Button>
                    <Button onClick={() => handleShare(cert)} size="sm" variant="outline" className="flex-1 rounded-md">
                      <Share2 className="h-3 w-3 mr-1" /> Share
                    </Button>
                  </div>
                  <Link to={`/verify/${cert.certificate_code}`} className="flex items-center justify-center gap-1 text-xs text-primary hover:underline">
                    <ExternalLink className="h-3 w-3" /> Verify
                  </Link>
                </div>

              </div>
            ))}
          </div>
        ) : (
          <div className="rounded-xl border border-border bg-card p-8 text-center">
            <Award className="mx-auto h-16 w-16 text-muted-foreground/30 mb-4" />
            <h2 className="font-heading text-xl font-600">No certificates yet</h2>
            <p className="mt-2 text-sm text-muted-foreground">Complete a course to earn your first certificate.</p>
            {nearestCourse && (
              <div className="mt-6 mx-auto max-w-xs rounded-lg border border-border bg-secondary/30 p-4">
                <p className="text-xs text-muted-foreground mb-1">Closest to completion:</p>
                <p className="text-sm font-medium">{nearestCourse.courses?.title}</p>
                <Progress value={Math.round((nearestCourse.done / nearestCourse.total) * 100)} className="mt-2 h-1.5" />
                <p className="mt-1 text-xs text-muted-foreground">{nearestCourse.done}/{nearestCourse.total} modules</p>
                <Button asChild size="sm" className="mt-3 w-full rounded-md">
                  <Link to={`/courses/${nearestCourse.course_id}`}>Continue →</Link>
                </Button>
              </div>
            )}
            {!nearestCourse && (
              <Button asChild className="mt-6 rounded-md bg-accent hover:bg-accent/90 text-accent-foreground">
                <Link to="/explore">Explore Courses</Link>
              </Button>
            )}
          </div>
        )}
      </div>
    </DashboardLayout>
  );
};

export default Certificate;
