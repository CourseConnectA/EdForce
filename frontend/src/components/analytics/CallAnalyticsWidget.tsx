import React, { useEffect, useMemo, useState, useCallback } from 'react';
import {
  Box,
  Typography,
  Chip,
  CircularProgress,
  FormControl,
  MenuItem,
  Checkbox,
  ListItemText,
  IconButton,
  useMediaQuery,
  useTheme,
  Stack,
  Tooltip as MuiTooltip,
  Paper,
} from '@mui/material';
import Select, { SelectChangeEvent } from '@mui/material/Select';
import KeyboardArrowDownIcon from '@mui/icons-material/KeyboardArrowDown';
import CallMadeIcon from '@mui/icons-material/CallMade';
import CallReceivedIcon from '@mui/icons-material/CallReceived';
import BarChartIcon from '@mui/icons-material/BarChart';
import AlignHorizontalLeftIcon from '@mui/icons-material/AlignHorizontalLeft';
import ShowChartIcon from '@mui/icons-material/ShowChart';
import PieChartIcon from '@mui/icons-material/PieChart';
import DonutLargeIcon from '@mui/icons-material/DonutLarge';
import callsService, { CallAnalyticsResponse } from '@/services/callsService';
import webSocketService from '@/services/webSocketService';
import {
  ResponsiveContainer,
  BarChart,
  Bar,
  XAxis,
  YAxis,
  Tooltip,
  Legend,
  CartesianGrid,
  LineChart,
  Line,
  PieChart,
  Pie,
  Cell,
} from 'recharts';
import { startOfDay, endOfDay, subDays, startOfMonth, endOfMonth, subMonths } from 'date-fns';
import { screenshotColors } from '@/theme/theme';

type TimeRange = 'today' | 'last7' | 'last15' | 'currentMonth' | 'lastMonth' | 'custom';
type ChartType = 'horizontal' | 'vertical' | 'line' | 'pie' | 'donut';

interface CallAnalyticsWidgetProps {
  period?: 'daily' | 'monthly';
  startDate?: string;
  endDate?: string;
  /** Use icon buttons instead of dropdown for chart type selection */
  useChartTypeIcons?: boolean;
  /** Show page header (for standalone page usage) */
  showPageHeader?: boolean;
  /** Page title (when showPageHeader is true) */
  pageTitle?: string;
}

interface RangeConfig {
  startISO?: string;
  endISO?: string;
  period: 'daily' | 'monthly';
  ready: boolean;
}

const toStartISO = (date: Date): string => startOfDay(date).toISOString();
const toEndISO = (date: Date): string => endOfDay(date).toISOString();

const parseDateInput = (value: string): Date | null => {
  if (!value) return null;
  const parsed = new Date(value);
  return Number.isNaN(parsed.getTime()) ? null : parsed;
};

const resolveRange = (range: TimeRange, customStart: string, customEnd: string): RangeConfig => {
  const now = new Date();
  switch (range) {
    case 'today':
      return { startISO: toStartISO(now), endISO: toEndISO(now), period: 'daily', ready: true };
    case 'last7':
      return { startISO: toStartISO(subDays(now, 6)), endISO: toEndISO(now), period: 'daily', ready: true };
    case 'last15':
      return { startISO: toStartISO(subDays(now, 14)), endISO: toEndISO(now), period: 'daily', ready: true };
    case 'currentMonth':
      return { startISO: toStartISO(startOfMonth(now)), endISO: toEndISO(endOfMonth(now)), period: 'monthly', ready: true };
    case 'lastMonth': {
      const prev = subMonths(now, 1);
      return { startISO: toStartISO(startOfMonth(prev)), endISO: toEndISO(endOfMonth(prev)), period: 'monthly', ready: true };
    }
    case 'custom': {
      const start = parseDateInput(customStart);
      const end = parseDateInput(customEnd);
      if (!start || !end || start > end) return { period: 'daily', ready: false };
      return { startISO: toStartISO(start), endISO: toEndISO(end), period: 'daily', ready: true };
    }
    default:
      return { period: 'daily', ready: false };
  }
};

const formatDuration = (seconds: number): string => {
  if (!seconds || seconds <= 0) return '0s';
  const hours = Math.floor(seconds / 3600);
  const mins = Math.floor((seconds % 3600) / 60);
  const secs = seconds % 60;
  if (hours > 0) return `${hours}h ${mins}m ${secs}s`;
  if (mins > 0) return `${mins}m`;
  return `${secs}s`;
};

const CallAnalyticsWidget: React.FC<CallAnalyticsWidgetProps> = ({ 
  period: _period = 'daily', 
  startDate, 
  endDate,
  useChartTypeIcons = false,
  showPageHeader = false,
  pageTitle = 'Call Management',
}) => {
  const [analyticsData, setAnalyticsData] = useState<CallAnalyticsResponse | null>(null);
  const [loading, setLoading] = useState(false);
  const [timeRange, setTimeRange] = useState<TimeRange>('today');
  const [selectedActors, setSelectedActors] = useState<string[]>([]);
  const [customStart, setCustomStart] = useState<string>('');
  const [customEnd, setCustomEnd] = useState<string>('');
  const [chartType, setChartType] = useState<ChartType>('horizontal');
  
  const theme = useTheme();
  const isMobile = useMediaQuery(theme.breakpoints.down('md'));

  useEffect(() => {
    if (startDate || endDate) {
      setTimeRange('custom');
      setCustomStart(startDate ? startDate.slice(0, 10) : '');
      setCustomEnd(endDate ? endDate.slice(0, 10) : '');
    }
  }, [startDate, endDate]);

  const rangeConfig = useMemo(() => resolveRange(timeRange, customStart, customEnd), [timeRange, customStart, customEnd]);

  // Fetch analytics function - extracted for reuse
  const fetchAnalytics = useCallback(async () => {
    if (!rangeConfig.ready) {
      setLoading(false);
      setAnalyticsData(null);
      return;
    }
    setLoading(true);
    try {
      const data = await callsService.getAnalytics({
        period: rangeConfig.period,
        startDate: rangeConfig.startISO,
        endDate: rangeConfig.endISO,
      });
      setAnalyticsData(data);
    } catch (error) {
      console.error('Failed to load call analytics:', error);
      setAnalyticsData(null);
    } finally {
      setLoading(false);
    }
  }, [rangeConfig.startISO, rangeConfig.endISO, rangeConfig.ready, rangeConfig.period]);

  // Initial fetch and refetch on range change
  useEffect(() => {
    void fetchAnalytics();
  }, [fetchAnalytics]);

  // Listen for real-time call updates via WebSocket
  useEffect(() => {
    let debounceTimeout: ReturnType<typeof setTimeout> | null = null;

    const handleCallLogged = () => {
      console.log('📊 Call logged - refreshing analytics...');
      // Debounce rapid updates during bulk sync
      if (debounceTimeout) {
        clearTimeout(debounceTimeout);
      }
      debounceTimeout = setTimeout(() => {
        void fetchAnalytics();
        debounceTimeout = null;
      }, 500);
    };

    webSocketService.on('call:logged', handleCallLogged);
    return () => {
      if (debounceTimeout) {
        clearTimeout(debounceTimeout);
      }
      webSocketService.off('call:logged', handleCallLogged);
    };
  }, [fetchAnalytics]);

  const analytics = analyticsData?.breakdown || [];
  const summary = analyticsData?.summary;

  const analyticsRows = useMemo(
    () => analytics.map((item, idx) => ({
      key: item.userId || item.centerName || `unknown-${idx}`,
      label: item.userName || item.centerName || 'Unknown',
      data: item,
    })),
    [analytics],
  );

  const actorOptions = useMemo(
    () => analyticsRows.map((row) => ({ value: row.key, label: row.label })),
    [analyticsRows],
  );

  const filteredRows = useMemo(() => {
    if (!selectedActors.length) return analyticsRows;
    const selected = new Set(selectedActors);
    return analyticsRows.filter((row) => selected.has(row.key));
  }, [analyticsRows, selectedActors]);

  // Chart data - real API data only
  const chartData = useMemo(() => {
    return filteredRows.map((row) => ({
      label: row.label,
      totalCalls: row.data.totalCalls,
    }));
  }, [filteredRows]);

  // Totals from real API data only
  const totals = useMemo(() => {
    if (summary) {
      return {
        totalCalls: summary.totalCalls,
        totalDuration: summary.totalDuration,
        totalInbound: summary.totalInbound,
        totalOutbound: summary.totalOutbound,
        totalAnswered: summary.totalAnswered,
        totalUnanswered: summary.totalUnanswered,
        inboundAnswered: summary.inboundAnswered,
        inboundUnanswered: summary.inboundUnanswered,
        outboundAnswered: summary.outboundAnswered,
        outboundUnanswered: summary.outboundUnanswered,
        uniqueAnswered: summary.uniqueAnswered,
        uniqueUnanswered: summary.uniqueUnanswered,
        uniqueInboundAnswered: summary.uniqueInboundAnswered,
        uniqueInboundUnanswered: summary.uniqueInboundUnanswered,
        uniqueOutboundAnswered: summary.uniqueOutboundAnswered,
        uniqueOutboundUnanswered: summary.uniqueOutboundUnanswered,
      };
    }
    return filteredRows.reduce(
      (acc, row) => {
        acc.totalCalls += row.data.totalCalls;
        acc.totalDuration += row.data.totalDuration;
        return acc;
      },
      { 
        totalCalls: 0, 
        totalDuration: 0,
        totalInbound: 0,
        totalOutbound: 0,
        totalAnswered: 0,
        totalUnanswered: 0,
        inboundAnswered: 0,
        inboundUnanswered: 0,
        outboundAnswered: 0,
        outboundUnanswered: 0,
        uniqueAnswered: 0,
        uniqueUnanswered: 0,
        uniqueInboundAnswered: 0,
        uniqueInboundUnanswered: 0,
        uniqueOutboundAnswered: 0,
        uniqueOutboundUnanswered: 0,
      },
    );
  }, [filteredRows, summary]);

  const averageDuration = totals.totalCalls > 0 ? Math.round(totals.totalDuration / totals.totalCalls) : 0;
  const teamCount = filteredRows.length;

  const handleActorChange = (event: SelectChangeEvent<string[]>) => {
    const value = event.target.value;
    const next = typeof value === 'string' ? value.split(',') : value;
    if (next.includes('__ALL__')) {
      setSelectedActors([]);
      return;
    }
    setSelectedActors(next);
  };

  const handleRangeChange = (event: SelectChangeEvent<TimeRange>) => {
    const next = event.target.value as TimeRange;
    setTimeRange(next);
    if (next !== 'custom') {
      setCustomStart('');
      setCustomEnd('');
    }
  };

  const gradientId = 'chartBarGradient';

  // Dropdown pill style matching screenshot exactly
  const dropdownPillStyle = {
    display: 'flex',
    alignItems: 'center',
    backgroundColor: '#f0f0f0',
    borderRadius: isMobile ? '20px' : '30px',
    height: isMobile ? 40 : 48,
    pl: isMobile ? 1.5 : 2.5,
    pr: 0.5,
    gap: 0.5,
    position: 'relative' as const,
    flex: isMobile ? 1 : 'none',
    minWidth: 0, // Allow shrinking
  };

  // Circle button style for dropdown icon
  const circleIconBtnStyle = {
    width: isMobile ? 28 : 38,
    height: isMobile ? 28 : 38,
    backgroundColor: '#e0e0e0',
    borderRadius: '50%',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    flexShrink: 0,
  };

  // Chart type icons configuration
  const chartTypeIcons: { type: ChartType; icon: React.ReactNode; label: string }[] = [
    { type: 'horizontal', icon: <AlignHorizontalLeftIcon />, label: 'Horizontal Bar' },
    { type: 'vertical', icon: <BarChartIcon />, label: 'Vertical Bar' },
    { type: 'pie', icon: <PieChartIcon />, label: 'Pie Chart' },
    { type: 'line', icon: <ShowChartIcon />, label: 'Line Chart' },
    { type: 'donut', icon: <DonutLargeIcon />, label: 'Donut Chart' },
  ];

  return (
    <Box>
      {/* Page Header - only shown when used as standalone page */}
      {showPageHeader && (
        <Box sx={{ mb: 3 }}>
          <Typography
            sx={{ 
              color: screenshotColors.darkText, 
              fontSize: isMobile ? '1.75rem' : '2rem',
              fontWeight: 700, 
              lineHeight: 1.1,
              display: 'flex',
              alignItems: 'center',
              gap: 1.5,
            }}
          >
            {pageTitle}
          </Typography>
          <Typography sx={{ color: '#888', fontSize: '0.9rem', mt: 0.5 }}>
            Monitor and analyze call performance across your team
          </Typography>
        </Box>
      )}

      {/* Header Row */}
      <Box
        sx={{
          display: 'flex',
          flexDirection: isMobile ? 'column' : 'row',
          alignItems: isMobile ? 'flex-start' : 'center',
          justifyContent: 'space-between',
          mb: isMobile ? 1 : 2.5,
          gap: isMobile ? 1 : 0,
        }}
      >
        {/* Title with Today badge */}
        <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.5 }}>
          <Typography
            sx={{
              color: screenshotColors.darkText,
              fontSize: isMobile ? '1.25rem' : '1.5rem',
              fontWeight: 600,
            }}
          >
            Call Analytics
          </Typography>
          <Chip
            label="Today"
            size="small"
            sx={{
              backgroundColor: 'rgba(0,0,0,0.08)',
              color: screenshotColors.darkText,
              fontSize: '0.75rem',
              height: 24,
              fontWeight: 500,
              borderRadius: '8px',
            }}
          />
        </Box>

        {/* Dropdown Controls - all in one row on mobile */}
        <Box sx={{ 
          display: 'flex', 
          gap: isMobile ? 0.5 : 1.5,
          flexDirection: 'row',
          width: isMobile ? '100%' : 'auto',
        }}>
          {/* Time Range Dropdown */}
          <Box sx={{ ...dropdownPillStyle }}>
            <Typography sx={{ color: '#888', fontSize: isMobile ? '0.6rem' : '0.8rem', whiteSpace: 'nowrap', flex: 1, overflow: 'hidden', textOverflow: 'ellipsis' }}>
              Time Range
            </Typography>
            <IconButton sx={circleIconBtnStyle} size="small" disableRipple>
              <KeyboardArrowDownIcon sx={{ color: '#666', fontSize: isMobile ? 18 : 22 }} />
            </IconButton>
            <FormControl 
              size="small"
              sx={{ 
                position: 'absolute', 
                width: '100%', 
                height: '100%', 
                opacity: 0, 
                left: 0, 
                top: 0,
                '& .MuiInputBase-root': { height: '100%' },
              }}
            >
              <Select
                value={timeRange}
                onChange={handleRangeChange}
                sx={{ width: '100%', height: '100%' }}
              >
                <MenuItem value="today">Today</MenuItem>
                <MenuItem value="last7">Last 7 Days</MenuItem>
                <MenuItem value="last15">Last 15 Days</MenuItem>
                <MenuItem value="currentMonth">Current Month</MenuItem>
                <MenuItem value="lastMonth">Last Month</MenuItem>
              </Select>
            </FormControl>
          </Box>

          {/* Team Members Dropdown */}
          <Box sx={{ ...dropdownPillStyle }}>
            <Typography sx={{ color: '#888', fontSize: isMobile ? '0.6rem' : '0.8rem', whiteSpace: 'nowrap', flex: 1, overflow: 'hidden', textOverflow: 'ellipsis' }}>
              {isMobile ? 'Team' : 'Team Members'}
            </Typography>
            <IconButton sx={circleIconBtnStyle} size="small" disableRipple>
              <KeyboardArrowDownIcon sx={{ color: '#666', fontSize: isMobile ? 18 : 22 }} />
            </IconButton>
            <FormControl 
              size="small"
              sx={{ 
                position: 'absolute', 
                width: '100%', 
                height: '100%', 
                opacity: 0, 
                left: 0, 
                top: 0,
                '& .MuiInputBase-root': { height: '100%' },
              }}
            >
              <Select
                multiple
                value={selectedActors}
                onChange={handleActorChange}
                renderValue={() => ''}
              >
                <MenuItem value="__ALL__">
                  <Checkbox checked={selectedActors.length === 0} />
                  <ListItemText primary="All team members" />
                </MenuItem>
                {actorOptions.map((option) => (
                  <MenuItem key={option.value} value={option.value}>
                    <Checkbox checked={selectedActors.indexOf(option.value) > -1} />
                    <ListItemText primary={option.label} />
                  </MenuItem>
                ))}
              </Select>
            </FormControl>
          </Box>

          {/* Chart Type - Icons or Dropdown based on prop */}
          {useChartTypeIcons ? (
            <Paper 
              elevation={0}
              sx={{ 
                display: 'flex', 
                gap: 0.5, 
                p: 0.5,
                borderRadius: '12px',
                backgroundColor: '#f5f5f5',
              }}
            >
              {chartTypeIcons.map((item) => (
                <MuiTooltip key={item.type} title={item.label} arrow>
                  <IconButton
                    size="small"
                    onClick={() => setChartType(item.type)}
                    sx={{
                      width: isMobile ? 36 : 42,
                      height: isMobile ? 36 : 42,
                      borderRadius: '10px',
                      backgroundColor: chartType === item.type ? '#1976d2' : 'transparent',
                      color: chartType === item.type ? '#fff' : '#666',
                      transition: 'all 0.2s ease',
                      '&:hover': {
                        backgroundColor: chartType === item.type ? '#1565c0' : 'rgba(0,0,0,0.08)',
                      },
                    }}
                  >
                    {item.icon}
                  </IconButton>
                </MuiTooltip>
              ))}
            </Paper>
          ) : (
            <Box sx={{ ...dropdownPillStyle }}>
              <Typography sx={{ color: '#888', fontSize: isMobile ? '0.6rem' : '0.8rem', whiteSpace: 'nowrap', flex: 1, overflow: 'hidden', textOverflow: 'ellipsis' }}>
                {isMobile 
                  ? (chartType === 'horizontal' ? 'H-Bar' : 
                     chartType === 'vertical' ? 'V-Bar' : 
                     chartType === 'line' ? 'Line' :
                     chartType === 'pie' ? 'Pie' :
                     chartType === 'donut' ? 'Donut' : 'Chart')
                  : (chartType === 'horizontal' ? 'Horizontal Bar' : 
                     chartType === 'vertical' ? 'Vertical Bar' : 
                     chartType === 'line' ? 'Line Chart' :
                     chartType === 'pie' ? 'Pie Chart' :
                     chartType === 'donut' ? 'Donut Chart' : 'Chart Type')}
              </Typography>
              <IconButton sx={circleIconBtnStyle} size="small" disableRipple>
                <KeyboardArrowDownIcon sx={{ color: '#666', fontSize: isMobile ? 18 : 22 }} />
              </IconButton>
              <FormControl 
                size="small"
                sx={{ 
                  position: 'absolute', 
                  width: '100%', 
                  height: '100%', 
                  opacity: 0, 
                  left: 0, 
                  top: 0,
                  '& .MuiInputBase-root': { height: '100%' },
                }}
              >
                <Select
                  value={chartType}
                  onChange={(e) => setChartType(e.target.value as ChartType)}
                  sx={{ width: '100%', height: '100%' }}
                >
                  <MenuItem value="horizontal">Horizontal Bar</MenuItem>
                  <MenuItem value="vertical">Vertical Bar</MenuItem>
                  <MenuItem value="line">Line Chart</MenuItem>
                  <MenuItem value="pie">Pie Chart</MenuItem>
                  <MenuItem value="donut">Donut Chart</MenuItem>
                </Select>
              </FormControl>
            </Box>
          )}
        </Box>
      </Box>

      {/* Dark Container - Contains both chart and stats */}
      <Box
        sx={{
          backgroundColor: screenshotColors.darkBg,
          borderRadius: isMobile ? '20px' : '24px',
          p: isMobile ? 2 : 4,
          pb: isMobile ? 2 : 3,
        }}
      >
        {/* Chart Area */}
        <Box sx={{ height: isMobile ? 280 : 320, mb: 0.5 }}>
          {loading ? (
            <Box sx={{ display: 'flex', justifyContent: 'center', alignItems: 'center', height: '100%' }}>
              <CircularProgress sx={{ color: screenshotColors.lightText }} />
            </Box>
          ) : chartType === 'pie' || chartType === 'donut' ? (
            /* Pie / Donut Chart */
            <ResponsiveContainer width="100%" height="100%">
              <PieChart margin={isMobile ? { top: 10, bottom: 10, left: 10, right: 10 } : undefined}>
                <defs>
                  <linearGradient id={gradientId} x1="0" y1="0" x2="1" y2="1">
                    <stop offset="0%" stopColor="#88d8f0" />
                    <stop offset="50%" stopColor="#c8f0a0" />
                    <stop offset="100%" stopColor="#f0f8a0" />
                  </linearGradient>
                </defs>
                <Pie
                  data={chartData}
                  dataKey="totalCalls"
                  nameKey="label"
                  cx="50%"
                  cy={isMobile ? "45%" : "50%"}
                  innerRadius={chartType === 'donut' ? (isMobile ? 40 : 60) : 0}
                  outerRadius={isMobile ? 70 : 120}
                  paddingAngle={2}
                  label={isMobile 
                    ? ({ percent }) => `${(percent * 100).toFixed(0)}%`
                    : ({ label, percent }) => `${label}: ${(percent * 100).toFixed(0)}%`
                  }
                  labelLine={{ stroke: 'rgba(255,255,255,0.5)', strokeWidth: isMobile ? 1 : 1 }}
                >
                  {chartData.map((_, index) => (
                    <Cell 
                      key={`cell-${index}`} 
                      fill={['#88d8f0', '#a8e8b0', '#c8f0a0', '#e8f8a0', '#f0f8a0', '#f8e8a0'][index % 6]}
                    />
                  ))}
                </Pie>
                <Tooltip
                  contentStyle={{
                    backgroundColor: '#7EB1FD',
                    border: '1px solid rgba(255,255,255,0.2)',
                    borderRadius: 8,
                    color: '#fff',
                    fontSize: isMobile ? 11 : 14,
                  }}
                />
                <Legend 
                  wrapperStyle={{ paddingTop: isMobile ? 8 : 16 }}
                  formatter={(value) => <span style={{ color: 'rgba(255,255,255,0.8)', fontSize: isMobile ? 10 : 13 }}>{value}</span>}
                  layout={isMobile ? "horizontal" : "horizontal"}
                  align="center"
                  verticalAlign="bottom"
                />
              </PieChart>
            </ResponsiveContainer>
          ) : chartType === 'line' ? (
            /* Line Chart */
            <ResponsiveContainer width="100%" height="100%">
              <LineChart 
                data={chartData} 
                margin={isMobile 
                  ? { left: 5, right: 10, top: 10, bottom: 40 }
                  : { left: 20, right: 40, top: 20, bottom: 50 }
                }
              >
                <defs>
                  <linearGradient id={gradientId} x1="0" y1="0" x2="1" y2="0">
                    <stop offset="0%" stopColor="#88d8f0" />
                    <stop offset="50%" stopColor="#c8f0a0" />
                    <stop offset="100%" stopColor="#f0f8a0" />
                  </linearGradient>
                </defs>
                <CartesianGrid 
                  strokeDasharray="4 4" 
                  stroke="rgba(255,255,255,0.2)" 
                />
                <XAxis 
                  dataKey="label" 
                  stroke="rgba(255,255,255,0.3)" 
                  tick={{ fill: 'rgba(255,255,255,0.9)', fontSize: isMobile ? 9 : 12 }}
                  axisLine={{ stroke: 'rgba(255,255,255,0.3)' }}
                  tickLine={{ stroke: 'rgba(255,255,255,0.3)' }}
                  interval={0}
                  angle={isMobile ? -45 : 0}
                  textAnchor={isMobile ? "end" : "middle"}
                  height={isMobile ? 50 : 30}
                />
                <YAxis 
                  stroke="rgba(255,255,255,0.3)"
                  tick={{ fill: 'rgba(255,255,255,0.7)', fontSize: isMobile ? 10 : 14 }}
                  axisLine={{ stroke: 'rgba(255,255,255,0.3)' }}
                  tickLine={{ stroke: 'rgba(255,255,255,0.3)' }}
                  domain={[0, 'auto']}
                  width={isMobile ? 30 : 40}
                />
                <Tooltip
                  contentStyle={{
                    backgroundColor: '#7EB1FD',
                    border: '1px solid rgba(255,255,255,0.2)',
                    borderRadius: 8,
                    color: '#fff',
                    fontSize: isMobile ? 11 : 14,
                  }}
                />
                <Legend 
                  wrapperStyle={{ paddingTop: isMobile ? 8 : 24 }}
                  formatter={() => <span style={{ color: 'rgba(255,255,255,0.8)', fontSize: isMobile ? 10 : 14 }}>Total Calls</span>}
                />
                <Line 
                  type="monotone"
                  dataKey="totalCalls" 
                  name="Total Calls" 
                  stroke={`url(#${gradientId})`}
                  strokeWidth={isMobile ? 2 : 3}
                  dot={{ fill: '#c8f0a0', strokeWidth: isMobile ? 1 : 2, r: isMobile ? 3 : 5 }}
                  activeDot={{ r: isMobile ? 5 : 8, fill: '#88d8f0' }}
                />
              </LineChart>
            </ResponsiveContainer>
          ) : (
            /* Bar Chart (horizontal or vertical) */
            <ResponsiveContainer width="100%" height="100%">
              <BarChart 
                data={chartData} 
                layout={chartType === 'horizontal' ? 'vertical' : 'horizontal'} 
                margin={chartType === 'horizontal' 
                  ? (isMobile 
                      ? { left: 0, right: 15, top: 10, bottom: 30 }
                      : { left: 40, right: 60, top: 20, bottom: 50 })
                  : (isMobile 
                      ? { left: 5, right: 10, top: 10, bottom: 50 }
                      : { left: 20, right: 20, top: 20, bottom: 60 })
                }
              >
                <defs>
                  <linearGradient id={gradientId} x1="0" y1="0" x2={chartType === 'horizontal' ? '1' : '0'} y2={chartType === 'horizontal' ? '0' : '1'}>
                    <stop offset="36%" stopColor="#D7ECFF" />
                    <stop offset="100%" stopColor="#EBFF74" />
                  </linearGradient>
                </defs>
                <CartesianGrid 
                  strokeDasharray="4 4" 
                  stroke="rgba(255,255,255,0.2)" 
                  horizontal={true} 
                  vertical={true} 
                />
                {chartType === 'horizontal' ? (
                  <>
                    <XAxis 
                      type="number" 
                      stroke="rgba(255,255,255,0.3)" 
                      tick={{ fill: 'rgba(255,255,255,0.7)', fontSize: isMobile ? 10 : 14 }}
                      axisLine={{ stroke: 'rgba(255,255,255,0.3)' }}
                      tickLine={{ stroke: 'rgba(255,255,255,0.3)' }}
                      domain={[0, 'auto']}
                    />
                    <YAxis 
                      dataKey="label" 
                      type="category" 
                      width={isMobile ? 70 : 140} 
                      stroke="rgba(255,255,255,0.3)"
                      tick={{ 
                        fill: 'rgba(255,255,255,0.9)', 
                        fontSize: isMobile ? 9 : 15,
                        width: isMobile ? 65 : 130,
                      }}
                      axisLine={{ stroke: 'rgba(255,255,255,0.3)' }}
                      tickLine={false}
                      tickFormatter={(value) => {
                        if (!isMobile) return value;
                        // Split long names into two lines for mobile
                        const words = value.split(' ');
                        if (words.length > 1 && value.length > 10) {
                          return words.slice(0, 2).join(' ');
                        }
                        return value.length > 12 ? value.slice(0, 12) + '...' : value;
                      }}
                    />
                  </>
                ) : (
                  <>
                    <XAxis 
                      dataKey="label" 
                      type="category"
                      stroke="rgba(255,255,255,0.3)" 
                      tick={{ fill: 'rgba(255,255,255,0.9)', fontSize: isMobile ? 9 : 12 }}
                      axisLine={{ stroke: 'rgba(255,255,255,0.3)' }}
                      tickLine={{ stroke: 'rgba(255,255,255,0.3)' }}
                      interval={0}
                      angle={isMobile ? -45 : 0}
                      textAnchor={isMobile ? "end" : "middle"}
                      height={isMobile ? 60 : 30}
                      tickFormatter={(value) => {
                        if (!isMobile) return value;
                        return value.length > 8 ? value.slice(0, 8) + '...' : value;
                      }}
                    />
                    <YAxis 
                      type="number"
                      stroke="rgba(255,255,255,0.3)"
                      tick={{ fill: 'rgba(255,255,255,0.7)', fontSize: isMobile ? 10 : 14 }}
                      axisLine={{ stroke: 'rgba(255,255,255,0.3)' }}
                      tickLine={{ stroke: 'rgba(255,255,255,0.3)' }}
                      domain={[0, 'auto']}
                      width={isMobile ? 30 : 40}
                    />
                  </>
                )}
                <Tooltip
                  contentStyle={{
                    backgroundColor: '#7EB1FD',
                    border: '1px solid rgba(255,255,255,0.2)',
                    borderRadius: 8,
                    color: '#fff',
                    fontSize: isMobile ? 11 : 14,
                  }}
                />
                <Legend 
                  wrapperStyle={{ paddingTop: isMobile ? 8 : 24 }}
                  formatter={() => <span style={{ color: 'rgba(255,255,255,0.8)', fontSize: isMobile ? 10 : 14 }}>Total Calls</span>}
                  iconType="square"
                />
                <Bar 
                  dataKey="totalCalls" 
                  name="Total Calls" 
                  fill={`url(#${gradientId})`}
                  radius={chartType === 'horizontal' ? [0, 4, 4, 0] : [4, 4, 0, 0]}
                  barSize={chartType === 'horizontal' ? (isMobile ? 35 : 70) : (isMobile ? 30 : 50)}
                />
              </BarChart>
            </ResponsiveContainer>
          )}
        </Box>

        {/* Stats Row - Top summary stats */}
        <Box
          sx={{
            background: 'rgba(255, 255, 255, 0.15)',
            backdropFilter: 'blur(12px)',
            WebkitBackdropFilter: 'blur(12px)',
            border: '1px solid rgba(255, 255, 255, 0.2)',
            borderRadius: isMobile ? '16px' : '20px',
            py: isMobile ? 1.5 : 2,
            px: isMobile ? 2 : 3,
            mb: 2,
          }}
        >
          <Box sx={{ 
            display: 'grid',
            gridTemplateColumns: isMobile ? 'repeat(2, 1fr)' : 'repeat(4, 1fr)',
            gap: isMobile ? 1.5 : 2,
          }}>
            <Box sx={{ textAlign: 'center' }}>
              <Typography sx={{ color: '#D8EFFE', fontSize: isMobile ? '0.7rem' : '0.85rem', mb: 0.25, fontWeight: 500 }}>
                Total Calls
              </Typography>
              <Typography sx={{ color: screenshotColors.lightText, fontSize: isMobile ? '1.25rem' : '1.5rem', fontWeight: 600 }}>
                {totals.totalCalls}
              </Typography>
            </Box>
            <Box sx={{ textAlign: 'center' }}>
              <Typography sx={{ color: '#D8EFFE', fontSize: isMobile ? '0.7rem' : '0.85rem', mb: 0.25, fontWeight: 500 }}>
                Total Duration
              </Typography>
              <Typography sx={{ color: screenshotColors.lightText, fontSize: isMobile ? '1.25rem' : '1.5rem', fontWeight: 600 }}>
                {formatDuration(totals.totalDuration)}
              </Typography>
            </Box>
            <Box sx={{ textAlign: 'center' }}>
              <Typography sx={{ color: '#D8EFFE', fontSize: isMobile ? '0.7rem' : '0.85rem', mb: 0.25, fontWeight: 500 }}>
                Average Duration
              </Typography>
              <Typography sx={{ color: screenshotColors.lightText, fontSize: isMobile ? '1.25rem' : '1.5rem', fontWeight: 600 }}>
                {formatDuration(averageDuration)}
              </Typography>
            </Box>
            <Box sx={{ textAlign: 'center' }}>
              <Typography sx={{ color: '#D8EFFE', fontSize: isMobile ? '0.7rem' : '0.85rem', mb: 0.25, fontWeight: 500 }}>
                Team Members
              </Typography>
              <Typography sx={{ color: screenshotColors.lightText, fontSize: isMobile ? '1.25rem' : '1.5rem', fontWeight: 600 }}>
                {teamCount}
              </Typography>
            </Box>
          </Box>
        </Box>

        {/* Direction Stats - Inbound/Outbound with Answered/Unanswered */}
        <Box sx={{ 
          display: 'grid',
          gridTemplateColumns: isMobile ? '1fr' : 'repeat(2, 1fr)',
          gap: 2,
        }}>
          {/* Outbound Calls */}
          <Box
            sx={{
              background: 'rgba(255, 255, 255, 0.1)',
              borderRadius: '16px',
              p: isMobile ? 1.5 : 2,
            }}
          >
            <Stack direction="row" alignItems="center" gap={1} sx={{ mb: 1.5 }}>
              <CallMadeIcon sx={{ color: '#4caf50', fontSize: isMobile ? 20 : 24 }} />
              <Typography sx={{ color: '#fff', fontSize: isMobile ? '0.9rem' : '1rem', fontWeight: 600 }}>
                Outbound Calls
              </Typography>
              <Chip 
                label={totals.totalOutbound} 
                size="small"
                sx={{ 
                  bgcolor: 'rgba(76, 175, 80, 0.3)', 
                  color: '#4caf50',
                  fontWeight: 600,
                  fontSize: isMobile ? '0.75rem' : '0.85rem',
                }}
              />
            </Stack>
            <Box sx={{ display: 'grid', gridTemplateColumns: 'repeat(2, 1fr)', gap: 1.5 }}>
              <Box sx={{ 
                bgcolor: 'rgba(76, 175, 80, 0.15)', 
                borderRadius: '12px', 
                p: 1.5,
                textAlign: 'center',
              }}>
                <Typography sx={{ color: 'rgba(255,255,255,0.7)', fontSize: isMobile ? '0.65rem' : '0.75rem', mb: 0.5 }}>
                  Answered
                </Typography>
                <Typography sx={{ color: '#4caf50', fontSize: isMobile ? '1.1rem' : '1.25rem', fontWeight: 700 }}>
                  {totals.outboundAnswered}
                </Typography>
                <Typography sx={{ color: 'rgba(255,255,255,0.5)', fontSize: isMobile ? '0.6rem' : '0.7rem', mt: 0.5 }}>
                  Unique: {totals.uniqueOutboundAnswered}
                </Typography>
              </Box>
              <Box sx={{ 
                bgcolor: 'rgba(244, 67, 54, 0.15)', 
                borderRadius: '12px', 
                p: 1.5,
                textAlign: 'center',
              }}>
                <Typography sx={{ color: 'rgba(255,255,255,0.7)', fontSize: isMobile ? '0.65rem' : '0.75rem', mb: 0.5 }}>
                  Unanswered
                </Typography>
                <Typography sx={{ color: '#f44336', fontSize: isMobile ? '1.1rem' : '1.25rem', fontWeight: 700 }}>
                  {totals.outboundUnanswered}
                </Typography>
                <Typography sx={{ color: 'rgba(255,255,255,0.5)', fontSize: isMobile ? '0.6rem' : '0.7rem', mt: 0.5 }}>
                  Unique: {totals.uniqueOutboundUnanswered}
                </Typography>
              </Box>
            </Box>
          </Box>

          {/* Inbound Calls */}
          <Box
            sx={{
              background: 'rgba(255, 255, 255, 0.1)',
              borderRadius: '16px',
              p: isMobile ? 1.5 : 2,
            }}
          >
            <Stack direction="row" alignItems="center" gap={1} sx={{ mb: 1.5 }}>
              <CallReceivedIcon sx={{ color: '#2196f3', fontSize: isMobile ? 20 : 24 }} />
              <Typography sx={{ color: '#fff', fontSize: isMobile ? '0.9rem' : '1rem', fontWeight: 600 }}>
                Inbound Calls
              </Typography>
              <Chip 
                label={totals.totalInbound} 
                size="small"
                sx={{ 
                  bgcolor: 'rgba(33, 150, 243, 0.3)', 
                  color: '#2196f3',
                  fontWeight: 600,
                  fontSize: isMobile ? '0.75rem' : '0.85rem',
                }}
              />
            </Stack>
            <Box sx={{ display: 'grid', gridTemplateColumns: 'repeat(2, 1fr)', gap: 1.5 }}>
              <Box sx={{ 
                bgcolor: 'rgba(33, 150, 243, 0.15)', 
                borderRadius: '12px', 
                p: 1.5,
                textAlign: 'center',
              }}>
                <Typography sx={{ color: 'rgba(255,255,255,0.7)', fontSize: isMobile ? '0.65rem' : '0.75rem', mb: 0.5 }}>
                  Answered
                </Typography>
                <Typography sx={{ color: '#2196f3', fontSize: isMobile ? '1.1rem' : '1.25rem', fontWeight: 700 }}>
                  {totals.inboundAnswered}
                </Typography>
                <Typography sx={{ color: 'rgba(255,255,255,0.5)', fontSize: isMobile ? '0.6rem' : '0.7rem', mt: 0.5 }}>
                  Unique: {totals.uniqueInboundAnswered}
                </Typography>
              </Box>
              <Box sx={{ 
                bgcolor: 'rgba(255, 152, 0, 0.15)', 
                borderRadius: '12px', 
                p: 1.5,
                textAlign: 'center',
              }}>
                <Typography sx={{ color: 'rgba(255,255,255,0.7)', fontSize: isMobile ? '0.65rem' : '0.75rem', mb: 0.5 }}>
                  Missed/Unanswered
                </Typography>
                <Typography sx={{ color: '#ff9800', fontSize: isMobile ? '1.1rem' : '1.25rem', fontWeight: 700 }}>
                  {totals.inboundUnanswered}
                </Typography>
                <Typography sx={{ color: 'rgba(255,255,255,0.5)', fontSize: isMobile ? '0.6rem' : '0.7rem', mt: 0.5 }}>
                  Unique: {totals.uniqueInboundUnanswered}
                </Typography>
              </Box>
            </Box>
          </Box>
        </Box>
      </Box>
    </Box>
  );
};

export default CallAnalyticsWidget;
