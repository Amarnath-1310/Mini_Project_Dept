/**
 * Report API Module
 * PDF report generation and download through Spring Boot backend.
 */

import { apiDownload, apiGet } from './axios';

/**
 * Download PDF report for a dataset.
 * @param {number} datasetId - The dataset ID.
 * @returns {Promise<Blob>} PDF file blob.
 */
export async function downloadReport(datasetId) {
  return apiDownload(`/api/dataset/${datasetId}/report`);
}

/**
 * Get report data (JSON) for a dataset.
 * @param {number} datasetId - The dataset ID.
 * @returns {Promise<object>} Report data.
 */
export async function getReportData(datasetId) {
  return apiGet(`/api/dataset/${datasetId}/report/json`);
}

/**
 * Trigger PDF report generation and get download URL.
 * @param {number} datasetId - The dataset ID.
 * @returns {Promise<string>} Download URL.
 */
export function getReportDownloadUrl(datasetId) {
  return `http://localhost:8080/api/dataset/${datasetId}/report`;
}
