import React, { useState } from 'react';
import {
  TextField,
  Button,
  Typography,
  Box,
  Alert,
  CircularProgress,
  MenuItem,
  Select,
  FormControl,
  IconButton,
  SelectChangeEvent,
} from '@mui/material';
import { useFormik } from 'formik';
import * as yup from 'yup';
import { useNavigate, Link } from 'react-router-dom';
import VisibilityIcon from '@mui/icons-material/Visibility';
import VisibilityOffIcon from '@mui/icons-material/VisibilityOff';
import ChevronLeftIcon from '@mui/icons-material/ChevronLeft';
import ChevronRightIcon from '@mui/icons-material/ChevronRight';

// Validation schema
const validationSchema = yup.object({
  username: yup.string().required('Username is required'),
  firstName: yup.string().required('First name is required'),
  lastName: yup.string().required('Last name is required'),
  email: yup.string().email('Enter a valid email').required('Email is required'),
  companyName: yup.string().required('Company name is required'),
  phoneNumber: yup.string().required('Phone number is required'),
  industry: yup.string().required('Industry is required'),
  country: yup.string().required('Country is required'),
  password: yup.string().min(6, 'Password must be at least 6 characters').required('Password is required'),
  confirmPassword: yup.string()
    .oneOf([yup.ref('password')], 'Passwords must match')
    .required('Confirm password is required'),
});

// Industry options
const industries = [
  'Education',
  'Technology',
  'Healthcare',
  'Finance',
  'Real Estate',
  'Manufacturing',
  'Retail',
  'Consulting',
  'Other',
];

// Country options
const countries = [
  'India',
  'United States',
  'United Kingdom',
  'Canada',
  'Australia',
  'Singapore',
  'UAE',
  'Other',
];

// Country codes for phone
const countryCodes = [
  { code: '+91', country: 'IN' },
  { code: '+1', country: 'US' },
  { code: '+44', country: 'UK' },
  { code: '+61', country: 'AU' },
  { code: '+65', country: 'SG' },
  { code: '+971', country: 'AE' },
];

const DemoRequestPage: React.FC = () => {
  const navigate = useNavigate();
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState(false);
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const [countryCode, setCountryCode] = useState('+91');
  const [selectedDate, setSelectedDate] = useState<Date | null>(null);
  const [calendarMonth, setCalendarMonth] = useState(new Date().getMonth());
  const [calendarYear, setCalendarYear] = useState(new Date().getFullYear());

  const formik = useFormik({
    initialValues: {
      username: '',
      firstName: '',
      lastName: '',
      email: '',
      companyName: '',
      phoneNumber: '',
      industry: '',
      country: '',
      password: '',
      confirmPassword: '',
    },
    validationSchema: validationSchema,
    onSubmit: async (values) => {
      // Validate date selection
      if (!selectedDate) {
        setError('Please select a demo date');
        return;
      }

      setIsLoading(true);
      setError(null);

      try {
        // Format data for Google Sheets
        const formData = {
          timestamp: new Date().toISOString(),
          username: values.username,
          firstName: values.firstName,
          lastName: values.lastName,
          email: values.email,
          companyName: values.companyName,
          phoneNumber: `${countryCode}${values.phoneNumber}`,
          industry: values.industry,
          country: values.country,
          demoDate: selectedDate.toISOString().split('T')[0],
        };

        const GOOGLE_SHEETS_URL = 'https://script.google.com/macros/s/AKfycbzDaGmwUmuTzTp_-NkjsasGdn08PV118ehQ1dukwv42fBtXjdm9IBzr-H4yhvU0NiOSsA/exec';
        
        await fetch(GOOGLE_SHEETS_URL, {
          method: 'POST',
          mode: 'no-cors',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify(formData),
        });

        setSuccess(true);
        setTimeout(() => {
          navigate('/login');
        }, 6000);
      } catch (err: any) {
        setError('Failed to submit. Please try again.');
        console.error('Submission error:', err);
      } finally {
        setIsLoading(false);
      }
    },
  });

  // Calendar helpers
  const getDaysInMonth = (month: number, year: number) => {
    return new Date(year, month + 1, 0).getDate();
  };

  const getFirstDayOfMonth = (month: number, year: number) => {
    return new Date(year, month, 1).getDay();
  };

  const monthNames = [
    'Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun',
    'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'
  ];

  const today = new Date();
  const isToday = (day: number) => {
    return day === today.getDate() && 
           calendarMonth === today.getMonth() && 
           calendarYear === today.getFullYear();
  };

  const isSelected = (day: number) => {
    return selectedDate && 
           day === selectedDate.getDate() && 
           calendarMonth === selectedDate.getMonth() && 
           calendarYear === selectedDate.getFullYear();
  };

  const isPastDate = (day: number) => {
    const checkDate = new Date(calendarYear, calendarMonth, day);
    const todayStart = new Date(today.getFullYear(), today.getMonth(), today.getDate());
    return checkDate < todayStart;
  };

  const handleDateClick = (day: number) => {
    if (!isPastDate(day)) {
      setSelectedDate(new Date(calendarYear, calendarMonth, day));
    }
  };

  const handlePrevMonth = () => {
    if (calendarMonth === 0) {
      setCalendarMonth(11);
      setCalendarYear(calendarYear - 1);
    } else {
      setCalendarMonth(calendarMonth - 1);
    }
  };

  const handleNextMonth = () => {
    if (calendarMonth === 11) {
      setCalendarMonth(0);
      setCalendarYear(calendarYear + 1);
    } else {
      setCalendarMonth(calendarMonth + 1);
    }
  };

  const renderCalendar = () => {
    const daysInMonth = getDaysInMonth(calendarMonth, calendarYear);
    const firstDay = getFirstDayOfMonth(calendarMonth, calendarYear);
    const days = [];
    const weekDays = ['Su', 'Mo', 'Tu', 'We', 'Th', 'Fr', 'Sa'];

    // Previous month days
    const prevMonthDays = getDaysInMonth(
      calendarMonth === 0 ? 11 : calendarMonth - 1,
      calendarMonth === 0 ? calendarYear - 1 : calendarYear
    );

    for (let i = firstDay - 1; i >= 0; i--) {
      days.push(
        <Box
          key={`prev-${i}`}
          sx={{
            width: 32,
            height: 32,
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            color: '#d1d5db',
            fontSize: '0.875rem',
          }}
        >
          {prevMonthDays - i}
        </Box>
      );
    }

    // Current month days
    for (let day = 1; day <= daysInMonth; day++) {
      const past = isPastDate(day);
      const todayStyle = isToday(day);
      const selected = isSelected(day);

      days.push(
        <Box
          key={day}
          onClick={() => !past && handleDateClick(day)}
          sx={{
            width: 32,
            height: 32,
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            borderRadius: '50%',
            cursor: past ? 'not-allowed' : 'pointer',
            fontSize: '0.875rem',
            fontWeight: selected ? 600 : 400,
            color: past ? '#d1d5db' : selected ? '#fff' : '#374151',
            backgroundColor: selected 
              ? '#1a1a1a' 
              : todayStyle 
                ? 'rgba(59, 130, 246, 0.15)' 
                : 'transparent',
            border: selected ? 'none' : todayStyle ? '1px solid #3b82f6' : 'none',
            transition: 'all 0.2s ease',
            '&:hover': {
              backgroundColor: past 
                ? 'transparent' 
                : selected 
                  ? '#1a1a1a' 
                  : 'rgba(0,0,0,0.05)',
            },
          }}
        >
          {day}
        </Box>
      );
    }

    // Next month days
    const remainingDays = 42 - days.length;
    for (let i = 1; i <= remainingDays; i++) {
      days.push(
        <Box
          key={`next-${i}`}
          sx={{
            width: 32,
            height: 32,
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            color: '#d1d5db',
            fontSize: '0.875rem',
          }}
        >
          {i}
        </Box>
      );
    }

    return (
      <Box>
        {/* Week days header */}
        <Box sx={{ display: 'grid', gridTemplateColumns: 'repeat(7, 1fr)', gap: 0.5, mb: 1 }}>
          {weekDays.map((day) => (
            <Box
              key={day}
              sx={{
                width: 32,
                height: 24,
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                fontSize: '0.75rem',
                color: '#9ca3af',
                fontWeight: 500,
              }}
            >
              {day}
            </Box>
          ))}
        </Box>
        {/* Days grid */}
        <Box sx={{ display: 'grid', gridTemplateColumns: 'repeat(7, 1fr)', gap: 0.5 }}>
          {days}
        </Box>
      </Box>
    );
  };

  // Common input styles
  const inputStyles = {
    '& .MuiOutlinedInput-root': {
      borderRadius: '6px',
      backgroundColor: '#fff',
      '& fieldset': {
        borderColor: '#e5e7eb',
      },
      '&:hover fieldset': {
        borderColor: '#d1d5db',
      },
      '&.Mui-focused fieldset': {
        borderColor: '#1a1a1a',
        borderWidth: 1,
      },
    },
    '& .MuiInputBase-input': {
      py: 1.3,
      fontSize: { xs: '0.8rem', md: '0.875rem' },
    },
    '& .MuiFormHelperText-root': {
      fontSize: '0.65rem',
      mt: 0.25,
    },
  };

  if (success) {
    return (
      <Box
        sx={{
          minHeight: '100vh',
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
          justifyContent: 'center',
          backgroundColor: '#f9fafb',
          px: 3,
        }}
      >
        <Box sx={{ textAlign: 'center', maxWidth: 400 }}>
          <Typography sx={{ fontSize: '2rem', fontWeight: 600, color: '#1a1a1a', mb: 2 }}>
            Thank You!
          </Typography>
          <Typography sx={{ color: '#6b7280', mb: 3 }}>
            Your request has been submitted successfully. Our team will contact you shortly.
          </Typography>
          <Typography sx={{ color: '#9ca3af', fontSize: '0.875rem' }}>
            Redirecting to login...
          </Typography>
        </Box>
      </Box>
    );
  }

  return (
    <Box
      sx={{
        height: '100vh',
        backgroundColor: '#f9fafb',
        py: { xs: 2, md: 2 },
        px: { xs: 2, md: 3 },
        display: 'flex',
        flexDirection: 'column',
        overflow: 'hidden',
      }}
    >
      {/* Header */}
      <Box sx={{ textAlign: 'center', mb: { xs: 1.5, md: 2 }, flexShrink: 0 }}>
        <Typography
                    sx={{
                      fontSize: '2rem',
                      fontWeight: 600,
                      color: '#1a1a1a',
                      mb: 1,
                      textAlign: 'center',
                      fontFamily: '"Inter", "Segoe UI", sans-serif',
                    }}
                  >
          Try It Free. Get a Live Demo.
        </Typography>
        <Typography
          sx={{
            color: '#6b7280',
            fontSize: { xs: '0.75rem', md: '0.875rem' },
            maxWidth: 700,
            mx: 'auto',
            lineHeight: 1.4,
            display: { xs: 'none', sm: 'block' },
          }}
        >
          Start with a free trial and discover the power of real-time sync, automation, and smart tools. Our experts will take you through a detailed product walkthrough.
        </Typography>
      </Box>

      {/* Main Content */}
      <Box
        sx={{
          display: 'flex',
          flexDirection: { xs: 'column', lg: 'row' },
          gap: { xs: 2, md: 3 },
          maxWidth: 1200,
          mx: 'auto',
          flex: 1,
          minHeight: 0,
          width: '100%',
        }}
      >
        {/* Left - Form */}
        <Box
          sx={{
            flex: 1,
            backgroundColor: '#fff',
            borderRadius: '12px',
            border: '1px solid #e5e7eb',
            p: { xs: 2, md: 3 },
            display: 'flex',
            flexDirection: 'column',
            overflow: 'auto',
          }}
        >
          <Typography
                      sx={{
                        fontSize: '2rem',
                        fontWeight: 600,
                        color: '#1a1a1a',
                        mb: 3,
                        fontFamily: '"Inter", "Segoe UI", sans-serif',
                      }}
                    >
            Sign Up
          </Typography>

          {error && (
            <Alert severity="error" sx={{ mb: 3, borderRadius: 2 }}>
              {error}
            </Alert>
          )}

          <Box component="form" onSubmit={formik.handleSubmit} sx={{ flex: 1, display: 'flex', flexDirection: 'column' }}>
            {/* Row 1: Username, First Name, Last Name */}
            <Box sx={{ display: 'grid', gridTemplateColumns: { xs: '1fr 1fr', sm: '1fr 1fr', md: 'repeat(3, 1fr)' }, gap: { xs: 1, md: 1.5 }, mb: { xs: 1, md: 1.5 } }}>
              <Box>
                <Typography sx={{ fontSize: '0.8rem', fontWeight: 500, color: '#374151', mb: 0.75 }}>
                  User Name
                </Typography>
                <TextField
                  fullWidth
                  size="small"
                  id="username"
                  name="username"
                  value={formik.values.username}
                  onChange={formik.handleChange}
                  onBlur={formik.handleBlur}
                  error={formik.touched.username && Boolean(formik.errors.username)}
                  helperText={formik.touched.username && formik.errors.username}
                  sx={inputStyles}
                />
              </Box>
              <Box>
                <Typography sx={{ fontSize: '0.8rem', fontWeight: 500, color: '#374151', mb: 0.75 }}>
                  First Name
                </Typography>
                <TextField
                  fullWidth
                  size="small"
                  id="firstName"
                  name="firstName"
                  value={formik.values.firstName}
                  onChange={formik.handleChange}
                  onBlur={formik.handleBlur}
                  error={formik.touched.firstName && Boolean(formik.errors.firstName)}
                  helperText={formik.touched.firstName && formik.errors.firstName}
                  sx={inputStyles}
                />
              </Box>
              <Box>
                <Typography sx={{ fontSize: '0.8rem', fontWeight: 500, color: '#374151', mb: 0.75 }}>
                  Last Name
                </Typography>
                <TextField
                  fullWidth
                  size="small"
                  id="lastName"
                  name="lastName"
                  value={formik.values.lastName}
                  onChange={formik.handleChange}
                  onBlur={formik.handleBlur}
                  error={formik.touched.lastName && Boolean(formik.errors.lastName)}
                  helperText={formik.touched.lastName && formik.errors.lastName}
                  sx={inputStyles}
                />
              </Box>
            </Box>

            {/* Row 2: Email */}
            <Box sx={{ mb: { xs: 1, md: 1.5 } }}>
              <Typography sx={{ fontSize: '0.8rem', fontWeight: 500, color: '#374151', mb: 0.75 }}>
                Email
              </Typography>
              <TextField
                fullWidth
                size="small"
                id="email"
                name="email"
                value={formik.values.email}
                onChange={formik.handleChange}
                onBlur={formik.handleBlur}
                error={formik.touched.email && Boolean(formik.errors.email)}
                helperText={formik.touched.email && formik.errors.email}
                sx={inputStyles}
              />
            </Box>

            {/* Row 3: Company Name, Phone Number */}
            <Box sx={{ display: 'grid', gridTemplateColumns: { xs: '1fr', sm: '1fr 1fr' }, gap: { xs: 1, md: 1.5 }, mb: { xs: 1, md: 1.5 } }}>
              <Box>
                <Typography sx={{ fontSize: '0.8rem', fontWeight: 500, color: '#374151', mb: 0.75 }}>
                  Company Name
                </Typography>
                <TextField
                  fullWidth
                  size="small"
                  id="companyName"
                  name="companyName"
                  value={formik.values.companyName}
                  onChange={formik.handleChange}
                  onBlur={formik.handleBlur}
                  error={formik.touched.companyName && Boolean(formik.errors.companyName)}
                  helperText={formik.touched.companyName && formik.errors.companyName}
                  sx={inputStyles}
                />
              </Box>
              <Box>
                <Typography sx={{ fontSize: '0.8rem', fontWeight: 500, color: '#374151', mb: 0.75 }}>
                  Phone Number
                </Typography>
                <Box sx={{ display: 'flex', gap: 1 }}>
                  <FormControl size="small" sx={{ minWidth: 80 }}>
                    <Select
                      value={countryCode}
                      onChange={(e: SelectChangeEvent) => setCountryCode(e.target.value)}
                      sx={{
                        borderRadius: '8px',
                        backgroundColor: '#fff',
                        '& .MuiOutlinedInput-notchedOutline': {
                          borderColor: '#e5e7eb',
                        },
                        '&:hover .MuiOutlinedInput-notchedOutline': {
                          borderColor: '#d1d5db',
                        },
                        '&.Mui-focused .MuiOutlinedInput-notchedOutline': {
                          borderColor: '#1a1a1a',
                          borderWidth: 1,
                        },
                      }}
                    >
                      {countryCodes.map((cc) => (
                        <MenuItem key={cc.code} value={cc.code}>
                          {cc.code}
                        </MenuItem>
                      ))}
                    </Select>
                  </FormControl>
                  <TextField
                    fullWidth
                    size="small"
                    id="phoneNumber"
                    name="phoneNumber"
                    value={formik.values.phoneNumber}
                    onChange={formik.handleChange}
                    onBlur={formik.handleBlur}
                    error={formik.touched.phoneNumber && Boolean(formik.errors.phoneNumber)}
                    helperText={formik.touched.phoneNumber && formik.errors.phoneNumber}
                    sx={inputStyles}
                  />
                </Box>
              </Box>
            </Box>

            {/* Row 4: Industry, Country */}
            <Box sx={{ display: 'grid', gridTemplateColumns: { xs: '1fr 1fr', sm: '1fr 1fr' }, gap: { xs: 1, md: 1.5 }, mb: { xs: 1, md: 1.5 } }}>
              <Box>
                <Typography sx={{ fontSize: '0.8rem', fontWeight: 500, color: '#374151', mb: 0.75 }}>
                  Industry
                </Typography>
                <FormControl fullWidth size="small">
                  <Select
                    id="industry"
                    name="industry"
                    value={formik.values.industry}
                    onChange={formik.handleChange}
                    onBlur={formik.handleBlur}
                    error={formik.touched.industry && Boolean(formik.errors.industry)}
                    displayEmpty
                    sx={{
                      borderRadius: '8px',
                      backgroundColor: '#fff',
                      '& .MuiOutlinedInput-notchedOutline': {
                        borderColor: '#e5e7eb',
                      },
                      '&:hover .MuiOutlinedInput-notchedOutline': {
                        borderColor: '#d1d5db',
                      },
                      '&.Mui-focused .MuiOutlinedInput-notchedOutline': {
                        borderColor: '#1a1a1a',
                        borderWidth: 1,
                      },
                    }}
                  >
                    <MenuItem value="" disabled>
                      <em>Select industry</em>
                    </MenuItem>
                    {industries.map((ind) => (
                      <MenuItem key={ind} value={ind}>
                        {ind}
                      </MenuItem>
                    ))}
                  </Select>
                </FormControl>
              </Box>
              <Box>
                <Typography sx={{ fontSize: '0.8rem', fontWeight: 500, color: '#374151', mb: 0.75 }}>
                  Country
                </Typography>
                <FormControl fullWidth size="small">
                  <Select
                    id="country"
                    name="country"
                    value={formik.values.country}
                    onChange={formik.handleChange}
                    onBlur={formik.handleBlur}
                    error={formik.touched.country && Boolean(formik.errors.country)}
                    displayEmpty
                    sx={{
                      borderRadius: '8px',
                      backgroundColor: '#fff',
                      '& .MuiOutlinedInput-notchedOutline': {
                        borderColor: '#e5e7eb',
                      },
                      '&:hover .MuiOutlinedInput-notchedOutline': {
                        borderColor: '#d1d5db',
                      },
                      '&.Mui-focused .MuiOutlinedInput-notchedOutline': {
                        borderColor: '#1a1a1a',
                        borderWidth: 1,
                      },
                    }}
                  >
                    <MenuItem value="" disabled>
                      <em>Select country</em>
                    </MenuItem>
                    {countries.map((c) => (
                      <MenuItem key={c} value={c}>
                        {c}
                      </MenuItem>
                    ))}
                  </Select>
                </FormControl>
              </Box>
            </Box>

            {/* Row 5: Password, Confirm Password */}
            <Box sx={{ display: 'grid', gridTemplateColumns: { xs: '1fr 1fr', sm: '1fr 1fr' }, gap: { xs: 1, md: 1.5 }, mb: { xs: 1.5, md: 2 } }}>
              <Box>
                <Typography sx={{ fontSize: '0.8rem', fontWeight: 500, color: '#374151', mb: 0.75 }}>
                  Password
                </Typography>
                <TextField
                  fullWidth
                  size="small"
                  id="password"
                  name="password"
                  type={showPassword ? 'text' : 'password'}
                  value={formik.values.password}
                  onChange={formik.handleChange}
                  onBlur={formik.handleBlur}
                  error={formik.touched.password && Boolean(formik.errors.password)}
                  helperText={formik.touched.password && formik.errors.password}
                  InputProps={{
                    endAdornment: (
                      <IconButton
                        onClick={() => setShowPassword(!showPassword)}
                        edge="end"
                        size="small"
                        sx={{ color: '#9ca3af' }}
                      >
                        {showPassword ? <VisibilityOffIcon fontSize="small" /> : <VisibilityIcon fontSize="small" />}
                      </IconButton>
                    ),
                  }}
                  sx={inputStyles}
                />
              </Box>
              <Box>
                <Typography sx={{ fontSize: '0.8rem', fontWeight: 500, color: '#374151', mb: 0.75 }}>
                  Confirm Password
                </Typography>
                <TextField
                  fullWidth
                  size="small"
                  id="confirmPassword"
                  name="confirmPassword"
                  type={showConfirmPassword ? 'text' : 'password'}
                  value={formik.values.confirmPassword}
                  onChange={formik.handleChange}
                  onBlur={formik.handleBlur}
                  error={formik.touched.confirmPassword && Boolean(formik.errors.confirmPassword)}
                  helperText={formik.touched.confirmPassword && formik.errors.confirmPassword}
                  InputProps={{
                    endAdornment: (
                      <IconButton
                        onClick={() => setShowConfirmPassword(!showConfirmPassword)}
                        edge="end"
                        size="small"
                        sx={{ color: '#9ca3af' }}
                      >
                        {showConfirmPassword ? <VisibilityOffIcon fontSize="small" /> : <VisibilityIcon fontSize="small" />}
                      </IconButton>
                    ),
                  }}
                  sx={inputStyles}
                />
              </Box>
            </Box>

            {/* Submit Button */}
            <Button
              type="submit"
              variant="contained"
              disabled={isLoading}
              sx={{
                py: { xs: 1, md: 1.25 },
                px: 4,
                borderRadius: '20px',
                backgroundColor: '#1a1a1a',
                fontSize: { xs: '0.8rem', md: '0.875rem' },
                fontWeight: 500,
                textTransform: 'none',
                boxShadow: 'none',
                display: 'block',
                mx: 'auto',
                minWidth: { xs: 150, md: 180 },
                mt: 'auto',
                '&:hover': {
                  backgroundColor: '#333',
                  boxShadow: 'none',
                },
                '&:disabled': {
                  backgroundColor: '#6b7280',
                  color: '#fff',
                },
              }}
            >
              {isLoading ? (
                <>
                  <CircularProgress size={18} sx={{ mr: 1, color: 'white' }} />
                  Submitting...
                </>
              ) : (
                'Sign Up'
              )}
            </Button>

            {/* Terms */}
            <Typography sx={{ textAlign: 'center', mt: { xs: 1, md: 1.5 }, color: '#6b7280', fontSize: { xs: '0.65rem', md: '0.7rem' } }}>
              By clicking "Sign Up" I agree to EdForce{' '}
              <Link to="/terms" style={{ color: '#3b82f6', textDecoration: 'none' }}>
                Terms of Service
              </Link>{' '}
              &{' '}
              <Link to="/privacy" style={{ color: '#3b82f6', textDecoration: 'none' }}>
                Privacy Policy
              </Link>
            </Typography>
          </Box>
        </Box>

        {/* Right - Calendar */}
        <Box
          sx={{
            width: { xs: '100%', lg: 280 },
            flexShrink: 0,
            backgroundColor: '#fff',
            borderRadius: '12px',
            border: '1px solid #e5e7eb',
            p: { xs: 2, md: 2.5 },
            alignSelf: { xs: 'stretch', lg: 'flex-start' },
            display: { xs: 'none', md: 'block' },
          }}
        >
          <Typography
            sx={{
              fontSize: { xs: '0.9rem', md: '1rem' },
              fontWeight: 600,
              color: '#1a1a1a',
              mb: 2,
              textAlign: 'center',
            }}
          >
            Select Date For Demo
          </Typography>

          {/* Calendar Header */}
          <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 1, mb: 2 }}>
            <IconButton size="small" onClick={handlePrevMonth}>
              <ChevronLeftIcon />
            </IconButton>
            <FormControl size="small" sx={{ minWidth: 70 }}>
              <Select
                value={calendarMonth}
                onChange={(e) => setCalendarMonth(Number(e.target.value))}
                sx={{
                  fontSize: '0.875rem',
                  '& .MuiOutlinedInput-notchedOutline': { border: 'none' },
                }}
              >
                {monthNames.map((month, index) => (
                  <MenuItem key={month} value={index}>
                    {month}
                  </MenuItem>
                ))}
              </Select>
            </FormControl>
            <FormControl size="small" sx={{ minWidth: 80 }}>
              <Select
                value={calendarYear}
                onChange={(e) => setCalendarYear(Number(e.target.value))}
                sx={{
                  fontSize: '0.875rem',
                  '& .MuiOutlinedInput-notchedOutline': { border: 'none' },
                }}
              >
                {Array.from({ length: 5 }, (_, i) => today.getFullYear() + i).map((year) => (
                  <MenuItem key={year} value={year}>
                    {year}
                  </MenuItem>
                ))}
              </Select>
            </FormControl>
            <IconButton size="small" onClick={handleNextMonth}>
              <ChevronRightIcon />
            </IconButton>
          </Box>

          {/* Calendar Grid */}
          {renderCalendar()}

          {/* Selected Date Display */}
          {selectedDate && (
            <Box sx={{ mt: 2, textAlign: 'center' }}>
              <Typography sx={{ fontSize: '0.875rem', color: '#6b7280' }}>
                Selected: {selectedDate.toLocaleDateString('en-US', { 
                  weekday: 'short', 
                  month: 'short', 
                  day: 'numeric', 
                  year: 'numeric' 
                })}
              </Typography>
            </Box>
          )}
        </Box>
      </Box>

      {/* Back to Login - Mobile Only */}
      <Box sx={{ textAlign: 'center', mt: 1, flexShrink: 0, display: { xs: 'block', md: 'none' } }}>
        <Typography sx={{ color: '#6b7280', fontSize: '0.75rem' }}>
          Already have an account?{' '}
          <Link to="/login" style={{ color: '#3b82f6', textDecoration: 'none', fontWeight: 500 }}>
            Sign in
          </Link>
        </Typography>
      </Box>
    </Box>
  );
};

export default DemoRequestPage;
