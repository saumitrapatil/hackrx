/**
 * Configures and exports an Axios instance with base URL, timeout, and default headers.
 * Provides methods for setting authentication tokens and handling request/response interceptors.
 * 
 * @remarks
 * - Sets a base URL for API requests
 * - Adds authorization header management
 * - Logs request and response details
 * - Handles 401 unauthorized errors by clearing authentication token
 */

import axios from 'axios';
import type { AxiosRequestConfig, AxiosResponse, AxiosError, InternalAxiosRequestConfig } from 'axios';

// Configure base URL - Update this to your backend server URL
const BASE_URL = 'http://localhost:3000/api';

export const api = axios.create({
  baseURL: BASE_URL,
  timeout: 10000,
  headers: {
    'Content-Type': 'application/json',
  },
});

// Set auth token
export const setAuthToken = (token: string | null) => {
  if (token) {
    api.defaults.headers.common['Authorization'] = `Bearer ${token}`;
  } else {
    delete api.defaults.headers.common['Authorization'];
  }
};

// Request interceptor with proper typing
api.interceptors.request.use(
  (config: InternalAxiosRequestConfig) => {
    console.log(`API Request: ${config.method?.toUpperCase()} ${config.url}`);
    return config;
  },
  (error: AxiosError) => {
    console.error('Request interceptor error:', error.message);
    return Promise.reject(error);
  }
);

// Response interceptor with proper typing and error handling
api.interceptors.response.use(
  (response: AxiosResponse) => {
    console.log(`API Response: ${response.status} ${response.config?.url}`);
    return response;
  },
  (error: AxiosError) => {
    // Enhanced error logging
    if (error.response) {
      console.error(`API Error: ${error.response.status} ${error.config?.url}`, {
        status: error.response.status,
        statusText: error.response.statusText,
        data: error.response.data,
      });
    } else if (error.request) {
      console.error('API Error: No response received', error.request);
    } else {
      console.error('API Error: Request setup failed', error.message);
    }

    // Handle token expiration
    if (error.response?.status === 401) {
      setAuthToken(null);
      // Optional: Redirect to login or emit an event
      // window.location.href = '/login';
      // or dispatch a logout action in your state management
    }

    return Promise.reject(error);
  }
);

export default api;