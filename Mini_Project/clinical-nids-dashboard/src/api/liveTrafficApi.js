import { apiGet, apiPost } from "./axios";

export function getLiveInterfaces() {
  return apiGet("/api/traffic/live/interfaces");
}

export function startLiveCapture(interfaceName, mode = "auto") {
  return apiPost("/api/traffic/live/start", {
    interface: interfaceName || null,
    mode,
    auto_ingest: true,
  });
}

export function stopLiveCapture() {
  return apiPost("/api/traffic/live/stop");
}

export function getLiveStatus() {
  return apiGet("/api/traffic/live/status");
}

export function getLiveFlows(limit = 50, sinceId = 0) {
  return apiGet(`/api/traffic/live/flows?limit=${limit}&since_id=${sinceId}`);
}
