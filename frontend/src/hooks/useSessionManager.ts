import { useEffect, useCallback, useRef } from 'react';
import { useDispatch, useSelector } from 'react-redux';
import { useNavigate } from 'react-router-dom';
import { RootState, AppDispatch } from '../store/store';
import { logoutUser, validateAndRestoreSession } from '../store/slices/authSlice';

// Session timeout: 7 days (to match cookie lifespan)
const SESSION_TIMEOUT = 7 * 24 * 60 * 60 * 1000;
// Warning before logout: last 10 minutes
const WARNING_TIME = 10 * 60 * 1000;
// Proactive token refresh: every 20 hours (before 24h expiry)
const TOKEN_REFRESH_INTERVAL = 20 * 60 * 60 * 1000;

let timeoutId: NodeJS.Timeout | null = null;
let warningTimeoutId: NodeJS.Timeout | null = null;
let tokenRefreshIntervalId: NodeJS.Timeout | null = null;

export const useSessionManager = () => {
  const dispatch = useDispatch<AppDispatch>();
  const navigate = useNavigate();
  const { isAuthenticated, accessToken } = useSelector((state: RootState) => state.auth);
  const lastRefreshTime = useRef<number>(Date.now());

  const handleLogout = useCallback(async () => {
    await dispatch(logoutUser());
    navigate('/login');
  }, [dispatch, navigate]);

  // Proactive token refresh to prevent expiry
  const refreshTokenProactively = useCallback(async () => {
    if (!isAuthenticated) return;
    
    try {
      console.log('Proactively refreshing token...');
      await dispatch(validateAndRestoreSession()).unwrap();
      lastRefreshTime.current = Date.now();
      console.log('Token refreshed successfully');
    } catch (error) {
      console.error('Failed to refresh token:', error);
      // If refresh fails, the user will be logged out on next API call
    }
  }, [dispatch, isAuthenticated]);

  const resetSessionTimer = useCallback(() => {
    // Clear existing timers
    if (timeoutId) clearTimeout(timeoutId);
    if (warningTimeoutId) clearTimeout(warningTimeoutId);

    if (!isAuthenticated || !accessToken) return;

    // Set warning timer (10 minutes before logout)
    warningTimeoutId = setTimeout(() => {
      console.warn('Session will expire in 10 minutes');
      // You could show a warning dialog here
    }, SESSION_TIMEOUT - WARNING_TIME);

    // Set logout timer (absolute max based on refresh cookie window)
    timeoutId = setTimeout(() => {
      console.log('Session expired - logging out');
      handleLogout();
    }, SESSION_TIMEOUT);
  }, [isAuthenticated, accessToken, handleLogout]);

  const extendSession = useCallback(() => {
    if (isAuthenticated) {
      resetSessionTimer();
    }
  }, [isAuthenticated, resetSessionTimer]);

  // Handle visibility change - refresh token when user returns to tab
  useEffect(() => {
    if (!isAuthenticated) return;

    const handleVisibilityChange = () => {
      if (document.visibilityState === 'visible') {
        const timeSinceLastRefresh = Date.now() - lastRefreshTime.current;
        // If more than 1 hour has passed since last refresh, refresh the token
        const oneHour = 60 * 60 * 1000;
        if (timeSinceLastRefresh > oneHour) {
          console.log('Tab became visible after inactivity, refreshing token...');
          refreshTokenProactively();
        }
      }
    };

    document.addEventListener('visibilitychange', handleVisibilityChange);
    return () => {
      document.removeEventListener('visibilitychange', handleVisibilityChange);
    };
  }, [isAuthenticated, refreshTokenProactively]);

  // Set up proactive token refresh interval
  useEffect(() => {
    if (isAuthenticated) {
      // Clear any existing interval
      if (tokenRefreshIntervalId) clearInterval(tokenRefreshIntervalId);
      
      // Set up interval to refresh token every 20 hours
      tokenRefreshIntervalId = setInterval(() => {
        refreshTokenProactively();
      }, TOKEN_REFRESH_INTERVAL);

      return () => {
        if (tokenRefreshIntervalId) clearInterval(tokenRefreshIntervalId);
      };
    }
  }, [isAuthenticated, refreshTokenProactively]);

  useEffect(() => {
    if (isAuthenticated) {
      resetSessionTimer();
      lastRefreshTime.current = Date.now();

      // Reset timer on user activity
      const events = ['mousedown', 'mousemove', 'keypress', 'scroll', 'touchstart'];
      
      const resetOnActivity = () => {
        resetSessionTimer();
      };

      events.forEach(event => {
        document.addEventListener(event, resetOnActivity, true);
      });

      return () => {
        events.forEach(event => {
          document.removeEventListener(event, resetOnActivity, true);
        });
        if (timeoutId) clearTimeout(timeoutId);
        if (warningTimeoutId) clearTimeout(warningTimeoutId);
      };
    } else {
      // Clear timers when not authenticated
      if (timeoutId) clearTimeout(timeoutId);
      if (warningTimeoutId) clearTimeout(warningTimeoutId);
      if (tokenRefreshIntervalId) clearInterval(tokenRefreshIntervalId);
    }
  }, [isAuthenticated, resetSessionTimer]);

  return {
    extendSession,
    handleLogout,
    refreshTokenProactively
  };
};