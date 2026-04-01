import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Route, Routes } from "react-router-dom";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { Toaster } from "@/components/ui/toaster";
import { TooltipProvider } from "@/components/ui/tooltip";
import { AuthProvider } from "@/contexts/AuthContext";
import ProtectedRoute, { CreatorRoute } from "@/components/ProtectedRoute";
import Index from "./pages/Index";
import Explore from "./pages/Explore";
import CreatorProfile from "./pages/CreatorProfile";
import CourseEnrollment from "./pages/CourseEnrollment";
import Login from "./pages/Login";
import Signup from "./pages/Signup";
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

const queryClient = new QueryClient();

const App = () => (
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
            <Route path="/verify/:certCode" element={<VerifyCertificate />} />

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

            <Route path="*" element={<NotFound />} />
          </Routes>
        </AuthProvider>
      </BrowserRouter>
    </TooltipProvider>
  </QueryClientProvider>
);

export default App;
