import React, { useState, useEffect } from 'react';
import {
  Box,
  Grid,
  Card,
  CardContent,
  Typography,
  FormControl,
  InputLabel,
  Select,
  MenuItem,
  Chip,
  Button,
  Tabs,
  Tab,
  Paper,
  FormControlLabel,
  Tooltip,
  IconButton,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  Checkbox,
  FormGroup,
  Alert,
  CircularProgress,
} from '@mui/material';
import { useTheme, useMediaQuery } from '@mui/material';
import {
  Settings as SettingsIcon,
  Download as DownloadIcon,
  Refresh as RefreshIcon,
  
  TrendingUp as TrendingUpIcon,
  TrendingDown as TrendingDownIcon,
  
} from '@mui/icons-material';
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip as RechartsTooltip,
  Legend,
  ResponsiveContainer,
  PieChart,
  Pie,
  Cell,
  LineChart,
  Line,
  Area,
  AreaChart,
} from 'recharts';
import { DatePicker } from '@mui/x-date-pickers/DatePicker';
import { LocalizationProvider } from '@mui/x-date-pickers/LocalizationProvider';
import { AdapterDateFns } from '@mui/x-date-pickers/AdapterDateFns';
import analyticsService, { AnalyticsData, AnalyticsFilters } from '../../services/analyticsService';

interface TabPanelProps {
  children?: React.ReactNode;
  index: number;
  value: number;
}

function TabPanel(props: TabPanelProps) {
  const { children, value, index, ...other } = props;

  return (
    <div
      role="tabpanel"
      hidden={value !== index}
      id={`analytics-tabpanel-${index}`}
      aria-labelledby={`analytics-tab-${index}`}
      {...other}
    >
      {value === index && <Box sx={{ p: 3 }}>{children}</Box>}
    </div>
  );
}

const COLORS = ['#8884d8', '#82ca9d', '#ffc658', '#ff7c7c', '#8dd1e1', '#d084d0', '#87d068'];

const AnalyticsDashboard: React.FC = () => {
  const theme = useTheme();
  // Treat phones and small tablets as "mobile" for header centering
  const isSmall = useMediaQuery(theme.breakpoints.down('md'));
  const [tabValue, setTabValue] = useState(0);
  const [analyticsData, setAnalyticsData] = useState<AnalyticsData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [customizationOpen, setCustomizationOpen] = useState(false);
  
  // Filters and customization
  const [filters, setFilters] = useState<AnalyticsFilters>({
    dateRange: {
      start: new Date(new Date().getFullYear(), new Date().getMonth() - 3, 1),
      end: new Date(),
    },
    modules: ['accounts', 'contacts', 'leads', 'opportunities'],
    metrics: ['count', 'value', 'conversion'],
  });

  const [visibleCharts, setVisibleCharts] = useState({
    salesFunnel: true,
    opportunityStages: true,
    leadSources: true,
    monthlyTrends: true,
    conversionRates: true,
    accountTypes: true,
    performanceMetrics: true,
  });

  // Custom fields for analytics could be added here in future

  useEffect(() => {
    fetchAnalyticsData();
  }, [filters]);

  const fetchAnalyticsData = async () => {
    try {
      setLoading(true);
      setError(null);
      const data = await analyticsService.getAnalyticsData(filters);
      setAnalyticsData(data);
    } catch (err) {
      console.error('Error fetching analytics data:', err);
      setError('Failed to load analytics data. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  const handleTabChange = (_: React.SyntheticEvent, newValue: number) => {
    setTabValue(newValue);
  };

  const handleFilterChange = (key: keyof AnalyticsFilters, value: any) => {
    setFilters(prev => ({
      ...prev,
      [key]: value,
    }));
  };

  const handleChartVisibilityChange = (chart: string, visible: boolean) => {
    setVisibleCharts(prev => ({
      ...prev,
      [chart]: visible,
    }));
  };

  const exportData = async (format: 'csv' | 'pdf' | 'excel') => {
    try {
      await analyticsService.exportAnalytics(filters, format);
    } catch (err) {
      console.error('Error exporting data:', err);
    }
  };

  // Custom tooltip for charts
  const CustomTooltip = ({ active, payload, label }: any) => {
    if (active && payload && payload.length) {
      return (
        <Paper sx={{ p: 2, maxWidth: 300 }}>
          <Typography variant="subtitle2" gutterBottom>
            {label}
          </Typography>
          {payload.map((entry: any, index: number) => (
            <Box key={index} sx={{ display: 'flex', alignItems: 'center', mb: 0.5 }}>
              <Box
                sx={{
                  width: 12,
                  height: 12,
                  backgroundColor: entry.color,
                  mr: 1,
                  borderRadius: 1,
                }}
              />
              <Typography variant="body2">
                {entry.dataKey}: {entry.value}
                {entry.payload?.percentage && ` (${entry.payload.percentage}%)`}
              </Typography>
            </Box>
          ))}
        </Paper>
      );
    }
    return null;
  };

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
        <Alert severity="error" sx={{ mb: 2 }}>
          {error}
        </Alert>
        <Button onClick={fetchAnalyticsData} startIcon={<RefreshIcon />}>
          Retry
        </Button>
      </Box>
    );
  }

  return (
    <LocalizationProvider dateAdapter={AdapterDateFns}>
      <Box>
        {/* Header */}
        <Box sx={{
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
          justifyContent: 'center',
          textAlign: 'center',
          gap: 1.5,
          mb: 3,
        }}>
          <div>
            <Typography variant="h4" gutterBottom sx={{ textAlign: 'center' }}>
              Analytics Dashboard
            </Typography>
            <Typography variant="body1" color="text.secondary" sx={{ textAlign: 'center' }}>
              Comprehensive insights into your CRM performance
            </Typography>
          </div>
          <Box sx={{ display: 'flex', gap: 1, justifyContent: 'center', width: '100%', mt: 0, flexWrap: 'wrap' }}>
            <Tooltip title="Refresh Data">
              <IconButton onClick={fetchAnalyticsData}>
                <RefreshIcon />
              </IconButton>
            </Tooltip>
            <Tooltip title="Customize Dashboard">
              <IconButton onClick={() => setCustomizationOpen(true)}>
                <SettingsIcon />
              </IconButton>
            </Tooltip>
            <Button
              variant="outlined"
              startIcon={<DownloadIcon />}
              onClick={() => exportData('pdf')}
            >
              Export
            </Button>
          </Box>
        </Box>

        {/* Filters */}
        <Card sx={{ mb: 3 }}>
          <CardContent>
            <Typography variant="h6" gutterBottom>
              Filters & Settings
            </Typography>
            <Grid container spacing={3} alignItems="center">
              <Grid item xs={12} sm={6} md={3}>
                <DatePicker
                  label="Start Date"
                  value={filters.dateRange.start}
                  onChange={(newValue) => 
                    newValue && handleFilterChange('dateRange', { 
                      ...filters.dateRange, 
                      start: newValue 
                    })
                  }
                  slotProps={{
                    textField: { fullWidth: true, size: 'small' }
                  }}
                />
              </Grid>
              <Grid item xs={12} sm={6} md={3}>
                <DatePicker
                  label="End Date"
                  value={filters.dateRange.end}
                  onChange={(newValue) => 
                    newValue && handleFilterChange('dateRange', { 
                      ...filters.dateRange, 
                      end: newValue 
                    })
                  }
                  slotProps={{
                    textField: { fullWidth: true, size: 'small' }
                  }}
                />
              </Grid>
              <Grid item xs={12} sm={6} md={3}>
                <FormControl fullWidth size="small">
                  <InputLabel>Modules</InputLabel>
                  <Select
                    multiple
                    value={filters.modules}
                    onChange={(e) => handleFilterChange('modules', e.target.value)}
                    renderValue={(selected) => (
                      <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 0.5 }}>
                        {selected.map((value) => (
                          <Chip key={value} label={value} size="small" />
                        ))}
                      </Box>
                    )}
                  >
                    <MenuItem value="accounts">Accounts</MenuItem>
                    <MenuItem value="contacts">Contacts</MenuItem>
                    <MenuItem value="leads">Leads</MenuItem>
                    <MenuItem value="opportunities">Opportunities</MenuItem>
                  </Select>
                </FormControl>
              </Grid>
              <Grid item xs={12} sm={6} md={3}>
                <FormControl fullWidth size="small">
                  <InputLabel>Metrics</InputLabel>
                  <Select
                    multiple
                    value={filters.metrics}
                    onChange={(e) => handleFilterChange('metrics', e.target.value)}
                    renderValue={(selected) => (
                      <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 0.5 }}>
                        {selected.map((value) => (
                          <Chip key={value} label={value} size="small" />
                        ))}
                      </Box>
                    )}
                  >
                    <MenuItem value="count">Count</MenuItem>
                    <MenuItem value="value">Value</MenuItem>
                    <MenuItem value="conversion">Conversion</MenuItem>
                    <MenuItem value="revenue">Revenue</MenuItem>
                  </Select>
                </FormControl>
              </Grid>
            </Grid>
          </CardContent>
        </Card>

        {/* Tabs */}
        <Box sx={{ borderBottom: 1, borderColor: 'divider', mb: 3 }}>
          <Tabs value={tabValue} onChange={handleTabChange}>
            <Tab label="Overview" />
            <Tab label="Sales Funnel" />
            <Tab label="Performance" />
            <Tab label="Trends" />
            <Tab label="Custom Reports" />
          </Tabs>
        </Box>

        {/* Tab Panels */}
        <TabPanel value={tabValue} index={0}>
          {/* Overview Tab */}
          <Grid container spacing={3}>
            {/* Key Metrics Cards */}
            <Grid item xs={12}>
              <Grid container spacing={2}>
                {analyticsData?.summary?.map((metric, index) => (
                  <Grid item xs={12} sm={6} md={3} key={index}>
                    <Card>
                      <CardContent>
                        <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                          <div>
                            <Typography variant="h4" color="primary">
                              {metric.value}
                            </Typography>
                            <Typography variant="body2" color="text.secondary">
                              {metric.label}
                            </Typography>
                          </div>
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
                              {Math.abs(metric.trend)}%
                            </Typography>
                          </Box>
                        </Box>
                      </CardContent>
                    </Card>
                  </Grid>
                ))}
              </Grid>
            </Grid>

            {/* Quick Charts */}
            {visibleCharts.opportunityStages && analyticsData?.opportunityStages && (
              <Grid item xs={12} md={6}>
                <Card>
                  <CardContent>
                    <Typography variant="h6" gutterBottom>
                      Opportunity Stages
                    </Typography>
                    <Box sx={{ overflowX: 'auto', WebkitOverflowScrolling: 'touch' }}>
                      <Box sx={{ minWidth: isSmall ? 560 : 'auto' }}>
                        <ResponsiveContainer width="100%" height={300}>
                          <PieChart>
                        <Pie
                          data={analyticsData.opportunityStages}
                          cx="50%"
                          cy="50%"
                          outerRadius={100}
                          fill="#8884d8"
                          dataKey="value"
                          label={({ name, percentage }) => `${name} ${percentage}%`}
                        >
                          {analyticsData.opportunityStages.map((entry, index) => {
                            void entry; // keep TS happy for noUnusedParameters
                            return <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                          })}
                        </Pie>
                        <RechartsTooltip content={<CustomTooltip />} />
                          </PieChart>
                        </ResponsiveContainer>
                      </Box>
                    </Box>
                  </CardContent>
                </Card>
              </Grid>
            )}

            {visibleCharts.leadSources && analyticsData?.leadSources && (
              <Grid item xs={12} md={6}>
                <Card>
                  <CardContent>
                    <Typography variant="h6" gutterBottom>
                      Lead Sources
                    </Typography>
                    <Box sx={{ overflowX: 'auto', WebkitOverflowScrolling: 'touch' }}>
                      <Box sx={{ minWidth: isSmall ? 560 : 'auto' }}>
                        <ResponsiveContainer width="100%" height={300}>
                          <BarChart data={analyticsData.leadSources}>
                        <CartesianGrid strokeDasharray="3 3" />
                        <XAxis dataKey="name" />
                        <YAxis />
                        <RechartsTooltip content={<CustomTooltip />} />
                        <Bar dataKey="value" fill="#82ca9d" />
                          </BarChart>
                        </ResponsiveContainer>
                      </Box>
                    </Box>
                  </CardContent>
                </Card>
              </Grid>
            )}
          </Grid>
        </TabPanel>

        <TabPanel value={tabValue} index={1}>
          {/* Sales Funnel Tab */}
          <Grid container spacing={3}>
            {visibleCharts.salesFunnel && analyticsData?.salesFunnel && (
              <Grid item xs={12}>
                <Card>
                  <CardContent>
                    <Typography variant="h6" gutterBottom>
                      Sales Funnel Analysis
                    </Typography>
                    <Box sx={{ overflowX: 'auto', WebkitOverflowScrolling: 'touch' }}>
                      <Box sx={{ minWidth: isSmall ? 700 : 'auto' }}>
                        <ResponsiveContainer width="100%" height={400}>
                          <BarChart
                        data={analyticsData.salesFunnel}
                        layout="horizontal"
                        margin={{ top: 20, right: 30, left: 20, bottom: 5 }}
                      >
                        <CartesianGrid strokeDasharray="3 3" />
                        <XAxis type="number" />
                        <YAxis dataKey="stage" type="category" width={150} />
                        <RechartsTooltip content={<CustomTooltip />} />
                        <Bar dataKey="count" fill="#8884d8" />
                        <Bar dataKey="value" fill="#82ca9d" />
                          </BarChart>
                        </ResponsiveContainer>
                      </Box>
                    </Box>
                  </CardContent>
                </Card>
              </Grid>
            )}

            {visibleCharts.conversionRates && analyticsData?.conversionRates && (
              <Grid item xs={12}>
                <Card>
                  <CardContent>
                    <Typography variant="h6" gutterBottom>
                      Conversion Rates by Stage
                    </Typography>
                    <Box sx={{ overflowX: 'auto', WebkitOverflowScrolling: 'touch' }}>
                      <Box sx={{ minWidth: isSmall ? 560 : 'auto' }}>
                        <ResponsiveContainer width="100%" height={300}>
                          <LineChart data={analyticsData.conversionRates}>
                        <CartesianGrid strokeDasharray="3 3" />
                        <XAxis dataKey="stage" />
                        <YAxis />
                        <RechartsTooltip content={<CustomTooltip />} />
                        <Line 
                          type="monotone" 
                          dataKey="rate" 
                          stroke="#8884d8" 
                          strokeWidth={3}
                          dot={{ fill: '#8884d8', strokeWidth: 2, r: 6 }}
                        />
                          </LineChart>
                        </ResponsiveContainer>
                      </Box>
                    </Box>
                  </CardContent>
                </Card>
              </Grid>
            )}
          </Grid>
        </TabPanel>

        <TabPanel value={tabValue} index={2}>
          {/* Performance Tab */}
          <Grid container spacing={3}>
            {visibleCharts.performanceMetrics && analyticsData?.performanceMetrics && (
              <Grid item xs={12}>
                <Card>
                  <CardContent>
                    <Typography variant="h6" gutterBottom>
                      Performance Metrics
                    </Typography>
                    <Box sx={{ overflowX: 'auto', WebkitOverflowScrolling: 'touch' }}>
                      <Box sx={{ minWidth: isSmall ? 620 : 'auto' }}>
                        <ResponsiveContainer width="100%" height={400}>
                          <BarChart data={analyticsData.performanceMetrics}>
                        <CartesianGrid strokeDasharray="3 3" />
                        <XAxis dataKey="metric" />
                        <YAxis />
                        <RechartsTooltip content={<CustomTooltip />} />
                        <Bar dataKey="current" fill="#8884d8" name="Current Period" />
                        <Bar dataKey="previous" fill="#82ca9d" name="Previous Period" />
                        <Legend />
                          </BarChart>
                        </ResponsiveContainer>
                      </Box>
                    </Box>
                  </CardContent>
                </Card>
              </Grid>
            )}
          </Grid>
        </TabPanel>

        <TabPanel value={tabValue} index={3}>
          {/* Trends Tab */}
          <Grid container spacing={3}>
            {visibleCharts.monthlyTrends && analyticsData?.monthlyTrends && (
              <Grid item xs={12}>
                <Card>
                  <CardContent>
                    <Typography variant="h6" gutterBottom>
                      Monthly Trends
                    </Typography>
                    <Box sx={{ overflowX: 'auto', WebkitOverflowScrolling: 'touch' }}>
                      <Box sx={{ minWidth: isSmall ? 700 : 'auto' }}>
                        <ResponsiveContainer width="100%" height={400}>
                          <AreaChart data={analyticsData.monthlyTrends}>
                        <CartesianGrid strokeDasharray="3 3" />
                        <XAxis dataKey="month" />
                        <YAxis />
                        <RechartsTooltip content={<CustomTooltip />} />
                        <Area 
                          type="monotone" 
                          dataKey="accounts" 
                          stackId="1" 
                          stroke="#8884d8" 
                          fill="#8884d8" 
                          fillOpacity={0.6}
                        />
                        <Area 
                          type="monotone" 
                          dataKey="contacts" 
                          stackId="1" 
                          stroke="#82ca9d" 
                          fill="#82ca9d" 
                          fillOpacity={0.6}
                        />
                        <Area 
                          type="monotone" 
                          dataKey="leads" 
                          stackId="1" 
                          stroke="#ffc658" 
                          fill="#ffc658" 
                          fillOpacity={0.6}
                        />
                        <Area 
                          type="monotone" 
                          dataKey="opportunities" 
                          stackId="1" 
                          stroke="#ff7c7c" 
                          fill="#ff7c7c" 
                          fillOpacity={0.6}
                        />
                        <Legend />
                          </AreaChart>
                        </ResponsiveContainer>
                      </Box>
                    </Box>
                  </CardContent>
                </Card>
              </Grid>
            )}
          </Grid>
        </TabPanel>

        <TabPanel value={tabValue} index={4}>
          {/* Custom Reports Tab */}
          <Grid container spacing={3}>
            <Grid item xs={12}>
              <Card>
                <CardContent>
                  <Typography variant="h6" gutterBottom>
                    Custom Reports
                  </Typography>
                  <Typography variant="body2" color="text.secondary" paragraph>
                    Create custom analytics reports with your specific data fields and metrics.
                  </Typography>
                  <Button variant="outlined" startIcon={<SettingsIcon />}>
                    Create Custom Report
                  </Button>
                </CardContent>
              </Card>
            </Grid>
          </Grid>
        </TabPanel>

        {/* Customization Dialog */}
        <Dialog open={customizationOpen} onClose={() => setCustomizationOpen(false)} maxWidth="md" fullWidth>
          <DialogTitle>Customize Dashboard</DialogTitle>
          <DialogContent>
            <Typography variant="h6" gutterBottom sx={{ mt: 2 }}>
              Visible Charts
            </Typography>
            <FormGroup>
              {Object.entries(visibleCharts).map(([key, value]) => (
                <FormControlLabel
                  key={key}
                  control={
                    <Checkbox
                      checked={value}
                      onChange={(e) => handleChartVisibilityChange(key, e.target.checked)}
                    />
                  }
                  label={key.replace(/([A-Z])/g, ' $1').replace(/^./, str => str.toUpperCase())}
                />
              ))}
            </FormGroup>
          </DialogContent>
          <DialogActions>
            <Button onClick={() => setCustomizationOpen(false)}>Cancel</Button>
            <Button onClick={() => setCustomizationOpen(false)} variant="contained">
              Save Changes
            </Button>
          </DialogActions>
        </Dialog>
      </Box>
    </LocalizationProvider>
  );
};

export default AnalyticsDashboard;