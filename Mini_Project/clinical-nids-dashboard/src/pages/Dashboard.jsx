import { useState, useEffect } from 'react'
import {
  Network, AlertTriangle, ShieldAlert, Brain,
  TrendingUp, ArrowUpRight, RefreshCw,
  Database, Upload, FileText, AlertCircle
} from 'lucide-react'
import {
  PieChart, Pie, Cell, BarChart, Bar, XAxis, YAxis, CartesianGrid,
  Tooltip, ResponsiveContainer
} from 'recharts'
import { getLatestDashboardSummary, getDashboardDatasets } from '../data/api'
import { useNavigate } from 'react-router-dom'

const ATTACK_COLORS = {
  'Benign': '#22c55e', 'DDoS': '#ef4444', 'DoS': '#f97316',
  'PortScan': '#8b5cf6', 'Brute Force': '#06b6d4', 'Botnet': '#eab308',
  'Infiltration': '#ec4899', 'Web Attack': '#14b8a6',
}
function getAttackColor(n) { return ATTACK_COLORS[n] || '#3b82f6' }

export default function Dashboard() {
  const navigate = useNavigate()
  const [summary, setSummary] = useState(null)
  const [datasets, setDatasets] = useState([])
  const [loading, setLoading] = useState(true)

  useEffect(() => { fetchData() }, [])

  async function fetchData() {
    setLoading(true)
    try {
      const dsList = await getDashboardDatasets()
      setDatasets(Array.isArray(dsList) ? dsList : [])
      const s = await getLatestDashboardSummary()
      if (s) { setSummary(s); localStorage.setItem('datasetId', String(s.datasetId)) }
      else setSummary(null)
    } catch { setSummary(null) }
    setLoading(false)
  }

  const hasData = !!summary && summary.status === 'COMPLETED'
  const totalRecords = summary?.totalRecords || 0
  const attackTraffic = summary?.attackTraffic || 0
  const normalTraffic = summary?.normalTraffic || 0
  const modelAccuracy = summary?.modelAccuracy || 0
  const riskLevel = summary?.riskLevel || 'N/A'
  const attackPercentage = summary?.attackPercentage || 0
  const avgConfidence = summary?.avgConfidence || 0
  const filename = summary?.filename || ''
  const attackTypes = summary?.attackTypes || []
  const globalFeatures = summary?.globalFeatureImportance || []

  const pieData = hasData
    ? [{ name: 'Normal', value: normalTraffic, color: '#22c55e' }, ...attackTypes.map(a => ({ name: a.type, value: a.count, color: getAttackColor(a.type) }))]
    : []
  const barData = attackTypes.map(a => ({ name: a.type, count: a.count, color: getAttackColor(a.type) }))

  return (
    <div className="space-y-6 animate-fade-in">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-white">Security Dashboard</h1>
          <p className="text-sm text-gray-400 mt-1">{hasData ? `Latest analysis: ${filename}` : 'Upload a dataset to see real analysis results'}</p>
        </div>
        <div className="flex items-center gap-3">
          <button onClick={() => navigate('/upload')} className="btn-primary flex items-center gap-2 text-xs py-2"><Upload className="w-3.5 h-3.5" /> Upload Dataset</button>
          <button onClick={fetchData} className="btn-secondary flex items-center gap-2 text-xs py-2"><RefreshCw className="w-3.5 h-3.5" /> Refresh</button>
        </div>
      </div>

      {!loading && !hasData && (
        <div className="glass-card p-12 text-center">
          <AlertCircle className="w-16 h-16 text-cyber-blue mx-auto mb-4 opacity-50" />
          <h3 className="text-lg font-semibold text-white mb-2">No Analysis Data Available</h3>
          <p className="text-sm text-gray-400 mb-6">Upload a parquet dataset file to generate dashboard results.</p>
          <button onClick={() => navigate('/upload')} className="btn-primary flex items-center gap-2 text-sm mx-auto"><Upload className="w-4 h-4" /> Upload Your First Dataset</button>
        </div>
      )}

      {hasData && (<>
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-4">
          {[
            { label: 'Total Records', value: totalRecords.toLocaleString(), icon: Network, sub: `${summary?.totalFeatures || 0} features`, color: 'text-cyber-blue', bg: 'bg-cyber-blue/15' },
            { label: 'Detected Attacks', value: attackTraffic.toLocaleString(), icon: AlertTriangle, sub: `${attackPercentage}% of traffic`, color: 'text-cyber-red', bg: 'bg-cyber-red/15' },
            { label: 'Risk Level', value: riskLevel, icon: ShieldAlert, sub: `Confidence: ${(avgConfidence * 100).toFixed(1)}%`, color: riskLevel === 'CRITICAL' ? 'text-red-400' : riskLevel === 'HIGH' ? 'text-orange-400' : 'text-cyber-green', bg: 'bg-cyber-red/15' },
            { label: 'Model Accuracy', value: `${(modelAccuracy * 100).toFixed(1)}%`, icon: Brain, sub: 'XGBoost NIDS', color: 'text-cyber-purple', bg: 'bg-cyber-purple/15' },
            { label: 'Datasets', value: datasets.length, icon: Database, sub: 'Total uploads', color: 'text-cyber-cyan', bg: 'bg-cyber-cyan/15' },
          ].map(({ label, value, icon: Icon, sub, color, bg }) => (
            <div key={label} className="stat-card">
              <div className="flex items-start justify-between mb-3"><div className={`w-10 h-10 rounded-xl ${bg} flex items-center justify-center`}><Icon className={`w-5 h-5 ${color}`} /></div></div>
              <p className="text-2xl font-bold text-white">{value}</p>
              <p className="text-xs text-gray-400 mt-1">{label}</p>
              <p className="text-[10px] text-gray-500 mt-0.5">{sub}</p>
            </div>
          ))}
        </div>

        {datasets.length > 0 && (
          <div className="glass-card p-5">
            <h3 className="text-sm font-semibold text-white mb-3">Recent Datasets</h3>
            <div className="space-y-2">
              {datasets.slice(0, 5).map(ds => (
                <div key={ds.id} onClick={() => ds.status === 'COMPLETED' && navigate(`/analysis/${ds.id}`)}
                  className="flex items-center justify-between bg-navy-700/30 rounded-lg p-3 border border-navy-600/30 hover:border-cyber-blue/30 transition-all cursor-pointer">
                  <div className="flex items-center gap-3">
                    <FileText className="w-4 h-4 text-cyber-blue" />
                    <div>
                      <p className="text-sm text-white font-medium">{ds.filename}</p>
                      <p className="text-[11px] text-gray-500">{ds.totalRecords ? `${ds.totalRecords.toLocaleString()} records` : ''} {ds.uploadedTime ? new Date(ds.uploadedTime).toLocaleDateString() : ''}</p>
                    </div>
                  </div>
                  <span className={`text-xs font-medium px-2 py-0.5 rounded-full ${ds.status === 'COMPLETED' ? 'text-cyber-green bg-cyber-green/10' : ds.status === 'FAILED' ? 'text-red-400 bg-red-400/10' : 'text-gray-400 bg-gray-400/10'}`}>{ds.status}</span>
                </div>
              ))}
            </div>
          </div>
        )}

        <div className="grid grid-cols-1 xl:grid-cols-3 gap-6">
          <div className="xl:col-span-2 glass-card p-5">
            <h3 className="text-sm font-semibold text-white mb-4">Attack Distribution</h3>
            <ResponsiveContainer width="100%" height={280}>
              <PieChart>
                <Pie data={pieData} cx="50%" cy="50%" innerRadius={60} outerRadius={100} paddingAngle={3} dataKey="value" label={({ name, percent }) => `${name}: ${(percent * 100).toFixed(1)}%`} labelLine={false}>
                  {pieData.map((e, i) => <Cell key={i} fill={e.color} />)}
                </Pie>
                <Tooltip contentStyle={{ backgroundColor: '#0f1729', border: '1px solid #1b2741', borderRadius: '8px', fontSize: '12px' }} />
              </PieChart>
            </ResponsiveContainer>
            <div className="flex flex-wrap gap-3 mt-2 justify-center">
              {pieData.map(d => (<div key={d.name} className="flex items-center gap-1.5"><div className="w-2.5 h-2.5 rounded-full" style={{ backgroundColor: d.color }} /><span className="text-[11px] text-gray-400">{d.name} ({d.value.toLocaleString()})</span></div>))}
            </div>
          </div>
          <div className="glass-card p-5">
            <h3 className="text-sm font-semibold text-white mb-1">AI Feature Importance</h3>
            <p className="text-xs text-gray-400 mb-4">SHAP-based global feature importance</p>
            {globalFeatures.length > 0 ? (
              <div className="space-y-3">
                {globalFeatures.slice(0, 7).map((f, i) => {
                  const mx = Math.max(...globalFeatures.map(g => g.impact || 0))
                  const pct = mx > 0 ? ((f.impact || 0) / mx) * 100 : 0
                  return (<div key={i}><div className="flex justify-between text-xs mb-1"><span className="text-gray-300">{f.name}</span><span className="text-gray-400 font-mono">{(f.impact || 0).toFixed(4)}</span></div><div className="h-2 bg-navy-700 rounded-full overflow-hidden"><div className="h-full rounded-full bg-gradient-to-r from-cyber-blue to-cyber-cyan transition-all duration-700" style={{ width: `${pct}%` }} /></div></div>)
                })}
              </div>
            ) : <p className="text-sm text-gray-500 text-center py-8">No SHAP data available</p>}
            <button onClick={() => navigate('/upload')} className="mt-5 w-full btn-secondary text-xs flex items-center justify-center gap-2">Upload New Dataset <ArrowUpRight className="w-3.5 h-3.5" /></button>
          </div>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          <div className="lg:col-span-2 glass-card p-5">
            <h3 className="text-sm font-semibold text-white mb-4">Attack Frequency</h3>
            {barData.length > 0 ? (
              <ResponsiveContainer width="100%" height={260}>
                <BarChart data={barData} layout="vertical">
                  <CartesianGrid strokeDasharray="3 3" stroke="#1b2741" horizontal={false} />
                  <XAxis type="number" stroke="#4b5563" fontSize={11} />
                  <YAxis dataKey="name" type="category" stroke="#4b5563" fontSize={11} width={90} />
                  <Tooltip contentStyle={{ backgroundColor: '#0f1729', border: '1px solid #1b2741', borderRadius: '8px', fontSize: '12px' }} />
                  <Bar dataKey="count" radius={[0, 4, 4, 0]}>{barData.map((e, i) => <Cell key={i} fill={e.color} />)}</Bar>
                </BarChart>
              </ResponsiveContainer>
            ) : <p className="text-sm text-gray-500 text-center py-8">No attacks detected</p>}
          </div>
          <div className="glass-card p-5">
            <h3 className="text-sm font-semibold text-white mb-4">Quick Actions</h3>
            <div className="space-y-3">
              <button onClick={() => navigate('/upload')} className="w-full btn-secondary text-xs flex items-center gap-3 py-3"><Upload className="w-4 h-4 text-cyber-blue" /> Upload New Dataset</button>
              <button onClick={() => navigate('/alerts')} className="w-full btn-secondary text-xs flex items-center gap-3 py-3"><ShieldAlert className="w-4 h-4 text-cyber-orange" /> View Alerts</button>
              <button onClick={() => navigate(`/analysis/${summary.datasetId}`)} className="w-full btn-secondary text-xs flex items-center gap-3 py-3"><TrendingUp className="w-4 h-4 text-cyber-purple" /> View Full Analysis</button>
            </div>
          </div>
        </div>

        {attackTypes.length > 0 && (
          <div className="glass-card p-5">
            <h3 className="text-sm font-semibold text-white mb-4">Attack Category Breakdown</h3>
            <div className="overflow-x-auto">
              <table className="w-full text-sm"><thead><tr className="border-b border-navy-600/60 text-xs text-gray-500 uppercase tracking-wider">
                <th className="text-left py-3 px-3 font-medium">Attack Type</th><th className="text-left py-3 px-3 font-medium">Count</th><th className="text-left py-3 px-3 font-medium">% of Attacks</th><th className="text-left py-3 px-3 font-medium">Distribution</th>
              </tr></thead><tbody>
                {attackTypes.map((at, i) => (
                  <tr key={i} className="border-b border-navy-600/30 hover:bg-navy-700/30 transition-colors">
                    <td className="py-2.5 px-3"><div className="flex items-center gap-2"><div className="w-2.5 h-2.5 rounded-full" style={{ backgroundColor: getAttackColor(at.type) }} /><span className="text-white text-xs font-medium">{at.type}</span></div></td>
                    <td className="py-2.5 px-3 text-gray-300 font-mono text-xs">{at.count?.toLocaleString()}</td>
                    <td className="py-2.5 px-3 text-gray-300 font-mono text-xs">{at.percentage?.toFixed(1)}%</td>
                    <td className="py-2.5 px-3"><div className="w-24 h-1.5 bg-navy-700 rounded-full overflow-hidden"><div className="h-full rounded-full bg-cyber-blue" style={{ width: `${at.percentage || 0}%` }} /></div></td>
                  </tr>
                ))}
              </tbody></table>
            </div>
          </div>
        )}
      </>)}
    </div>
  )
}
