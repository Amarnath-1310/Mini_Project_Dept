/**
 * MedSentry-XAI Auth API Module
 * Authentication & User Profile endpoints through Spring Boot backend.
 */

import { apiPost, apiGet, apiPut, setToken, clearToken, getToken } from './axios';

const USER_STORAGE_KEY = 'medsentry_user';

/**
 * Login with email and password.
 * @returns {Promise<{token: string, email: string, role: string, fullName: string}>}
 */
export async function login(email, password) {
  const result = await apiPost('/api/auth/login', { email, password });
  if (result.token) {
    setToken(result.token);
    localStorage.setItem(USER_STORAGE_KEY, JSON.stringify({
      email: result.email,
      role: result.role,
      fullName: result.fullName
    }));
  }
  return result;
}

/**
 * Register a new user with profile fields.
 * @param {Object} userData - { fullName, email, password, department, phoneNumber, bio, role }
 * @returns {Promise<{token: string, email: string, role: string, fullName: string}>}
 */
export async function register(userData) {
  const payload = typeof userData === 'string' 
    ? { email: arguments[0], password: arguments[1], role: arguments[2] || 'SECURITY_ANALYST' }
    : userData;

  const result = await apiPost('/api/auth/register', payload);
  if (result.token) {
    setToken(result.token);
    localStorage.setItem(USER_STORAGE_KEY, JSON.stringify({
      email: result.email,
      role: result.role,
      fullName: result.fullName
    }));
  }
  return result;
}

/**
 * Get current user's profile from database.
 */
export async function getProfile() {
  const profile = await apiGet('/api/auth/me');
  if (profile) {
    const current = getCurrentUser() || {};
    localStorage.setItem(USER_STORAGE_KEY, JSON.stringify({
      ...current,
      email: profile.email,
      role: profile.role,
      fullName: profile.fullName,
      department: profile.department
    }));
  }
  return profile;
}

/**
 * Update user's profile permanently in database.
 * @param {Object} updateData - { fullName, department, phoneNumber, bio, newPassword }
 */
export async function updateProfile(updateData) {
  const updated = await apiPut('/api/auth/profile', updateData);
  if (updated) {
    const current = getCurrentUser() || {};
    localStorage.setItem(USER_STORAGE_KEY, JSON.stringify({
      ...current,
      email: updated.email,
      role: updated.role,
      fullName: updated.fullName,
      department: updated.department
    }));
  }
  return updated;
}

/**
 * Get cached user details from localStorage.
 */
export function getCurrentUser() {
  try {
    const stored = localStorage.getItem(USER_STORAGE_KEY);
    return stored ? JSON.parse(stored) : null;
  } catch {
    return null;
  }
}

/**
 * Logout - clear token and user state from storage.
 */
export function logout() {
  clearToken();
  localStorage.removeItem(USER_STORAGE_KEY);
  localStorage.removeItem('datasetId');
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

