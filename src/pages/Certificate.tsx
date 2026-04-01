import { useAuth } from '@/contexts/AuthContext';
import DashboardLayout from '@/components/dashboard/DashboardLayout';
import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { Link } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { Award, Download, Share2 } from 'lucide-react';
import { useRef } from 'react';

const Certificate = () => {
  const { user, profile } = useAuth();
  const certRef = useRef<HTMLDivElement>(null);

  const { data: certificates } = useQuery({
    queryKey: ['my-certificates', user?.id],
    queryFn: async () => {
      const { data } = await supabase
        .from('certificates')
        .select('*, courses(title), creator:profiles!certificates_creator_id_fkey(full_name, creator_display_name)')
        .eq('student_id', user!.id)
        .order('issued_at', { ascending: false });
      return data || [];
    },
    enabled: !!user,
  });

  const handleDownload = async (cert: any) => {
    try {
      const { default: html2canvas } = await import('html2canvas');
      const el = document.getElementById(`cert-${cert.id}`);
      if (!el) return;
      const canvas = await html2canvas(el, { scale: 2, backgroundColor: '#ffffff' });
      const link = document.createElement('a');
      link.download = `Backupshala-Certificate-${cert.certificate_code}.png`;
      link.href = canvas.toDataURL('image/png');
      link.click();
    } catch {}
  };

  const handleShare = (cert: any) => {
    const msg = encodeURIComponent(
      `I earned a certificate for "${(cert as any).courses?.title}" on Backupshala! 🎓 Verify: ${window.location.origin}/verify/${cert.certificate_code}`
    );
    window.open(`https://wa.me/?text=${msg}`, '_blank');
  };

  if (!certificates || certificates.length === 0) {
    return (
      <DashboardLayout>
        <div className="space-y-6">
          <h1 className="font-heading text-2xl font-700">Certificates</h1>
          <div className="rounded-xl border border-border bg-card p-8 text-center">
            <Award className="mx-auto h-16 w-16 text-muted-foreground/30 mb-4" />
            <h2 className="font-heading text-xl font-600">No certificates yet</h2>
            <p className="mt-2 text-sm text-muted-foreground">Complete a course to earn your first certificate.</p>
            <Button asChild className="mt-6 rounded-md bg-accent hover:bg-accent/90 text-accent-foreground">
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
        <h1 className="font-heading text-2xl font-700">My Certificates 🎓</h1>
        <div className="grid gap-6 sm:grid-cols-2">
          {certificates.map((cert: any) => (
            <div key={cert.id} className="rounded-xl border border-border bg-card p-5 space-y-4">
              <div id={`cert-${cert.id}`} className="rounded-lg border border-primary/20 bg-white p-6 text-center" style={{ color: '#1c1917' }}>
                <p className="font-heading text-xs font-700 tracking-[0.2em]" style={{ color: '#16a34a' }}>BACKUPSHALA</p>
                <p className="font-heading text-lg font-700 mt-2">Certificate of Completion</p>
                <p className="text-xs mt-2" style={{ color: '#78716c' }}>This certifies that</p>
                <p className="font-heading text-xl font-800 mt-1" style={{ color: '#16a34a' }}>{profile?.full_name}</p>
                <p className="text-xs mt-1" style={{ color: '#78716c' }}>completed</p>
                <p className="font-heading text-sm font-600 mt-1">{cert.courses?.title}</p>
                <p className="text-xs mt-1" style={{ color: '#78716c' }}>
                  by {cert.creator?.creator_display_name || cert.creator?.full_name}
                </p>
                <p className="font-mono text-xs mt-2" style={{ color: '#16a34a' }}>{cert.certificate_code}</p>
              </div>
              <div className="flex gap-2">
                <Button onClick={() => handleDownload(cert)} size="sm" className="flex-1 rounded-md"><Download className="h-3 w-3 mr-1" /> Download</Button>
                <Button onClick={() => handleShare(cert)} size="sm" variant="outline" className="flex-1 rounded-md"><Share2 className="h-3 w-3 mr-1" /> Share</Button>
              </div>
              <Link to={`/verify/${cert.certificate_code}`} className="block text-center text-xs text-primary hover:underline">Verify certificate</Link>
            </div>
          ))}
        </div>
      </div>
    </DashboardLayout>
  );
};

export default Certificate;
