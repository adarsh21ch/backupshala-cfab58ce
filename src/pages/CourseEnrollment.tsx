import { useParams, Link, useNavigate } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import LandingNavbar from '@/components/landing/Navbar';
import Footer from '@/components/landing/Footer';
import { Button } from '@/components/ui/button';
import { Skeleton } from '@/components/ui/skeleton';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { CheckCircle, Lock, Play, Star, BookOpen, Clock, Award, Users, Share2, Loader2 } from 'lucide-react';
import { formatPrice } from '@/lib/format';
import { useToast } from '@/hooks/use-toast';
import { useState, useCallback } from 'react';

const loadRazorpayScript = (): Promise<boolean> => {
  return new Promise((resolve) => {
    if ((window as any).Razorpay) { resolve(true); return; }
    const script = document.createElement('script');
    script.src = 'https://checkout.razorpay.com/v1/checkout.js';
    script.onload = () => resolve(true);
    script.onerror = () => resolve(false);
    document.body.appendChild(script);
  });
};

const CourseEnrollment = () => {
  const { creatorSlug, courseSlug } = useParams<{ creatorSlug: string; courseSlug: string }>();
  const { user, profile } = useAuth();
  const navigate = useNavigate();
  const { toast } = useToast();
  const [paying, setPaying] = useState(false);
  const [showSuccess, setShowSuccess] = useState<{ courseName: string; invoiceNumber: string } | null>(null);

  const { data: course, isLoading } = useQuery({
    queryKey: ['course-enroll', courseSlug],
    queryFn: async () => {
      const { data } = await supabase
        .from('courses')
        .select('*, modules(*), profiles(full_name, avatar_url, bio, creator_display_name, creator_slug, creator_category, creator_website, creator_instagram, creator_youtube)')
        .eq('slug', courseSlug!)
        .eq('status', 'published')
        .single();
      if (data?.modules) data.modules.sort((a: any, b: any) => a.order_index - b.order_index);
      return data;
    },
    enabled: !!courseSlug,
  });

  const { data: enrollment, refetch: refetchEnrollment } = useQuery({
    queryKey: ['enrollment-check', user?.id, course?.id],
    queryFn: async () => {
      const { data } = await supabase
        .from('enrollments')
        .select('id')
        .eq('student_id', user!.id)
        .eq('course_id', course!.id)
        .maybeSingle();
      return data;
    },
    enabled: !!user && !!course?.id,
  });

  const { data: reviews } = useQuery({
    queryKey: ['course-reviews', course?.id],
    queryFn: async () => {
      const { data } = await supabase
        .from('course_reviews')
        .select('*, profiles(full_name)')
        .eq('course_id', course!.id)
        .order('created_at', { ascending: false });
      return data || [];
    },
    enabled: !!course?.id,
  });

  const handleEnroll = useCallback(async () => {
    if (!user) {
      navigate(`/signup?redirect=/c/${creatorSlug}/${courseSlug}`);
      return;
    }
    if (enrollment) {
      navigate('/courses');
      return;
    }
    if (!course) return;

    setPaying(true);
    try {
      const scriptLoaded = await loadRazorpayScript();
      if (!scriptLoaded) throw new Error('Failed to load payment gateway');

      const { data: orderData, error: orderError } = await supabase.functions.invoke('create-razorpay-order', {
        body: { course_id: course.id },
      });

      if (orderError || orderData?.error) {
        throw new Error(orderData?.error || orderError?.message || 'Failed to create order');
      }

      const options = {
        key: orderData.razorpay_key_id,
        amount: orderData.amount,
        currency: orderData.currency,
        name: 'Backupshala',
        description: orderData.course_title,
        order_id: orderData.razorpay_order_id,
        prefill: {
          name: profile?.full_name || '',
          email: profile?.email || user.email || '',
          contact: profile?.phone || '',
        },
        theme: { color: '#16a34a' },
        handler: async (response: any) => {
          try {
            const { data: verifyData, error: verifyError } = await supabase.functions.invoke('verify-razorpay-payment', {
              body: {
                razorpay_order_id: response.razorpay_order_id,
                razorpay_payment_id: response.razorpay_payment_id,
                razorpay_signature: response.razorpay_signature,
                course_id: course.id,
              },
            });

            if (verifyError || !verifyData?.success) {
              throw new Error(verifyData?.error || 'Verification failed');
            }

            setShowSuccess({ courseName: course.title, invoiceNumber: verifyData.invoice_number });
            refetchEnrollment();
            setTimeout(() => navigate('/courses'), 6000);
          } catch (err: any) {
            toast({ title: 'Payment verification failed', description: err.message, variant: 'destructive' });
          } finally {
            setPaying(false);
          }
        },
        modal: {
          ondismiss: () => setPaying(false),
        },
      };

      const rzp = new (window as any).Razorpay(options);
      rzp.on('payment.failed', (response: any) => {
        toast({ title: 'Payment failed', description: response.error?.description || 'Please try again.', variant: 'destructive' });
        setPaying(false);
      });
      rzp.open();
    } catch (err: any) {
      toast({ title: 'Error', description: err.message, variant: 'destructive' });
      setPaying(false);
    }
  }, [user, enrollment, course, profile, navigate, toast, creatorSlug, courseSlug, refetchEnrollment]);

  // Success overlay
  if (showSuccess) {
    return (
      <div className="fixed inset-0 z-50 flex items-center justify-center bg-background/95">
        <div className="text-center space-y-4 p-8 max-w-md">
          <div className="text-6xl">🎉</div>
          <h1 className="font-heading text-3xl font-800 text-primary">Enrollment Confirmed!</h1>
          <p className="text-muted-foreground">{showSuccess.courseName}</p>
          <p className="text-xs text-muted-foreground">Invoice: {showSuccess.invoiceNumber}</p>
          <Button onClick={() => navigate('/courses')} className="w-full rounded-md bg-primary hover:bg-primary/90 font-semibold">
            Start Learning Now
          </Button>
          <div className="rounded-lg border border-primary/20 bg-primary/5 p-3 text-center">
            <p className="text-xs text-primary font-medium">🎉 You're in! As an enrolled student, you now have access to our private community.</p>
            <Button variant="outline" size="sm" className="mt-2 rounded-md text-xs" onClick={() => window.open('https://t.me/backupshala', '_blank')}>
              📱 Join Telegram Community
            </Button>
          </div>
          <p className="text-xs text-muted-foreground">Redirecting in a few seconds…</p>
        </div>
      </div>
    );
  }

  if (isLoading) {
    return (
      <div className="min-h-screen">
        <LandingNavbar />
        <div className="container mx-auto px-4 py-12">
          <Skeleton className="h-8 w-96 mb-4" />
          <Skeleton className="h-4 w-full max-w-xl mb-8" />
          <Skeleton className="aspect-video max-w-2xl rounded-xl" />
        </div>
      </div>
    );
  }

  if (!course) {
    return (
      <div className="min-h-screen">
        <LandingNavbar />
        <div className="container mx-auto px-4 py-20 text-center">
          <h1 className="font-heading text-2xl font-700">Course not found</h1>
          <p className="mt-2 text-muted-foreground">This course doesn't exist or isn't published.</p>
        </div>
        <Footer />
      </div>
    );
  }

  const creator = course.profiles as any;
  const creatorName = creator?.creator_display_name || creator?.full_name || 'Creator';
  const modules = course.modules || [];
  const commissionAmount = Math.round(course.price * (course.commission_percent / 100));

  return (
    <div className="min-h-screen flex flex-col">
      <LandingNavbar />
      <div className="flex-1 container mx-auto px-4 py-8">
        <div className="grid gap-8 lg:grid-cols-3">
          {/* Main content */}
          <div className="lg:col-span-2 space-y-6">
            <div>
              <h1 className="font-heading text-2xl font-700 md:text-3xl">{course.title}</h1>
              <p className="mt-2 text-muted-foreground">{course.short_description}</p>
              <div className="flex items-center gap-4 mt-3 text-sm text-muted-foreground">
                {course.rating > 0 && (
                  <span className="flex items-center gap-1">
                    <Star className="h-4 w-4 fill-warning text-warning" />
                    {course.rating.toFixed(1)} ({course.total_reviews} reviews)
                  </span>
                )}
                <span>{course.total_students} students</span>
                <span className="rounded-md bg-secondary px-2 py-0.5 text-xs">{course.level}</span>
              </div>
            </div>

            {/* Creator card */}
            <Link to={`/c/${creator?.creator_slug || creatorSlug}`} className="flex items-center gap-3 rounded-xl border border-border bg-card p-4 hover:border-primary/20 transition-colors">
              <div className="h-10 w-10 rounded-full bg-primary/10 flex items-center justify-center text-sm font-bold text-primary overflow-hidden">
                {creator?.avatar_url ? <img src={creator.avatar_url} alt="" className="h-full w-full object-cover" /> : creatorName[0]}
              </div>
              <div>
                <p className="text-sm font-medium">{creatorName}</p>
                {creator?.creator_category && <p className="text-xs text-muted-foreground">{creator.creator_category}</p>}
              </div>
            </Link>

            {/* Preview video */}
            {course.preview_video_url && (
              <div className="aspect-video w-full overflow-hidden rounded-xl border border-border">
                <iframe src={course.preview_video_url} title="Preview" className="h-full w-full" allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture" allowFullScreen />
              </div>
            )}

            {/* Tabs */}
            <Tabs defaultValue="learn" className="w-full">
              <TabsList className="w-full justify-start bg-transparent border-b border-border rounded-none h-auto p-0 gap-4">
                <TabsTrigger value="learn" className="rounded-none border-b-2 border-transparent data-[state=active]:border-primary px-0 pb-2">What You'll Learn</TabsTrigger>
                <TabsTrigger value="content" className="rounded-none border-b-2 border-transparent data-[state=active]:border-primary px-0 pb-2">Course Content</TabsTrigger>
                <TabsTrigger value="reviews" className="rounded-none border-b-2 border-transparent data-[state=active]:border-primary px-0 pb-2">Reviews</TabsTrigger>
              </TabsList>
              <TabsContent value="learn" className="mt-4">
                {course.what_you_learn && course.what_you_learn.length > 0 ? (
                  <ul className="grid gap-2 sm:grid-cols-2">
                    {course.what_you_learn.map((item: string, i: number) => (
                      <li key={i} className="flex items-start gap-2 text-sm">
                        <CheckCircle className="mt-0.5 h-4 w-4 shrink-0 text-primary" />
                        {item}
                      </li>
                    ))}
                  </ul>
                ) : <p className="text-sm text-muted-foreground">Details coming soon.</p>}
                {course.requirements && course.requirements.length > 0 && (
                  <div className="mt-6">
                    <h3 className="font-heading text-sm font-600 mb-2">Requirements</h3>
                    <ul className="space-y-1">
                      {course.requirements.map((r: string, i: number) => (
                        <li key={i} className="text-sm text-muted-foreground">• {r}</li>
                      ))}
                    </ul>
                  </div>
                )}
              </TabsContent>
              <TabsContent value="content" className="mt-4">
                <p className="text-xs text-muted-foreground mb-3">{modules.length} modules • {course.total_duration_minutes} min total</p>
                <div className="space-y-1">
                  {modules.map((m: any, i: number) => (
                    <div key={m.id} className="flex items-center gap-3 rounded-lg border border-border p-3">
                      <span className="flex h-7 w-7 items-center justify-center rounded-md bg-secondary text-xs font-semibold">{i + 1}</span>
                      <div className="flex-1 min-w-0">
                        <p className="text-sm font-medium truncate">{m.title}</p>
                        <p className="text-xs text-muted-foreground">{m.duration_minutes} min</p>
                      </div>
                      {m.is_preview ? <Play className="h-4 w-4 text-primary" /> : <Lock className="h-4 w-4 text-muted-foreground/40" />}
                    </div>
                  ))}
                </div>
              </TabsContent>
              <TabsContent value="reviews" className="mt-4">
                {reviews && reviews.length > 0 ? (
                  <div className="space-y-3">
                    {reviews.map((r: any) => (
                      <div key={r.id} className="rounded-lg border border-border p-4">
                        <div className="flex items-center gap-2 mb-1">
                          <span className="text-sm font-medium">{r.profiles?.full_name || 'Student'}</span>
                          <div className="flex">
                            {[...Array(5)].map((_, i) => (
                              <Star key={i} className={`h-3 w-3 ${i < r.rating ? 'fill-warning text-warning' : 'text-muted'}`} />
                            ))}
                          </div>
                        </div>
                        {r.review_text && <p className="text-sm text-muted-foreground">{r.review_text}</p>}
                      </div>
                    ))}
                  </div>
                ) : <p className="text-sm text-muted-foreground">No reviews yet.</p>}
              </TabsContent>
            </Tabs>
          </div>

          {/* Sticky enrollment card */}
          <div className="lg:col-span-1">
            <div className="lg:sticky lg:top-20 rounded-xl border border-border bg-card p-6 space-y-4">
              {course.thumbnail_url && (
                <img src={course.thumbnail_url} alt={course.title} className="w-full rounded-lg aspect-video object-cover" />
              )}
              <p className="font-heading text-3xl font-800 text-accent">{formatPrice(course.price)}</p>
              <Button onClick={handleEnroll} disabled={paying} size="lg" className="w-full rounded-md bg-primary hover:bg-primary/90 font-semibold text-base">
                {paying ? <Loader2 className="h-4 w-4 animate-spin mr-2" /> : null}
                {enrollment ? 'Continue Learning' : paying ? 'Processing…' : 'Enroll Now'}
              </Button>
              <ul className="space-y-2 text-sm">
                <li className="flex items-center gap-2"><BookOpen className="h-4 w-4 text-primary" /> {modules.length} video modules</li>
                <li className="flex items-center gap-2"><Clock className="h-4 w-4 text-primary" /> Full lifetime access</li>
                <li className="flex items-center gap-2"><Award className="h-4 w-4 text-primary" /> Certificate of completion</li>
                {commissionAmount > 0 && (
                  <li className="flex items-center gap-2"><Users className="h-4 w-4 text-primary" /> Refer friends & earn {formatPrice(commissionAmount)}</li>
                )}
              </ul>
              {commissionAmount > 0 && (
                <div className="rounded-lg border border-primary/20 bg-primary/5 p-3 text-center">
                  <p className="text-xs text-primary font-medium">
                    Refer friends, earn {formatPrice(commissionAmount)} per enrollment
                    {course.commission_percent >= (100 - course.platform_fee_percent) ? ' — maximum referral course!' : ''}
                  </p>
                </div>
              )}
              <p className="text-[10px] text-muted-foreground">Price inclusive of 18% GST. Invoice emailed on enrollment.</p>
              <Button variant="outline" size="sm" className="w-full rounded-md text-xs" onClick={() => {
                const msg = encodeURIComponent(`Check out "${course.title}" on Backupshala: ${window.location.href}`);
                window.open(`https://wa.me/?text=${msg}`, '_blank');
              }}>
                <Share2 className="h-3 w-3 mr-1" /> Share this course
              </Button>
            </div>
          </div>
        </div>
      </div>
      <Footer />
    </div>
  );
};

export default CourseEnrollment;
