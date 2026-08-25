/**
 * MedSentry-XAI API Service Layer
 * =================================
 * Centralized re-exports from modular API endpoints.
 * All requests go through Spring Boot backend.
 */

export { 
  login, 
  register, 
  getProfile, 
  updateProfile, 
  getCurrentUser, 
  logout, 
  isAuthenticated, 
  getCurrentToken 
} from '../api/authApi';

export { getToken, setToken, clearToken } from '../api/axios';

export {
  uploadDataset,
  analyzeDataset,
  getAnalysisProgress,
  getAnalysis,
  getDatasets,
  getDashboardStats,
  getAlerts,
  getAlertById,
  markAlertReviewed,
  deleteDataset,
} from '../api/datasetApi';

export {
  getAdminUsers,
  updateUserStatus,
  updateUserRole,
  deleteUser,
  getSystemStatus,
  deleteDatasetAdmin,
} from '../api/adminApi';

export {
  getInterfaces,
  startLiveCapture,
  stopLiveCapture,
  getLiveStatus,
  getLiveFlows,
} from '../api/liveTrafficApi';

export {
  downloadReport,
  downloadCsvReport,
  downloadExcelReport,
  getReportData,
  getReportDownloadUrl,
  downloadAndSave,
} from '../api/reportApi';

export { 
  getDashboardSummary, 
  getLatestDashboardSummary, 
  getDashboardDatasets 
} from '../api/dashboardApi';

