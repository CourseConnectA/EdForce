import React, { useState, useEffect } from 'react';
import {
  Box,
  Grid,
  Card,
  CardContent,
  Typography,
  Button,
  Alert,
  CircularProgress,
  Paper,
  Accordion,
  AccordionSummary,
  AccordionDetails,
  FormControlLabel,
  Checkbox,
} from '@mui/material';
import { useTheme, useMediaQuery } from '@mui/material';
import {
  ExpandMore as ExpandMoreIcon,
  Download as DownloadIcon,
  Refresh as RefreshIcon,
  TrendingUp as TrendingUpIcon,
  TrendingDown as TrendingDownIcon,
  Settings as SettingsIcon,
} from '@mui/icons-material';
import { DatePicker } from '@mui/x-date-pickers/DatePicker';
import { LocalizationProvider } from '@mui/x-date-pickers/LocalizationProvider';
import { AdapterDateFns } from '@mui/x-date-pickers/AdapterDateFns';
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ResponsiveContainer,
  PieChart,
  Pie,
  Cell,
  LineChart,
  Line,
} from 'recharts';

import analyticsService, { 
  AnalyticsFilters, 
  AnalyticsData, 
  MetricSummary
} from '../../services/analyticsService';

// Color palette for charts
const COLORS = ['#0088FE', '#00C49F', '#FFBB28', '#FF8042', '#8884D8', '#82CA9D', '#FFC658'];

interface CustomTooltipProps {
  active?: boolean;
  payload?: any[];
  label?: string;
}

const CustomTooltip: React.FC<CustomTooltipProps> = ({ active, payload, label }) => {
  if (active && payload && payload.length) {
    return (
      <Paper sx={{ p: 2, border: '1px solid #ccc' }}>
        <Typography variant="h6" gutterBottom>{`${label}`}</Typography>
        {payload.map((pload: any, index: number) => (
          <div key={index}>
            <Typography 
              variant="body2" 
              sx={{ color: pload.color }}
            >
              {`${pload.dataKey}: ${pload.value}`}
              {pload.payload.percentage && (
                <span> ({pload.payload.percentage.toFixed(1)}%)</span>
              )}
            </Typography>
          </div>
        ))}
      </Paper>
    );
  }
  return null;
};

const Analytics: React.FC = () => {
  const theme = useTheme();
  const isSmall = useMediaQuery(theme.breakpoints.down('md'));
  const [analyticsData, setAnalyticsData] = useState<AnalyticsData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [filters, setFilters] = useState<AnalyticsFilters>({
    dateRange: {
      start: new Date(new Date().getFullYear(), new Date().getMonth() - 5, 1),
      end: new Date(),
    },
    modules: ['accounts', 'contacts', 'leads', 'opportunities'],
    metrics: ['count', 'value', 'conversion'],
    customFields: [],
  });
  const [showCustomization, setShowCustomization] = useState(false);

  useEffect(() => {
    const fetchAnalyticsData = async () => {
      setLoading(true);
      setError(null);
      
      try {
        const data = await analyticsService.getAnalyticsData(filters);
        setAnalyticsData(data);
      } catch (err) {
        console.error('Error fetching analytics:', err);
        setError('Failed to load analytics data. Some data may be from fallback sources.');
        
        // Still try to show some data by using mock fallback
        try {
          const fallbackData = await analyticsService.getAnalyticsData(filters);
          setAnalyticsData(fallbackData);
        } catch {
          // If even fallback fails, set empty state
          setAnalyticsData(null);
        }
      } finally {
        setLoading(false);
      }
    };

    fetchAnalyticsData();
  }, [filters]);

  const handleRefresh = () => {
    const fetchData = async () => {
      setLoading(true);
      try {
        const data = await analyticsService.getAnalyticsData(filters);
        setAnalyticsData(data);
        setError(null);
      } catch (err) {
        setError('Failed to refresh analytics data.');
      } finally {
        setLoading(false);
      }
    };
    fetchData();
  };

  const handleExport = async (format: 'csv' | 'pdf' | 'excel') => {
    try {
      await analyticsService.exportAnalytics(filters, format);
    } catch (err) {
      console.error('Export failed:', err);
      alert('Export functionality is not available at the moment.');
    }
  };

  const handleModuleChange = (module: string) => {
    const newModules = filters.modules.includes(module)
      ? filters.modules.filter(m => m !== module)
      : [...filters.modules, module];
    
    setFilters({ ...filters, modules: newModules as any });
  };

  const formatCurrency = (value: number) => {
    return new Intl.NumberFormat('en-IN', {
      style: 'currency',
      currency: 'INR',
      maximumFractionDigits: 0,
    }).format(value);
  };

  const formatNumber = (value: number) => {
    return new Intl.NumberFormat('en-US').format(value);
  };

  if (loading) {
    return (
      <Box sx={{ display: 'flex', justifyContent: 'center', alignItems: 'center', height: '50vh' }}>
        <CircularProgress size={60} />
      </Box>
    );
  }

  return (
    <LocalizationProvider dateAdapter={AdapterDateFns}>
      <Box>
        {/* Header */}
        <Box sx={{
          display: 'flex',
          flexDirection: isSmall ? 'column' : 'row',
          alignItems: isSmall ? 'center' : 'center',
          justifyContent: isSmall ? 'center' : 'space-between',
          textAlign: isSmall ? 'center' : 'left',
          mb: 3,
          gap: isSmall ? 1.5 : 0,
        }}>
          <div>
            <Typography variant="h4" gutterBottom sx={{ textAlign: isSmall ? 'center' : 'left' }}>
              Analytics Dashboard
            </Typography>
            <Typography variant="body1" color="text.secondary" sx={{ textAlign: isSmall ? 'center' : 'left' }}>
              Comprehensive insights and reports for your CRM data
            </Typography>
          </div>
          <Box sx={{ display: 'flex', gap: 1, justifyContent: 'center', width: isSmall ? '100%' : 'auto', mt: isSmall ? 1 : 0, flexWrap: 'wrap' }}>
            <Button
              variant="outlined"
              startIcon={<SettingsIcon />}
              onClick={() => setShowCustomization(!showCustomization)}
            >
              Customize
            </Button>
            <Button
              variant="outlined"
              startIcon={<RefreshIcon />}
              onClick={handleRefresh}
              disabled={loading}
            >
              Refresh
            </Button>
            <Button
              variant="contained"
              startIcon={<DownloadIcon />}
              onClick={() => handleExport('pdf')}
            >
              Export
            </Button>
          </Box>
        </Box>

        {/* Error Alert */}
        {error && (
          <Alert severity="warning" sx={{ mb: 2 }}>
            {error}
          </Alert>
        )}

        {/* Customization Panel */}
        {showCustomization && (
          <Accordion sx={{ mb: 3 }}>
            <AccordionSummary expandIcon={<ExpandMoreIcon />}>
              <Typography variant="h6">Customize Analytics</Typography>
            </AccordionSummary>
            <AccordionDetails>
              <Grid container spacing={3}>
                <Grid item xs={12} md={4}>
                  <Typography variant="subtitle1" gutterBottom>Date Range</Typography>
                  <Box sx={{ display: 'flex', gap: 2, flexDirection: 'column' }}>
                    <DatePicker
                      label="Start Date"
                      value={filters.dateRange.start}
                      onChange={(newValue) => newValue && setFilters({
                        ...filters,
                        dateRange: { ...filters.dateRange, start: newValue }
                      })}
                      slotProps={{ textField: { size: 'small' } }}
                    />
                    <DatePicker
                      label="End Date"
                      value={filters.dateRange.end}
                      onChange={(newValue) => newValue && setFilters({
                        ...filters,
                        dateRange: { ...filters.dateRange, end: newValue }
                      })}
                      slotProps={{ textField: { size: 'small' } }}
                    />
                  </Box>
                </Grid>
                <Grid item xs={12} md={4}>
                  <Typography variant="subtitle1" gutterBottom>Modules</Typography>
                  <Box sx={{ display: 'flex', flexDirection: 'column' }}>
                    {['accounts', 'contacts', 'leads', 'opportunities'].map((module) => (
                      <FormControlLabel
                        key={module}
                        control={
                          <Checkbox
                            checked={filters.modules.includes(module as any)}
                            onChange={() => handleModuleChange(module)}
                          />
                        }
                        label={module.charAt(0).toUpperCase() + module.slice(1)}
                      />
                    ))}
                  </Box>
                </Grid>
                <Grid item xs={12} md={4}>
                  <Typography variant="subtitle1" gutterBottom>Export Options</Typography>
                  <Box sx={{ display: 'flex', gap: 1, flexDirection: 'column' }}>
                    <Button variant="outlined" size="small" onClick={() => handleExport('csv')}>
                      Export CSV
                    </Button>
                    <Button variant="outlined" size="small" onClick={() => handleExport('excel')}>
                      Export Excel
                    </Button>
                    <Button variant="outlined" size="small" onClick={() => handleExport('pdf')}>
                      Export PDF
                    </Button>
                  </Box>
                </Grid>
              </Grid>
            </AccordionDetails>
          </Accordion>
        )}

        {analyticsData && (
          <>
            {/* Summary Metrics */}
            <Grid container spacing={3} sx={{ mb: 4 }}>
              {analyticsData.summary.map((metric: MetricSummary, index: number) => (
                <Grid item xs={12} sm={6} md={3} key={index}>
                  <Card>
                    <CardContent>
                      <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                        <Box>
                          <Typography variant="h4" component="div" gutterBottom>
                            {metric.value}
                          </Typography>
                          <Typography variant="body2" color="text.secondary">
                            {metric.label}
                          </Typography>
                          {metric.description && (
                            <Typography variant="caption" color="text.secondary">
                              {metric.description}
                            </Typography>
                          )}
                        </Box>
                        <Box sx={{ display: 'flex', alignItems: 'center' }}>
                          {metric.trend > 0 ? (
                            <TrendingUpIcon color="success" />
                          ) : (
                            <TrendingDownIcon color="error" />
                          )}
                          <Typography 
                            variant="body2" 
                            color={metric.trend > 0 ? 'success.main' : 'error.main'}
                            sx={{ ml: 0.5 }}
                          >
                            {Math.abs(metric.trend).toFixed(1)}%
                          </Typography>
                        </Box>
                      </Box>
                    </CardContent>
                  </Card>
                </Grid>
              ))}
            </Grid>

            {/* Sales Funnel */}
            <Grid container spacing={3} sx={{ mb: 4 }}>
              <Grid item xs={12} lg={8}>
                <Card>
                  <CardContent>
                    <Typography variant="h6" gutterBottom>
                      Sales Funnel Analysis
                    </Typography>
                    <ResponsiveContainer width="100%" height={400}>
                      <BarChart data={analyticsData.salesFunnel}>
                        <CartesianGrid strokeDasharray="3 3" />
                        <XAxis dataKey="stage" />
                        <YAxis />
                        <Tooltip content={<CustomTooltip />} />
                        <Legend />
                        <Bar dataKey="count" fill="#8884d8" name="Count" />
                        <Bar dataKey="value" fill="#82ca9d" name="Value (₹)" />
                      </BarChart>
                    </ResponsiveContainer>
                  </CardContent>
                </Card>
              </Grid>
              <Grid item xs={12} lg={4}>
                <Card>
                  <CardContent>
                    <Typography variant="h6" gutterBottom>
                      Conversion Rates
                    </Typography>
                    <Box>
                      {analyticsData.conversionRates.map((conversion, index) => (
                        <Box key={index} sx={{ mb: 2 }}>
                          <Box sx={{ display: 'flex', justifyContent: 'space-between', mb: 1 }}>
                            <Typography variant="body2">{conversion.stage}</Typography>
                            <Typography variant="body2" fontWeight="bold">
                              {conversion.rate.toFixed(1)}%
                            </Typography>
                          </Box>
                          <Box sx={{ 
                            width: '100%', 
                            height: 8, 
                            backgroundColor: 'grey.300', 
                            borderRadius: 1 
                          }}>
                            <Box sx={{ 
                              width: `${conversion.rate}%`, 
                              height: '100%', 
                              backgroundColor: 'primary.main', 
                              borderRadius: 1 
                            }} />
                          </Box>
                          <Typography variant="caption" color="text.secondary">
                            {formatNumber(conversion.count)} conversions
                          </Typography>
                        </Box>
                      ))}
                    </Box>
                  </CardContent>
                </Card>
              </Grid>
            </Grid>

            {/* Charts Row */}
            <Grid container spacing={3} sx={{ mb: 4 }}>
              {/* Opportunity Stages */}
              <Grid item xs={12} md={6}>
                <Card>
                  <CardContent>
                    <Typography variant="h6" gutterBottom>
                      Opportunity Stages Distribution
                    </Typography>
                    <ResponsiveContainer width="100%" height={300}>
                      <PieChart>
                        <Pie
                          data={analyticsData.opportunityStages}
                          cx="50%"
                          cy="50%"
                          labelLine={false}
                          label={({ name, percentage }) => `${name} (${percentage?.toFixed(1)}%)`}
                          outerRadius={80}
                          fill="#8884d8"
                          dataKey="value"
                        >
                          {analyticsData.opportunityStages.map((_entry, index) => (
                            <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                          ))}
                        </Pie>
                        <Tooltip content={<CustomTooltip />} />
                      </PieChart>
                    </ResponsiveContainer>
                  </CardContent>
                </Card>
              </Grid>

              {/* Lead Sources */}
              <Grid item xs={12} md={6}>
                <Card>
                  <CardContent>
                    <Typography variant="h6" gutterBottom>
                      Lead Sources
                    </Typography>
                    <ResponsiveContainer width="100%" height={300}>
                      <BarChart data={analyticsData.leadSources} layout="horizontal">
                        <CartesianGrid strokeDasharray="3 3" />
                        <XAxis type="number" />
                        <YAxis dataKey="name" type="category" width={100} />
                        <Tooltip content={<CustomTooltip />} />
                        <Bar dataKey="value" fill="#00C49F" />
                      </BarChart>
                    </ResponsiveContainer>
                  </CardContent>
                </Card>
              </Grid>
            </Grid>

            {/* Performance Metrics */}
            <Grid container spacing={3}>
              <Grid item xs={12}>
                <Card>
                  <CardContent>
                    <Typography variant="h6" gutterBottom>
                      Performance Metrics Comparison
                    </Typography>
                    <ResponsiveContainer width="100%" height={400}>
                      <BarChart data={analyticsData.performanceMetrics}>
                        <CartesianGrid strokeDasharray="3 3" />
                        <XAxis dataKey="metric" />
                        <YAxis />
                        <Tooltip 
                          formatter={(value, name) => [
                            typeof value === 'number' && name === 'current' && value > 1000 
                              ? formatCurrency(value) 
                              : formatNumber(Number(value)), 
                            name === 'current' ? 'Current' : 'Previous'
                          ]}
                        />
                        <Legend />
                        <Bar dataKey="previous" fill="#8884d8" name="Previous Period" />
                        <Bar dataKey="current" fill="#82ca9d" name="Current Period" />
                      </BarChart>
                    </ResponsiveContainer>
                  </CardContent>
                </Card>
              </Grid>
            </Grid>

            {/* Monthly Trends */}
            {analyticsData.monthlyTrends.length > 1 && (
              <Grid container spacing={3}>
                <Grid item xs={12}>
                  <Card>
                    <CardContent>
                      <Typography variant="h6" gutterBottom>
                        Monthly Trends
                      </Typography>
                      <ResponsiveContainer width="100%" height={400}>
                        <LineChart data={analyticsData.monthlyTrends}>
                          <CartesianGrid strokeDasharray="3 3" />
                          <XAxis dataKey="month" />
                          <YAxis />
                          <Tooltip content={<CustomTooltip />} />
                          <Legend />
                          <Line type="monotone" dataKey="accounts" stroke="#8884d8" name="Accounts" />
                          <Line type="monotone" dataKey="contacts" stroke="#82ca9d" name="Contacts" />
                          <Line type="monotone" dataKey="leads" stroke="#ffc658" name="Leads" />
                          <Line type="monotone" dataKey="opportunities" stroke="#ff7300" name="Opportunities" />
                        </LineChart>
                      </ResponsiveContainer>
                    </CardContent>
                  </Card>
                </Grid>
              </Grid>
            )}
          </>
        )}

        {!analyticsData && !loading && (
          <Box sx={{ textAlign: 'center', py: 8 }}>
            <Typography variant="h6" color="text.secondary">
              No analytics data available
            </Typography>
            <Typography variant="body2" color="text.secondary" sx={{ mt: 1 }}>
              Please check your filters or try refreshing the page
            </Typography>
          </Box>
        )}
      </Box>
    </LocalizationProvider>
  );
};

export default Analytics;