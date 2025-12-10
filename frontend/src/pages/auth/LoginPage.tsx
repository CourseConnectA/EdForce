import React, { useState, useEffect } from 'react';
import {
  TextField,
  Button,
  Typography,
  Box,
  Alert,
  CircularProgress,
  InputAdornment,
  IconButton,
} from '@mui/material';
import { useFormik } from 'formik';
import * as yup from 'yup';
import { useDispatch, useSelector } from 'react-redux';
import { useNavigate, Link } from 'react-router-dom';
import { RootState, AppDispatch } from '../../store/store';
import { loginUser, clearError } from '../../store/slices/authSlice';
import PersonOutlineIcon from '@mui/icons-material/PersonOutline';
import LockOutlinedIcon from '@mui/icons-material/LockOutlined';
import VisibilityIcon from '@mui/icons-material/Visibility';
import VisibilityOffIcon from '@mui/icons-material/VisibilityOff';

const validationSchema = yup.object({
  username: yup
    .string()
    .required('Username is required'),
  password: yup
    .string()
    .min(6, 'Password should be of minimum 6 characters length')
    .required('Password is required'),
});

// Carousel slides data - replace placeholder images with your actual images
const slides = [
  {
    id: 1,
    headline: 'The simplest way to manage your workforce',
    subtext: 'Enter your credentials to access your account',
    // Replace with your actual image path
    image: '/assets/login/slide1.png',
  },
  {
    id: 2,
    headline: 'Instant sync. Infinite productivity.',
    subtext: 'no delays, no boundaries.',
    // Replace with your actual image path
    image: '/assets/login/slide2.png',
  },
  {
    id: 3,
    headline: 'Your workflow is unique. Now your crm can be too',
    subtext: 'Dynamic lead customization that adapts to your business.',
    // Replace with your actual image path
    image: '/assets/login/slide3.png',
  },
];

const LoginPage: React.FC = () => {
  const dispatch = useDispatch<AppDispatch>();
  const navigate = useNavigate();
  const { isLoading, error, isAuthenticated } = useSelector((state: RootState) => state.auth);
  const [activeSlide, setActiveSlide] = useState(0);
  const [showPassword, setShowPassword] = useState(false);
  
  // Auto-rotate carousel every 3 seconds
  useEffect(() => {
    const interval = setInterval(() => {
      setActiveSlide((prev) => (prev + 1) % slides.length);
    }, 6000);
    return () => clearInterval(interval);
  }, []);

  // Clear error when component mounts
  useEffect(() => {
    dispatch(clearError());
  }, [dispatch]);

  // Redirect if already authenticated
  useEffect(() => {
    if (isAuthenticated) {
      navigate('/dashboard');
    }
  }, [isAuthenticated, navigate]);
  
  const formik = useFormik({
    initialValues: {
      username: '',
      password: '',
    },
    validationSchema: validationSchema,
    onSubmit: async (values) => {
      try {
        console.log('Login attempt with:', values.username);
        await dispatch(loginUser(values)).unwrap();
        navigate('/dashboard');
      } catch (error: any) {
        console.error('Login error:', error);
      }
    },
  });

  return (
    <Box
      sx={{
        display: 'flex',
        minHeight: '100vh',
        width: '100%',
        overflow: 'hidden',
      }}
    >
      {/* Left Side - Dark Background with Carousel */}
      <Box
        sx={{
          flex: 1,
          position: 'relative',
          display: { xs: 'none', md: 'flex' },
          flexDirection: 'column',
          backgroundImage: 'url(/assets/login/background.png)',
          backgroundSize: 'cover',
          backgroundPosition: 'center',
          overflow: 'hidden',
        }}
      >

        {/* Logo - Fixed at top left */}
        <Box
          sx={{
            position: 'absolute',
            top: 32,
            left: 40,
            zIndex: 10,
          }}
        >
           <Box
            sx={{
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              position: 'relative',
            }}
          >
           <img src="/assets/login/logo.png" alt="EdForce" style={{ height: 72 }} />
          </Box>
        </Box>

        {/* Content Area */}
        <Box
          sx={{
            display: 'flex',
            flexDirection: 'column',
            px: 10,
            pt: 16,
            position: 'relative',
            zIndex: 5,
            width: '80%',
          }}
        >
          {/* Headline and Subtext - Changes with carousel */}
          <Box sx={{ mb: 4 }}>
            <Typography
              sx={{
                color: '#fff',
                fontSize: '2.5rem',
                fontWeight: 400,
                lineHeight: 1.2,
                letterSpacing: '-0.02em',
                fontFamily: '"Inter", "Segoe UI", sans-serif',
              }}
            >
              {slides[activeSlide].headline}
            </Typography>
            <Typography
              sx={{
                color: '#fff',
                fontSize: '1rem',
                mt: 1.5,
                fontWeight: 300,
              }}
            >
              {slides[activeSlide].subtext}
            </Typography>
          </Box>

          {/* Progress Bar Indicators */}
          <Box sx={{ display: 'flex', gap: 1, mb: 4 }}>
            {slides.map((_, index) => (
              <Box
                key={index}
                onClick={() => setActiveSlide(index)}
                sx={{
                  height: 4,
                  width: activeSlide === index ? 40 : 20,
                  backgroundColor: activeSlide === index ? '#DEFF20' : '#8E8E8E',
                  borderRadius: 2,
                  cursor: 'pointer',
                  transition: 'all 0.6s ease',
                  '&:hover': {
                    backgroundColor: activeSlide === index ? '#DEFF20' : '#8E8E8E',
                  },
                }}
              />
            ))}
          </Box>
        </Box>

        {/* Bottom Device Images - Changes with carousel */}
        <Box
          sx={{
            position: 'absolute',
            bottom: 0,
            right: 0,
            left: 'auto',
            height: '60%',
            width: '85%',
            display: 'flex',
            alignItems: 'flex-end',
            justifyContent: 'flex-end',
            pointerEvents: 'none',
            overflow: 'hidden',
          }}
        >
          <Box
            key={activeSlide}
            component="img"
            src={slides[activeSlide].image}
            alt="Product preview"
            sx={{
              maxWidth: '100%',
              maxHeight: '100%',
              objectFit: 'contain',
              objectPosition: 'bottom right',
              animation: 'slideInFromRight 0.6s ease-out forwards',
              willChange: 'transform, opacity',
              '@keyframes slideInFromRight': {
                '0%': {
                  transform: 'translateX(100px)',
                  opacity: 0,
                },
                '100%': {
                  transform: 'translateX(0)',
                  opacity: 1,
                },
              },
            }}
          />
        </Box>
      </Box>

      {/* Right Side - Login Form */}
      <Box
        sx={{
          width: { xs: '100%', md: '480px' },
          minWidth: { md: '480px' },
          display: 'flex',
          flexDirection: 'column',
          justifyContent: 'center',
          alignItems: 'center',
          px: { xs: 3, sm: 6 },
          py: 4,
          backgroundColor: '#fff',
        }}
      >
        <Box
          sx={{
            width: '100%',
            maxWidth: 360,
          }}
        >
          {/* Welcome Text */}
          <Typography
            sx={{
              fontSize: '2rem',
              fontWeight: 600,
              color: '#1a1a1a',
              mb: 4,
              textAlign: 'center',
              fontFamily: '"Inter", "Segoe UI", sans-serif',
            }}
          >
            Welcome Back
          </Typography>

          {error && (
            <Alert severity="error" sx={{ mb: 3, borderRadius: 2 }}>
              {error}
            </Alert>
          )}

          <Box component="form" onSubmit={formik.handleSubmit}>
            {/* Username Field */}
            <Box sx={{ mb: 3 }}>
              <Typography
                sx={{
                  fontSize: '0.875rem',
                  fontWeight: 500,
                  color: '#374151',
                  mb: 1,
                }}
              >
                User Name
              </Typography>
              <TextField
                fullWidth
                id="username"
                name="username"
                placeholder=""
                value={formik.values.username}
                onChange={formik.handleChange}
                onBlur={formik.handleBlur}
                error={formik.touched.username && Boolean(formik.errors.username)}
                helperText={formik.touched.username && formik.errors.username}
                autoComplete="username"
                InputProps={{
                  startAdornment: (
                    <InputAdornment position="start">
                      <PersonOutlineIcon sx={{ color: '#9ca3af', fontSize: 22 }} />
                    </InputAdornment>
                  ),
                }}
                sx={{
                  '& .MuiOutlinedInput-root': {
                    borderRadius: '12px',
                    backgroundColor: '#f9fafb',
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
                    py: 1.75,
                  },
                }}
              />
            </Box>

            {/* Password Field */}
            <Box sx={{ mb: 4 }}>
              <Typography
                sx={{
                  fontSize: '0.875rem',
                  fontWeight: 500,
                  color: '#374151',
                  mb: 1,
                }}
              >
                Password
              </Typography>
              <TextField
                fullWidth
                id="password"
                name="password"
                type={showPassword ? 'text' : 'password'}
                placeholder=""
                value={formik.values.password}
                onChange={formik.handleChange}
                onBlur={formik.handleBlur}
                error={formik.touched.password && Boolean(formik.errors.password)}
                helperText={formik.touched.password && formik.errors.password}
                autoComplete="current-password"
                InputProps={{
                  startAdornment: (
                    <InputAdornment position="start">
                      <LockOutlinedIcon sx={{ color: '#9ca3af', fontSize: 22 }} />
                    </InputAdornment>
                  ),
                  endAdornment: (
                    <InputAdornment position="end">
                      <IconButton
                        onClick={() => setShowPassword(!showPassword)}
                        edge="end"
                        sx={{ color: '#9ca3af' }}
                      >
                        {showPassword ? <VisibilityOffIcon /> : <VisibilityIcon />}
                      </IconButton>
                    </InputAdornment>
                  ),
                }}
                sx={{
                  '& .MuiOutlinedInput-root': {
                    borderRadius: '12px',
                    backgroundColor: '#f9fafb',
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
                    py: 1.75,
                  },
                }}
              />
            </Box>

            {/* Sign In Button */}
            <Button
              type="submit"
              fullWidth
              variant="contained"
              disabled={isLoading}
              sx={{
                py: 1.75,
                borderRadius: '12px',
                backgroundColor: '#1a1a1a',
                fontSize: '1rem',
                fontWeight: 500,
                textTransform: 'none',
                boxShadow: 'none',
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
                  <CircularProgress size={20} sx={{ mr: 1, color: 'white' }} />
                  Signing in...
                </>
              ) : (
                'Sign In'
              )}
            </Button>
          </Box>

          {/* Sign Up Link */}
          <Box sx={{ mt: 4, textAlign: 'center' }}>
            <Typography sx={{ color: '#6b7280', fontSize: '0.875rem' }}>
              Don't have an account?{' '}
              <Link
                to="/register"
                style={{
                  color: '#3b82f6',
                  textDecoration: 'none',
                  fontWeight: 500,
                }}
              >
                Sign up
              </Link>
            </Typography>
          </Box>
        </Box>
      </Box>
    </Box>
  );
};

export default LoginPage;