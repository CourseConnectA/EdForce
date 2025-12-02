import React, { useEffect, useState, useMemo, useCallback } from 'react';
import {
  Box,
  Typography,
  CircularProgress,
  Alert,
  useMediaQuery,
  useTheme,
} from '@mui/material';
import dashboardService, { DashboardStats } from '../../services/dashboardService';
import CallAnalyticsWidget from '@/components/analytics/CallAnalyticsWidget';
import { screenshotColors, glassMorphism } from '../../theme/theme';

const Dashboard: React.FC = () => {
  const [stats, setStats] = useState<DashboardStats | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  
  const theme = useTheme();
  const isMobile = useMediaQuery(theme.breakpoints.down('md'));

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
    // Increased polling interval from 5s to 30s for better performance
    const interval = setInterval(fetchDashboardData, 30000);
    return () => clearInterval(interval);
  }, [fetchDashboardData]);

  const formatNumber = useCallback((num: number) => {
    return new Intl.NumberFormat('en-US').format(num);
  }, []);

  // Memoize derived data
  const dashboardData = useMemo(() => ({
    counselorsCount: (stats as any)?.counselorsCount || (stats as any)?.totalCounselors || 0,
    totalLeads: stats?.leads?.totalLeads || 0,
    qualifiedLeads: stats?.leads?.qualifiedLeads || 0,
    centerName: (stats as any)?.centerName || 'Center',
    programWise: (stats as any)?.programWise || [],
    counselorPerformance: (stats as any)?.counselorPerformance || [],
  }), [stats]);

  if (loading) {
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

  const { counselorsCount, totalLeads, qualifiedLeads, centerName, programWise, counselorPerformance } = dashboardData;

  return (
    <Box sx={{ px: isMobile ? 0 : 1 }}>
      {/* Header Row: Title left, Stat Cards right (stacked on mobile) */}
      <Box 
        sx={{ 
          display: 'flex', 
          flexDirection: isMobile ? 'column' : 'row',
          alignItems: isMobile ? 'flex-start' : 'flex-start', 
          justifyContent: 'space-between', 
          mb: 2.5,
          mt: 0,
          gap: isMobile ? 2 : 0,
        }}
      >
        {/* Title Section - bigger title, less line height */}
        <Box>
          <Typography
            sx={{ 
              color: screenshotColors.darkText, 
              fontSize: isMobile ? '2rem' : '2.5rem',
              fontWeight: 700, 
              mb: 0,
              lineHeight: 1.1,
              letterSpacing: '-0.5px',
            }}
          >
            Dashboard
          </Typography>
          <Typography
            sx={{ 
              color: screenshotColors.mutedText, 
              fontSize: '0.9rem',
              mt: 0.25,
            }}
          >
            Welcome to your CRM dashboard.
          </Typography>
        </Box>

        {/* Stat Cards Row - glassmorphism style (stacked on mobile) */}
        <Box sx={{ 
          display: 'flex', 
          gap: isMobile ? 1.5 : 2,
          flexDirection: isMobile ? 'row' : 'row',
          flexWrap: isMobile ? 'wrap' : 'nowrap',
          width: isMobile ? '100%' : 'auto',
        }}>
          {/* Total Counsellors */}
          <Box
            sx={{
              ...glassMorphism,
              borderRadius: isMobile ? '14px' : '16px',
              px: isMobile ? 2 : 3,
              py: isMobile ? 1.5 : 1.25,
              minWidth: isMobile ? 'calc(32% - 6px)' : 220,
              width: isMobile ? 'calc(32% - 6px)' : 240,
              height: isMobile ? 'auto' : 70,
              display: 'flex',
              flexDirection: isMobile ? 'column' : 'row',
              alignItems: isMobile ? 'flex-start' : 'center',
              justifyContent: isMobile ? 'flex-start' : 'space-between',
              gap: isMobile ? 0.5 : 0,
            }}
          >
            <Typography sx={{ color: screenshotColors.mutedText, fontSize: isMobile ? '1rem' : '0.9rem', lineHeight: 1.3 }}>
              Total<br />Counsellors
            </Typography>
            <Typography sx={{ color: screenshotColors.darkText, fontSize: isMobile ? '1.75rem' : '2.75rem', fontWeight: 600, ml: isMobile ? 0 : 4 }}>
              {formatNumber(counselorsCount)}
            </Typography>
          </Box>

          {/* Total Leads */}
          <Box
            sx={{
              ...glassMorphism,
              borderRadius: isMobile ? '14px' : '16px',
              px: isMobile ? 2 : 3,
              py: isMobile ? 1.5 : 1.25,
              minWidth: isMobile ? 'calc(32% - 6px)' : 200,
              width: isMobile ? 'calc(32% - 6px)' : 220,
              height: isMobile ? 'auto' : 70,
              display: 'flex',
              flexDirection: isMobile ? 'column' : 'row',
              alignItems: isMobile ? 'flex-start' : 'center',
              justifyContent: isMobile ? 'flex-start' : 'space-between',
              gap: isMobile ? 0.5 : 0,
            }}
          >
            <Typography sx={{ color: screenshotColors.mutedText, fontSize: isMobile ? '1rem' : '0.9rem', lineHeight: 1.3 }}>
              Total<br />Leads
            </Typography>
            <Typography sx={{ color: screenshotColors.darkText, fontSize: isMobile ? '1.75rem' : '2.75rem', fontWeight: 600, ml: isMobile ? 0 : 4 }}>
              {formatNumber(totalLeads)}
            </Typography>
          </Box>

          {/* Qualified Leads */}
          <Box
            sx={{
              ...glassMorphism,
              borderRadius: isMobile ? '14px' : '16px',
              px: isMobile ? 2 : 3,
              py: isMobile ? 1.5 : 1.25,
              minWidth: isMobile ? 'calc(32% - 6px)' : 200,
              width: isMobile ? 'calc(32% - 6px)' : 220,
              height: isMobile ? 'auto' : 70,
              display: 'flex',
              flexDirection: isMobile ? 'column' : 'row',
              alignItems: isMobile ? 'flex-start' : 'center',
              justifyContent: isMobile ? 'flex-start' : 'space-between',
              gap: isMobile ? 0.5 : 0,
            }}
          >
            <Typography sx={{ color: screenshotColors.mutedText, fontSize: isMobile ? '1rem' : '0.9rem', lineHeight: 1.3 }}>
              Qualified<br />Leads
            </Typography>
            <Typography sx={{ color: screenshotColors.darkText, fontSize: isMobile ? '1.75rem' : '2.75rem', fontWeight: 600, ml: isMobile ? 0 : 4 }}>
              {formatNumber(qualifiedLeads)}
            </Typography>
          </Box>
        </Box>
      </Box>

      {/* Call Analytics Widget */}
      <Box sx={{ mb: 3 }}>
        <CallAnalyticsWidget period="daily" />
      </Box>

      {/* Bottom Section: Program-wise Leads and Counselor-wise Performance */}
      <Box sx={{ 
        display: 'flex', 
        flexDirection: isMobile ? 'column' : 'row',
        gap: 2.5 
      }}>
        {/* Program-wise Leads - Left section (wider) - Dark blue-gray card */}
        <Box
          sx={{
            flex: isMobile ? 'none' : 2,
            backgroundColor: '#5a7a8a',
            borderRadius: '20px',
            p: isMobile ? 2 : 3,
            display: 'flex',
            flexDirection: 'column',
            maxHeight: isMobile ? 280 : 320,
          }}
        >
          <Typography
            sx={{
              color: '#fff',
              fontSize: isMobile ? '1.1rem' : '1.25rem',
              fontWeight: 600,
              mb: 2,
              flexShrink: 0,
            }}
          >
            Program-wise Leads ({centerName})
          </Typography>
          
          {/* Two columns grid for programs - scrollable (single column on mobile) */}
          <Box 
            sx={{ 
              display: 'grid', 
              gridTemplateColumns: isMobile ? '1fr' : 'repeat(2, 1fr)', 
              gap: 1.5,
              overflowY: 'auto',
              pr: 1,
              // Custom scrollbar styling - green accent
              '&::-webkit-scrollbar': {
                width: '6px',
              },
              '&::-webkit-scrollbar-track': {
                backgroundColor: 'rgba(255, 255, 255, 0.1)',
                borderRadius: '3px',
              },
              '&::-webkit-scrollbar-thumb': {
                backgroundColor: '#c8f000',
                borderRadius: '3px',
                '&:hover': {
                  backgroundColor: '#b8e000',
                },
              },
            }}
          >
            {programWise.map((p: any, idx: number) => (
              <Box
                key={idx}
                sx={{
                  backgroundColor: 'rgba(255, 255, 255, 0.15)',
                  borderRadius: '12px',
                  px: 2,
                  py: 1.25,
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'space-between',
                }}
              >
                <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.5 }}>
                  <Box
                    sx={{
                      width: 10,
                      height: 10,
                      borderRadius: '50%',
                      backgroundColor: '#c8f000',
                    }}
                  />
                  <Typography sx={{ color: '#fff', fontSize: '0.95rem', fontWeight: 500 }}>
                    {p.program}
                  </Typography>
                </Box>
                <Typography sx={{ color: '#fff', fontSize: '0.9rem', opacity: 0.9 }}>
                  {p.count} <span style={{ opacity: 0.7 }}>Leads</span>
                </Typography>
              </Box>
            ))}
          </Box>
        </Box>

        {/* Counselor-wise Performance - Right section - Dark blue-gray card */}
        <Box
          sx={{
            flex: isMobile ? 'none' : 1,
            backgroundColor: '#5a7a8a',
            borderRadius: '20px',
            p: isMobile ? 2 : 3,
            position: 'relative',
            display: 'flex',
            flexDirection: 'column',
            maxHeight: isMobile ? 280 : 320,
          }}
        >
          {/* Yellow/green accent bar on the right - now part of the scrollbar track */}
          
          <Typography
            sx={{
              color: '#fff',
              fontSize: '1.25rem',
              fontWeight: 600,
              mb: 2.5,
              flexShrink: 0,
            }}
          >
            Counselor-wise Performance
          </Typography>
          
          <Box 
            sx={{ 
              display: 'flex', 
              flexDirection: 'column', 
              gap: 1.5,
              overflowY: 'auto',
              pr: 1,
              // Custom scrollbar styling - green accent (the green bar from screenshot)
              '&::-webkit-scrollbar': {
                width: '6px',
              },
              '&::-webkit-scrollbar-track': {
                backgroundColor: 'rgba(255, 255, 255, 0.1)',
                borderRadius: '3px',
              },
              '&::-webkit-scrollbar-thumb': {
                backgroundColor: '#c8f000',
                borderRadius: '3px',
                '&:hover': {
                  backgroundColor: '#b8e000',
                },
              },
            }}
          >
            {counselorPerformance.map((c: any, idx: number) => (
              <Box
                key={idx}
                sx={{
                  backgroundColor: 'rgba(255, 255, 255, 0.15)',
                  borderRadius: '12px',
                  px: 2,
                  py: 1.25,
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'space-between',
                }}
              >
                <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.5 }}>
                  <Box
                    sx={{
                      width: 10,
                      height: 10,
                      borderRadius: '50%',
                      backgroundColor: '#c8f000',
                    }}
                  />
                  <Typography sx={{ color: '#fff', fontSize: '0.95rem', fontWeight: 500 }}>
                    {c.userName}
                  </Typography>
                </Box>
                <Box sx={{ display: 'flex', gap: 2.5, alignItems: 'center' }}>
                  <Typography sx={{ color: 'rgba(255,255,255,0.7)', fontSize: '0.85rem' }}>
                    Leads: <span style={{ color: '#fff' }}>{c.totalLeads}</span>
                  </Typography>
                  <Typography sx={{ color: '#c8f000', fontSize: '0.85rem' }}>
                    Qualified: <span style={{ color: '#c8f000' }}>{c.qualifiedLeads}</span>
                  </Typography>
                </Box>
              </Box>
            ))}
          </Box>
        </Box>
      </Box>
    </Box>
  );
};

export default Dashboard;
