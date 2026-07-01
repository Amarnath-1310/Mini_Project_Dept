import { useState, useEffect } from 'react'
import { Activity, Shield, AlertTriangle, Brain, Database, AlertCircle, RefreshCw } from 'lucide-react'
import { getLatestDashboardSummary } from '../data/api'

export default function Monitoring() {
  const [summary, setSummary] = useState(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => { loadMonitoring() }, [])

  async function loadMonitoring() {
    setLoading(true)
    try {
      const s = await getLatestDashboardSummary()
      if (s) setSummary(s)
    } catch { /* ignore */ }
    setLoading(false)
  }

  const hasData = !!summary && summary.status === 'COMPLETED'
  const attackTypes = summary?.attackTypes || []
  const globalFeatures = summary?.globalFeatureImportance || []
  const severityDist = summary?.severityDistribution || {}
  const totalRecords = summary?.totalRecords || 0
  const attackTraffic = summary?.attackTraffic || 0
  const normalTraffic = summary?.normalTraffic || 0
  const modelAccuracy = summary?.modelAccuracy || 0
  const avgConfidence = summary?.avgConfidence || 0

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="text-center"><div className="w-8 h-8 border-2 border-cyber-blue border-t-transparent rounded-full animate-spin mx-auto mb-3" /><p className="text-sm text-gray-400">Loading monitoring data...</p></div>
      </div>
    )
  }

  return (
    <div className="space-y-6 animate-fade-in">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-white">Threat Monitoring</h1>
          <p className="text-sm text-gray-400 mt-1">{hasData ? `Monitoring: ${summary.filename}` : 'No analysis data available'}</p>
        </div>
        <button onClick={loadMonitoring} className="btn-secondary flex items-center gap-2 text-xs py-2"><RefreshCw className="w-3.5 h-3.5" /> Refresh</button>
      </div>

      {!hasData && (
        <div className="glass-card p-12 text-center">
          <AlertCircle className="w-16 h-16 text-cyber-blue mx-auto mb-4 opacity-50" />
          <h3 className="text-lg font-semibold text-white mb-2">No Monitoring Data</h3>
          <p className="text-sm text-gray-400">Upload and analyze a dataset to start monitoring threats.</p>
        </div>
      )}

      {hasData && (<>
        {/* Live Metrics */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          <div className="stat-card">
            <div className="flex items-center gap-3 mb-3"><div className="w-10 h-10 rounded-xl bg-cyber-blue/15 flex items-center justify-center"><Database className="w-5 h-5 text-cyber-blue" /></div></div>
            <p className="text-2xl font-bold text-white">{totalRecords.toLocaleString()}</p>
            <p className="text-xs text-gray-400 mt-1">Total Records Analyzed</p>
          </div>
          <div className="stat-card">
            <div className="flex items-center gap-3 mb-3"><div className="w-10 h-10 rounded-xl bg-cyber-green/15 flex items-center justify-center"><Shield className="w-5 h-5 text-cyber-green" /></div></div>
            <p className="text-2xl font-bold text-white">{normalTraffic.toLocaleString()}</p>
            <p className="text-xs text-gray-400 mt-1">Normal Traffic</p>
          </div>
          <div className="stat-card">
            <div className="flex items-center gap-3 mb-3"><div className="w-10 h-10 rounded-xl bg-cyber-red/15 flex items-center justify-center"><AlertTriangle className="w-5 h-5 text-cyber-red" /></div></div>
            <p className="text-2xl font-bold text-white">{attackTraffic.toLocaleString()}</p>
            <p className="text-xs text-gray-400 mt-1">Attack Traffic</p>
          </div>
          <div className="stat-card">
            <div className="flex items-center gap-3 mb-3"><div className="w-10 h-10 rounded-xl bg-cyber-purple/15 flex items-center justify-center"><Activity className="w-5 h-5 text-cyber-purple" /></div></div>
            <p className="text-2xl font-bold text-white">{(avgConfidence * 100).toFixed(1)}%</p>
            <p className="text-xs text-gray-400 mt-1">Avg Confidence</p>
          </div>
        </div>

        {/* Attack Categories Table */}
        <div className="glass-card p-5">
          <h3 className="text-sm font-semibold text-white mb-4">Attack Categories</h3>
          {attackTypes.length > 0 ? (
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b border-navy-600/60 text-xs text-gray-500 uppercase tracking-wider">
                    <th className="text-left py-3 px-3 font-medium">Attack Type</th>
                    <th className="text-left py-3 px-3 font-medium">Count</th>
                    <th className="text-left py-3 px-3 font-medium">% of Attacks</th>
                    <th className="text-left py-3 px-3 font-medium">Status</th>
                  </tr>
                </thead>
                <tbody>
                  {attackTypes.map((at, i) => (
                    <tr key={i} className="border-b border-navy-600/30 hover:bg-navy-700/30 transition-colors">
                      <td className="py-2.5 px-3 text-white text-xs font-medium">{at.type}</td>
                      <td className="py-2.5 px-3 text-gray-300 font-mono text-xs">{at.count?.toLocaleString()}</td>
                      <td className="py-2.5 px-3 text-gray-300 font-mono text-xs">{at.percentage?.toFixed(1)}%</td>
                      <td className="py-2.5 px-3">
                        <span className={`text-[10px] font-medium px-2 py-0.5 rounded-full ${at.percentage > 20 ? 'text-red-400 bg-red-400/10' : at.percentage > 5 ? 'text-orange-400 bg-orange-400/10' : 'text-yellow-400 bg-yellow-400/10'}`}>
                          {at.percentage > 20 ? 'CRITICAL' : at.percentage > 5 ? 'WARNING' : 'LOW'}
                        </span>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          ) : <p className="text-sm text-gray-500 text-center py-8">No attacks detected</p>}
        </div>

        {/* SHAP Feature Importance + Severity */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          <div className="glass-card p-5">
            <div className="flex items-center gap-2 mb-4">
              <Brain className="w-4 h-4 text-cyber-purple" />
              <h3 className="text-sm font-semibold text-white">AI Feature Importance (SHAP)</h3>
            </div>
            {globalFeatures.length > 0 ? (
              <div className="space-y-3">
                {globalFeatures.slice(0, 8).map((f, i) => {
                  const mx = Math.max(...globalFeatures.map(g => g.impact || 0))
                  const pct = mx > 0 ? ((f.impact || 0) / mx) * 100 : 0
                  return (
                    <div key={i}>
                      <div className="flex justify-between text-xs mb-1">
                        <span className="text-gray-300 truncate mr-2">{f.name}</span>
                        <span className="text-gray-400 font-mono flex-shrink-0">{(f.impact || 0).toFixed(4)}</span>
                      </div>
                      <div className="h-2 bg-navy-700 rounded-full overflow-hidden">
                        <div className="h-full rounded-full bg-gradient-to-r from-cyber-purple to-cyber-blue transition-all duration-700" style={{ width: `${pct}%` }} />
                      </div>
                    </div>
                  )
                })}
              </div>
            ) : <p className="text-sm text-gray-500 text-center py-8">No SHAP data available</p>}
          </div>

          <div className="glass-card p-5">
            <h3 className="text-sm font-semibold text-white mb-4">Severity Breakdown</h3>
            <div className="space-y-3">
              {Object.entries(severityDist).map(([sev, count]) => {
                const total = Object.values(severityDist).reduce((a, b) => a + (b || 0), 0)
                const pct = total > 0 ? (count / total) * 100 : 0
                const color = sev === 'CRITICAL' ? 'bg-red-500' : sev === 'HIGH' ? 'bg-orange-500' : sev === 'MEDIUM' ? 'bg-yellow-500' : sev === 'LOW' ? 'bg-green-500' : 'bg-gray-500'
                return (
                  <div key={sev}>
                    <div className="flex justify-between text-xs mb-1">
                      <span className="text-gray-300">{sev}</span>
                      <span className="text-gray-400 font-mono">{count?.toLocaleString?.() || 0}</span>
                    </div>
                    <div className="h-2 bg-navy-700 rounded-full overflow-hidden">
                      <div className={`h-full rounded-full ${color} transition-all duration-700`} style={{ width: `${pct}%` }} />
                    </div>
                  </div>
                )
              })}
            </div>
            <div className="mt-4 pt-4 border-t border-navy-600/40">
              <div className="flex justify-between text-xs">
                <span className="text-gray-400">Model Accuracy</span>
                <span className="text-cyber-green font-mono">{(modelAccuracy * 100).toFixed(1)}%</span>
              </div>
            </div>
          </div>
        </div>
      </>)}
    </div>
  )
}
