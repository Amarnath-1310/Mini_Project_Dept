/**
 * Clinical-NIDS API Service Layer
 * Connects the React frontend to the Spring Boot backend and FastAPI ML service.
 */

const SPRING_BOOT_URL = 'http://localhost:8080';
const ML_SERVICE_URL = 'http://localhost:8000';

// ── Auth APIs (Spring Boot) ─────────────────────────────────────────────────

export async function login(email, password) {
  const res = await fetch(`${SPRING_BOOT_URL}/api/auth/login`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ email, password }),
  });
  if (!res.ok) throw new Error('Login failed');
  return res.json();
}

export function getToken() {
  return localStorage.getItem('nids_token');
}

export function setToken(token) {
  localStorage.setItem('nids_token', token);
}

export function clearToken() {
  localStorage.removeItem('nids_token');
}

// ── Authenticated request helper ────────────────────────────────────────────

function authHeaders() {
  const token = getToken();
  return {
    'Content-Type': 'application/json',
    ...(token ? { Authorization: `Bearer ${token}` } : {}),
  };
}

// ── Detection APIs (Spring Boot → ML Service) ──────────────────────────────

export async function predictTraffic(features) {
  const res = await fetch(`${SPRING_BOOT_URL}/api/detection/predict`, {
    method: 'POST',
    headers: authHeaders(),
    body: JSON.stringify(features),
  });
  if (!res.ok) throw new Error('Prediction failed');
  return res.json();
}

export async function getDetections(limit = 100) {
  const res = await fetch(`${SPRING_BOOT_URL}/api/detections?limit=${limit}`, {
    headers: authHeaders(),
  });
  if (!res.ok) throw new Error('Failed to fetch detections');
  return res.json();
}

export async function getDetectionById(id) {
  const res = await fetch(`${SPRING_BOOT_URL}/api/detections/${id}`, {
    headers: authHeaders(),
  });
  if (!res.ok) throw new Error('Detection not found');
  return res.json();
}

// ── Alert APIs (Spring Boot) ────────────────────────────────────────────────

export async function getAlerts(status) {
  const url = status
    ? `${SPRING_BOOT_URL}/api/alerts?status=${status}`
    : `${SPRING_BOOT_URL}/api/alerts`;
  const res = await fetch(url, { headers: authHeaders() });
  if (!res.ok) throw new Error('Failed to fetch alerts');
  return res.json();
}

export async function getAlertById(id) {
  const res = await fetch(`${SPRING_BOOT_URL}/api/alerts/${id}`, {
    headers: authHeaders(),
  });
  if (!res.ok) throw new Error('Alert not found');
  return res.json();
}

export async function markAlertReviewed(id) {
  const res = await fetch(`${SPRING_BOOT_URL}/api/alerts/${id}/review`, {
    method: 'PUT',
    headers: authHeaders(),
  });
  if (!res.ok) throw new Error('Failed to update alert');
  return res.json();
}

// ── Dashboard Stats (Spring Boot) ───────────────────────────────────────────

export async function getDashboardStats() {
  const res = await fetch(`${SPRING_BOOT_URL}/api/dashboard/statistics`, {
    headers: authHeaders(),
  });
  if (!res.ok) throw new Error('Failed to fetch stats');
  return res.json();
}

// ── ML Service Direct APIs (FastAPI) ────────────────────────────────────────

export async function mlPredict(features) {
  const res = await fetch(`${ML_SERVICE_URL}/api/predict`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(features),
  });
  if (!res.ok) throw new Error('ML prediction failed');
  return res.json();
}

export async function mlHealth() {
  const res = await fetch(`${ML_SERVICE_URL}/api/health`);
  return res.json();
}

export async function mlModelInfo() {
  const res = await fetch(`${ML_SERVICE_URL}/api/model/info`);
  return res.json();
}

export async function mlStartSimulation() {
  const res = await fetch(`${ML_SERVICE_URL}/api/simulate/start`, { method: 'POST' });
  return res.json();
}

export async function mlStopSimulation() {
  const res = await fetch(`${ML_SERVICE_URL}/api/simulate/stop`, { method: 'POST' });
  return res.json();
}

export async function mlSimulationStatus() {
  const res = await fetch(`${ML_SERVICE_URL}/api/simulate/status`);
  return res.json();
}

export async function mlGetDetections(limit = 100) {
  const res = await fetch(`${ML_SERVICE_URL}/api/detections?limit=${limit}`);
  if (!res.ok) throw new Error('Failed to fetch ML detections');
  return res.json();
}

export async function mlDashboardStats() {
  const res = await fetch(`${ML_SERVICE_URL}/api/dashboard/statistics`);
  return res.json();
}

// ── Dataset Upload & Analysis APIs (Spring Boot) ─────────────────────────

export async function uploadDataset(file) {
  const formData = new FormData();
  formData.append('file', file);
  const res = await fetch(`${SPRING_BOOT_URL}/api/dataset/upload`, {
    method: 'POST',
    headers: { ...(getToken() ? { Authorization: `Bearer ${getToken()}` } : {}) },
    body: formData,
  });
  if (!res.ok) throw new Error('Upload failed');
  return res.json();
}

export async function analyzeDataset(id) {
  const res = await fetch(`${SPRING_BOOT_URL}/api/dataset/${id}/analyze`, {
    method: 'POST',
    headers: authHeaders(),
  });
  if (!res.ok) throw new Error('Analysis failed');
  return res.json();
}

export async function getAnalysis(id) {
  const res = await fetch(`${SPRING_BOOT_URL}/api/dataset/${id}/analysis`, {
    headers: authHeaders(),
  });
  if (!res.ok) throw new Error('Failed to fetch analysis');
  return res.json();
}

export async function getDatasets() {
  const res = await fetch(`${SPRING_BOOT_URL}/api/datasets`, {
    headers: authHeaders(),
  });
  if (!res.ok) throw new Error('Failed to fetch datasets');
  return res.json();
}

export async function downloadReport(id) {
  const res = await fetch(`${SPRING_BOOT_URL}/api/dataset/${id}/report`, {
    headers: authHeaders(),
  });
  if (!res.ok) throw new Error('Failed to download report');
  return res.blob();
}

// ── ML Service Direct Upload (fallback) ──────────────────────────────────

export async function mlUploadDataset(file) {
  const formData = new FormData();
  formData.append('file', file);
  const res = await fetch(`${ML_SERVICE_URL}/api/upload`, {
    method: 'POST',
    body: formData,
  });
  if (!res.ok) throw new Error('ML Upload failed');
  return res.json();
}

export async function mlAnalyzeDataset(datasetId) {
  const res = await fetch(`${ML_SERVICE_URL}/api/analyze/${datasetId}`, {
    method: 'POST',
  });
  if (!res.ok) throw new Error('ML Analysis failed');
  return res.json();
}

export async function mlGetAnalysis(datasetId) {
  const res = await fetch(`${ML_SERVICE_URL}/api/analysis/${datasetId}`);
  if (!res.ok) throw new Error('Failed to fetch ML analysis');
  return res.json();
}

export async function mlGetReportData(datasetId) {
  const res = await fetch(`${ML_SERVICE_URL}/api/report/${datasetId}`);
  if (!res.ok) throw new Error('Failed to fetch report data');
  return res.json();
}
