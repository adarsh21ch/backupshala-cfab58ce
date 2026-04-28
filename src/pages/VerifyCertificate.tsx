import { useParams, Link } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { CheckCircle, XCircle } from 'lucide-react';

const VerifyCertificate = () => {
  const { certCode } = useParams<{ certCode: string }>();

  const { data: certificate, isLoading } = useQuery({
    queryKey: ['verify', certCode],
    queryFn: async () => {
      if (!certCode) return null;
      const { data: certRows } = await supabase.rpc('verify_certificate', { _code: certCode });
      const cert = certRows?.[0];
      if (!cert) return null;
      const [{ data: course }, { data: creator }] = await Promise.all([
        supabase.from('courses').select('title').eq('id', cert.course_id).maybeSingle(),
        supabase.from('public_creator_profiles').select('full_name, creator_display_name').eq('id', cert.creator_id).maybeSingle(),
      ]);
      // Student name is intentionally not exposed publicly — show masked label.
      return {
        ...cert,
        courses: course,
        student_name: 'Verified Student',
        creator_name: creator?.creator_display_name || creator?.full_name || 'Creator',
      };
    },
    enabled: !!certCode,
  });

  return (
    <div className="flex min-h-screen items-center justify-center bg-background px-4">
      <div className="w-full max-w-md text-center">
        <Link to="/" className="inline-flex items-center mb-8">
          <span className="font-heading text-2xl font-800"><span className="text-foreground">Backup</span><span className="text-accent">shala</span></span>
        </Link>

        <h1 className="font-heading text-xl font-700 mb-2">Certificate Verification</h1>
        <p className="text-sm text-muted-foreground mb-6 font-mono">{certCode}</p>

        {isLoading ? (
          <div className="h-8 w-8 mx-auto animate-spin rounded-full border-4 border-primary border-t-transparent" />
        ) : certificate ? (
          <div className="rounded-xl border border-primary/30 bg-primary/5 p-6">
            <CheckCircle className="mx-auto h-12 w-12 text-primary mb-3" />
            <p className="font-heading text-lg font-700 text-primary">✓ Authentic Certificate</p>
            <p className="mt-2 text-sm">
              Issued to: <span className="font-semibold">{certificate.student_name}</span>
            </p>
            <p className="text-sm text-muted-foreground">
              Course: <span className="font-medium">{(certificate as any).courses?.title}</span>
            </p>
            <p className="text-sm text-muted-foreground">
              By: {certificate.creator_name}
            </p>
            <p className="text-sm text-muted-foreground mt-1">
              Completed on {new Date(certificate.issued_at).toLocaleDateString('en-IN', { day: 'numeric', month: 'long', year: 'numeric' })}
            </p>
          </div>
        ) : (
          <div className="rounded-xl border border-destructive/30 bg-destructive/5 p-6">
            <XCircle className="mx-auto h-12 w-12 text-destructive mb-3" />
            <p className="font-heading text-lg font-700 text-destructive">Certificate not found</p>
            <p className="mt-2 text-sm text-muted-foreground">This certificate code was not found in our records.</p>
          </div>
        )}
      </div>
    </div>
  );
};

export default VerifyCertificate;
