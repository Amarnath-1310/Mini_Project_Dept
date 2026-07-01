/**
 * Auth API Module
 * Authentication endpoints through Spring Boot backend.
 */

import { apiPost, setToken, clearToken, getToken } from './axios';

/**
 * Login with email and password.
 * @returns {Promise<{token: string}>}
 */
export async function login(email, password) {
  const result = await apiPost('/api/auth/login', { email, password });
  if (result.token) {
    setToken(result.token);
  }
  return result;
}

/**
 * Register a new user.
 * @returns {Promise<{token: string}>}
 */
export async function register(email, password, role = 'USER') {
  const result = await apiPost('/api/auth/register', { email, password, role });
  if (result.token) {
    setToken(result.token);
  }
  return result;
}

/**
 * Logout - clear token from storage.
 */
export function logout() {
  clearToken();
}

/**
 * Check if user is authenticated.
 */
export function isAuthenticated() {
  return !!getToken();
}

/**
 * Get current token.
 */
export function getCurrentToken() {
  return getToken();
}
