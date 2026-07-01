/**
 * Dataset API Module
 * Dataset upload, analysis, and management through Spring Boot backend.
 */

import { apiGet, apiPost, apiUpload } from './axios';

/**
 * Upload a parquet dataset file.
 * @param {File} file - The parquet file to upload.
 * @returns {Promise<{datasetId: number, filename: string, status: string}>}
 */
export async function uploadDataset(file) {
  const formData = new FormData();
  formData.append('file', file);
  return apiUpload('/api/dataset/upload', formData);
}

/**
 * Analyze an uploaded dataset.
 * @param {number} datasetId - The dataset ID to analyze.
 * @returns {Promise<object>} Analysis results.
 */
export async function analyzeDataset(datasetId) {
  return apiPost(`/api/dataset/${datasetId}/analyze`);
}

/**
 * Get analysis results for a dataset.
 * @param {number} datasetId - The dataset ID.
 * @returns {Promise<object>} Analysis results.
 */
export async function getAnalysis(datasetId) {
  return apiGet(`/api/dataset/${datasetId}/analysis`);
}

/**
 * Get list of all uploaded datasets.
 * @returns {Promise<Array>} List of datasets.
 */
export async function getDatasets() {
  return apiGet('/api/datasets');
}

/**
 * Get dashboard statistics.
 * @returns {Promise<object>} Dashboard stats.
 */
export async function getDashboardStats() {
  return apiGet('/api/dashboard/statistics');
}

/**
 * Get alerts.
 * @param {string} [status] - Optional status filter.
 * @returns {Promise<Array>} List of alerts.
 */
export async function getAlerts(status) {
  const url = status ? `/api/alerts?status=${status}` : '/api/alerts';
  return apiGet(url);
}

/**
 * Get alert by ID.
 * @param {number} id - Alert ID.
 * @returns {Promise<object>} Alert details.
 */
export async function getAlertById(id) {
  return apiGet(`/api/alerts/${id}`);
}

/**
 * Mark an alert as reviewed.
 * @param {number} id - Alert ID.
 * @returns {Promise<object>} Updated alert.
 */
export async function markAlertReviewed(id) {
  return apiPost(`/api/alerts/${id}/review`);
}
