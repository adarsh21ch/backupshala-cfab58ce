const SkeletonKPI = () => (
  <div className="rounded-xl border border-border bg-card p-4 space-y-3">
    <div className="h-9 w-9 rounded-lg skeleton-shimmer" />
    <div className="h-6 w-16 rounded skeleton-shimmer" />
    <div className="h-3 w-20 rounded skeleton-shimmer" />
  </div>
);

const SkeletonCourseCard = () => (
  <div className="rounded-xl border border-border bg-card overflow-hidden">
    <div className="h-36 skeleton-shimmer" />
    <div className="p-5 space-y-3">
      <div className="h-4 w-3/4 rounded skeleton-shimmer" />
      <div className="h-3 w-1/2 rounded skeleton-shimmer" />
      <div className="h-1.5 w-full rounded-full skeleton-shimmer" />
      <div className="h-8 w-full rounded-lg skeleton-shimmer mt-2" />
    </div>
  </div>
);

const SkeletonRow = () => (
  <div className="flex items-center gap-3 p-4">
    <div className="h-8 w-8 rounded-lg skeleton-shimmer shrink-0" />
    <div className="flex-1 space-y-2">
      <div className="h-3 w-2/3 rounded skeleton-shimmer" />
      <div className="h-2 w-1/3 rounded skeleton-shimmer" />
    </div>
    <div className="h-4 w-12 rounded skeleton-shimmer" />
  </div>
);

const SkeletonVideoCard = () => (
  <div className="rounded-xl border border-border bg-card overflow-hidden">
    <div className="aspect-video skeleton-shimmer" />
    <div className="p-4 space-y-2">
      <div className="h-4 w-3/4 rounded skeleton-shimmer" />
      <div className="h-3 w-1/2 rounded skeleton-shimmer" />
    </div>
  </div>
);

export { SkeletonKPI, SkeletonCourseCard, SkeletonRow, SkeletonVideoCard };
