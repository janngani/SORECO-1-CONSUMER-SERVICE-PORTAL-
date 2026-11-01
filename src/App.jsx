import { useState, useEffect } from "react";
import { BrowserRouter as Router, Routes, Route, Navigate, useLocation } from "react-router";
import { AuthProvider, useAuth } from "@/src/context/AuthContext";
import { NotificationProvider } from "@/src/context/NotificationContext";
import { supabase } from "@/src/lib/supabase";
import { Navbar } from "@/src/components/layout/Navbar";
import { Footer } from "@/src/components/layout/Footer";
import { LandingPage } from "@/src/pages/LandingPage";
import { LoginPage } from "@/src/pages/LoginPage";
import { RegisterPage } from "@/src/pages/RegisterPage";
import { ConsumerDashboard } from "@/src/pages/ConsumerDashboard";
import { AdminDashboard } from "@/src/pages/AdminDashboard";
import { ProfilePage } from "@/src/pages/ProfilePage";
import { TicketDetails } from "@/src/pages/TicketDetails";
import { AboutPage } from "@/src/pages/AboutPage";
import { ServicesPage } from "@/src/pages/ServicesPage";
import { ReconnectionServicePage } from "@/src/pages/ReconnectionServicePage";
import { BillingDisputeServicePage } from "@/src/pages/BillingDisputeServicePage";
import { OtherBillingServicePage } from "@/src/pages/OtherBillingServicePage";
import { ContactPage } from "@/src/pages/ContactPage";
import { BarangaysPage } from "@/src/pages/63barangay";
import { BarangayTicketsPage } from "@/src/pages/BarangayTicketsPage";
import { EmailConfirmedPage } from "@/src/pages/EmailConfirmedPage";
import { PrivacyPolicyPage } from "@/src/pages/PrivacyPolicyPage";
import { TermsOfServicePage } from "@/src/pages/TermsOfServicePage";
import { Toaster, toast } from "sonner";
import { NotificationListener } from "@/src/components/NotificationListener";
import { GoogleOnboardingModal } from "@/src/components/GoogleOnboardingModal";
import { AnnouncementMarquee } from "@/src/components/AnnouncementMarquee";
import { UrlSecurityGuard } from "@/src/components/UrlSecurityGuard";

const ProtectedRoute = ({ children, adminOnly = false, consumerOnly = false }) => {
  const { user, loading, isAdmin } = useAuth();
  const [sessionChecking, setSessionChecking] = useState(true);
  const [hasValidSession, setHasValidSession] = useState(false);
  const location = useLocation();

  useEffect(() => {
    let isMounted = true;
    const verifySession = async () => {
      try {
        const token = localStorage.getItem("auth_token");
        if (!token) {
          if (isMounted) {
            setHasValidSession(false);
            setSessionChecking(false);
          }
          return;
        }

        // Verify active session with supabase.auth.getSession()
        const { data: { session } } = await supabase.auth.getSession();
        if (session || (token && user)) {
          if (isMounted) setHasValidSession(true);
        } else {
          if (isMounted) setHasValidSession(false);
        }
      } catch (err) {
        console.warn("Session verification error:", err);
        const token = localStorage.getItem("auth_token");
        if (token && user) {
          if (isMounted) setHasValidSession(true);
        } else {
          if (isMounted) setHasValidSession(false);
        }
      } finally {
        if (isMounted) setSessionChecking(false);
      }
    };

    if (!loading) {
      verifySession();
    }
  }, [loading, user]);

  // Proactive toast alerts on role violation or unauthorized attempts
  useEffect(() => {
    if (loading || sessionChecking) return;

    if (!hasValidSession || !user) {
      toast.warning("Authentication required. Please sign in to access your portal.", {
        id: "auth-required-toast",
        duration: 4000
      });
    } else if (adminOnly && !isAdmin) {
      toast.error("Access Denied: You do not have administrator privileges to view this section.", {
        id: "admin-access-denied-toast",
        duration: 5000
      });
    } else if (consumerOnly && isAdmin) {
      toast.info("Notice: Consumer portal route is restricted. Redirected to Admin Dashboard.", {
        id: "consumer-route-restricted-toast",
        duration: 5000
      });
    }
  }, [loading, sessionChecking, hasValidSession, user, adminOnly, consumerOnly, isAdmin, location.pathname]);

  if (loading || sessionChecking) {
    return (
      <div className="flex min-h-[calc(100vh-140px)] items-center justify-center bg-[#F8F6F2]">
        <div className="flex flex-col items-center gap-3">
          <div className="h-8 w-8 animate-spin rounded-full border-4 border-primary border-t-transparent" />
          <p className="text-sm font-medium text-slate-500">Verifying session...</p>
        </div>
      </div>
    );
  }

  if (!hasValidSession || !user) {
    return <Navigate to="/login" replace />;
  }

  if (adminOnly && !isAdmin) {
    return <Navigate to="/dashboard" replace />;
  }

  if (consumerOnly && isAdmin) {
    return <Navigate to="/admin" replace />;
  }

  return <>{children}</>;
};

export default function App() {
  return (
    <AuthProvider>
      <NotificationProvider>
        <Router>
          <UrlSecurityGuard />
          <div className="flex flex-col min-h-screen bg-[#F8F6F2]">
            <Navbar />
            <NotificationListener />
            <GoogleOnboardingModal />
            <main className="flex-grow">
              <Routes>
                <Route path="/" element={<LandingPage />} />
                <Route path="/about" element={<AboutPage />} />
                <Route path="/services" element={<ServicesPage />} />
                <Route path="/services/reconnection" element={<ReconnectionServicePage />} />
                <Route path="/services/billing-dispute" element={<BillingDisputeServicePage />} />
                <Route path="/services/other-billing" element={<OtherBillingServicePage />} />
                <Route path="/contact" element={<ContactPage />} />

                <Route path="/login" element={<LoginPage />} />
                <Route path="/register" element={<RegisterPage />} />
                <Route path="/email-confirmed" element={<EmailConfirmedPage />} />
                <Route path="/privacy-policy" element={<PrivacyPolicyPage />} />
                <Route path="/terms-of-service" element={<TermsOfServicePage />} />

                {/* Consumer-only dashboard */}
                <Route
                  path="/dashboard"
                  element={
                    <ProtectedRoute consumerOnly>
                      <ConsumerDashboard />
                    </ProtectedRoute>
                  }
                />

                {/* Admin-only dashboards and barangay management */}
                <Route
                  path="/admin"
                  element={
                    <ProtectedRoute adminOnly>
                      <AdminDashboard />
                    </ProtectedRoute>
                  }
                />

                <Route
                  path="/barangays"
                  element={
                    <ProtectedRoute adminOnly>
                      <BarangaysPage />
                    </ProtectedRoute>
                  }
                />

                <Route
                  path="/barangays/:barangayName"
                  element={
                    <ProtectedRoute adminOnly>
                      <BarangayTicketsPage />
                    </ProtectedRoute>
                  }
                />

                <Route
                  path="/profile"
                  element={
                    <ProtectedRoute>
                      <ProfilePage />
                    </ProtectedRoute>
                  }
                />

                <Route
                  path="/ticket/:id"
                  element={
                    <ProtectedRoute>
                      <TicketDetails />
                    </ProtectedRoute>
                  }
                />
                <Route
                  path="/tickets/:id"
                  element={
                    <ProtectedRoute>
                      <TicketDetails />
                    </ProtectedRoute>
                  }
                />
              </Routes>
            </main>
            <AnnouncementMarquee />
            <Footer />
          </div>
          <Toaster position="top-right" />
        </Router>
      </NotificationProvider>
    </AuthProvider>
  );
}
