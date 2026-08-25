/**
 * MedSentry-XAI Live Traffic API Module
 * Real-time network interface inspection, capture control, and live flow streaming.
 */

import { apiGet, apiPost } from './axios';

/**
 * Discover host network interfaces.
 */
export async function getInterfaces() {
  return apiGet('/api/traffic/live/interfaces');
}

/**
 * Start live traffic capture and analysis.
 * @param {Object} [options] - { interface, mode, auto_ingest }
 */
export async function startLiveCapture(options = {}) {
  return apiPost('/api/traffic/live/start', options);
}

/**
 * Stop live traffic capture.
 */
export async function stopLiveCapture() {
  return apiPost('/api/traffic/live/stop');
}

/**
 * Get current live capture operational status.
 */
export async function getLiveStatus() {
  return apiGet('/api/traffic/live/status');
}

/**
 * Get recent live analyzed flows.
 * @param {number} [limit=50]
 * @param {number} [sinceId=0]
 */
export async function getLiveFlows(limit = 50, sinceId = 0) {
  return apiGet(`/api/traffic/live/flows?limit=${limit}&since_id=${sinceId}`);
}
