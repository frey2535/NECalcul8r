import React, { Suspense, lazy, useEffect, useState } from "react";
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
import { refreshApp } from '@/lib/pwa';

// Lazy-loaded route components
const NECCalculator = lazy(lazyRetry(() => import('@/pages/NECCalculator'), 'NECCalculator'));
const NECTables = lazy(lazyRetry(() => import('@/pages/NECTables'), 'NECTables'));
const History = lazy(lazyRetry(() => import('@/pages/History'), 'History'));
const Projects = lazy(lazyRetry(() => import('@/pages/Projects'), 'Projects'));
const NewAnalysis = lazy(lazyRetry(() => import('@/pages/NewAnalysis'), 'NewAnalysis'));
const Results = lazy(lazyRetry(() => import('@/pages/Results'), 'Results'));
const UserManagement = lazy(lazyRetry(() => import('@/pages/UserManagement'), 'UserManagement'));
const DeveloperAudit = lazy(lazyRetry(() => import('@/pages/DeveloperAudit'), 'DeveloperAudit'));
const DiscrepancyReports = lazy(lazyRetry(() => import('@/pages/admin/DiscrepancyReports'), 'DiscrepancyReports'));
const NECCoverageReport = lazy(lazyRetry(() => import('@/pages/NECCoverageReport'), 'NECCoverageReport'));
const CodebookMatrix = lazy(lazyRetry(() => import('@/pages/admin/CodebookMatrix'), 'CodebookMatrix'));
const CalculatorVerification = lazy(lazyRetry(() => import('@/pages/admin/CalculatorVerification'), 'CalculatorVerification'));
const Landing = lazy(lazyRetry(() => import('@/pages/Landing'), 'Landing'));
const Profile = lazy(lazyRetry(() => import('@/pages/Profile'), 'Profile'));
const Purchase = lazy(lazyRetry(() => import('@/pages/Purchase'), 'Purchase'));
const PrivacyPolicy = lazy(lazyRetry(() => import('@/pages/PrivacyPolicy'), 'PrivacyPolicy'));
const TermsOfService = lazy(lazyRetry(() => import('@/pages/TermsOfService'), 'TermsOfService'));

function PageLoader() {
  return (
    <div className="flex items-center justify-center py-24">
      <div className="w-8 h-8 border-4 border-slate-200 border-t-blue-600 rounded-full animate-spin" />
    </div>
  );
}

function StartupLoadingScreen() {
  const [showRecovery, setShowRecovery] = useState(false);
  const [refreshing, setRefreshing] = useState(false);

  useEffect(() => {
    const timer = window.setTimeout(() => setShowRecovery(true), 5000);
    return () => window.clearTimeout(timer);
  }, []);

  const refreshAndUpdate = async () => {
    setRefreshing(true);
    await refreshApp();
  };

  return (
    <div className="fixed inset-0 flex items-center justify-center bg-background px-6">
      <div className="max-w-sm text-center space-y-4">
        <div className="w-8 h-8 border-4 border-slate-200 border-t-slate-800 rounded-full animate-spin mx-auto" />
        <div>
          <p className="text-sm font-semibold text-foreground">Loading NECalcul8r…</p>
          <p className="text-xs text-muted-foreground mt-1">
            Checking your app session and latest update.
          </p>
        </div>
        {showRecovery && (
          <div className="rounded-xl border border-border bg-card p-3 shadow-sm">
            <p className="text-xs text-muted-foreground">
              If loading is stuck, refresh the full app and install any pending update.
            </p>
            <button
              type="button"
              onClick={refreshAndUpdate}
              disabled={refreshing}
              className="mt-3 rounded-lg bg-blue-600 hover:bg-blue-700 disabled:opacity-60 text-white text-xs font-bold px-3 py-1.5 transition-colors"
            >
              {refreshing ? "Refreshing…" : "Refresh / Update app"}
            </button>
          </div>
        )}
      </div>
    </div>
  );
}

const AuthenticatedApp = () => {
  const { isLoadingAuth, isLoadingPublicSettings, authError, navigateToLogin, user } = useAuth();
  const location = useLocation();
  const trialStatus = useTrialStatus(user);

  if (isLoadingPublicSettings || isLoadingAuth) {
    return <StartupLoadingScreen />;
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