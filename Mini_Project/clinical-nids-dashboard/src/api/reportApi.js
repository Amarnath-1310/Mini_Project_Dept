/**
 * Report API Module
 * Report generation and download (PDF, CSV, Excel, JSON) through Spring Boot backend.
 */

import { apiDownload, apiGet } from './axios';

const API_BASE = 'http://localhost:8080';

/**
 * Download PDF report for a dataset.
 * @param {number} datasetId - The dataset ID.
 * @returns {Promise<Blob>} PDF file blob.
 */
export async function downloadReport(datasetId) {
  return apiDownload(`/api/dataset/${datasetId}/report`);
}

/**
 * Download CSV report for a dataset.
 * @param {number} datasetId - The dataset ID.
 * @returns {Promise<Blob>} CSV file blob.
 */
export async function downloadCsvReport(datasetId) {
  return apiDownload(`/api/dataset/${datasetId}/report/csv`);
}

/**
 * Download Excel report for a dataset.
 * @param {number} datasetId - The dataset ID.
 * @returns {Promise<Blob>} Excel file blob.
 */
export async function downloadExcelReport(datasetId) {
  return apiDownload(`/api/dataset/${datasetId}/report/excel`);
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
 * Get PDF report download URL.
 * @param {number} datasetId - The dataset ID.
 * @returns {string} Download URL.
 */
export function getReportDownloadUrl(datasetId) {
  return `${API_BASE}/api/dataset/${datasetId}/report`;
}

/**
 * Helper to trigger file download from a blob.
 */
export async function downloadAndSave(datasetId, format, filename) {
  let blob;
  const ext = format.toLowerCase();
  switch (ext) {
    case 'csv':
      blob = await downloadCsvReport(datasetId);
      break;
    case 'excel':
    case 'xlsx':
      blob = await downloadExcelReport(datasetId);
      break;
    case 'pdf':
    default:
      blob = await downloadReport(datasetId);
      break;
  }
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = filename || `ClinicalNIDS_Report_${datasetId}.${ext === 'excel' || ext === 'xlsx' ? 'xlsx' : ext}`;
  a.click();
  URL.revokeObjectURL(url);
}
