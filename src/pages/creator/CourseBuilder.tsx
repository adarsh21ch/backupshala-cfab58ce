import { useState, useEffect, useCallback, useRef } from "react";
import { useParams, useNavigate, Link } from "react-router-dom";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { useToast } from "@/hooks/use-toast";
import { usePlatformSettings } from "@/hooks/usePlatformSettings";
import CreatorDashboardLayout from "@/components/dashboard/CreatorDashboardLayout";
import BuilderSidebar, { BuilderStep } from "@/components/course/builder/BuilderSidebar";
import CourseDetailsStep, { DetailsForm } from "@/components/course/builder/CourseDetailsStep";
import CourseContentStep from "@/components/course/builder/CourseContentStep";
import CourseVideoSettings from "@/components/course/builder/CourseVideoSettings";
import CoursePricingStep from "@/components/course/builder/CoursePricingStep";
import CoursePublishStep, { PublishCheck } from "@/components/course/builder/CoursePublishStep";
import { validatePrice, MIN_PRICE } from "@/components/course/PriceInput";
import { Button } from "@/components/ui/button";
import { ChevronLeft, Check, Loader2 } from "lucide-react";
import { formatPrice } from "@/lib/format";

const STEPS: BuilderStep[] = [
  { id: 1, label: "Course Details", key: "details" },
  { id: 2, label: "Build Course", key: "content" },
  { id: 3, label: "Video Settings", key: "video" },
  { id: 4, label: "Set Price", key: "pricing" },
  { id: 5, label: "Publish", key: "publish" },
];

const generateSlug = (t: string) =>
  t
    .toLowerCase()
    .replace(/[^a-z0-9\s-]/g, "")
    .replace(/\s+/g, "-")
    .replace(/-+/g, "-")
    .replace(/^-+|-+$/g, "")
    .trim();

const CourseBuilder = () => {
  const { id } = useParams<{ id: string }>();
  const isNew = !id || id === "new";
  const { user, profile } = useAuth();
  const { toast } = useToast();
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const { data: platformSettings } = usePlatformSettings();
  const [activeStep, setActiveStep] = useState(1);
  const [saving, setSaving] = useState(false);
  const [savedAt, setSavedAt] = useState<Date | null>(null);
  const autoSaveTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

  const platformFeePercent = platformSettings?.platform_fee_percent ?? 15;
  const maxCommission = 100 - platformFeePercent;

  const [details, setDetails] = useState<DetailsForm>({
    title: "",
    slug: "",
    short_description: "",
    full_description: "",
    category: "Other",
    language: "English",
    level: "Beginner",
    thumbnail_url: "",
    preview_video_url: "",
    what_you_learn: [],
    requirements: [],
    tags: [],
  });
  const [price, setPrice] = useState("");
  const [originalPrice, setOriginalPrice] = useState("");
  const [showOriginalPrice, setShowOriginalPrice] = useState(false);
  const [commissionPercent, setCommissionPercent] = useState(maxCommission);
  const [status, setStatus] = useState("draft");

  const { data: course, isLoading } = useQuery({
    queryKey: ["course-builder", id],
    queryFn: async () => {
      if (isNew) return null;
      const { data, error } = await supabase
        .from("courses")
        .select("*, modules(id)")
        .eq("id", id!)
        .eq("creator_id", user!.id)
        .single();
      if (error) throw error;
      return data;
    },
    enabled: !isNew && !!user,
  });

  const { data: proSub } = useQuery({
    queryKey: ["creator-pro-sub", user?.id],
    queryFn: async () => {
      const { data } = await supabase
        .from("creator_pro_subscriptions")
        .select("plan, status")
        .eq("creator_id", user!.id)
        .maybeSingle();
      return data;
    },
    enabled: !!user,
    staleTime: 5 * 60 * 1000,
  });
  const isPro =
    profile?.is_admin ||
    (!!proSub && (proSub.plan === "pro" || proSub.plan === "trial") && proSub.status === "active");

  useEffect(() => {
    if (course) {
      setDetails({
        title: course.title || "",
        slug: course.slug || "",
        short_description: course.short_description || "",
        full_description: course.full_description || "",
        category: course.category || "Other",
        language: course.language || "English",
        level: course.level || "Beginner",
        thumbnail_url: course.thumbnail_url || "",
        preview_video_url: course.preview_video_url || "",
        what_you_learn: course.what_you_learn || [],
        requirements: course.requirements || [],
        tags: course.tags || [],
      });
      setPrice(course.price ? String(course.price) : "");
      const op = (course as any).original_price;
      if (op != null) {
        setShowOriginalPrice(true);
        setOriginalPrice(String(op));
      }
      setCommissionPercent(course.commission_percent ?? maxCommission);
      setStatus(course.status || "draft");
    }
  }, [course, maxCommission]);

  const updateDetails = useCallback((updates: Partial<DetailsForm>) => {
    setDetails((prev) => {
      const next = { ...prev, ...updates };
      if (
        updates.title !== undefined &&
        (!prev.slug || prev.slug === generateSlug(prev.title))
      ) {
        next.slug = generateSlug(updates.title);
      }
      return next;
    });
  }, []);

  const saveCourse = useCallback(async (): Promise<string | null> => {
    if (!details.title.trim() || !details.short_description.trim()) {
      toast({ title: "Title and short description required", variant: "destructive" });
      return null;
    }
    setSaving(true);
    try {
      const priceNum = Number(price) || 0;
      const previewUrl = (() => {
        const u = details.preview_video_url.trim();
        if (!u) return null;
        const yt = u.match(
          /(?:youtube\.com\/(?:watch\?v=|embed\/|shorts\/)|youtu\.be\/)([\w-]{6,})/,
        );
        return yt ? `https://www.youtube.com/embed/${yt[1]}` : u;
      })();

      const courseData: any = {
        title: details.title.trim(),
        slug: details.slug.trim() || generateSlug(details.title),
        short_description: details.short_description.trim(),
        full_description: details.full_description.trim() || null,
        category: details.category,
        language: details.language,
        level: details.level,
        thumbnail_url: details.thumbnail_url.trim() || null,
        preview_video_url: previewUrl,
        what_you_learn: details.what_you_learn.filter((s) => s.trim()),
        requirements: details.requirements.filter((s) => s.trim()),
        tags: details.tags.filter((s) => s.trim()),
        price: priceNum,
        base_price: priceNum,
        display_price: priceNum,
        original_price:
          showOriginalPrice && Number(originalPrice) > priceNum ? Number(originalPrice) : null,
        commission_percent: commissionPercent,
      };

      if (isNew) {
        courseData.platform_fee_percent = platformFeePercent;
        const { data, error } = await supabase
          .from("courses")
          .insert({ ...courseData, creator_id: user!.id, status: "draft" })
          .select()
          .single();
        if (error) throw error;
        setSavedAt(new Date());
        navigate(`/creator/courses/${data.id}/edit`, { replace: true });
        return data.id;
      } else {
        if (status === "published" && course) {
          const priceChanged = priceNum !== course.price;
          const commChanged = commissionPercent !== course.commission_percent;
          if (priceChanged || commChanged) {
            courseData.status = "pending_review";
            courseData.rejection_reason =
              "Price/commission updated by creator — please review";
          }
        }
        const { error } = await supabase
          .from("courses")
          .update(courseData)
          .eq("id", id!);
        if (error) throw error;
        setSavedAt(new Date());
        queryClient.invalidateQueries({ queryKey: ["course-builder", id] });
        return id!;
      }
    } catch (err: any) {
      toast({ title: "Failed to save", description: err.message, variant: "destructive" });
      return null;
    } finally {
      setSaving(false);
    }
  }, [
    details,
    price,
    originalPrice,
    showOriginalPrice,
    commissionPercent,
    isNew,
    status,
    course,
    id,
    user,
    platformFeePercent,
    navigate,
    queryClient,
    toast,
  ]);

  // Debounced auto-save when details change (existing course only)
  useEffect(() => {
    if (isNew || isLoading) return;
    if (autoSaveTimer.current) clearTimeout(autoSaveTimer.current);
    autoSaveTimer.current = setTimeout(() => {
      saveCourse();
    }, 2500);
    return () => {
      if (autoSaveTimer.current) clearTimeout(autoSaveTimer.current);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [details]);

  const submitForReview = async () => {
    const savedId = await saveCourse();
    if (!savedId) return;
    const { error } = await supabase
      .from("courses")
      .update({ status: "pending_review" })
      .eq("id", savedId);
    if (error) {
      toast({ title: "Failed", variant: "destructive" });
      return;
    }
    setStatus("pending_review");
    queryClient.invalidateQueries({ queryKey: ["course-builder", id] });
    toast({ title: "Submitted for review! ✓" });
  };

  // Module count for completion checks (from joined modules)
  const moduleCount = (course?.modules?.length as number) ?? 0;
  const priceErr = validatePrice(price);
  const priceNum = Number(price) || 0;

  const checks: PublishCheck[] = [
    {
      label: "Title and description added (min 50 chars)",
      ok: !!details.title.trim() && details.short_description.trim().length >= 50,
    },
    { label: "Thumbnail uploaded", ok: !!details.thumbnail_url.trim() },
    {
      label:
        moduleCount >= 3
          ? "At least 3 modules total"
          : `Add ${3 - moduleCount} more module${3 - moduleCount === 1 ? "" : "s"} (you have ${moduleCount})`,
      ok: moduleCount >= 3,
    },
    {
      label: priceErr
        ? `Course price set (₹${MIN_PRICE} minimum)`
        : `Course price set (${formatPrice(priceNum)})`,
      ok: !priceErr,
    },
  ];

  const completedSteps: number[] = [];
  if (checks[0].ok) completedSteps.push(1);
  if (moduleCount > 0) completedSteps.push(2);
  completedSteps.push(3); // Video settings always have safe defaults
  if (!priceErr) completedSteps.push(4);
  if (status === "published" || status === "pending_review") completedSteps.push(5);

  const enrollmentUrl = `${window.location.origin}/c/${profile?.creator_slug}/${details.slug}`;

  if (isLoading) {
    return (
      <CreatorDashboardLayout>
        <div className="flex items-center justify-center py-20">
          <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
        </div>
      </CreatorDashboardLayout>
    );
  }

  return (
    <CreatorDashboardLayout>
      <div className="space-y-4">
        {/* Header */}
        <div className="flex items-center justify-between gap-3 flex-wrap">
          <div className="flex items-center gap-2">
            <Link
              to="/creator/courses"
              className="text-muted-foreground hover:text-foreground"
            >
              <ChevronLeft className="h-5 w-5" />
            </Link>
            <h1 className="font-heading text-xl sm:text-2xl font-700">
              {isNew ? "Create Course" : "Edit Course"}
            </h1>
          </div>
          <div className="flex items-center gap-3">
            <div className="text-xs text-muted-foreground min-w-[110px] text-right">
              {saving ? (
                <span className="inline-flex items-center gap-1">
                  <Loader2 className="h-3 w-3 animate-spin" /> Saving...
                </span>
              ) : savedAt ? (
                <span className="inline-flex items-center gap-1 text-primary">
                  <Check className="h-3 w-3" /> All changes saved
                </span>
              ) : null}
            </div>
            <Button onClick={saveCourse} disabled={saving} size="sm">
              Save
            </Button>
          </div>
        </div>

        {/* Body */}
        <div className="flex flex-col lg:flex-row gap-6">
          <BuilderSidebar
            steps={STEPS}
            activeStep={activeStep}
            completedSteps={completedSteps}
            onStepClick={setActiveStep}
          />

          <div className="flex-1 min-w-0">
            {activeStep === 1 && (
              <CourseDetailsStep
                form={details}
                onChange={updateDetails}
                onSave={async () => { await saveCourse(); }}
                onNext={async () => {
                  const ok = await saveCourse();
                  if (ok) setActiveStep(2);
                }}
              />
            )}
            {activeStep === 2 && (
              <CourseContentStep
                courseId={id || ""}
                isNew={isNew}
                onSaveFirst={async () => {
                  const newId = await saveCourse();
                  if (newId) setActiveStep(2);
                }}
              />
            )}
            {activeStep === 3 && (
              <CourseVideoSettings courseId={id || ""} />
            )}
            {activeStep === 4 && (
              <CoursePricingStep
                price={price}
                setPrice={setPrice}
                originalPrice={originalPrice}
                setOriginalPrice={setOriginalPrice}
                showOriginalPrice={showOriginalPrice}
                setShowOriginalPrice={setShowOriginalPrice}
                isPro={isPro}
                status={status}
                saving={saving}
                onSave={async () => {
                  const ok = await saveCourse();
                  if (ok) setActiveStep(5);
                }}
              />
            )}
            {activeStep === 5 && (
              <CoursePublishStep
                status={status}
                checks={checks}
                enrollmentUrl={enrollmentUrl}
                onSubmit={submitForReview}
              />
            )}
          </div>
        </div>
      </div>
    </CreatorDashboardLayout>
  );
};

export default CourseBuilder;
