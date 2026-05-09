import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Route, Routes } from "react-router-dom";
import { lazy, Suspense } from "react";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { Toaster } from "@/components/ui/toaster";
import { TooltipProvider } from "@/components/ui/tooltip";
import { AuthProvider } from "@/contexts/AuthContext";
import { HelmetProvider } from "react-helmet-async";
import ProtectedRoute, { CreatorRoute, AdminRoute } from "@/components/ProtectedRoute";
import Index from "./pages/Index";
import Explore from "./pages/Explore";
import Advanced from "./pages/Advanced";
import CreatorProfile from "./pages/CreatorProfile";
import CourseEnrollment from "./pages/CourseEnrollment";
import Login from "./pages/Login";
import Signup from "./pages/Signup";
import ResetPassword from "./pages/ResetPassword";
import VerifyEmail from "./pages/VerifyEmail";
import Receipt from "./pages/Receipt";
import Dashboard from "./pages/Dashboard";
import Courses from "./pages/Courses";
import CourseDetail from "./pages/CourseDetail";
import ModulePlayer from "./pages/ModulePlayer";
import Certificate from "./pages/Certificate";
import Payouts from "./pages/Payouts";
import VerifyCertificate from "./pages/VerifyCertificate";
import Profile from "./pages/Profile";
import Notifications from "./pages/Notifications";
import ReferEarn from "./pages/ReferEarn";
import WalletPage from "./pages/Wallet";
import CreatorOnboarding from "./pages/creator/CreatorOnboarding";
import CreatorDashboardHome from "./pages/creator/CreatorDashboardHome";
import CreatorCourses from "./pages/creator/CreatorCourses";
import CourseBuilder from "./pages/creator/CourseBuilder";
import CreatorStudents from "./pages/creator/CreatorStudents";
import CreatorEarnings from "./pages/creator/CreatorEarnings";
import CreatorPayouts from "./pages/creator/CreatorPayouts";
import CreatorProfileEdit from "./pages/creator/CreatorProfileEdit";
import NotFound from "./pages/NotFound";
import PrivacyPolicy from "./pages/PrivacyPolicy";
import Terms from "./pages/Terms";
import RefundPolicy from "./pages/RefundPolicy";
import Contact from "./pages/Contact";
import About from "./pages/About";
import CreatorVideos from "./pages/creator/CreatorVideos";
import CreatorSettings from "./pages/creator/CreatorSettings";
import CreatorUnlockRequests from "./pages/creator/CreatorUnlockRequests";
import CreatorUpgrade from "./pages/creator/CreatorUpgrade";
import StudentVideos from "./pages/StudentVideos";
import WatchVideo from "./pages/WatchVideo";
import CreatorAgreement from "./pages/CreatorAgreement";
import ContentPolicy from "./pages/ContentPolicy";
import CommunityGuidelines from "./pages/CommunityGuidelines";
import CancellationPolicy from "./pages/CancellationPolicy";
import OrderHistory from "./pages/OrderHistory";
import CookieConsent from "./components/CookieConsent";
import InstallPrompt from "./components/InstallPrompt";
import CreatorCoupons from "./pages/creator/CreatorCoupons";
import CreatorAnnouncements from "./pages/creator/CreatorAnnouncements";
import CreatorDiscussions from "./pages/creator/CreatorDiscussions";
import { ThemeProvider } from "next-themes";
import { Loader2 } from "lucide-react";

// Lazy-loaded admin routes — kept as factories so we can prefetch them all
// the first time any admin route mounts. After prefetch, tab navigation is
// instant because every chunk is already in the browser cache.
const adminLoaders = {
  AdminDashboardHome: () => import("./pages/admin/AdminDashboardHome"),
  AdminCreators: () => import("./pages/admin/AdminCreators"),
  AdminCourses: () => import("./pages/admin/AdminCourses"),
  AdminPlatformCourseNew: () => import("./pages/admin/AdminPlatformCourseNew"),
  AdminPlatformCourses: () => import("./pages/admin/AdminPlatformCourses"),
  AdminStudents: () => import("./pages/admin/AdminStudents"),
  AdminPayments: () => import("./pages/admin/AdminPayments"),
  AdminCommissions: () => import("./pages/admin/AdminCommissions"),
  AdminPayouts: () => import("./pages/admin/AdminPayouts"),
  AdminSettings: () => import("./pages/admin/AdminSettings"),
  AdminSupport: () => import("./pages/admin/AdminSupport"),
  AdminStandardBundle: () => import("./pages/admin/AdminStandardBundle"),
  AdminVideos: () => import("./pages/admin/AdminVideos"),
  AdminCreatorPro: () => import("./pages/admin/AdminCreatorPro"),
  AdminRevenue: () => import("./pages/admin/AdminRevenue"),
  AdminFeaturedListings: () => import("./pages/admin/AdminFeaturedListings"),
  AdminAuditLog: () => import("./pages/admin/AdminAuditLog"),
  AdminWebhookLogs: () => import("./pages/admin/AdminWebhookLogs"),
};

let adminPrefetched = false;
export const prefetchAdminRoutes = () => {
  if (adminPrefetched) return;
  adminPrefetched = true;
  // Fire all imports in parallel; ignore errors (will retry on real navigation)
  Object.values(adminLoaders).forEach((load) => {
    load().catch(() => { adminPrefetched = false; });
  });
};

const AdminDashboardHome = lazy(adminLoaders.AdminDashboardHome);
const AdminCreators = lazy(adminLoaders.AdminCreators);
const AdminCourses = lazy(adminLoaders.AdminCourses);
const AdminPlatformCourseNew = lazy(adminLoaders.AdminPlatformCourseNew);
const AdminPlatformCourses = lazy(adminLoaders.AdminPlatformCourses);
const AdminStudents = lazy(adminLoaders.AdminStudents);
const AdminPayments = lazy(adminLoaders.AdminPayments);
const AdminCommissions = lazy(adminLoaders.AdminCommissions);
const AdminPayouts = lazy(adminLoaders.AdminPayouts);
const AdminSettings = lazy(adminLoaders.AdminSettings);
const AdminSupport = lazy(adminLoaders.AdminSupport);
const AdminStandardBundle = lazy(adminLoaders.AdminStandardBundle);
const AdminVideos = lazy(adminLoaders.AdminVideos);
const AdminCreatorPro = lazy(adminLoaders.AdminCreatorPro);
const AdminRevenue = lazy(adminLoaders.AdminRevenue);
const AdminFeaturedListings = lazy(adminLoaders.AdminFeaturedListings);
const AdminAuditLog = lazy(adminLoaders.AdminAuditLog);
const AdminWebhookLogs = lazy(adminLoaders.AdminWebhookLogs);

const AdminFallback = () => (
  <div className="flex items-center justify-center min-h-screen">
    <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
  </div>
);

const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      staleTime: 5 * 60 * 1000,
      retry: 2,
      refetchOnWindowFocus: false,
    },
  },
});

const App = () => (
  <HelmetProvider>
  <ThemeProvider attribute="class" defaultTheme="light" enableSystem={false} storageKey="backupshala-theme">
  <QueryClientProvider client={queryClient}>
    <TooltipProvider>
      <Toaster />
      <Sonner />
      <BrowserRouter>
        <AuthProvider>
          <Suspense fallback={<AdminFallback />}>
          <Routes>
            {/* Public pages */}
            <Route path="/" element={<Index />} />
            <Route path="/explore" element={<Explore />} />
            <Route path="/advanced" element={<Advanced />} />
            <Route path="/c/:creatorSlug" element={<CreatorProfile />} />
            <Route path="/c/:creatorSlug/:courseSlug" element={<CourseEnrollment />} />
            <Route path="/login" element={<Login />} />
            <Route path="/signup" element={<Signup />} />
            <Route path="/reset-password" element={<ResetPassword />} />
            <Route path="/verify-email" element={<VerifyEmail />} />
            <Route path="/verify/:certCode" element={<VerifyCertificate />} />
            <Route path="/watch/:bsvCode" element={<WatchVideo />} />
            <Route path="/privacy-policy" element={<PrivacyPolicy />} />
            <Route path="/terms" element={<Terms />} />
            <Route path="/refund-policy" element={<RefundPolicy />} />
            <Route path="/contact" element={<Contact />} />
            <Route path="/about" element={<About />} />
            <Route path="/creator-agreement" element={<CreatorAgreement />} />
            <Route path="/content-policy" element={<ContentPolicy />} />
            <Route path="/community-guidelines" element={<CommunityGuidelines />} />
            <Route path="/cancellation-policy" element={<CancellationPolicy />} />

            {/* Student dashboard */}
            <Route path="/dashboard" element={<ProtectedRoute><Dashboard /></ProtectedRoute>} />
            <Route path="/courses" element={<ProtectedRoute><Courses /></ProtectedRoute>} />
            <Route path="/courses/:id" element={<ProtectedRoute><CourseDetail /></ProtectedRoute>} />
            <Route path="/courses/:id/module/:moduleId" element={<ProtectedRoute><ModulePlayer /></ProtectedRoute>} />
            <Route path="/certificate" element={<ProtectedRoute><Certificate /></ProtectedRoute>} />
            <Route path="/dashboard/certificates" element={<ProtectedRoute><Certificate /></ProtectedRoute>} />
            <Route path="/dashboard/payouts" element={<ProtectedRoute><Payouts /></ProtectedRoute>} />
            <Route path="/dashboard/wallet" element={<ProtectedRoute><WalletPage /></ProtectedRoute>} />
            <Route path="/profile" element={<ProtectedRoute><Profile /></ProtectedRoute>} />
            <Route path="/notifications" element={<ProtectedRoute><Notifications /></ProtectedRoute>} />
            <Route path="/refer" element={<ProtectedRoute><ReferEarn /></ProtectedRoute>} />
            <Route path="/dashboard/videos" element={<ProtectedRoute><StudentVideos /></ProtectedRoute>} />
            <Route path="/receipt/:paymentId" element={<ProtectedRoute><Receipt /></ProtectedRoute>} />
            <Route path="/dashboard/orders" element={<ProtectedRoute><OrderHistory /></ProtectedRoute>} />

            {/* Creator onboarding (any logged-in user) */}
            <Route path="/creator/onboarding" element={<ProtectedRoute><CreatorOnboarding /></ProtectedRoute>} />

            {/* Creator dashboard (approved creators only) */}
            <Route path="/creator/dashboard" element={<CreatorRoute><CreatorDashboardHome /></CreatorRoute>} />
            <Route path="/creator/courses" element={<CreatorRoute><CreatorCourses /></CreatorRoute>} />
            <Route path="/creator/courses/new" element={<CreatorRoute><CourseBuilder /></CreatorRoute>} />
            <Route path="/creator/courses/:id/edit" element={<CreatorRoute><CourseBuilder /></CreatorRoute>} />
            <Route path="/creator/students" element={<CreatorRoute><CreatorStudents /></CreatorRoute>} />
            <Route path="/creator/earnings" element={<CreatorRoute><CreatorEarnings /></CreatorRoute>} />
            <Route path="/creator/payouts" element={<CreatorRoute><CreatorPayouts /></CreatorRoute>} />
            <Route path="/creator/profile" element={<CreatorRoute><CreatorProfileEdit /></CreatorRoute>} />
            <Route path="/creator/videos" element={<CreatorRoute><CreatorVideos /></CreatorRoute>} />
            <Route path="/creator/settings" element={<CreatorRoute><CreatorSettings /></CreatorRoute>} />
            <Route path="/creator/unlock-requests" element={<CreatorRoute><CreatorUnlockRequests /></CreatorRoute>} />
            <Route path="/creator/upgrade" element={<CreatorRoute><CreatorUpgrade /></CreatorRoute>} />
            <Route path="/creator/coupons" element={<CreatorRoute><CreatorCoupons /></CreatorRoute>} />
            <Route path="/creator/announcements" element={<CreatorRoute><CreatorAnnouncements /></CreatorRoute>} />
            <Route path="/creator/discussions" element={<CreatorRoute><CreatorDiscussions /></CreatorRoute>} />

            {/* Admin panel (lazy-loaded) */}
            <Route path="/admin/dashboard" element={<AdminRoute><AdminDashboardHome /></AdminRoute>} />
            <Route path="/admin/creators" element={<AdminRoute><AdminCreators /></AdminRoute>} />
            <Route path="/admin/courses" element={<AdminRoute><AdminCourses /></AdminRoute>} />
            <Route path="/admin/courses/new-platform" element={<AdminRoute><AdminPlatformCourseNew /></AdminRoute>} />
            <Route path="/admin/platform-courses" element={<AdminRoute><AdminPlatformCourses /></AdminRoute>} />
            <Route path="/admin/students" element={<AdminRoute><AdminStudents /></AdminRoute>} />
            <Route path="/admin/payments" element={<AdminRoute><AdminPayments /></AdminRoute>} />
            <Route path="/admin/commissions" element={<AdminRoute><AdminCommissions /></AdminRoute>} />
            <Route path="/admin/payouts" element={<AdminRoute><AdminPayouts /></AdminRoute>} />
            <Route path="/admin/standard-bundle" element={<AdminRoute><AdminStandardBundle /></AdminRoute>} />
            <Route path="/admin/settings" element={<AdminRoute><AdminSettings /></AdminRoute>} />
            <Route path="/admin/support" element={<AdminRoute><AdminSupport /></AdminRoute>} />
            <Route path="/admin/videos" element={<AdminRoute><AdminVideos /></AdminRoute>} />
            <Route path="/admin/creator-pro" element={<AdminRoute><AdminCreatorPro /></AdminRoute>} />
            <Route path="/admin/revenue" element={<AdminRoute><AdminRevenue /></AdminRoute>} />
            <Route path="/admin/featured" element={<AdminRoute><AdminFeaturedListings /></AdminRoute>} />
            <Route path="/admin/audit-log" element={<AdminRoute><AdminAuditLog /></AdminRoute>} />
            <Route path="/admin/webhook-logs" element={<AdminRoute><AdminWebhookLogs /></AdminRoute>} />

            <Route path="*" element={<NotFound />} />
          </Routes>
          </Suspense>
          <CookieConsent />
          <InstallPrompt />
        </AuthProvider>
      </BrowserRouter>
    </TooltipProvider>
  </QueryClientProvider>
  </ThemeProvider>
  </HelmetProvider>
);

export default App;
