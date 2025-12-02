import { createSlice, createAsyncThunk } from '@reduxjs/toolkit';
import { authService, LoginCredentials } from '../../services/authService';

// Async thunks
export const loginUser = createAsyncThunk(
  'auth/loginUser',
  async (credentials: LoginCredentials, { rejectWithValue }) => {
    try {
      const response = await authService.login(credentials);
      return response;
    } catch (error: any) {
      const message = error.response?.data?.message || error.message || 'Login failed';
      return rejectWithValue(message);
    }
  }
);

export const logoutUser = createAsyncThunk(
  'auth/logoutUser',
  async (_, { rejectWithValue }) => {
    try {
      await authService.logout();
      authService.clearTokens();
    } catch (error: any) {
      // Even if logout fails on server, clear local tokens
      authService.clearTokens();
      const message = error.response?.data?.message || error.message || 'Logout failed';
      return rejectWithValue(message);
    }
  }
);

export const fetchUserProfile = createAsyncThunk(
  'auth/fetchUserProfile',
  async (_, { rejectWithValue }) => {
    try {
      const user = await authService.getProfile();
      return user;
    } catch (error: any) {
      const message = error.response?.data?.message || error.message || 'Failed to fetch profile';
      return rejectWithValue(message);
    }
  }
);

export const validateAndRestoreSession = createAsyncThunk(
  'auth/validateAndRestoreSession',
  async (_, { rejectWithValue }) => {
    try {
      const { accessToken } = authService.getStoredTokens();
      
      // If no access token or it's invalid, try cookie-based refresh
      if (!accessToken || !authService.isTokenValid(accessToken)) {
        try {
          const refreshResponse = await authService.refreshToken();
          localStorage.setItem('accessToken', refreshResponse.accessToken);
          const user = await authService.getProfile();
          return { user, accessToken: refreshResponse.accessToken };
        } catch (refreshError) {
          authService.clearTokens();
          throw new Error('Token refresh failed');
        }
      }
      // Token is valid, fetch profile
      const user = await authService.getProfile();
      return { user, accessToken };
    } catch (error: any) {
      authService.clearTokens();
      const message = error.response?.data?.message || error.message || 'Session validation failed';
      return rejectWithValue(message);
    }
  }
);

interface User {
  id: string;
  userName: string;
  firstName: string;
  lastName: string;
  email: string;
  isAdmin: boolean;
  role?: string;
  centerName?: string | null;
}

interface AuthState {
  user: User | null;
  accessToken: string | null;
  refreshToken: string | null;
  isAuthenticated: boolean;
  isLoading: boolean;
  error: string | null;
}

const initialState: AuthState = {
  user: null,
  accessToken: null,
  refreshToken: null,
  isAuthenticated: false,
  isLoading: false,
  error: null,
};

const authSlice = createSlice({
  name: 'auth',
  initialState,
  reducers: {
    clearError: (state) => {
      state.error = null;
    },
    initializeAuth: (state) => {
      // This will trigger validateAndRestoreSession
      state.isLoading = true;
    },
    resetAuth: (state) => {
      Object.assign(state, initialState);
      authService.clearTokens();
    },
  },
  extraReducers: (builder) => {
    builder
      // Login cases
      .addCase(loginUser.pending, (state) => {
        state.isLoading = true;
        state.error = null;
      })
      .addCase(loginUser.fulfilled, (state, action) => {
        state.isLoading = false;
        state.isAuthenticated = true;
        state.user = action.payload.user;
        state.accessToken = action.payload.accessToken;
        state.refreshToken = null;
        state.error = null;

        // Store tokens in localStorage
        localStorage.setItem('accessToken', action.payload.accessToken);
  // Stop storing refresh token; use cookie-based refresh
      })
      .addCase(loginUser.rejected, (state, action) => {
        state.isLoading = false;
        state.isAuthenticated = false;
        state.user = null;
        state.accessToken = null;
        state.refreshToken = null;
        state.error = action.payload as string;
      })
      // Logout cases
      .addCase(logoutUser.pending, (state) => {
        // Clear auth state immediately for smooth transition
        state.isAuthenticated = false;
        state.user = null;
        state.accessToken = null;
        state.refreshToken = null;
        state.error = null;
      })
      .addCase(logoutUser.fulfilled, (state) => {
        state.isAuthenticated = false;
        state.user = null;
        state.accessToken = null;
        state.refreshToken = null;
        state.error = null;
      })
      .addCase(logoutUser.rejected, (state) => {
        // Even on error, ensure we're logged out (don't show error)
        state.isAuthenticated = false;
        state.user = null;
        state.accessToken = null;
        state.refreshToken = null;
        state.error = null; // Don't show error on logout failure
      })
      // Fetch profile cases
      .addCase(fetchUserProfile.fulfilled, (state, action) => {
        state.user = action.payload;
      })
      .addCase(fetchUserProfile.rejected, (state, action) => {
        state.error = action.payload as string;
        // If profile fetch fails, user might need to re-login
        state.isAuthenticated = false;
        state.accessToken = null;
        state.refreshToken = null;
        authService.clearTokens();
      })
      // Session validation cases
      .addCase(validateAndRestoreSession.pending, (state) => {
        state.isLoading = true;
      })
      .addCase(validateAndRestoreSession.fulfilled, (state, action) => {
        state.isLoading = false;
        state.isAuthenticated = true;
        state.user = action.payload.user;
        state.accessToken = action.payload.accessToken;
        state.refreshToken = null;
        state.error = null;
      })
      .addCase(validateAndRestoreSession.rejected, (state, action) => {
        state.isLoading = false;
        state.isAuthenticated = false;
        state.user = null;
        state.accessToken = null;
        state.refreshToken = null;
        state.error = action.payload as string;
        authService.clearTokens();
      });
  },
});

export const {
  clearError,
  initializeAuth,
  resetAuth,
} = authSlice.actions;

export default authSlice.reducer;