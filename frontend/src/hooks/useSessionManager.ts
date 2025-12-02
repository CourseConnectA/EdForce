import { useEffect, useCallback } from 'react';
import { useDispatch, useSelector } from 'react-redux';
import { useNavigate } from 'react-router-dom';
import { RootState, AppDispatch } from '../store/store';
import { logoutUser } from '../store/slices/authSlice';

// Session timeout: 7 days (to match cookie lifespan)
const SESSION_TIMEOUT = 7 * 24 * 60 * 60 * 1000;
// Warning before logout: last 10 minutes
const WARNING_TIME = 10 * 60 * 1000;

let timeoutId: NodeJS.Timeout | null = null;
let warningTimeoutId: NodeJS.Timeout | null = null;

export const useSessionManager = () => {
  const dispatch = useDispatch<AppDispatch>();
  const navigate = useNavigate();
  const { isAuthenticated, accessToken } = useSelector((state: RootState) => state.auth);

  const handleLogout = useCallback(async () => {
    await dispatch(logoutUser());
    navigate('/login');
  }, [dispatch, navigate]);

  const resetSessionTimer = useCallback(() => {
    // Clear existing timers
    if (timeoutId) clearTimeout(timeoutId);
    if (warningTimeoutId) clearTimeout(warningTimeoutId);

    if (!isAuthenticated || !accessToken) return;

    // Set warning timer (5 minutes before logout)
    warningTimeoutId = setTimeout(() => {
      console.warn('Session will expire in 5 minutes');
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

  useEffect(() => {
    if (isAuthenticated) {
      resetSessionTimer();

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
    }
  }, [isAuthenticated, resetSessionTimer]);

  return {
    extendSession,
    handleLogout
  };
};