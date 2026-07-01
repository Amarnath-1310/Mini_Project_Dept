/**
 * Clinical-NIDS API Service Layer
 * =================================
 * Re-exports from centralized API modules.
 * All requests go through Spring Boot backend — NO direct ML service calls.
 */

// Re-export everything from the new modular API
export { login, register, logout, isAuthenticated, getCurrentToken } from '../api/authApi';
export { getToken, setToken, clearToken } from '../api/axios';
export {
  uploadDataset,
  analyzeDataset,
  getAnalysis,
  getDatasets,
  getDashboardStats,
  getAlerts,
  getAlertById,
  markAlertReviewed,
} from '../api/datasetApi';
export { downloadReport, getReportData, getReportDownloadUrl } from '../api/reportApi';
export { getDashboardSummary, getLatestDashboardSummary, getDashboardDatasets } from '../api/dashboardApi';
