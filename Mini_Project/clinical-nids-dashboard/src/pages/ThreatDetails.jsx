import { useState, useEffect } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import { ArrowLeft, AlertTriangle, Shield, Brain, Database, AlertCircle } from 'lucide-react'
import { getLatestDashboardSummary } from '../data/api'

const SEVERITY_COLORS = {
  CRITICAL: 'text-red-400 bg-red-400/10',
  HIGH: 'text-orange-400 bg-orange-400/10',
  MEDIUM: 'text-yellow-400 bg-yellow-400/10',
  LOW: 'text-cyber-green bg-cyber-green/10',
}

export default function ThreatDetails() {
  const { id } = useParams()
  const navigate = useNavigate()
  const [summary, setSummary] = useState(null)
  const [selectedIdx, setSelectedIdx] = useState(0)
  const [loading, setLoading] = useState(true)

  useEffect(() => { loadDetails() }, [])

  async function loadDetails() {
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
  const selected = attackTypes[selectedIdx] || null

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="text-center"><div className="w-8 h-8 border-2 border-cyber-blue border-t-transparent rounded-full animate-spin mx-auto mb-3" /><p className="text-sm text-gray-400">Loading threat details...</p></div>
      </div>
    )
  }

  return (
    <div className="space-y-6 animate-fade-in">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <button onClick={() => navigate(-1)} className="btn-secondary p-2"><ArrowLeft className="w-4 h-4" /></button>
          <div>
            <h1 className="text-2xl font-bold text-white">Threat Details</h1>
            <p className="text-sm text-gray-400 mt-1">{hasData ? `Dataset: ${summary.filename}` : 'No analysis data available'}</p>
          </div>
        </div>
      </div>

      {!hasData && (
        <div className="glass-card p-12 text-center">
          <AlertCircle className="w-16 h-16 text-cyber-blue mx-auto mb-4 opacity-50" />
          <h3 className="text-lg font-semibold text-white mb-2">No Threat Data Available</h3>
          <p className="text-sm text-gray-400 mb-6">Upload and analyze a dataset to see threat details.</p>
          <button onClick={() => navigate('/upload')} className="btn-primary text-sm">Upload Dataset</button>
        </div>
      )}

      {hasData && (<>
        {/* Dataset Summary Context */}
        <div className="glass-card p-5">
          <div className="flex items-center gap-2 mb-4">
            <Database className="w-4 h-4 text-cyber-blue" />
            <h3 className="text-sm font-semibold text-white">Dataset Summary</h3>
          </div>
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
            <div className="bg-navy-700/30 rounded-lg p-3 border border-navy-600/30">
              <p className="text-xs text-gray-400">Total Records</p>
              <p className="text-lg font-bold text-white">{summary.totalRecords?.toLocaleString()}</p>
            </div>
            <div className="bg-navy-700/30 rounded-lg p-3 border border-navy-600/30">
              <p className="text-xs text-gray-400">Attack Traffic</p>
              <p className="text-lg font-bold text-cyber-red">{summary.attackTraffic?.toLocaleString()}</p>
            </div>
            <div className="bg-navy-700/30 rounded-lg p-3 border border-navy-600/30">
              <p className="text-xs text-gray-400">Attack %</p>
              <p className="text-lg font-bold text-cyber-orange">{summary.attackPercentage?.toFixed(1)}%</p>
            </div>
            <div className="bg-navy-700/30 rounded-lg p-3 border border-navy-600/30">
              <p className="text-xs text-gray-400">Risk Level</p>
              <p className="text-lg font-bold text-white">{summary.riskLevel}</p>
            </div>
          </div>
        </div>

        {/* Attack Type Selector */}
        <div className="glass-card p-5">
          <h3 className="text-sm font-semibold text-white mb-4">Select Attack Type</h3>
          {attackTypes.length > 0 ? (
            <div className="flex flex-wrap gap-2">
              {attackTypes.map((at, i) => (
                <button key={i} onClick={() => setSelectedIdx(i)}
                  className={`px-3 py-1.5 rounded-lg text-xs font-medium transition-all ${i === selectedIdx ? 'bg-cyber-blue/20 text-cyber-blue border border-cyber-blue/40' : 'bg-navy-700/40 text-gray-400 border border-navy-600/30 hover:text-gray-200'}`}>
                  {at.type} ({at.count?.toLocaleString()})
                </button>
              ))}
            </div>
          ) : <p className="text-sm text-gray-500">No attacks detected in this dataset.</p>}
        </div>

        {/* Selected Attack Detail */}
        {selected && (
          <div className="glass-card p-5">
            <div className="flex items-center gap-2 mb-4">
              <AlertTriangle className="w-4 h-4 text-cyber-red" />
              <h3 className="text-sm font-semibold text-white">{selected.type} Attack Details</h3>
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 mb-6">
              <div className="bg-navy-700/30 rounded-lg p-4 border border-navy-600/30">
                <p className="text-xs text-gray-400 mb-1">Total Occurrences</p>
                <p className="text-2xl font-bold text-white">{selected.count?.toLocaleString()}</p>
              </div>
              <div className="bg-navy-700/30 rounded-lg p-4 border border-navy-600/30">
                <p className="text-xs text-gray-400 mb-1">% of All Attacks</p>
                <p className="text-2xl font-bold text-white">{selected.percentage?.toFixed(1)}%</p>
              </div>
              <div className="bg-navy-700/30 rounded-lg p-4 border border-navy-600/30">
                <p className="text-xs text-gray-400 mb-1">Severity</p>
                <span className={`text-sm font-bold px-3 py-1 rounded-full ${selected.percentage > 30 ? SEVERITY_COLORS.CRITICAL : selected.percentage > 15 ? SEVERITY_COLORS.HIGH : selected.percentage > 5 ? SEVERITY_COLORS.MEDIUM : SEVERITY_COLORS.LOW}`}>
                  {selected.percentage > 30 ? 'CRITICAL' : selected.percentage > 15 ? 'HIGH' : selected.percentage > 5 ? 'MEDIUM' : 'LOW'}
                </span>
              </div>
            </div>

            {/* Distribution Bar */}
            <div className="mb-6">
              <p className="text-xs text-gray-400 mb-2">Attack Distribution</p>
              <div className="h-3 bg-navy-700 rounded-full overflow-hidden">
                <div className="h-full rounded-full bg-gradient-to-r from-cyber-red to-cyber-orange transition-all duration-700" style={{ width: `${selected.percentage || 0}%` }} />
              </div>
              <p className="text-[10px] text-gray-500 mt-1">{selected.type} accounts for {selected.percentage?.toFixed(1)}% of all detected attacks</p>
            </div>
          </div>
        )}

        {/* SHAP Features */}
        <div className="glass-card p-5">
          <div className="flex items-center gap-2 mb-4">
            <Brain className="w-4 h-4 text-cyber-purple" />
            <h3 className="text-sm font-semibold text-white">SHAP Feature Importance</h3>
          </div>
          <p className="text-xs text-gray-400 mb-4">Top features driving attack detection (global importance)</p>
          {globalFeatures.length > 0 ? (
            <div className="space-y-3">
              {globalFeatures.slice(0, 10).map((f, i) => {
                const mx = Math.max(...globalFeatures.map(g => g.impact || 0))
                const pct = mx > 0 ? ((f.impact || 0) / mx) * 100 : 0
                return (
                  <div key={i}>
                    <div className="flex justify-between text-xs mb-1">
                      <span className="text-gray-300">{f.name}</span>
                      <span className="text-gray-400 font-mono">{(f.impact || 0).toFixed(4)}</span>
                    </div>
                    <div className="h-2 bg-navy-700 rounded-full overflow-hidden">
                      <div className="h-full rounded-full bg-gradient-to-r from-cyber-purple to-cyber-cyan transition-all duration-700" style={{ width: `${pct}%` }} />
                    </div>
                  </div>
                )
              })}
            </div>
          ) : <p className="text-sm text-gray-500 text-center py-8">No SHAP feature data available</p>}
        </div>
      </>)}
    </div>
  )
}
