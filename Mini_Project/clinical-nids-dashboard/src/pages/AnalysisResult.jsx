import { useState, useEffect } from 'react'
import { useParams, useLocation, useNavigate } from 'react-router-dom'
import {
  ArrowLeft, Download, FileText, Shield, AlertTriangle, Activity,
  Brain, Database, Loader2, Filter, Search, BarChart3
} from 'lucide-react'
import {
  PieChart, Pie, Cell, BarChart, Bar, XAxis, YAxis, CartesianGrid,
  Tooltip, ResponsiveContainer, Legend
} from 'recharts'
import { getAnalysis, downloadReport } from '../data/api'

const ATTACK_COLORS = {
  'Benign': '#22c55e', 'DDoS': '#ef4444', 'DoS': '#f97316',
  'PortScan': '#8b5cf6', 'Brute Force': '#06b6d4', 'Botnet': '#eab308',
  'Infiltration': '#ec4899', 'Web Attack': '#14b8a6',
}

const SEVERITY_COLORS = {
  'CRITICAL': '#ef4444', 'HIGH': '#f97316', 'MEDIUM': '#eab308',
  'LOW': '#22c55e', 'NONE': '#6b7280',
}

function getAttackColor(name) {
  return ATTACK_COLORS[name] || '#3b82f6'
}

export default function AnalysisResult() {
  const { datasetId } = useParams()
  const location = useLocation()
  const navigate = useNavigate()
  const [data, setData] = useState(location.state?.mlResult || null)
  const [loading, setLoading] = useState(!data)
  const [error, setError] = useState('')
  const [downloading, setDownloading] = useState(false)
  const [filter, setFilter] = useState('all')
  const [search, setSearch] = useState('')
  const [page, setPage] = useState(0)
  const PAGE_SIZE = 25

  useEffect(() => {
    if (data) return
    // Fetch from backend
    const id = datasetId?.replace('ml-', '')
    if (!id) return

    setLoading(true)
    getAnalysis(id)
      .then(result => setData(result))
      .catch(err => setError(err.message))
      .finally(() => setLoading(false))
  }, [datasetId, data])

  const handleDownloadReport = async () => {
    setDownloading(true)
    try {
      const id = datasetId?.replace('ml-', '')
      const blob = await downloadReport(id)
      const url = URL.createObjectURL(blob)
      const a = document.createElement('a')
      a.href = url
      a.download = `ClinicalNIDS_Report_${id}.pdf`
      a.click()
      URL.revokeObjectURL(url)
    } catch {
      setError('Failed to download PDF report. Make sure the backend is running.')
    }
    setDownloading(false)
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[60vh]">
        <div className="text-center">
          <Loader2 className="w-10 h-10 text-cyber-blue animate-spin mx-auto mb-4" />
          <p className="text-sm text-gray-400">Loading analysis results...</p>
        </div>
      </div>
    )
  }

  if (error && !data) {
    return (
      <div className="flex items-center justify-center min-h-[60vh]">
        <div className="glass-card p-8 text-center max-w-md">
          <AlertTriangle className="w-12 h-12 text-cyber-orange mx-auto mb-4" />
          <p className="text-lg font-semibold text-white mb-2">Failed to Load Results</p>
          <p className="text-sm text-gray-400 mb-4">{error}</p>
          <button onClick={() => navigate('/upload')} className="btn-primary text-sm">
            Upload New Dataset
          </button>
        </div>
      </div>
    )
  }

  // Normalize data structure (handle both backend DTO and ML service direct)
  const dsInfo = data?.dataset_info || data || {}
  const summary = data?.security_summary || {}
  const attackDist = data?.attack_distribution || data?.attackDistribution || {}
  const severityDist = data?.severity_distribution || data?.severityDistribution || {}
  const attackDetails = data?.attack_details || data?.attackDetails || []
  const globalFeatures = data?.global_feature_importance || data?.globalFeatureImportance || []
  const predictions = data?.predictions || []
  const filename = data?.filename || 'unknown'

  const totalTraffic = summary.total_traffic || dsInfo.total_records || dsInfo.totalRecords || 0
  const normalCount = summary.normal_count || data?.normalCount || 0
  const attackCount = summary.attack_count || data?.attackCount || 0
  const riskLevel = summary.risk_level || data?.riskLevel || 'UNKNOWN'
  const modelAccuracy = summary.model_accuracy || data?.modelAccuracy || 0
  const avgConfidence = summary.avg_confidence || data?.avgConfidence || 0

  // Chart data
  const pieData = Object.entries(attackDist).map(([name, value]) => ({
    name, value: typeof value === 'number' ? value : 0, color: getAttackColor(name),
  }))

  const barData = Object.entries(attackDist)
    .filter(([name]) => name !== 'Benign')
    .map(([name, value]) => ({ name, count: typeof value === 'number' ? value : 0 }))

  // Filter predictions
  const filteredPreds = predictions.filter(p => {
    const attackType = p.attackType || p.prediction || ''
    const severity = p.severity || ''
    const matchFilter = filter === 'all' ||
      (filter === 'attacks' && (p.is_attack || p.isAttack)) ||
      (filter === 'normal' && !(p.is_attack || p.isAttack)) ||
      filter === severity.toLowerCase()
    const matchSearch = !search ||
      attackType.toLowerCase().includes(search.toLowerCase())
    return matchFilter && matchSearch
  })

  const totalPages = Math.ceil(filteredPreds.length / PAGE_SIZE)
  const pagedPreds = filteredPreds.slice(page * PAGE_SIZE, (page + 1) * PAGE_SIZE)

  return (
    <div className="space-y-6 animate-fade-in">
      {/* Header */}
      <div className="flex items-center justify-between flex-wrap gap-4">
        <div className="flex items-center gap-4">
          <button onClick={() => navigate('/upload')} className="p-2 rounded-lg hover:bg-navy-700/60 transition-colors">
            <ArrowLeft className="w-5 h-5 text-gray-400" />
          </button>
          <div>
            <h1 className="text-2xl font-bold text-white">Analysis Results</h1>
            <p className="text-sm text-gray-400 mt-1">
              {filename} &mdash; {totalTraffic.toLocaleString()} flows analyzed
            </p>
          </div>
        </div>
        <div className="flex gap-2">
          <button
            onClick={handleDownloadReport}
            disabled={downloading}
            className="btn-primary flex items-center gap-2 text-xs py-2"
          >
            {downloading ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Download className="w-3.5 h-3.5" />}
            Download PDF Report
          </button>
        </div>
      </div>

      {/* Dataset Info */}
      <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-3">
        {[
          { label: 'Filename', value: filename, icon: FileText },
          { label: 'Total Records', value: totalTraffic.toLocaleString(), icon: Database },
          { label: 'Features', value: dsInfo.features_count || dsInfo.featuresCount || 'N/A', icon: BarChart3 },
          { label: 'Missing Values', value: (dsInfo.missing_values || dsInfo.missingValues || 0).toLocaleString(), icon: AlertTriangle },
          { label: 'Duplicates', value: (dsInfo.duplicate_records || dsInfo.duplicateRecords || 0).toLocaleString(), icon: Activity },
          { label: 'Model Accuracy', value: `${(modelAccuracy * 100).toFixed(1)}%`, icon: Brain },
        ].map(({ label, value, icon: Icon }) => (
          <div key={label} className="glass-card p-3 flex items-center gap-3">
            <Icon className="w-4 h-4 text-cyber-blue flex-shrink-0" />
            <div className="min-w-0">
              <p className="text-xs text-gray-500 truncate">{label}</p>
              <p className="text-sm font-semibold text-white truncate">{value}</p>
            </div>
          </div>
        ))}
      </div>

      {/* Security Summary Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-4 gap-4">
        <div className="stat-card">
          <p className="text-xs text-gray-400">Total Traffic</p>
          <p className="text-2xl font-bold text-white">{totalTraffic.toLocaleString()}</p>
        </div>
        <div className="stat-card">
          <p className="text-xs text-gray-400">Normal Traffic</p>
          <p className="text-2xl font-bold text-cyber-green">{normalCount.toLocaleString()}</p>
          <p className="text-xs text-gray-500">{totalTraffic > 0 ? ((normalCount / totalTraffic) * 100).toFixed(1) : 0}%</p>
        </div>
        <div className="stat-card">
          <p className="text-xs text-gray-400">Detected Attacks</p>
          <p className="text-2xl font-bold text-cyber-red">{attackCount.toLocaleString()}</p>
          <p className="text-xs text-gray-500">{totalTraffic > 0 ? ((attackCount / totalTraffic) * 100).toFixed(1) : 0}%</p>
        </div>
        <div className="stat-card">
          <p className="text-xs text-gray-400">Risk Level</p>
          <p className={`text-2xl font-bold ${
            riskLevel === 'CRITICAL' ? 'text-red-400' :
            riskLevel === 'HIGH' ? 'text-orange-400' :
            riskLevel === 'MEDIUM' ? 'text-yellow-400' : 'text-green-400'
          }`}>{riskLevel}</p>
          <p className="text-xs text-gray-500">Avg confidence: {(avgConfidence * 100).toFixed(1)}%</p>
        </div>
      </div>

      {/* Charts Row */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Pie Chart */}
        <div className="glass-card p-5">
          <h3 className="text-sm font-semibold text-white mb-4">Attack Distribution</h3>
          {pieData.length > 0 ? (
            <>
              <ResponsiveContainer width="100%" height={280}>
                <PieChart>
                  <Pie data={pieData} cx="50%" cy="50%" innerRadius={60} outerRadius={100} paddingAngle={3} dataKey="value"
                    label={({ name, percent }) => `${name}: ${(percent * 100).toFixed(1)}%`} labelLine={false}>
                    {pieData.map((entry, i) => <Cell key={i} fill={entry.color} />)}
                  </Pie>
                  <Tooltip contentStyle={{ backgroundColor: '#0f1729', border: '1px solid #1b2741', borderRadius: '8px', fontSize: '12px' }} />
                </PieChart>
              </ResponsiveContainer>
              <div className="flex flex-wrap gap-3 mt-2 justify-center">
                {pieData.map(d => (
                  <div key={d.name} className="flex items-center gap-1.5">
                    <div className="w-2.5 h-2.5 rounded-full" style={{ backgroundColor: d.color }} />
                    <span className="text-[11px] text-gray-400">{d.name} ({d.value.toLocaleString()})</span>
                  </div>
                ))}
              </div>
            </>
          ) : (
            <p className="text-sm text-gray-500 text-center py-8">No attack data available</p>
          )}
        </div>

        {/* Bar Chart */}
        <div className="glass-card p-5">
          <h3 className="text-sm font-semibold text-white mb-4">Attack Frequency</h3>
          {barData.length > 0 ? (
            <ResponsiveContainer width="100%" height={300}>
              <BarChart data={barData}>
                <CartesianGrid strokeDasharray="3 3" stroke="#1b2741" />
                <XAxis dataKey="name" stroke="#4b5563" fontSize={11} />
                <YAxis stroke="#4b5563" fontSize={11} />
                <Tooltip contentStyle={{ backgroundColor: '#0f1729', border: '1px solid #1b2741', borderRadius: '8px', fontSize: '12px' }} />
                <Bar dataKey="count" radius={[4, 4, 0, 0]}>
                  {barData.map((entry, i) => <Cell key={i} fill={getAttackColor(entry.name)} />)}
                </Bar>
              </BarChart>
            </ResponsiveContainer>
          ) : (
            <p className="text-sm text-gray-500 text-center py-8">No attacks detected</p>
          )}
        </div>
      </div>

      {/* Attack Details + SHAP */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Attack Category Details */}
        <div className="glass-card p-5">
          <h3 className="text-sm font-semibold text-white mb-4">Attack Category Details</h3>
          <div className="space-y-3 max-h-96 overflow-y-auto">
            {attackDetails.map((ad, i) => (
              <div key={i} className="bg-navy-700/30 rounded-lg p-3 border border-navy-600/30">
                <div className="flex items-center justify-between mb-2">
                  <div className="flex items-center gap-2">
                    <div className="w-3 h-3 rounded-full" style={{ backgroundColor: getAttackColor(ad.attack_type || ad.attackType) }} />
                    <span className="text-sm font-semibold text-white">{ad.attack_type || ad.attackType}</span>
                  </div>
                  <span className={`severity-${(ad.severity || 'none').toLowerCase()}`}>{ad.severity}</span>
                </div>
                <div className="grid grid-cols-2 gap-2 text-xs">
                  <div>
                    <span className="text-gray-500">Count: </span>
                    <span className="text-gray-300 font-mono">{(ad.count || 0).toLocaleString()}</span>
                  </div>
                  <div>
                    <span className="text-gray-500">Avg Confidence: </span>
                    <span className="text-gray-300 font-mono">{((ad.average_confidence || ad.averageConfidence || 0) * 100).toFixed(1)}%</span>
                  </div>
                </div>
                {(ad.top_features || ad.topFeatures || []).length > 0 && (
                  <div className="mt-2">
                    <p className="text-[10px] text-gray-500 uppercase tracking-wider font-semibold mb-1">Key Factors</p>
                    <div className="flex flex-wrap gap-1">
                      {(ad.top_features || ad.topFeatures).map((f, fi) => (
                        <span key={fi} className={`text-[10px] px-2 py-0.5 rounded-full ${
                          (f.level || f.impact_level) === 'HIGH' ? 'bg-red-400/10 text-red-400' :
                          (f.level || f.impact_level) === 'MEDIUM' ? 'bg-yellow-400/10 text-yellow-400' :
                          'bg-gray-400/10 text-gray-400'
                        }`}>
                          {f.name || f.feature}: {f.level || f.impact_level}
                        </span>
                      ))}
                    </div>
                  </div>
                )}
              </div>
            ))}
            {attackDetails.length === 0 && (
              <p className="text-sm text-gray-500 text-center py-4">No attack details available</p>
            )}
          </div>
        </div>

        {/* Global SHAP Feature Importance */}
        <div className="glass-card p-5">
          <h3 className="text-sm font-semibold text-white mb-1">AI Explanation (SHAP)</h3>
          <p className="text-xs text-gray-400 mb-4">Global feature importance across all detected attacks</p>
          {globalFeatures.length > 0 ? (
            <div className="space-y-3">
              {globalFeatures.slice(0, 10).map((f, i) => {
                const maxImpact = Math.max(...globalFeatures.map(g => g.impact || 0))
                const pct = maxImpact > 0 ? ((f.impact || 0) / maxImpact) * 100 : 0
                return (
                  <div key={i}>
                    <div className="flex justify-between text-xs mb-1">
                      <span className="text-gray-300">{f.name || f.feature}</span>
                      <span className="text-gray-400 font-mono">{(f.impact || 0).toFixed(4)}</span>
                    </div>
                    <div className="h-2 bg-navy-700 rounded-full overflow-hidden">
                      <div
                        className="h-full rounded-full transition-all duration-700"
                        style={{
                          width: `${pct}%`,
                          background: (f.level || '') === 'HIGH' ? '#ef4444' :
                            (f.level || '') === 'MEDIUM' ? '#f97316' : '#3b82f6'
                        }}
                      />
                    </div>
                  </div>
                )
              })}
            </div>
          ) : (
            <p className="text-sm text-gray-500 text-center py-8">No SHAP data available</p>
          )}
        </div>
      </div>

      {/* Prediction Table */}
      <div className="glass-card p-5">
        <div className="flex items-center justify-between mb-4 flex-wrap gap-3">
          <h3 className="text-sm font-semibold text-white">
            Prediction Table ({filteredPreds.length.toLocaleString()} flows)
          </h3>
          <div className="flex items-center gap-2">
            <div className="flex gap-1">
              {['all', 'attacks', 'normal', 'critical', 'high'].map(f => (
                <button key={f} onClick={() => { setFilter(f); setPage(0) }}
                  className={`px-3 py-1 rounded-lg text-xs font-medium capitalize transition-all ${
                    filter === f ? 'bg-cyber-blue/20 text-cyber-blue' : 'text-gray-400 hover:text-gray-200'
                  }`}>
                  {f}
                </button>
              ))}
            </div>
            <div className="relative">
              <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-gray-500" />
              <input value={search} onChange={e => { setSearch(e.target.value); setPage(0) }}
                placeholder="Search..." className="input-field pl-8 w-40 text-xs" />
            </div>
          </div>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-navy-600/60 text-xs text-gray-500 uppercase tracking-wider">
                <th className="text-left py-3 px-3 font-medium">Flow #</th>
                <th className="text-left py-3 px-3 font-medium">Attack Type</th>
                <th className="text-left py-3 px-3 font-medium">Confidence</th>
                <th className="text-left py-3 px-3 font-medium">Severity</th>
                <th className="text-left py-3 px-3 font-medium">Status</th>
              </tr>
            </thead>
            <tbody>
              {pagedPreds.map((p, i) => {
                const attackType = p.attackType || p.prediction || 'Unknown'
                const conf = p.confidence || 0
                const severity = p.severity || 'NONE'
                const isAttack = p.is_attack || p.isAttack
                return (
                  <tr key={i} className="border-b border-navy-600/30 hover:bg-navy-700/30 transition-colors">
                    <td className="py-2.5 px-3 text-gray-300 font-mono text-xs">{p.flow_index ?? p.flowIndex ?? i + 1}</td>
                    <td className="py-2.5 px-3 text-white text-xs font-medium">{attackType}</td>
                    <td className="py-2.5 px-3">
                      <div className="flex items-center gap-2">
                        <div className="w-12 h-1.5 bg-navy-700 rounded-full overflow-hidden">
                          <div className="h-full rounded-full bg-cyber-blue" style={{ width: `${conf * 100}%` }} />
                        </div>
                        <span className="text-xs text-gray-300 font-mono">{(conf * 100).toFixed(1)}%</span>
                      </div>
                    </td>
                    <td className="py-2.5 px-3"><span className={`severity-${severity.toLowerCase()}`}>{severity}</span></td>
                    <td className="py-2.5 px-3">
                      <span className={`text-xs font-medium px-2 py-0.5 rounded-full ${
                        isAttack ? 'text-cyber-red bg-cyber-red/10' : 'text-cyber-green bg-cyber-green/10'
                      }`}>
                        {isAttack ? 'Detected' : 'Normal'}
                      </span>
                    </td>
                  </tr>
                )
              })}
            </tbody>
          </table>
        </div>

        {/* Pagination */}
        {totalPages > 1 && (
          <div className="flex items-center justify-between mt-4 text-xs text-gray-400">
            <span>Page {page + 1} of {totalPages}</span>
            <div className="flex gap-2">
              <button onClick={() => setPage(Math.max(0, page - 1))} disabled={page === 0}
                className="btn-secondary text-xs py-1 disabled:opacity-40">Previous</button>
              <button onClick={() => setPage(Math.min(totalPages - 1, page + 1))} disabled={page >= totalPages - 1}
                className="btn-secondary text-xs py-1 disabled:opacity-40">Next</button>
            </div>
          </div>
        )}
      </div>
    </div>
  )
}
