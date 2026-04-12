import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Route, Routes } from "react-router-dom";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { Toaster } from "@/components/ui/toaster";
import { TooltipProvider } from "@/components/ui/tooltip";
import { AuthProvider } from "@/contexts/AuthContext";
import { HelmetProvider } from "react-helmet-async";
import ProtectedRoute, { CreatorRoute, AdminRoute } from "@/components/ProtectedRoute";
import Index from "./pages/Index";
import Explore from "./pages/Explore";
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
import AdminDashboardHome from "./pages/admin/AdminDashboardHome";
import AdminCreators from "./pages/admin/AdminCreators";
import AdminCourses from "./pages/admin/AdminCourses";
import AdminStudents from "./pages/admin/AdminStudents";
import AdminPayments from "./pages/admin/AdminPayments";
import AdminCommissions from "./pages/admin/AdminCommissions";
import AdminPayouts from "./pages/admin/AdminPayouts";
import AdminSettings from "./pages/admin/AdminSettings";
import AdminSupport from "./pages/admin/AdminSupport";
import AdminStandardBundle from "./pages/admin/AdminStandardBundle";
import AdminVideos from "./pages/admin/AdminVideos";
import CreatorVideos from "./pages/creator/CreatorVideos";
import CreatorSettings from "./pages/creator/CreatorSettings";
import CreatorUnlockRequests from "./pages/creator/CreatorUnlockRequests";
import CreatorUpgrade from "./pages/creator/CreatorUpgrade";
import StudentVideos from "./pages/StudentVideos";
import WatchVideo from "./pages/WatchVideo";
import AdminCreatorPro from "./pages/admin/AdminCreatorPro";
import CreatorAgreement from "./pages/CreatorAgreement";
import ContentPolicy from "./pages/ContentPolicy";
import CommunityGuidelines from "./pages/CommunityGuidelines";
import CancellationPolicy from "./pages/CancellationPolicy";
import AdminAuditLog from "./pages/admin/AdminAuditLog";
import OrderHistory from "./pages/OrderHistory";
import CookieConsent from "./components/CookieConsent";

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
  <QueryClientProvider client={queryClient}>
    <TooltipProvider>
      <Toaster />
      <Sonner />
      <BrowserRouter>
        <AuthProvider>
          <Routes>
            {/* Public pages */}
            <Route path="/" element={<Index />} />
            <Route path="/explore" element={<Explore />} />
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

            {/* Admin panel */}
            <Route path="/admin/dashboard" element={<AdminRoute><AdminDashboardHome /></AdminRoute>} />
            <Route path="/admin/creators" element={<AdminRoute><AdminCreators /></AdminRoute>} />
            <Route path="/admin/courses" element={<AdminRoute><AdminCourses /></AdminRoute>} />
            <Route path="/admin/students" element={<AdminRoute><AdminStudents /></AdminRoute>} />
            <Route path="/admin/payments" element={<AdminRoute><AdminPayments /></AdminRoute>} />
            <Route path="/admin/commissions" element={<AdminRoute><AdminCommissions /></AdminRoute>} />
            <Route path="/admin/payouts" element={<AdminRoute><AdminPayouts /></AdminRoute>} />
            <Route path="/admin/standard-bundle" element={<AdminRoute><AdminStandardBundle /></AdminRoute>} />
            <Route path="/admin/settings" element={<AdminRoute><AdminSettings /></AdminRoute>} />
            <Route path="/admin/support" element={<AdminRoute><AdminSupport /></AdminRoute>} />
            <Route path="/admin/videos" element={<AdminRoute><AdminVideos /></AdminRoute>} />
            <Route path="/admin/creator-pro" element={<AdminRoute><AdminCreatorPro /></AdminRoute>} />
            <Route path="/admin/audit-log" element={<AdminRoute><AdminAuditLog /></AdminRoute>} />

            <Route path="*" element={<NotFound />} />
          </Routes>
          <CookieConsent />
        </AuthProvider>
      </BrowserRouter>
    </TooltipProvider>
  </QueryClientProvider>
  </HelmetProvider>
);

export default App;
