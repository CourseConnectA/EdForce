import React, { useEffect, useMemo, useState } from 'react';
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
} from '@mui/material';
import Select, { SelectChangeEvent } from '@mui/material/Select';
import KeyboardArrowDownIcon from '@mui/icons-material/KeyboardArrowDown';
import callsService, { CallAnalytics } from '@/services/callsService';
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

interface CallAnalyticsWidgetProps {
  period?: 'daily' | 'monthly';
  startDate?: string;
  endDate?: string;
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

const CallAnalyticsWidget: React.FC<CallAnalyticsWidgetProps> = ({ period: _period = 'daily', startDate, endDate }) => {
  const [analytics, setAnalytics] = useState<CallAnalytics[]>([]);
  const [loading, setLoading] = useState(false);
  const [timeRange, setTimeRange] = useState<TimeRange>('today');
  const [selectedActors, setSelectedActors] = useState<string[]>([]);
  const [customStart, setCustomStart] = useState<string>('');
  const [customEnd, setCustomEnd] = useState<string>('');
  const [chartType, setChartType] = useState<string>('horizontal');
  
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

  useEffect(() => {
    const fetchAnalytics = async () => {
      if (!rangeConfig.ready) {
        setLoading(false);
        setAnalytics([]);
        return;
      }
      setLoading(true);
      try {
        const data = await callsService.getAnalytics({
          period: rangeConfig.period,
          startDate: rangeConfig.startISO,
          endDate: rangeConfig.endISO,
        });
        setAnalytics(data || []);
      } catch (error) {
        console.error('Failed to load call analytics:', error);
        setAnalytics([]);
      } finally {
        setLoading(false);
      }
    };
    void fetchAnalytics();
  }, [rangeConfig.startISO, rangeConfig.endISO, rangeConfig.ready, rangeConfig.period]);

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
    return filteredRows.reduce(
      (acc, row) => {
        acc.totalCalls += row.data.totalCalls;
        acc.totalDuration += row.data.totalDuration;
        return acc;
      },
      { totalCalls: 0, totalDuration: 0 },
    );
  }, [filteredRows]);

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

  return (
    <Box>
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

          {/* Chart Type Dropdown */}
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
                onChange={(e) => setChartType(e.target.value)}
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

        {/* Stats Row - Glassmorphism pill INSIDE the dark container */}
        <Box
          sx={{
            background: 'rgba(255, 255, 255, 0.15)',
            backdropFilter: 'blur(12px)',
            WebkitBackdropFilter: 'blur(12px)',
            border: '1px solid rgba(255, 255, 255, 0.2)',
            borderRadius: isMobile ? '20px' : '60px',
            py: isMobile ? 2 : 1,
            px: isMobile ? 2 : 8,
            display: 'grid',
            gridTemplateColumns: isMobile ? 'repeat(2, 1fr)' : 'repeat(4, 1fr)',
            gap: isMobile ? 2 : 0,
            justifyContent: 'space-between',
            alignItems: 'center',
          }}
        >
        <Box sx={{ textAlign: 'left' }}>
          <Typography sx={{ color: '#D8EFFE', fontSize: isMobile ? '0.85rem' : '1rem', mb: 0.25, fontWeight: 500 }}>
            Total Calls
          </Typography>
          <Typography sx={{ color: screenshotColors.lightText, fontSize: isMobile ? '1.5rem' : '1.75rem', fontWeight: 600 }}>
            {totals.totalCalls}
          </Typography>
        </Box>
        <Box sx={{ textAlign: 'left' }}>
          <Typography sx={{ color: '#D8EFFE', fontSize: isMobile ? '0.85rem' : '1rem', mb: 0.25, fontWeight: 500 }}>
            Total Duration
          </Typography>
          <Typography sx={{ color: screenshotColors.lightText, fontSize: isMobile ? '1.5rem' : '1.75rem', fontWeight: 600 }}>
            {formatDuration(totals.totalDuration)}
          </Typography>
        </Box>
        <Box sx={{ textAlign: 'left' }}>
          <Typography sx={{ color: '#D8EFFE', fontSize: isMobile ? '0.85rem' : '1rem', mb: 0.25, fontWeight: 500 }}>
            Average Duration
          </Typography>
          <Typography sx={{ color: screenshotColors.lightText, fontSize: isMobile ? '1.5rem' : '1.75rem', fontWeight: 600 }}>
            {formatDuration(averageDuration)}
          </Typography>
        </Box>
        <Box sx={{ textAlign: 'left' }}>
          <Typography sx={{ color: '#D8EFFE', fontSize: isMobile ? '0.85rem' : '1rem', mb: 0.25, fontWeight: 500 }}>
            Team Members Count
          </Typography>
          <Typography sx={{ color: screenshotColors.lightText, fontSize: isMobile ? '1.5rem' : '1.75rem', fontWeight: 600 }}>
            {teamCount}
          </Typography>
        </Box>
        </Box>
      </Box>
    </Box>
  );
};

export default CallAnalyticsWidget;
