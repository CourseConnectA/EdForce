import React, { useEffect } from 'react';
import { Routes, Route, Navigate, useLocation } from 'react-router-dom';
import { useSelector, useDispatch } from 'react-redux';
import { Box, CircularProgress, Typography } from '@mui/material';
import { Helmet } from 'react-helmet-async';

import { RootState, AppDispatch } from './store/store';
import { validateAndRestoreSession } from './store/slices/authSlice';
import { useSessionManager } from './hooks/useSessionManager';
import webSocketService from './services/webSocketService';
import nativeDialerService from './services/nativeDialerService';
import Layout from './components/layout/Layout';
import LoginPage from './pages/auth/LoginPage';
import DemoRequestPage from './pages/auth/DemoRequestPage';
import Dashboard from './pages/dashboard/Dashboard';
import AccountsPage from './pages/accounts/AccountsPage';
// Contacts removed
// LeadsPage removed per requirement
// Opportunities page unused (coming soon placeholder is used)
import CampaignsPage from './pages/campaigns/CampaignsPage';
// Old workflow automation removed
import MarketingPage from './pages/marketing/MarketingPage';
import LeadsPage from './pages/leads/LeadsPage';
import PresencePage from './pages/presence/PresencePage';
import LeadDetailPage from './pages/leads/LeadDetailPage';
import ComingSoon from './components/common/ComingSoon';
import Analytics from './pages/analytics/Analytics';
import WhatsAppPage from './pages/whatsapp/WhatsApp';
import CasesPage from './pages/cases/CasesPage';
import TasksPage from './pages/tasks/TasksPage';
import ReportsPage from './pages/reports/ReportsPage';
import UsersPage from './pages/settings/UsersPage';
import LeadFieldSettingsPage from './pages/settings/LeadFieldSettingsPage';
import SettingsPage from './pages/settings/SettingsPage';
import RulePage from './pages/rules/RulePage';
import CallManagementPage from './pages/calls/CallManagementPage';

// Protected Route Component
const ProtectedRoute: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const isAuthenticated = useSelector((state: RootState) => state.auth.isAuthenticated);
  
  return isAuthenticated ? <>{children}</> : <Navigate to="/login" replace />;
};

// Public Route Component (redirect to dashboard if authenticated)
const PublicRoute: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const isAuthenticated = useSelector((state: RootState) => state.auth.isAuthenticated);
  
  return !isAuthenticated ? <>{children}</> : <Navigate to="/dashboard" replace />;
};

const App: React.FC = () => {
  const dispatch = useDispatch<AppDispatch>();
  const { isLoading, isAuthenticated } = useSelector((state: RootState) => state.auth);
  const location = useLocation();
  
  // Initialize session manager for automatic logout and session handling
  useSessionManager();

  useEffect(() => {
    // Try to restore session on app start, but skip while on login page to avoid needless refresh attempts
    if (location.pathname !== '/login') {
      dispatch(validateAndRestoreSession());
    }
  }, [dispatch, location.pathname]);

  // Initialize WebSocket and Dialer for real-time updates when authenticated
  useEffect(() => {
    if (isAuthenticated) {
      console.log('🔌 Connecting WebSocket for real-time updates...');
      webSocketService.connect();
      
      console.log('📱 Starting native dialer service...');
      nativeDialerService.start();
      
      return () => {
        console.log('🔌 Disconnecting WebSocket...');
        webSocketService.disconnect();
        console.log('📱 Stopping native dialer service...');
        nativeDialerService.stop();
      };
    }
  }, [isAuthenticated]);

  // Show global loading only outside the Login page; on Login, keep inline button spinner
  if (isLoading && location.pathname !== '/login') {
    return (
      <Box 
        sx={{ 
          display: 'flex', 
          justifyContent: 'center', 
          alignItems: 'center', 
          minHeight: '100vh',
          flexDirection: 'column',
          gap: 2
        }}
      >
        <CircularProgress />
        <Typography variant="body2" color="text.secondary">
          Validating session...
        </Typography>
      </Box>
    );
  }

  return (
    <Box sx={{ display: 'flex', flexDirection: 'column', minHeight: '100vh' }}>
      <Helmet>
        <title>Edforce - Enterprise Customer Relationship Management</title>
        <meta name="description" content="Modern, enterprise-grade Customer Relationship Management system" />
      </Helmet>

      <Routes>
        {/* Public Routes */}
        <Route
          path="/login"
          element={
            <PublicRoute>
              <LoginPage />
            </PublicRoute>
          }
        />
        <Route
          path="/register"
          element={
            <PublicRoute>
              <DemoRequestPage />
            </PublicRoute>
          }
        />

        {/* Protected Routes */}
        <Route
          path="/*"
          element={
            <ProtectedRoute>
              <Layout>
                <Routes>
                  <Route path="/" element={<Navigate to="/dashboard" replace />} />
                  <Route path="/dashboard" element={<Dashboard />} />
                  <Route path="/accounts/*" element={<AccountsPage />} />
                  <Route path="/presence" element={<PresencePage />} />
                  {/* Leads visible only to Center Manager and Counselor; extra check inside page */}
                  <Route path="/leads" element={<LeadsPage />} />
                  <Route path="/leads/:id" element={<LeadDetailPage />} />
                  {/* Call Management page */}
                  <Route path="/calls" element={<CallManagementPage />} />
                  {/* Opportunities replaced with Coming Soon UI */}
                  <Route path="/opportunities/*" element={<ComingSoon title="Opportunities" subtitle="This feature is coming soon." />} />
                  <Route path="/campaigns/*" element={<CampaignsPage />} />
                  {/* New Marketing Automation (admin-only UI handles access) */}
                  <Route path="/marketing" element={<MarketingPage />} />
                  <Route path="/analytics" element={<Analytics />} />
                  <Route path="/whatsapp" element={<WhatsAppPage />} />
                  <Route path="/cases/*" element={<CasesPage />} />
                  <Route path="/tasks/*" element={<TasksPage />} />
                  <Route path="/reports/*" element={<ReportsPage />} />
                  {/* Center Manager only UI gating is inside the page */}
                  <Route path="/rule" element={<RulePage />} />
                  {/* Settings: Unified page that shows appropriate content per role */}
                  <Route path="/settings" element={<SettingsPage />} />
                  <Route path="/settings/lead-fields" element={<LeadFieldSettingsPage />} />
                  {/* Legacy route fallback */}
                  <Route path="/settings/custom-fields" element={<LeadFieldSettingsPage />} />
                  {/* Backward compatibility: redirect old users path to new top-level */}
                  <Route path="/settings/users" element={<Navigate to="/users" replace />} />
                  {/* New top-level Users route */}
                  <Route path="/users" element={<UsersPage />} />
                  
                  {/* Catch all route */}
                  <Route path="*" element={<Navigate to="/dashboard" replace />} />
                </Routes>
              </Layout>
            </ProtectedRoute>
          }
        />
      </Routes>
    </Box>
  );
};

export default App;