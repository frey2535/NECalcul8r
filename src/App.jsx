import React, { Suspense, lazy } from "react";
import { Toaster } from "@/components/ui/toaster"
import { QueryClientProvider } from '@tanstack/react-query'
import { queryClientInstance } from '@/lib/query-client'
import { BrowserRouter as Router, Route, Routes, Navigate, useLocation } from 'react-router-dom';
import Login from '@/pages/Login';
import Register from '@/pages/Register';
import ForgotPassword from '@/pages/ForgotPassword';
import ResetPassword from '@/pages/ResetPassword';
import PageNotFound from './lib/PageNotFound';
import { AuthProvider, useAuth } from '@/lib/AuthContext';
import { NECYearProvider } from '@/context/NECYearContext';
import { ThemeProvider } from '@/context/ThemeContext';
import UserNotRegisteredError from '@/components/UserNotRegisteredError';
import { lazyRetry } from '@/lib/lazyRetry';

import AppLayout from '@/components/layout/AppLayout';
import ProtectedRoute from '@/components/ProtectedRoute';
import AdminRoute from '@/components/AdminRoute';
import { useTrialStatus } from '@/hooks/useTrialStatus';
import TrialExpiredScreen from '@/components/TrialExpiredScreen';
import InstallAppPrompt from '@/components/InstallAppPrompt';
import UpdateAvailablePrompt from '@/components/UpdateAvailablePrompt';

// Lazy-loaded route components
const NECCalculator = lazy(() => import('@/pages/NECCalculator'));
const NECTables = lazy(() => import('@/pages/NECTables'));
const History = lazy(() => import('@/pages/History'));
const Projects = lazy(() => import('@/pages/Projects'));
const NewAnalysis = lazy(() => import('@/pages/NewAnalysis'));
const Results = lazy(() => import('@/pages/Results'));
const UserManagement = lazy(() => import('@/pages/UserManagement'));
const DeveloperAudit = lazy(() => import('@/pages/DeveloperAudit'));
const DiscrepancyReports = lazy(() => import('@/pages/admin/DiscrepancyReports'));
const NECCoverageReport = lazy(() => import('@/pages/NECCoverageReport'));
const CodebookMatrix = lazy(() => import('@/pages/admin/CodebookMatrix'));
const CalculatorVerification = lazy(() => import('@/pages/admin/CalculatorVerification'));
const Landing = lazy(lazyRetry(() => import('@/pages/Landing'), 'Landing'));
const Profile = lazy(() => import('@/pages/Profile'));
const Purchase = lazy(() => import('@/pages/Purchase'));
const PrivacyPolicy = lazy(() => import('@/pages/PrivacyPolicy'));
const TermsOfService = lazy(() => import('@/pages/TermsOfService'));

function PageLoader() {
  return (
    <div className="flex items-center justify-center py-24">
      <div className="w-8 h-8 border-4 border-slate-200 border-t-blue-600 rounded-full animate-spin" />
    </div>
  );
}

const AuthenticatedApp = () => {
  const { isLoadingAuth, isLoadingPublicSettings, authError, navigateToLogin, user } = useAuth();
  const location = useLocation();
  const trialStatus = useTrialStatus(user);

  if (isLoadingPublicSettings || isLoadingAuth) {
    return (
      <div className="fixed inset-0 flex items-center justify-center">
        <div className="w-8 h-8 border-4 border-slate-200 border-t-slate-800 rounded-full animate-spin"></div>
      </div>
    );
  }

  if (authError?.type === 'user_not_registered') {
    return <UserNotRegisteredError />;
  }

  // Block access if trial expired or disabled (admins are always allowed)
  if (!trialStatus.canAccess && trialStatus.status !== 'unknown' && location.pathname !== "/purchase") {
    return <TrialExpiredScreen user={user} status={trialStatus.status} blockReason={trialStatus.blockReason} />;
  }

  return (
    <Suspense fallback={<PageLoader />}>
      <Routes>
        <Route path="/landing" element={<Landing />} />
        <Route path="/privacy" element={<PrivacyPolicy />} />
        <Route path="/terms" element={<TermsOfService />} />
        <Route path="/login" element={<Login />} />
        <Route path="/register" element={<Register />} />
        <Route path="/forgot-password" element={<ForgotPassword />} />
        <Route path="/reset-password" element={<ResetPassword />} />
        <Route element={<ProtectedRoute unauthenticatedElement={<Navigate to="/landing" replace />} />}>
          <Route element={<AppLayout trialStatus={trialStatus} />}>
            <Route path="/" element={<NECCalculator />} />
            <Route path="/calculator/:calcId" element={<NECCalculator />} />
            <Route path="/nec-tables" element={<NECTables />} />
            <Route path="/projects" element={<Projects />} />
            <Route path="/history" element={<History />} />
            <Route path="/new-analysis" element={<NewAnalysis />} />
            <Route path="/results" element={<Results />} />
            <Route path="/profile" element={<Profile />} />
            <Route path="/purchase" element={<Purchase />} />
            <Route element={<AdminRoute />}>
              <Route path="/admin/users" element={<UserManagement />} />
              <Route path="/admin/audit" element={<DeveloperAudit />} />
              <Route path="/admin/reports" element={<DiscrepancyReports />} />
              <Route path="/admin/coverage" element={<NECCoverageReport />} />
              <Route path="/admin/codebook" element={<CodebookMatrix />} />
              <Route path="/admin/verification" element={<CalculatorVerification />} />
            </Route>
          </Route>
        </Route>
        <Route path="*" element={<PageNotFound />} />
      </Routes>
    </Suspense>
  );
};

function App() {
  return (
    <AuthProvider>
      <NECYearProvider>
        <ThemeProvider>
        <QueryClientProvider client={queryClientInstance}>
          <Router>
            <AuthenticatedApp />
            <InstallAppPrompt />
            <UpdateAvailablePrompt />
          </Router>
          <Toaster />
        </QueryClientProvider>
        </ThemeProvider>
      </NECYearProvider>
    </AuthProvider>
  )
}

export default App