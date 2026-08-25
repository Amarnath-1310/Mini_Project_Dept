/**
 * MedSentry-XAI Admin API Module
 * Administrative user management, system telemetry, and dataset governance.
 */

import { apiGet, apiPut, apiDelete } from './axios';

/**
 * List all users in the system (Admin only).
 */
export async function getAdminUsers() {
  return apiGet('/api/admin/users');
}

/**
 * Toggle user active/inactive status.
 */
export async function updateUserStatus(userId, active) {
  return apiPut(`/api/admin/users/${userId}/status`, { active });
}

/**
 * Change a user's role (ADMIN / SECURITY_ANALYST).
 */
export async function updateUserRole(userId, role) {
  return apiPut(`/api/admin/users/${userId}/role`, { role });
}

/**
 * Delete a user account (Admin only).
 */
export async function deleteUser(userId) {
  return apiDelete(`/api/admin/users/${userId}`);
}

/**
 * Retrieve real-time system telemetry and component statuses.
 */
export async function getSystemStatus() {
  return apiGet('/api/admin/system/status');
}

/**
 * Delete dataset from admin console.
 */
export async function deleteDatasetAdmin(datasetId) {
  return apiDelete(`/api/admin/datasets/${datasetId}`);
}
