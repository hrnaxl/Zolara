import { Toaster } from "@/components/ui/toaster";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import ProtectedRoute from "@/components/ProtectedRoute";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Routes, Route, Navigate } from "react-router-dom";
import { lazy, Suspense } from "react";

import Auth from "./pages/Auth";
import AuthCallback from "./pages/AuthCallback";
import LandingPage from "./pages/LandingPage";
import PublicBooking from "./pages/PublicBooking";

import DashboardLayout from "./components/layout/DashboardLayout";
import AdminLayout from "./components/layout/AdminLayout";
import StaffLayout from "./components/layout/StaffLayout";
import CleanerLayout from "./components/layout/CleanerLayout";
import ReceptionistLayout from "./components/layout/ReceptionistLayout";
import ClientLayout from "./components/layout/ClientLayout";

const Bookings = lazy(() => import("./pages/Admin/Bookings"));
const Clients = lazy(() => import("./pages/Admin/Clients"));
const Staff = lazy(() => import("./pages/Admin/Staff"));
const Services = lazy(() => import("./pages/Admin/Services"));
const Sales = lazy(() => import("./pages/Admin/Sales"));
const Reports = lazy(() => import("./pages/Admin/Reports"));
import NotFound from "./pages/Admin/NotFound";
const Attendance = lazy(() => import("./pages/Admin/Attendance"));
const AttendanceReports = lazy(() => import("./pages/Admin/AttendanceReports"));
const Checkout = lazy(() => import("./pages/Admin/Checkout"));
const GiftCards = lazy(() => import("./pages/Admin/GiftCards"));

import StaffBookings from "./pages/Staff/StaffBookings";
import MyAttendance from "./pages/Staff/MyAttendance";

import ClientBookings from "./pages/Client/ClientBookings";
import ClientAuth from "./pages/Client/ClientAuth";
import ClientPortal from "./pages/Client/ClientPortal";
import ClientDashboard from "./pages/Client/ClientDashboard";
import ClientLoyalty from "./pages/Client/ClientLoyalty";
import ClientProfile from "./pages/Client/ClientProfile";
const SMSTest = lazy(() => import("./pages/Admin/SMSTest"));
import ViewServices from "./pages/Client/ViewServices";
const SettingsPage = lazy(() => import("./pages/Admin/Settings"));
const Loyalty = lazy(() => import("./pages/Admin/Loyalty"));
const PromoCodesPage = lazy(() => import("./pages/Admin/PromoCodes"));
import BuyGiftCard from "./pages/Public/BuyGiftCard";
const GiftCardBatchGenerator = lazy(() => import("./pages/Admin/GiftCardBatchGenerator"));
const AnalyticsPage = lazy(() => import("./pages/Admin/Analytics"));
const ProductsPage = lazy(() => import("./pages/Admin/Products"));
const ProductSale = lazy(() => import("./pages/Admin/ProductSale"));
const SecuritySettings = lazy(() => import("./pages/Admin/SecuritySettings"));
const WaitlistPage = lazy(() => import("./pages/Admin/Waitlist"));
import Feedback from "./pages/Public/Feedback";
const SubscriptionsPage = lazy(() => import("./pages/Admin/Subscriptions"));
import { CatalogProvider } from "./context/CatalogContext";
import { SettingsProvider } from "./context/SettingsContext";

const queryClient = new QueryClient();

const App = () => (
  <QueryClientProvider client={queryClient}>
    <TooltipProvider>
      <CatalogProvider>
        <SettingsProvider>
        <Toaster />
        <Sonner />
        <BrowserRouter>
        <Suspense fallback={<div style={{display:"flex",alignItems:"center",justifyContent:"center",height:"100vh",background:"#FAFAF8"}}><div style={{width:40,height:40,border:"3px solid #F0E4CC",borderTopColor:"#C8A97E",borderRadius:"50%",animation:"spin 0.8s linear infinite"}} /><style>{"@keyframes spin{to{transform:rotate(360deg)}}"}</style></div>}>
        <Routes>
          {/* =================== PUBLIC ROUTES =================== */}
          {/* Public Landing Page */}
          <Route path="/" element={<LandingPage />} />
          
          {/* Public Booking Page (no login required) */}
          <Route path="/book" element={<PublicBooking />} />
          
          {/* Staff Login Page */}
          <Route path="/app/auth" element={<Auth />} />
          <Route path="/buy-gift-card" element={<BuyGiftCard />} />
          <Route path="/feedback" element={<Feedback />} />

          <Route path="/auth/callback" element={<AuthCallback />} />
          <Route path="/app/auth/callback" element={<AuthCallback />} />

          {/* Client self-service portal */}
          <Route path="/app/client/auth" element={<Navigate to="/app/auth" />} />
          <Route path="/app/client" element={<ClientPortal />}>
            <Route path="dashboard" element={<ClientDashboard />} />
            <Route path="bookings" element={<ClientBookings />} />
            <Route path="loyalty" element={<ClientLoyalty />} />
            <Route path="profile" element={<ClientProfile />} />
            <Route path="services" element={<ViewServices />} />
            <Route path="security" element={<SecuritySettings />} />
          </Route>

          {/* =================== MANAGEMENT SYSTEM ROUTES =================== */}
          
          {/* OWNER (Manager) - Full Access */}
          <Route element={<ProtectedRoute allowedRoles={["owner", "admin"]} />}>
            <Route element={<DashboardLayout />}>
              <Route path="/app/admin/dashboard" element={<AdminLayout />} />
              <Route path="/app/admin/bookings" element={<Bookings />} />
              <Route path="/app/admin/checkout" element={<Checkout />} />
              <Route path="/app/admin/services" element={<Services />} />
              <Route path="/app/admin/clients" element={<Clients />} />
              <Route path="/app/admin/staff" element={<Staff />} />
              <Route path="/app/admin/sales" element={<Sales />} />
              <Route path="/app/admin/reports" element={<Reports />} />
              <Route path="/app/admin/attendance" element={<Attendance />} />
              <Route path="/app/admin/attendance-reports" element={<AttendanceReports />} />
              <Route path="/app/admin/gift-cards" element={<GiftCards />} />
              <Route path="/app/admin/gift-card-batches" element={<GiftCardBatchGenerator />} />
              <Route path="/app/admin/loyalty" element={<Loyalty />} />
              <Route path="/app/admin/sms-test" element={<SMSTest />} />
              <Route path="/app/admin/promo-codes" element={<PromoCodesPage />} />
              <Route path="/app/admin/analytics" element={<AnalyticsPage />} />
              <Route path="/app/admin/products" element={<ProductsPage />} />
              <Route path="/app/admin/product-sale" element={<ProductSale />} />
              <Route path="/app/admin/subscriptions" element={<SubscriptionsPage />} />
              <Route path="/app/admin/settings" element={<SettingsPage />} />
              <Route path="/app/admin/security" element={<SecuritySettings />} />
              <Route path="/app/admin/waitlist" element={<WaitlistPage />} />
            </Route>
          </Route>

          {/* RECEPTIONIST - Limited Access (daily operations) */}
          <Route element={<ProtectedRoute allowedRoles={["receptionist"]} />}>
            <Route element={<DashboardLayout />}>
              <Route path="/app/receptionist/dashboard" element={<ReceptionistLayout />} />
              <Route path="/app/receptionist/bookings" element={<Bookings />} />
              <Route path="/app/receptionist/clients" element={<Clients />} />
              <Route path="/app/receptionist/staff" element={<Staff />} />
              <Route path="/app/receptionist/gift-cards" element={<GiftCards />} />
              <Route path="/app/receptionist/checkout" element={<Checkout />} />
              <Route path="/app/receptionist/attendance" element={<Attendance />} />
              <Route path="/app/receptionist/services" element={<ViewServices />} />
              <Route path="/app/receptionist/promo-codes" element={<PromoCodesPage />} />
              <Route path="/app/receptionist/loyalty" element={<Loyalty />} />
              <Route path="/app/receptionist/products" element={<ProductsPage />} />
              <Route path="/app/receptionist/product-sale" element={<ProductSale />} />
              <Route path="/app/receptionist/security" element={<SecuritySettings />} />
              <Route path="/app/receptionist/waitlist" element={<WaitlistPage />} />
              <Route path="/app/receptionist/sales" element={<Sales />} />
              <Route path="/app/receptionist/attendance-reports" element={<AttendanceReports />} />
            </Route>
          </Route>

          {/* STAFF - Minimal Access (their own tasks) */}
          <Route element={<ProtectedRoute allowedRoles={["staff"]} />}>
            <Route element={<DashboardLayout />}>
              <Route path="/app/staff/dashboard" element={<StaffLayout />} />
              <Route path="/app/staff/bookings" element={<StaffBookings />} />
              <Route path="/app/staff/services" element={<ViewServices />} />
              <Route path="/app/staff/attendance" element={<MyAttendance />} />
              <Route path="/app/staff/promo-codes" element={<PromoCodesPage />} />
              <Route path="/app/staff/security" element={<SecuritySettings />} />
            </Route>
          </Route>

          {/* CLEANER - Read-only: promo codes + services + attendance */}
          <Route element={<ProtectedRoute allowedRoles={["cleaner"]} />}>
            <Route element={<DashboardLayout />}>
              <Route path="/app/cleaner/dashboard" element={<CleanerLayout />} />
              <Route path="/app/cleaner/promo-codes" element={<PromoCodesPage />} />
              <Route path="/app/cleaner/security" element={<SecuritySettings />} />
              <Route path="/app/cleaner/services" element={<ViewServices />} />
              <Route path="/app/cleaner/attendance" element={<MyAttendance />} />
            </Route>
          </Route>

          {/* CLIENT - Customer portal */}


          {/* =================== LEGACY REDIRECTS =================== */}
          <Route path="/auth" element={<Navigate to="/app/auth" />} />
          <Route path="/admin/*" element={<Navigate to="/app/admin/dashboard" />} />
          <Route path="/staff/*" element={<Navigate to="/app/staff/dashboard" />} />
          <Route path="/dashboard" element={<Navigate to="/app/client/dashboard" />} />
          <Route path="/app/dashboard" element={<Navigate to="/app/client/dashboard" />} />
          <Route path="/app/bookings" element={<Navigate to="/app/client/bookings" />} />
          <Route path="/app/services" element={<Navigate to="/app/client/services" />} />
          <Route path="/app/staff/staff" element={<Navigate to="/app/admin/staff" />} />
          <Route path="/manage" element={<Navigate to="/app/auth" />} />
          <Route path="/manage/*" element={<Navigate to="/app/auth" />} />

          {/* 404 */}
          <Route path="*" element={<NotFound />} />
        </Routes>
        </Suspense>
        </BrowserRouter>
      </SettingsProvider>
      </CatalogProvider>
    </TooltipProvider>
  </QueryClientProvider>
);

export default App;
