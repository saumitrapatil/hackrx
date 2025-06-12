
import { createSlice, createAsyncThunk, PayloadAction } from '@reduxjs/toolkit';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { api, setAuthToken } from '../../utils/api';

export interface User {
  id: number;
  email: string;
  role: 'client' | 'developer' | 'broker' | 'admin';
  name: string;
  phone?: string;
  location?: string;
  preferences?: any;
  verification_status: string;
  subscription_plan: string;
  profile_image?: string;
  created_at: string;
}

interface AuthState {
  user: User | null;
  token: string | null;
  isLoading: boolean;
  error: string | null;
  isAuthenticated: boolean;
}

const initialState: AuthState = {
  user: null,
  token: null,
  isLoading: false,
  error: null,
  isAuthenticated: false,
};

// Async thunks
export const loginUser = createAsyncThunk(
  'auth/login',
  async ({ email, password }: { email: string; password: string }, { rejectWithValue }) => {
    try {
      const response = await api.post('/auth/login', { email, password });
      const { token, user } = response.data;
      
      // Store token in AsyncStorage
      await AsyncStorage.setItem('authToken', token);
      setAuthToken(token);
      
      return { token, user };
    } catch (error: any) {
      return rejectWithValue(error.response?.data?.message || 'Login failed');
    }
  }
);

export const registerUser = createAsyncThunk(
  'auth/register',
  async (userData: {
    email: string;
    password: string;
    role: string;
    name: string;
    phone?: string;
    location?: string;
    preferences?: any;
  }, { rejectWithValue }) => {
    try {
      const response = await api.post('/auth/register', userData);
      const { token, user } = response.data;
      
      // Store token in AsyncStorage
      await AsyncStorage.setItem('authToken', token);
      setAuthToken(token);
      
      return { token, user };
    } catch (error: any) {
      return rejectWithValue(error.response?.data?.message || 'Registration failed');
    }
  }
);

export const verifyToken = createAsyncThunk(
  'auth/verifyToken',
  async (_, { rejectWithValue }) => {
    try {
      const token = await AsyncStorage.getItem('authToken');
      if (!token) {
        throw new Error('No token found');
      }
      
      setAuthToken(token);
      const response = await api.post('/auth/verify-token');
      
      return { token, user: response.data.user };
    } catch (error: any) {
      await AsyncStorage.removeItem('authToken');
      setAuthToken(null);
      return rejectWithValue('Token verification failed');
    }
  }
);

export const updateProfile = createAsyncThunk(
  'auth/updateProfile',
  async (profileData: {
    name: string;
    phone?: string;
    location?: string;
    preferences?: any;
  }, { rejectWithValue }) => {
    try {
      const response = await api.put('/users/profile', profileData);
      return response.data.user;
    } catch (error: any) {
      return rejectWithValue(error.response?.data?.message || 'Profile update failed');
    }
  }
);

const authSlice = createSlice({
  name: 'auth',
  initialState,
  reducers: {
    clearError: (state) => {
      state.error = null;
    },
    logout: (state) => {
      state.user = null;
      state.token = null;
      state.isAuthenticated = false;
      AsyncStorage.removeItem('authToken');
      setAuthToken(null);
    },
  },
  extraReducers: (builder) => {
    // Login
    builder
      .addCase(loginUser.pending, (state) => {
        state.isLoading = true;
        state.error = null;
      })
      .addCase(loginUser.fulfilled, (state, action) => {
        state.isLoading = false;
        state.user = action.payload.user;
        state.token = action.payload.token;
        state.isAuthenticated = true;
      })
      .addCase(loginUser.rejected, (state, action) => {
        state.isLoading = false;
        state.error = action.payload as string;
      })
      
    // Register
    builder
      .addCase(registerUser.pending, (state) => {
        state.isLoading = true;
        state.error = null;
      })
      .addCase(registerUser.fulfilled, (state, action) => {
        state.isLoading = false;
        state.user = action.payload.user;
        state.token = action.payload.token;
        state.isAuthenticated = true;
      })
      .addCase(registerUser.rejected, (state, action) => {
        state.isLoading = false;
        state.error = action.payload as string;
      })
      
    // Verify Token
    builder
      .addCase(verifyToken.pending, (state) => {
        state.isLoading = true;
      })
      .addCase(verifyToken.fulfilled, (state, action) => {
        state.isLoading = false;
        state.user = action.payload.user;
        state.token = action.payload.token;
        state.isAuthenticated = true;
      })
      .addCase(verifyToken.rejected, (state) => {
        state.isLoading = false;
        state.isAuthenticated = false;
      })
      
    // Update Profile
    builder
      .addCase(updateProfile.fulfilled, (state, action) => {
        state.user = action.payload;
      });
  },
});

export const { clearError, logout } = authSlice.actions;
export default authSlice.reducer;