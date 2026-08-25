/**
 * Formatting utility functions for Clinical-NIDS dashboard.
 */

/**
 * Format bytes to human-readable size.
 */
export function formatSize(bytes) {
  if (bytes == null || bytes === 0) return '0 B'
  const units = ['B', 'KB', 'MB', 'GB', 'TB']
  const i = Math.floor(Math.log(bytes) / Math.log(1024))
  const val = bytes / Math.pow(1024, i)
  return `${val.toFixed(i > 0 ? 1 : 0)} ${units[i]}`
}

/**
 * Format number with commas/locales.
 */
export function formatNumber(num) {
  if (num == null) return '0'
  return Number(num).toLocaleString()
}

/**
 * Format a date string or Date object to locale display.
 */
export function formatDate(dateStr) {
  if (!dateStr) return 'N/A'
  try {
    const d = new Date(dateStr)
    return d.toLocaleDateString(undefined, {
      year: 'numeric', month: 'short', day: 'numeric',
      hour: '2-digit', minute: '2-digit'
    })
  } catch {
    return dateStr
  }
}

/**
 * Format percentage.
 */
export function formatPercent(value, decimals = 1) {
  if (value == null) return '0%'
  return `${(Number(value) * 100).toFixed(decimals)}%`
}

/**
 * Format duration in seconds to mm:ss or hh:mm:ss.
 */
export function formatDuration(seconds) {
  if (seconds == null || seconds <= 0) return '0s'
  if (seconds < 60) return `${Math.ceil(seconds)}s`
  const mins = Math.floor(seconds / 60)
  const secs = Math.ceil(seconds % 60)
  if (mins < 60) return `${mins}m ${secs}s`
  const hrs = Math.floor(mins / 60)
  const remainMins = mins % 60
  return `${hrs}h ${remainMins}m`
}
