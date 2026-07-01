import { useState, useEffect } from 'react'
import { Bell, AlertTriangle, Shield, AlertCircle, CheckCircle, Clock, Filter } from 'lucide-react'
import { getLatestDashboardSummary } from '../data/api'

const SEVERITY_COLORS = {
  CRITICAL: 'text-red-400 bg-red-400/10 border-red-400/30',
  HIGH: 'text-orange-400 bg-orange-400/10 border-orange-400/30',
  MEDIUM: 'text-yellow-400 bg-yellow-400/10 border-yellow-400/30',
  LOW: 'text-cyber-green bg-cyber-green/10 border-cyber-green/30',
}

export default function Alerts() {
  const [summary, setSummary] = useState(null)
  const [loading, setLoading] = useState(true)
  const [filter, setFilter] = useState('ALL')

  useEffect(() => { loadAlerts() }, [])

  async function loadAlerts() {
    setLoading(true)
    try {
      const s = await getLatestDashboardSummary()
      if (s) setSummary(s)
    } catch { /* ignore */ }
    setLoading(false)
  }

  const hasData = !!summary && summary.status === 'COMPLETED'
  const attackTypes = summary?.attackTypes || []
  const severityDist = summary?.severityDistribution || {}

  // Build alert entries from real attack data
  const alerts = attackTypes.map((at, i) => {
    const severity = at.percentage > 30 ? 'CRITICAL' : at.percentage > 15 ? 'HIGH' : at.percentage > 5 ? 'MEDIUM' : 'LOW'
    return {
      id: i + 1,
      type: at.type,
      count: at.count,
      percentage: at.percentage,
      severity,
      status: 'ACTIVE',
      timestamp: summary?.analyzedTime || new Date().toISOString(),
    }
  })

  const filtered = filter === 'ALL' ? alerts : alerts.filter(a => a.severity === filter)

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="text-center"><div className="w-8 h-8 border-2 border-cyber-blue border-t-transparent rounded-full animate-spin mx-auto mb-3" /><p className="text-sm text-gray-400">Loading alerts...</p></div>
      </div>
    )
  }

  return (
    <div className="space-y-6 animate-fade-in">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-white">Alert Management</h1>
          <p className="text-sm text-gray-400 mt-1">{hasData ? `Alerts from: ${summary.filename}` : 'No analysis data available'}</p>
        </div>
        <button onClick={loadAlerts} className="btn-secondary flex items-center gap-2 text-xs py-2"><Clock className="w-3.5 h-3.5" /> Refresh</button>
      </div>

      {!hasData && (
        <div className="glass-card p-12 text-center">
          <AlertCircle className="w-16 h-16 text-cyber-blue mx-auto mb-4 opacity-50" />
          <h3 className="text-lg font-semibold text-white mb-2">No Alerts Available</h3>
          <p className="text-sm text-gray-400">Upload and analyze a dataset to generate security alerts.</p>
        </div>
      )}

      {hasData && (<>
        <div className="grid grid-cols-1 sm:grid-cols-4 gap-4">
          {['CRITICAL', 'HIGH', 'MEDIUM', 'LOW'].map(sev => (
            <div key={sev} className={`glass-card p-4 border ${SEVERITY_COLORS[sev]} cursor-pointer`} onClick={() => setFilter(filter === sev ? 'ALL' : sev)}>
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-2xl font-bold text-white">{severityDist[sev] || 0}</p>
                  <p className="text-xs text-gray-400 mt-1">{sev} Severity</p>
                </div>
                <AlertTriangle className={`w-5 h-5 ${SEVERITY_COLORS[sev].split(' ')[0]}`} />
              </div>
            </div>
          ))}
        </div>

        <div className="glass-card p-5">
          <div className="flex items-center justify-between mb-4">
            <h3 className="text-sm font-semibold text-white">Detected Threat Alerts</h3>
            <div className="flex items-center gap-2">
              <Filter className="w-3.5 h-3.5 text-gray-400" />
              <span className="text-xs text-gray-400">{filter !== 'ALL' ? `Filtered: ${filter}` : 'All alerts'}</span>
            </div>
          </div>
          <div className="space-y-3">
            {filtered.length > 0 ? filtered.map(alert => (
              <div key={alert.id} className="bg-navy-700/30 rounded-lg p-4 border border-navy-600/30 hover:border-cyber-blue/30 transition-all">
                <div className="flex items-start justify-between">
                  <div className="flex items-start gap-3">
                    <div className={`w-8 h-8 rounded-lg flex items-center justify-center ${SEVERITY_COLORS[alert.severity]}`}>
                      <AlertTriangle className="w-4 h-4" />
                    </div>
                    <div>
                      <p className="text-sm font-semibold text-white">{alert.type} Attack Detected</p>
                      <p className="text-xs text-gray-400 mt-0.5">{alert.count?.toLocaleString()} occurrences &middot; {alert.percentage?.toFixed(1)}% of all attacks</p>
                    </div>
                  </div>
                  <div className="flex items-center gap-2">
                    <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full border ${SEVERITY_COLORS[alert.severity]}`}>{alert.severity}</span>
                    <span className="text-[10px] font-medium px-2 py-0.5 rounded-full text-cyber-blue bg-cyber-blue/10">{alert.status}</span>
                  </div>
                </div>
              </div>
            )) : (
              <p className="text-sm text-gray-500 text-center py-8">No alerts match the current filter.</p>
            )}
          </div>
        </div>
      </>)}
    </div>
  )
}
