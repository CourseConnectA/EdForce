import React, { useEffect, useState, useCallback } from 'react';
import {
  Box,
  Typography,
  CircularProgress,
  Alert,
  useMediaQuery,
  useTheme,
  Card,
  CardContent,
  Chip,
  Stack,
  LinearProgress,
} from '@mui/material';
import { useNavigate } from 'react-router-dom';
import { useSelector } from 'react-redux';
import { RootState } from '../../store/store';
import dashboardService, { 
  DashboardStats, 
  CounselorDashboard, 
  SuperAdminDashboard,
  CenterManagerDashboard,
  FollowUpLead,
} from '../../services/dashboardService';
import CallAnalyticsWidget from '@/components/analytics/CallAnalyticsWidget';
import { screenshotColors, glassMorphism } from '../../theme/theme';
import PhoneIcon from '@mui/icons-material/Phone';
import EmailIcon from '@mui/icons-material/Email';
import EventIcon from '@mui/icons-material/Event';
import OpenInNewIcon from '@mui/icons-material/OpenInNew';
import WarningAmberIcon from '@mui/icons-material/WarningAmber';
import TrendingUpIcon from '@mui/icons-material/TrendingUp';
import GroupsIcon from '@mui/icons-material/Groups';
import BusinessIcon from '@mui/icons-material/Business';
import LeaderboardIcon from '@mui/icons-material/Leaderboard';
import CheckCircleIcon from '@mui/icons-material/CheckCircle';
import PersonIcon from '@mui/icons-material/Person';

type StatCardFilter = 'today' | 'qualified' | 'overdue';

const Dashboard: React.FC = () => {
  const [stats, setStats] = useState<DashboardStats | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  
  const theme = useTheme();
  const isMobile = useMediaQuery(theme.breakpoints.down('md'));
  const navigate = useNavigate();
  const { user } = useSelector((state: RootState) => state.auth);
  const userRole = String((user as any)?.role || ((user as any)?.isAdmin ? 'super-admin' : 'counselor')).toLowerCase();

  const fetchDashboardData = useCallback(async () => {
    try {
      setError(null);
      const data = await dashboardService.getAllStats();
      setStats(data);
    } catch (err) {
      console.error('Error fetching dashboard data:', err);
      const errorMessage = err instanceof Error ? err.message : 'Failed to load dashboard data';
      setError(errorMessage);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    setLoading(true);
    fetchDashboardData();
    // Poll every 30 seconds for updates
    const interval = setInterval(fetchDashboardData, 30000);
    return () => clearInterval(interval);
  }, [fetchDashboardData]);

  const formatNumber = useCallback((num: number) => {
    return new Intl.NumberFormat('en-US').format(num);
  }, []);

  const formatDateTime = useCallback((dateStr?: string) => {
    if (!dateStr) return '-';
    const date = new Date(dateStr);
    return date.toLocaleString('en-US', {
      month: 'short',
      day: 'numeric',
      hour: 'numeric',
      minute: '2-digit',
      hour12: true,
    });
  }, []);

  const handleLeadClick = useCallback((leadId: string) => {
    navigate(`/leads/${leadId}`);
  }, [navigate]);

  if (loading && !stats) {
    return (
      <Box sx={{ display: 'flex', justifyContent: 'center', alignItems: 'center', height: '50vh' }}>
        <CircularProgress size={60} />
      </Box>
    );
  }

  if (error) {
    return (
      <Box>
        <Typography variant="h4" sx={{ color: screenshotColors.darkText, fontWeight: 600, mb: 1 }}>
          Dashboard
        </Typography>
        <Alert severity="warning" sx={{ mt: 2 }}>{error}</Alert>
      </Box>
    );
  }

  // Render based on role
  if (userRole === 'counselor' && stats?.role === 'counselor') {
    return <CounselorDashboardView 
      stats={stats as CounselorDashboard} 
      loading={loading}
      isMobile={isMobile}
      formatNumber={formatNumber}
      formatDateTime={formatDateTime}
      handleLeadClick={handleLeadClick}
    />;
  }

  if (userRole === 'super-admin' && stats?.role === 'super-admin') {
    return <SuperAdminDashboardView 
      stats={stats as SuperAdminDashboard}
      loading={loading}
      isMobile={isMobile}
      formatNumber={formatNumber}
    />;
  }

  // Center Manager view
  if (userRole === 'center-manager' && stats?.role === 'center-manager') {
    return <CenterManagerDashboardView
      stats={stats as CenterManagerDashboard}
      loading={loading}
      isMobile={isMobile}
      formatNumber={formatNumber}
      formatDateTime={formatDateTime}
      handleLeadClick={handleLeadClick}
    />;
  }

  return null;
};

// ==================== COUNSELOR DASHBOARD ====================
interface CounselorDashboardViewProps {
  stats: CounselorDashboard;
  loading: boolean;
  isMobile: boolean;
  formatNumber: (num: number) => string;
  formatDateTime: (date?: string) => string;
  handleLeadClick: (leadId: string) => void;
}

const CounselorDashboardView: React.FC<CounselorDashboardViewProps> = ({
  stats,
  loading,
  isMobile,
  formatNumber,
  formatDateTime,
  handleLeadClick,
}) => {
  const [activeFilter, setActiveFilter] = useState<StatCardFilter>('today');

  // Get the leads list based on selected filter
  const getDisplayedLeads = (): FollowUpLead[] => {
    switch (activeFilter) {
      case 'today':
        return stats.todayFollowUpsList || [];
      case 'overdue':
        return stats.overdueFollowUpsList || [];
      case 'qualified':
        return stats.qualifiedLeadsList || [];
      default:
        return [];
    }
  };

  const getDisplayTitle = () => {
    switch (activeFilter) {
      case 'today':
        return `Today's Follow-ups (${stats.todayFollowUpsList?.length || 0})`;
      case 'overdue':
        return `Overdue Follow-ups (${stats.overdueFollowUpsList?.length || 0})`;
      case 'qualified':
        return `Qualified Leads (${stats.qualifiedLeadsList?.length || 0})`;
      default:
        return '';
    }
  };

  const displayedLeads = getDisplayedLeads();

  return (
    <Box sx={{ px: isMobile ? 0 : 1 }}>
      {/* Header Row */}
      <Box sx={{ mb: 2.5 }}>
        <Typography
          sx={{ 
            color: screenshotColors.darkText, 
            fontSize: isMobile ? '1.75rem' : '2rem',
            fontWeight: 700, 
            lineHeight: 1.1,
          }}
        >
          Dashboard
        </Typography>
        <Typography sx={{ color: screenshotColors.mutedText, fontSize: '0.9rem', mt: 0.25 }}>
          Manage your leads and follow-ups
        </Typography>
      </Box>

      {/* Top Stats Row - Total Leads, Conversion (for counselor) */}
      <Box sx={{ 
        display: 'grid', 
        gridTemplateColumns: isMobile ? '1fr' : 'repeat(2, 1fr)',
        gap: 2,
        mb: 3,
      }}>
        <Box sx={{ ...glassMorphism, borderRadius: '16px', p: 2.5 }}>
          <Stack direction="row" alignItems="center" gap={1.5}>
            <LeaderboardIcon sx={{ fontSize: 32, color: '#1976d2' }} />
            <Box>
              <Typography sx={{ color: screenshotColors.mutedText, fontSize: '0.8rem' }}>Total Leads</Typography>
              <Typography sx={{ color: screenshotColors.darkText, fontSize: '1.75rem', fontWeight: 600 }}>
                {formatNumber(stats.leads.totalLeads)}
              </Typography>
            </Box>
          </Stack>
        </Box>
        <Box sx={{ ...glassMorphism, borderRadius: '16px', p: 2.5 }}>
          <Stack direction="row" alignItems="center" gap={1.5}>
            <TrendingUpIcon sx={{ fontSize: 32, color: '#4caf50' }} />
            <Box>
              <Typography sx={{ color: screenshotColors.mutedText, fontSize: '0.8rem' }}>Conversion</Typography>
              <Typography sx={{ color: '#4caf50', fontSize: '1.75rem', fontWeight: 600 }}>
                {stats.leads.totalLeads > 0 ? Math.round((stats.leads.qualifiedLeads / stats.leads.totalLeads) * 100) : 0}%
              </Typography>
            </Box>
          </Stack>
        </Box>
      </Box>

      {/* Clickable Filter Buttons Row - Modern Design */}
      <Box sx={{ 
        display: 'flex',
        justifyContent: 'center',
        gap: isMobile ? 2 : 4,
        mb: 3,
      }}>
        {/* Today's Follow-ups */}
        <Box 
          onClick={() => setActiveFilter('today')}
          sx={{ 
            display: 'flex',
            flexDirection: 'column',
            alignItems: 'center',
            cursor: 'pointer',
            transition: 'all 0.2s ease',
          }}
        >
          <Box sx={{
            width: isMobile ? 56 : 64,
            height: isMobile ? 56 : 64,
            borderRadius: '50%',
            border: activeFilter === 'today' ? '2px solid #1976d2' : '2px solid rgba(0,0,0,0.12)',
            backgroundColor: activeFilter === 'today' ? 'rgba(25, 118, 210, 0.08)' : 'transparent',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            transition: 'all 0.2s ease',
            position: 'relative',
            '&:hover': {
              backgroundColor: 'rgba(25, 118, 210, 0.08)',
              borderColor: '#1976d2',
            },
          }}>
            <EventIcon sx={{ fontSize: isMobile ? 28 : 32, color: activeFilter === 'today' ? '#1976d2' : '#666' }} />
            {stats.followUpsToday > 0 && (
              <Box sx={{
                position: 'absolute',
                top: -4,
                right: -4,
                minWidth: 22,
                height: 22,
                borderRadius: '11px',
                backgroundColor: '#1976d2',
                color: '#fff',
                fontSize: '0.75rem',
                fontWeight: 600,
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                px: 0.5,
              }}>
                {stats.followUpsToday > 99 ? '99+' : stats.followUpsToday}
              </Box>
            )}
          </Box>
          <Typography sx={{ 
            mt: 1, 
            fontSize: isMobile ? '0.7rem' : '0.8rem', 
            color: activeFilter === 'today' ? '#1976d2' : screenshotColors.mutedText,
            fontWeight: activeFilter === 'today' ? 600 : 400,
            textAlign: 'center',
            maxWidth: 80,
          }}>
            Today's Follow-ups
          </Typography>
        </Box>

        {/* Qualified Leads */}
        <Box 
          onClick={() => setActiveFilter('qualified')}
          sx={{ 
            display: 'flex',
            flexDirection: 'column',
            alignItems: 'center',
            cursor: 'pointer',
            transition: 'all 0.2s ease',
          }}
        >
          <Box sx={{
            width: isMobile ? 56 : 64,
            height: isMobile ? 56 : 64,
            borderRadius: '50%',
            border: activeFilter === 'qualified' ? '2px solid #4caf50' : '2px solid rgba(0,0,0,0.12)',
            backgroundColor: activeFilter === 'qualified' ? 'rgba(76, 175, 80, 0.08)' : 'transparent',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            transition: 'all 0.2s ease',
            position: 'relative',
            '&:hover': {
              backgroundColor: 'rgba(76, 175, 80, 0.08)',
              borderColor: '#4caf50',
            },
          }}>
            <CheckCircleIcon sx={{ fontSize: isMobile ? 28 : 32, color: activeFilter === 'qualified' ? '#4caf50' : '#666' }} />
            {stats.leads.qualifiedLeads > 0 && (
              <Box sx={{
                position: 'absolute',
                top: -4,
                right: -4,
                minWidth: 22,
                height: 22,
                borderRadius: '11px',
                backgroundColor: '#4caf50',
                color: '#fff',
                fontSize: '0.75rem',
                fontWeight: 600,
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                px: 0.5,
              }}>
                {stats.leads.qualifiedLeads > 99 ? '99+' : stats.leads.qualifiedLeads}
              </Box>
            )}
          </Box>
          <Typography sx={{ 
            mt: 1, 
            fontSize: isMobile ? '0.7rem' : '0.8rem', 
            color: activeFilter === 'qualified' ? '#4caf50' : screenshotColors.mutedText,
            fontWeight: activeFilter === 'qualified' ? 600 : 400,
            textAlign: 'center',
            maxWidth: 80,
          }}>
            Qualified Leads
          </Typography>
        </Box>

        {/* Overdue */}
        <Box 
          onClick={() => setActiveFilter('overdue')}
          sx={{ 
            display: 'flex',
            flexDirection: 'column',
            alignItems: 'center',
            cursor: 'pointer',
            transition: 'all 0.2s ease',
          }}
        >
          <Box sx={{
            width: isMobile ? 56 : 64,
            height: isMobile ? 56 : 64,
            borderRadius: '50%',
            border: activeFilter === 'overdue' ? '2px solid #ff9800' : '2px solid rgba(0,0,0,0.12)',
            backgroundColor: activeFilter === 'overdue' ? 'rgba(255, 152, 0, 0.08)' : 'transparent',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            transition: 'all 0.2s ease',
            position: 'relative',
            '&:hover': {
              backgroundColor: 'rgba(255, 152, 0, 0.08)',
              borderColor: '#ff9800',
            },
          }}>
            <WarningAmberIcon sx={{ fontSize: isMobile ? 28 : 32, color: activeFilter === 'overdue' ? '#ff9800' : '#666' }} />
            {stats.overdueFollowUps > 0 && (
              <Box sx={{
                position: 'absolute',
                top: -4,
                right: -4,
                minWidth: 22,
                height: 22,
                borderRadius: '11px',
                backgroundColor: '#ff9800',
                color: '#fff',
                fontSize: '0.75rem',
                fontWeight: 600,
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                px: 0.5,
              }}>
                {stats.overdueFollowUps > 99 ? '99+' : stats.overdueFollowUps}
              </Box>
            )}
          </Box>
          <Typography sx={{ 
            mt: 1, 
            fontSize: isMobile ? '0.7rem' : '0.8rem', 
            color: activeFilter === 'overdue' ? '#ff9800' : screenshotColors.mutedText,
            fontWeight: activeFilter === 'overdue' ? 600 : 400,
            textAlign: 'center',
            maxWidth: 80,
          }}>
            Overdue
          </Typography>
        </Box>
      </Box>

      {/* Loading indicator */}
      {loading && <LinearProgress sx={{ mb: 2, borderRadius: 1 }} />}

      {/* Leads List Container - Scrollable */}
      <Box
        sx={{
          backgroundColor: activeFilter === 'overdue' ? '#8b5a2b' : activeFilter === 'qualified' ? '#2e7d32' : '#5a7a8a',
          borderRadius: '20px',
          p: isMobile ? 2 : 3,
          height: 350,
          display: 'flex',
          flexDirection: 'column',
          transition: 'background-color 0.3s ease',
        }}
      >
        <Typography sx={{ color: '#fff', fontSize: '1.25rem', fontWeight: 600, mb: 2, flexShrink: 0 }}>
          {getDisplayTitle()}
        </Typography>
        
        <Box sx={{ 
          flex: 1, 
          overflowY: 'auto',
          pr: 1,
          '&::-webkit-scrollbar': { 
            width: '8px',
          },
          '&::-webkit-scrollbar-track': { 
            backgroundColor: 'rgba(255, 255, 255, 0.1)', 
            borderRadius: '10px',
            border: '1px solid rgba(255, 255, 255, 0.2)',
          },
          '&::-webkit-scrollbar-thumb': { 
            backgroundColor: 'rgba(255, 255, 255, 0.6)', 
            borderRadius: '10px',
            '&:hover': {
              backgroundColor: 'rgba(255, 255, 255, 0.8)',
            },
          },
        }}>
          {displayedLeads.length === 0 ? (
            <Box sx={{ textAlign: 'center', py: 6 }}>
              <EventIcon sx={{ fontSize: 48, color: 'rgba(255,255,255,0.5)', mb: 1 }} />
              <Typography sx={{ color: 'rgba(255,255,255,0.7)' }}>
                {activeFilter === 'overdue' 
                  ? 'No overdue follow-ups 🎉' 
                  : activeFilter === 'qualified' 
                    ? 'No qualified leads yet'
                    : "No follow-ups scheduled for today"}
              </Typography>
            </Box>
          ) : (
            <LeadsList 
              leads={displayedLeads} 
              activeFilter={activeFilter}
              formatDateTime={formatDateTime}
              handleLeadClick={handleLeadClick}
              showCounselor={false}
            />
          )}
        </Box>
      </Box>

      {/* Call Analytics Widget */}
      <Box sx={{ mt: 3 }}>
        <CallAnalyticsWidget period="daily" />
      </Box>
    </Box>
  );
};

// Custom scrollbar styles
const customScrollbarStyles = {
  '&::-webkit-scrollbar': { 
    width: '8px',
    height: '8px',
  },
  '&::-webkit-scrollbar-track': { 
    backgroundColor: 'rgba(255, 255, 255, 0.1)', 
    borderRadius: '10px',
    border: '1px solid rgba(255, 255, 255, 0.2)',
  },
  '&::-webkit-scrollbar-thumb': { 
    backgroundColor: 'rgba(255, 255, 255, 0.6)', 
    borderRadius: '10px',
    border: '2px solid transparent',
    backgroundClip: 'padding-box',
    '&:hover': {
      backgroundColor: 'rgba(255, 255, 255, 0.8)',
    },
  },
};

// ==================== CENTER MANAGER DASHBOARD ====================
interface CenterManagerDashboardViewProps {
  stats: CenterManagerDashboard;
  loading: boolean;
  isMobile: boolean;
  formatNumber: (num: number) => string;
  formatDateTime: (date?: string) => string;
  handleLeadClick: (leadId: string) => void;
}

const CenterManagerDashboardView: React.FC<CenterManagerDashboardViewProps> = ({
  stats,
  loading,
  isMobile,
  formatNumber,
  formatDateTime,
  handleLeadClick,
}) => {
  const [activeFilter, setActiveFilter] = useState<StatCardFilter>('today');

  // Get the leads list based on selected filter
  const getDisplayedLeads = (): FollowUpLead[] => {
    switch (activeFilter) {
      case 'today':
        return stats.todayFollowUpsList || [];
      case 'overdue':
        return stats.overdueFollowUpsList || [];
      case 'qualified':
        return stats.qualifiedLeadsList || [];
      default:
        return [];
    }
  };

  const getDisplayTitle = () => {
    switch (activeFilter) {
      case 'today':
        return `Today's Follow-ups (${stats.todayFollowUpsList?.length || 0})`;
      case 'overdue':
        return `Overdue Follow-ups (${stats.overdueFollowUpsList?.length || 0})`;
      case 'qualified':
        return `Qualified Leads (${stats.qualifiedLeadsList?.length || 0})`;
      default:
        return '';
    }
  };

  const displayedLeads = getDisplayedLeads();

  return (
    <Box sx={{ px: isMobile ? 0 : 1 }}>
      {/* Header Row */}
      <Box sx={{ mb: 2.5 }}>
        <Typography
          sx={{ 
            color: screenshotColors.darkText, 
            fontSize: isMobile ? '1.75rem' : '2rem',
            fontWeight: 700, 
            lineHeight: 1.1,
          }}
        >
          Dashboard
        </Typography>
        <Typography sx={{ color: screenshotColors.mutedText, fontSize: '0.9rem', mt: 0.25 }}>
          {stats.centerName} - Overview
        </Typography>
      </Box>

      {/* Top Stats Row - Counselors, Total Leads, Conversion (3 items) */}
      <Box sx={{ 
        display: 'grid', 
        gridTemplateColumns: isMobile ? '1fr' : 'repeat(3, 1fr)',
        gap: 2,
        mb: 3,
      }}>
        <Box sx={{ ...glassMorphism, borderRadius: '16px', p: 2.5 }}>
          <Stack direction="row" alignItems="center" gap={1.5}>
            <GroupsIcon sx={{ fontSize: 32, color: '#9c27b0' }} />
            <Box>
              <Typography sx={{ color: screenshotColors.mutedText, fontSize: '0.8rem' }}>Counselors</Typography>
              <Typography sx={{ color: screenshotColors.darkText, fontSize: '1.75rem', fontWeight: 600 }}>
                {formatNumber(stats.counselorsCount)}
              </Typography>
            </Box>
          </Stack>
        </Box>
        <Box sx={{ ...glassMorphism, borderRadius: '16px', p: 2.5 }}>
          <Stack direction="row" alignItems="center" gap={1.5}>
            <LeaderboardIcon sx={{ fontSize: 32, color: '#1976d2' }} />
            <Box>
              <Typography sx={{ color: screenshotColors.mutedText, fontSize: '0.8rem' }}>Total Leads</Typography>
              <Typography sx={{ color: screenshotColors.darkText, fontSize: '1.75rem', fontWeight: 600 }}>
                {formatNumber(stats.leads.totalLeads)}
              </Typography>
            </Box>
          </Stack>
        </Box>
        <Box sx={{ ...glassMorphism, borderRadius: '16px', p: 2.5 }}>
          <Stack direction="row" alignItems="center" gap={1.5}>
            <TrendingUpIcon sx={{ fontSize: 32, color: '#4caf50' }} />
            <Box>
              <Typography sx={{ color: screenshotColors.mutedText, fontSize: '0.8rem' }}>Conversion</Typography>
              <Typography sx={{ color: '#4caf50', fontSize: '1.75rem', fontWeight: 600 }}>
                {stats.leads.totalLeads > 0 ? Math.round((stats.leads.qualifiedLeads / stats.leads.totalLeads) * 100) : 0}%
              </Typography>
            </Box>
          </Stack>
        </Box>
      </Box>

      {/* Clickable Filter Buttons Row - Modern Design */}
      <Box sx={{ 
        display: 'flex',
        justifyContent: 'center',
        gap: isMobile ? 2 : 4,
        mb: 3,
      }}>
        {/* Today's Follow-ups */}
        <Box 
          onClick={() => setActiveFilter('today')}
          sx={{ 
            display: 'flex',
            flexDirection: 'column',
            alignItems: 'center',
            cursor: 'pointer',
            transition: 'all 0.2s ease',
          }}
        >
          <Box sx={{
            width: isMobile ? 56 : 64,
            height: isMobile ? 56 : 64,
            borderRadius: '50%',
            border: activeFilter === 'today' ? '2px solid #1976d2' : '2px solid rgba(0,0,0,0.12)',
            backgroundColor: activeFilter === 'today' ? 'rgba(25, 118, 210, 0.08)' : 'transparent',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            transition: 'all 0.2s ease',
            position: 'relative',
            '&:hover': {
              backgroundColor: 'rgba(25, 118, 210, 0.08)',
              borderColor: '#1976d2',
            },
          }}>
            <EventIcon sx={{ fontSize: isMobile ? 28 : 32, color: activeFilter === 'today' ? '#1976d2' : '#666' }} />
            {stats.followUpsToday > 0 && (
              <Box sx={{
                position: 'absolute',
                top: -4,
                right: -4,
                minWidth: 22,
                height: 22,
                borderRadius: '11px',
                backgroundColor: '#1976d2',
                color: '#fff',
                fontSize: '0.75rem',
                fontWeight: 600,
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                px: 0.5,
              }}>
                {stats.followUpsToday > 99 ? '99+' : stats.followUpsToday}
              </Box>
            )}
          </Box>
          <Typography sx={{ 
            mt: 1, 
            fontSize: isMobile ? '0.7rem' : '0.8rem', 
            color: activeFilter === 'today' ? '#1976d2' : screenshotColors.mutedText,
            fontWeight: activeFilter === 'today' ? 600 : 400,
            textAlign: 'center',
            maxWidth: 80,
          }}>
            Today's Follow-ups
          </Typography>
        </Box>

        {/* Qualified Leads */}
        <Box 
          onClick={() => setActiveFilter('qualified')}
          sx={{ 
            display: 'flex',
            flexDirection: 'column',
            alignItems: 'center',
            cursor: 'pointer',
            transition: 'all 0.2s ease',
          }}
        >
          <Box sx={{
            width: isMobile ? 56 : 64,
            height: isMobile ? 56 : 64,
            borderRadius: '50%',
            border: activeFilter === 'qualified' ? '2px solid #4caf50' : '2px solid rgba(0,0,0,0.12)',
            backgroundColor: activeFilter === 'qualified' ? 'rgba(76, 175, 80, 0.08)' : 'transparent',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            transition: 'all 0.2s ease',
            position: 'relative',
            '&:hover': {
              backgroundColor: 'rgba(76, 175, 80, 0.08)',
              borderColor: '#4caf50',
            },
          }}>
            <CheckCircleIcon sx={{ fontSize: isMobile ? 28 : 32, color: activeFilter === 'qualified' ? '#4caf50' : '#666' }} />
            {(stats.qualifiedLeadsList?.length || 0) > 0 && (
              <Box sx={{
                position: 'absolute',
                top: -4,
                right: -4,
                minWidth: 22,
                height: 22,
                borderRadius: '11px',
                backgroundColor: '#4caf50',
                color: '#fff',
                fontSize: '0.75rem',
                fontWeight: 600,
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                px: 0.5,
              }}>
                {(stats.qualifiedLeadsList?.length || 0) > 99 ? '99+' : stats.qualifiedLeadsList?.length || 0}
              </Box>
            )}
          </Box>
          <Typography sx={{ 
            mt: 1, 
            fontSize: isMobile ? '0.7rem' : '0.8rem', 
            color: activeFilter === 'qualified' ? '#4caf50' : screenshotColors.mutedText,
            fontWeight: activeFilter === 'qualified' ? 600 : 400,
            textAlign: 'center',
            maxWidth: 80,
          }}>
            Qualified Leads
          </Typography>
        </Box>

        {/* Overdue */}
        <Box 
          onClick={() => setActiveFilter('overdue')}
          sx={{ 
            display: 'flex',
            flexDirection: 'column',
            alignItems: 'center',
            cursor: 'pointer',
            transition: 'all 0.2s ease',
          }}
        >
          <Box sx={{
            width: isMobile ? 56 : 64,
            height: isMobile ? 56 : 64,
            borderRadius: '50%',
            border: activeFilter === 'overdue' ? '2px solid #ff9800' : '2px solid rgba(0,0,0,0.12)',
            backgroundColor: activeFilter === 'overdue' ? 'rgba(255, 152, 0, 0.08)' : 'transparent',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            transition: 'all 0.2s ease',
            position: 'relative',
            '&:hover': {
              backgroundColor: 'rgba(255, 152, 0, 0.08)',
              borderColor: '#ff9800',
            },
          }}>
            <WarningAmberIcon sx={{ fontSize: isMobile ? 28 : 32, color: activeFilter === 'overdue' ? '#ff9800' : '#666' }} />
            {stats.overdueFollowUps > 0 && (
              <Box sx={{
                position: 'absolute',
                top: -4,
                right: -4,
                minWidth: 22,
                height: 22,
                borderRadius: '11px',
                backgroundColor: '#ff9800',
                color: '#fff',
                fontSize: '0.75rem',
                fontWeight: 600,
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                px: 0.5,
              }}>
                {stats.overdueFollowUps > 99 ? '99+' : stats.overdueFollowUps}
              </Box>
            )}
          </Box>
          <Typography sx={{ 
            mt: 1, 
            fontSize: isMobile ? '0.7rem' : '0.8rem', 
            color: activeFilter === 'overdue' ? '#ff9800' : screenshotColors.mutedText,
            fontWeight: activeFilter === 'overdue' ? 600 : 400,
            textAlign: 'center',
            maxWidth: 80,
          }}>
            Overdue
          </Typography>
        </Box>
      </Box>

      {/* Loading indicator */}
      {loading && <LinearProgress sx={{ mb: 2, borderRadius: 1 }} />}

      {/* Leads List Container - Scrollable */}
      <Box
        sx={{
          backgroundColor: activeFilter === 'overdue' ? '#8b5a2b' : activeFilter === 'qualified' ? '#2e7d32' : '#5a7a8a',
          borderRadius: '20px',
          p: isMobile ? 2 : 3,
          height: 350,
          display: 'flex',
          flexDirection: 'column',
          transition: 'background-color 0.3s ease',
          mb: 3,
        }}
      >
        <Typography sx={{ color: '#fff', fontSize: '1.25rem', fontWeight: 600, mb: 2, flexShrink: 0 }}>
          {getDisplayTitle()}
        </Typography>
        
        <Box sx={{ 
          flex: 1, 
          overflowY: 'auto',
          pr: 1,
          '&::-webkit-scrollbar': { 
            width: '8px',
          },
          '&::-webkit-scrollbar-track': { 
            backgroundColor: 'rgba(255, 255, 255, 0.1)', 
            borderRadius: '10px',
            border: '1px solid rgba(255, 255, 255, 0.2)',
          },
          '&::-webkit-scrollbar-thumb': { 
            backgroundColor: 'rgba(255, 255, 255, 0.6)', 
            borderRadius: '10px',
            '&:hover': {
              backgroundColor: 'rgba(255, 255, 255, 0.8)',
            },
          },
        }}>
          {displayedLeads.length === 0 ? (
            <Box sx={{ textAlign: 'center', py: 6 }}>
              <EventIcon sx={{ fontSize: 48, color: 'rgba(255,255,255,0.5)', mb: 1 }} />
              <Typography sx={{ color: 'rgba(255,255,255,0.7)' }}>
                {activeFilter === 'overdue' 
                  ? 'No overdue follow-ups 🎉' 
                  : activeFilter === 'qualified' 
                    ? 'No qualified leads yet'
                    : "No follow-ups scheduled for today"}
              </Typography>
            </Box>
          ) : (
            <LeadsList 
              leads={displayedLeads} 
              activeFilter={activeFilter}
              formatDateTime={formatDateTime}
              handleLeadClick={handleLeadClick}
              showCounselor={true}
            />
          )}
        </Box>
      </Box>

      {/* Counselor Performance Table - Scrollable */}
      <Box
        sx={{
          backgroundColor: '#5a7a8a',
          borderRadius: '20px',
          p: isMobile ? 2 : 3,
          mb: 3,
          maxHeight: 400,
          display: 'flex',
          flexDirection: 'column',
        }}
      >
        <Typography sx={{ color: '#fff', fontSize: '1.25rem', fontWeight: 600, mb: 2, flexShrink: 0 }}>
          Counselor Performance
        </Typography>
        
        <Box sx={{ 
          flex: 1,
          overflowY: 'auto',
          overflowX: 'auto',
          ...customScrollbarStyles,
        }}>
          {/* Header */}
          <Box sx={{ 
            display: 'grid', 
            gridTemplateColumns: isMobile ? '1fr 50px 50px 50px 50px' : '1.5fr 80px 80px 100px 80px',
            gap: 1,
            py: 1,
            borderBottom: '1px solid rgba(255,255,255,0.2)',
            mb: 1,
            minWidth: isMobile ? 400 : 'auto',
            position: 'sticky',
            top: 0,
            backgroundColor: '#5a7a8a',
            zIndex: 1,
          }}>
            <Typography sx={{ color: 'rgba(255,255,255,0.7)', fontSize: '0.75rem', fontWeight: 600 }}>COUNSELOR</Typography>
            <Typography sx={{ color: 'rgba(255,255,255,0.7)', fontSize: '0.75rem', fontWeight: 600, textAlign: 'center' }}>LEADS</Typography>
            <Typography sx={{ color: 'rgba(255,255,255,0.7)', fontSize: '0.75rem', fontWeight: 600, textAlign: 'center' }}>QUAL.</Typography>
            <Typography sx={{ color: 'rgba(255,255,255,0.7)', fontSize: '0.75rem', fontWeight: 600, textAlign: 'center' }}>TODAY</Typography>
            <Typography sx={{ color: 'rgba(255,255,255,0.7)', fontSize: '0.75rem', fontWeight: 600, textAlign: 'center' }}>OVERDUE</Typography>
          </Box>
          
          {/* Rows */}
          {stats.counselorPerformance.map((c, idx) => (
            <Box
              key={c.userId}
              sx={{
                display: 'grid',
                gridTemplateColumns: isMobile ? '1fr 50px 50px 50px 50px' : '1.5fr 80px 80px 100px 80px',
                gap: 1,
                py: 1.5,
                px: 1,
                borderRadius: '8px',
                minWidth: isMobile ? 400 : 'auto',
                backgroundColor: idx % 2 === 0 ? 'rgba(255,255,255,0.05)' : 'transparent',
                '&:hover': { backgroundColor: 'rgba(255,255,255,0.1)' },
              }}
            >
              <Stack direction="row" alignItems="center" gap={1}>
                <PersonIcon sx={{ fontSize: 18, color: '#c8f000' }} />
                <Typography sx={{ color: '#fff', fontSize: '0.9rem', fontWeight: 500 }}>{c.userName}</Typography>
              </Stack>
              <Typography sx={{ color: '#fff', fontSize: '0.9rem', textAlign: 'center' }}>{formatNumber(c.totalLeads)}</Typography>
              <Typography sx={{ color: '#c8f000', fontSize: '0.9rem', textAlign: 'center', fontWeight: 600 }}>{formatNumber(c.qualifiedLeads)}</Typography>
              <Typography sx={{ color: '#64b5f6', fontSize: '0.9rem', textAlign: 'center' }}>{formatNumber(c.followUpsToday)}</Typography>
              <Typography sx={{ 
                color: c.overdueFollowUps > 0 ? '#ff9800' : 'rgba(255,255,255,0.6)', 
                fontSize: '0.9rem', 
                textAlign: 'center',
                fontWeight: c.overdueFollowUps > 0 ? 600 : 400,
              }}>
                {formatNumber(c.overdueFollowUps)}
              </Typography>
            </Box>
          ))}
        </Box>
      </Box>

      {/* Call Analytics Widget */}
      <Box>
        <CallAnalyticsWidget period="daily" />
      </Box>
    </Box>
  );
};

// ==================== SUPER ADMIN DASHBOARD ====================
interface SuperAdminDashboardViewProps {
  stats: SuperAdminDashboard;
  loading: boolean;
  isMobile: boolean;
  formatNumber: (num: number) => string;
}

const SuperAdminDashboardView: React.FC<SuperAdminDashboardViewProps> = ({
  stats,
  loading,
  isMobile,
  formatNumber,
}) => {
  return (
    <Box sx={{ px: isMobile ? 0 : 1 }}>
      {/* Header */}
      <Box sx={{ mb: 2.5 }}>
        <Typography
          sx={{ 
            color: screenshotColors.darkText, 
            fontSize: isMobile ? '1.75rem' : '2rem',
            fontWeight: 700, 
            lineHeight: 1.1,
          }}
        >
          Admin Dashboard
        </Typography>
        <Typography sx={{ color: screenshotColors.mutedText, fontSize: '0.9rem', mt: 0.25 }}>
          Overview of all centers and performance
        </Typography>
      </Box>

      {/* Loading indicator */}
      {loading && <LinearProgress sx={{ mb: 2, borderRadius: 1 }} />}

      {/* Top Stats Cards */}
      <Box sx={{ 
        display: 'grid', 
        gridTemplateColumns: isMobile ? 'repeat(2, 1fr)' : 'repeat(4, 1fr)',
        gap: 2,
        mb: 3,
      }}>
        <Box sx={{ ...glassMorphism, borderRadius: '16px', p: 2.5 }}>
          <Stack direction="row" alignItems="center" gap={1.5}>
            <BusinessIcon sx={{ fontSize: 32, color: '#1976d2' }} />
            <Box>
              <Typography sx={{ color: screenshotColors.mutedText, fontSize: '0.8rem' }}>Total Centers</Typography>
              <Typography sx={{ color: screenshotColors.darkText, fontSize: '1.75rem', fontWeight: 600 }}>
                {formatNumber(stats.totalCenters)}
              </Typography>
            </Box>
          </Stack>
        </Box>
        <Box sx={{ ...glassMorphism, borderRadius: '16px', p: 2.5 }}>
          <Stack direction="row" alignItems="center" gap={1.5}>
            <GroupsIcon sx={{ fontSize: 32, color: '#9c27b0' }} />
            <Box>
              <Typography sx={{ color: screenshotColors.mutedText, fontSize: '0.8rem' }}>Total Counselors</Typography>
              <Typography sx={{ color: screenshotColors.darkText, fontSize: '1.75rem', fontWeight: 600 }}>
                {formatNumber(stats.totalCounselors)}
              </Typography>
            </Box>
          </Stack>
        </Box>
        <Box sx={{ ...glassMorphism, borderRadius: '16px', p: 2.5 }}>
          <Stack direction="row" alignItems="center" gap={1.5}>
            <LeaderboardIcon sx={{ fontSize: 32, color: '#ff9800' }} />
            <Box>
              <Typography sx={{ color: screenshotColors.mutedText, fontSize: '0.8rem' }}>Total Leads</Typography>
              <Typography sx={{ color: screenshotColors.darkText, fontSize: '1.75rem', fontWeight: 600 }}>
                {formatNumber(stats.leads.totalLeads)}
              </Typography>
            </Box>
          </Stack>
        </Box>
        <Box sx={{ ...glassMorphism, borderRadius: '16px', p: 2.5 }}>
          <Stack direction="row" alignItems="center" gap={1.5}>
            <TrendingUpIcon sx={{ fontSize: 32, color: '#4caf50' }} />
            <Box>
              <Typography sx={{ color: screenshotColors.mutedText, fontSize: '0.8rem' }}>Conversion Rate</Typography>
              <Typography sx={{ color: '#4caf50', fontSize: '1.75rem', fontWeight: 600 }}>
                {stats.leads.conversionRate}%
              </Typography>
            </Box>
          </Stack>
        </Box>
      </Box>

      {/* Center Performance Section */}
      <Box sx={{ display: 'flex', flexDirection: isMobile ? 'column' : 'row', gap: 2.5, mb: 3 }}>
        {/* Center Performance Table */}
        <Box
          sx={{
            flex: 2,
            backgroundColor: '#5a7a8a',
            borderRadius: '20px',
            p: isMobile ? 2 : 3,
            maxHeight: 400,
            display: 'flex',
            flexDirection: 'column',
          }}
        >
          <Typography sx={{ color: '#fff', fontSize: '1.25rem', fontWeight: 600, mb: 2, flexShrink: 0 }}>
            Center Performance
          </Typography>
          
          <Box sx={{ 
            overflowY: 'auto', 
            flex: 1,
            pr: 1,
            '&::-webkit-scrollbar': { width: '8px' },
            '&::-webkit-scrollbar-track': { backgroundColor: 'rgba(255, 255, 255, 0.1)', borderRadius: '10px', border: '1px solid rgba(255, 255, 255, 0.2)' },
            '&::-webkit-scrollbar-thumb': { backgroundColor: 'rgba(255, 255, 255, 0.6)', borderRadius: '10px', '&:hover': { backgroundColor: 'rgba(255, 255, 255, 0.8)' } },
          }}>
            {/* Header */}
            <Box sx={{ 
              display: 'grid', 
              gridTemplateColumns: isMobile ? '1fr 60px 60px' : '1.5fr 80px 80px 80px 80px 90px',
              gap: 1,
              py: 1,
              borderBottom: '1px solid rgba(255,255,255,0.2)',
              mb: 1,
            }}>
              <Typography sx={{ color: 'rgba(255,255,255,0.7)', fontSize: '0.75rem', fontWeight: 600 }}>CENTER</Typography>
              <Typography sx={{ color: 'rgba(255,255,255,0.7)', fontSize: '0.75rem', fontWeight: 600, textAlign: 'center' }}>LEADS</Typography>
              <Typography sx={{ color: 'rgba(255,255,255,0.7)', fontSize: '0.75rem', fontWeight: 600, textAlign: 'center' }}>QUAL.</Typography>
              {!isMobile && (
                <>
                  <Typography sx={{ color: 'rgba(255,255,255,0.7)', fontSize: '0.75rem', fontWeight: 600, textAlign: 'center' }}>TEAM</Typography>
                  <Typography sx={{ color: 'rgba(255,255,255,0.7)', fontSize: '0.75rem', fontWeight: 600, textAlign: 'center' }}>CONV %</Typography>
                  <Typography sx={{ color: 'rgba(255,255,255,0.7)', fontSize: '0.75rem', fontWeight: 600, textAlign: 'center' }}>THIS MTH</Typography>
                </>
              )}
            </Box>
            
            {/* Rows */}
            {stats.centerPerformance.map((center, idx) => (
              <Box
                key={idx}
                sx={{
                  display: 'grid',
                  gridTemplateColumns: isMobile ? '1fr 60px 60px' : '1.5fr 80px 80px 80px 80px 90px',
                  gap: 1,
                  py: 1.5,
                  px: 1,
                  borderRadius: '8px',
                  backgroundColor: idx % 2 === 0 ? 'rgba(255,255,255,0.05)' : 'transparent',
                  '&:hover': { backgroundColor: 'rgba(255,255,255,0.1)' },
                }}
              >
                <Typography sx={{ color: '#fff', fontSize: '0.9rem', fontWeight: 500 }}>{center.centerName}</Typography>
                <Typography sx={{ color: '#fff', fontSize: '0.9rem', textAlign: 'center' }}>{formatNumber(center.totalLeads)}</Typography>
                <Typography sx={{ color: '#c8f000', fontSize: '0.9rem', textAlign: 'center' }}>{formatNumber(center.qualifiedLeads)}</Typography>
                {!isMobile && (
                  <>
                    <Typography sx={{ color: 'rgba(255,255,255,0.8)', fontSize: '0.9rem', textAlign: 'center' }}>{center.counselorCount}</Typography>
                    <Typography sx={{ 
                      color: center.conversionRate >= 20 ? '#4caf50' : center.conversionRate >= 10 ? '#ff9800' : '#f44336', 
                      fontSize: '0.9rem', 
                      textAlign: 'center',
                      fontWeight: 600,
                    }}>
                      {center.conversionRate}%
                    </Typography>
                    <Typography sx={{ color: 'rgba(255,255,255,0.8)', fontSize: '0.9rem', textAlign: 'center' }}>{formatNumber(center.leadsThisMonth)}</Typography>
                  </>
                )}
              </Box>
            ))}
          </Box>
        </Box>

        {/* Lead Status Distribution */}
        <Box
          sx={{
            flex: 1,
            backgroundColor: '#5a7a8a',
            borderRadius: '20px',
            p: isMobile ? 2 : 3,
            maxHeight: 400,
            display: 'flex',
            flexDirection: 'column',
          }}
        >
          <Typography sx={{ color: '#fff', fontSize: '1.25rem', fontWeight: 600, mb: 2, flexShrink: 0 }}>
            Lead Status Distribution
          </Typography>
          
          <Box sx={{ 
            display: 'flex', 
            flexDirection: 'column', 
            gap: 1,
            overflowY: 'auto',
            flex: 1,
            pr: 1,
            '&::-webkit-scrollbar': { width: '8px' },
            '&::-webkit-scrollbar-track': { backgroundColor: 'rgba(255, 255, 255, 0.1)', borderRadius: '10px', border: '1px solid rgba(255, 255, 255, 0.2)' },
            '&::-webkit-scrollbar-thumb': { backgroundColor: 'rgba(255, 255, 255, 0.6)', borderRadius: '10px', '&:hover': { backgroundColor: 'rgba(255, 255, 255, 0.8)' } },
          }}>
            {stats.statusDistribution.map((item, idx) => {
              const maxCount = Math.max(...stats.statusDistribution.map(s => s.count));
              const percentage = maxCount > 0 ? (item.count / maxCount) * 100 : 0;
              return (
                <Box key={idx} sx={{ px: 1 }}>
                  <Stack direction="row" justifyContent="space-between" sx={{ mb: 0.5 }}>
                    <Typography sx={{ color: '#fff', fontSize: '0.85rem' }}>{item.status || 'Unknown'}</Typography>
                    <Typography sx={{ color: '#c8f000', fontSize: '0.85rem', fontWeight: 600 }}>{formatNumber(item.count)}</Typography>
                  </Stack>
                  <Box sx={{ 
                    height: 6, 
                    bgcolor: 'rgba(255,255,255,0.1)', 
                    borderRadius: 3,
                    overflow: 'hidden',
                  }}>
                    <Box sx={{ 
                      height: '100%', 
                      width: `${percentage}%`, 
                      bgcolor: '#c8f000',
                      borderRadius: 3,
                      transition: 'width 0.3s ease',
                    }} />
                  </Box>
                </Box>
              );
            })}
          </Box>
        </Box>
      </Box>

      {/* Call Analytics Widget */}
      <Box>
        <CallAnalyticsWidget period="daily" />
      </Box>
    </Box>
  );
};

// ==================== SHARED LEADS LIST COMPONENT ====================
interface LeadsListProps {
  leads: FollowUpLead[];
  activeFilter: StatCardFilter;
  formatDateTime: (date?: string) => string;
  handleLeadClick: (leadId: string) => void;
  showCounselor: boolean;
}

const LeadsList: React.FC<LeadsListProps> = ({
  leads,
  activeFilter,
  formatDateTime,
  handleLeadClick,
  showCounselor,
}) => {
  return (
    <Box sx={{ 
      display: 'flex', 
      flexDirection: 'column', 
      gap: 1.5, 
    }}>
      {leads.map((lead) => (
        <Card
          key={lead.id}
          sx={{
            backgroundColor: 'rgba(255, 255, 255, 0.15)',
            borderRadius: '12px',
            cursor: 'pointer',
            transition: 'all 0.15s ease-in-out',
            '&:hover': {
              backgroundColor: 'rgba(255, 255, 255, 0.25)',
              transform: 'translateY(-2px)',
            },
          }}
          onClick={() => handleLeadClick(lead.id)}
        >
          <CardContent sx={{ p: 2, '&:last-child': { pb: 2 } }}>
            <Stack direction="row" justifyContent="space-between" alignItems="flex-start">
              <Box sx={{ flex: 1, minWidth: 0 }}>
                <Stack direction="row" alignItems="center" gap={1} sx={{ mb: 0.5 }}>
                  <Typography sx={{ color: '#fff', fontWeight: 600, fontSize: '1rem' }}>
                    {lead.name}
                  </Typography>
                  <OpenInNewIcon sx={{ fontSize: 14, color: 'rgba(255,255,255,0.5)' }} />
                </Stack>
                
                <Stack direction="row" gap={2} flexWrap="wrap" sx={{ mb: 1 }}>
                  {lead.mobileNumber && (
                    <Typography sx={{ color: 'rgba(255,255,255,0.8)', fontSize: '0.85rem', display: 'flex', alignItems: 'center', gap: 0.5 }}>
                      <PhoneIcon sx={{ fontSize: 14 }} /> {lead.mobileNumber}
                    </Typography>
                  )}
                  {lead.email && (
                    <Typography sx={{ color: 'rgba(255,255,255,0.8)', fontSize: '0.85rem', display: 'flex', alignItems: 'center', gap: 0.5 }}>
                      <EmailIcon sx={{ fontSize: 14 }} /> {lead.email}
                    </Typography>
                  )}
                  {showCounselor && lead.counselorName && (
                    <Typography sx={{ color: 'rgba(255,255,255,0.8)', fontSize: '0.85rem', display: 'flex', alignItems: 'center', gap: 0.5 }}>
                      <PersonIcon sx={{ fontSize: 14 }} /> {lead.counselorName}
                    </Typography>
                  )}
                </Stack>
                
                <Stack direction="row" gap={1} flexWrap="wrap">
                  {lead.leadStatus && (
                    <Chip 
                      label={lead.leadStatus} 
                      size="small" 
                      sx={{ 
                        bgcolor: 'rgba(200, 240, 0, 0.2)', 
                        color: '#c8f000', 
                        fontSize: '0.75rem',
                        height: 24,
                      }} 
                    />
                  )}
                  {lead.program && (
                    <Chip 
                      label={lead.program} 
                      size="small" 
                      sx={{ 
                        bgcolor: 'rgba(255,255,255,0.2)', 
                        color: '#fff', 
                        fontSize: '0.75rem',
                        height: 24,
                      }} 
                    />
                  )}
                </Stack>
              </Box>
              
              {activeFilter !== 'qualified' && lead.nextFollowUpAt && (
                <Box sx={{ textAlign: 'right', flexShrink: 0, ml: 2 }}>
                  <Typography sx={{ color: activeFilter === 'overdue' ? '#ffcc80' : '#c8f000', fontSize: '0.85rem', fontWeight: 500 }}>
                    <EventIcon sx={{ fontSize: 14, verticalAlign: 'middle', mr: 0.5 }} />
                    {formatDateTime(lead.nextFollowUpAt)}
                  </Typography>
                </Box>
              )}
            </Stack>
          </CardContent>
        </Card>
      ))}
    </Box>
  );
};

export default Dashboard;
