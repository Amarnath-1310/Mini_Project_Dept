/**
 * Dashboard API Module
 * Fetches dashboard summary data from Spring Boot backend.
 */

import { apiGet } from './axios';

/**
 * Get dashboard summary for a specific dataset.
 * @param {number} datasetId
 * @returns {Promise<object>} Dashboard summary with real data.
 */
export async function getDashboardSummary(datasetId) {
  return apiGet(`/api/dashboard/${datasetId}/summary`);
}

/**
 * Get dashboard summary for the most recently analyzed dataset.
 * @returns {Promise<object|null>} Dashboard summary or null if no data.
 */
export async function getLatestDashboardSummary() {
  try {
    return await apiGet('/api/dashboard/latest/summary');
  } catch {
    return null;
  }
}

/**
 * Get list of all datasets from dashboard endpoint.
 * @returns {Promise<Array>} List of datasets.
 */
export async function getDashboardDatasets() {
  return apiGet('/api/dashboard/datasets');
}
