import { useState, useEffect } from 'react'
import {
  Network, AlertTriangle, ShieldAlert, Brain, Server,
  TrendingUp, TrendingDown, ArrowUpRight, RefreshCw,
  Database, Upload, FileText
} from 'lucide-react'
import {
  AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer,
  PieChart, Pie, Cell, BarChart, Bar, Legend
} from 'recharts'
import { trafficData, attackDistribution as mockAttackDist, aiFeatures } from '../data/mockData'
import { getDatasets, getAnalysis } from '../data/api'
import { useNavigate } from 'react-router-dom'

const ATTACK_COLORS = {
  'Benign': '#22c55e', 'DDoS': '#ef4444', 'DoS': '#f97316',
  'PortScan': '#8b5cf6', 'Brute Force': '#06b6d4', 'Botnet': '#eab308',
  'Infiltration': '#ec4899', 'Web Attack': '#14b8a6',
}

function getAttackColor(name) {
  return ATTACK_COLORS[name] || '#3b82f6'
}

function SeverityBadge({ severity }) {
  const cls = severity === 'CRITICAL' ? 'severity-critical' : severity === 'HIGH' ? 'severity-high' : severity === 'MEDIUM' ? 'severity-medium' : 'severity-low'
  return <span className={cls}>{severity}</span>
}

export default function Dashboard() {
  const navigate = useNavigate()
  const [datasets, setDatasets] = useState([])
  const [latestAnalysis, setLatestAnalysis] = useState(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    fetchData()
  }, [])

  async function fetchData() {
    setLoading(true)
    try {
      const dsList = await getDatasets()
      setDatasets(dsList || [])
      if (dsList && dsList.length > 0) {
        const latest = dsList[0]
        if (latest.status === 'COMPLETED' && latest.id) {
          const analysis = await getAnalysis(latest.id)
          setLatestAnalysis(analysis)
        }
      }
    } catch {
      console.warn('Backend unavailable, using mock data')
    }
    setLoading(false)
  }

  const hasRealData = !!latestAnalysis
  const summary = latestAnalysis?.security_summary || latestAnalysis || {}
  const attackDist = latestAnalysis?.attack_distribution || latestAnalysis?.attackDistribution || {}
  const globalFeatures = latestAnalysis?.global_feature_importance || latestAnalysis?.globalFeatureImportance || aiFeatures.map(f => ({ name: f.name, impact: f.importance / 100, level: f.importance > 70 ? 'HIGH' : f.importance > 50 ? 'MEDIUM' : 'LOW' }))
  const predictions = latestAnalysis?.predictions || []

  const totalFlows = summary.total_traffic || summary.totalRecords || 245890
  const totalAttacks = summary.attack_count || summary.attackCount || 342
  const modelAccuracy = summary.model_accuracy || summary.modelAccuracy || 0.987
  const riskLevel = summary.risk_level || summary.riskLevel || 'LOW'

  const stats = [
    { label: 'Total Network Flows', value: totalFlows.toLocaleString(), icon: Network, change: hasRealData ? 'From dataset' : 'Mock data', up: true, color: 'text-cyber-blue', bg: 'bg-cyber-blue/15' },
    { label: 'Detected Threats', value: totalAttacks.toLocaleString(), icon: AlertTriangle, change: hasRealData ? `${((totalAttacks / totalFlows) * 100).toFixed(1)}%` : 'Mock', up: false, color: 'text-cyber-orange', bg: 'bg-cyber-orange/15' },
    { label: 'Risk Level', value: riskLevel, icon: ShieldAlert, change: hasRealData ? 'From analysis' : 'Mock', up: riskLevel !== 'CRITICAL', color: 'text-cyber-red', bg: 'bg-cyber-red/15' },
    { label: 'Model Accuracy', value: `${(modelAccuracy * 100).toFixed(1)}%`, icon: Brain, change: '+0.3%', up: true, color: 'text-cyber-purple', bg: 'bg-cyber-purple/15' },
    { label: 'Datasets Analyzed', value: datasets.length || 0, icon: Database, change: 'Total uploads', up: true, color: 'text-cyber-cyan', bg: 'bg-cyber-cyan/15' },
  ]

  const pieData = Object.keys(attackDist).length > 0
    ? Object.entries(attackDist).map(([name, value]) => ({
        name, value: typeof value === 'number' ? value : 0, color: getAttackColor(name)
      }))
    : mockAttackDist

  const barData = pieData.filter(d => d.name !== 'Benign')

  return (
    <div className="space-y-6 animate-fade-in">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-white">Security Dashboard</h1>
          <p className="text-sm text-gray-400 mt-1">
            {hasRealData ? `Latest analysis: ${latestAnalysis?.filename || 'dataset'}` : 'Upload a dataset to see real analysis results'}
          </p>
        </div>
        <div className="flex items-center gap-3">
          <button onClick={() => navigate('/upload')} className="btn-primary flex items-center gap-2 text-xs py-2">
            <Upload className="w-3.5 h-3.5" /> Upload Dataset
          </button>
          <button onClick={fetchData} className="btn-secondary flex items-center gap-2 text-xs py-2">
            <RefreshCw className="w-3.5 h-3.5" /> Refresh
          </button>
        </div>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-4">
        {stats.map(({ label, value, icon: Icon, change, up, color, bg }) => (
          <div key={label} className="stat-card">
            <div className="flex items-start justify-between mb-3">
              <div className={`w-10 h-10 rounded-xl ${bg} flex items-center justify-center`}>
                <Icon className={`w-5 h-5 ${color}`} />
              </div>
              <div className={`flex items-center gap-1 text-xs font-medium ${up ? 'text-cyber-green' : 'text-cyber-orange'}`}>
                {up ? <TrendingUp className="w-3 h-3" /> : <TrendingDown className="w-3 h-3" />}
                {change}
              </div>
            </div>
            <p className="text-2xl font-bold text-white">{value}</p>
            <p className="text-xs text-gray-400 mt-1">{label}</p>
          </div>
        ))}
      </div>

      {datasets.length > 0 && (
        <div className="glass-card p-5">
          <h3 className="text-sm font-semibold text-white mb-3">Recent Datasets</h3>
          <div className="space-y-2">
            {datasets.slice(0, 5).map((ds) => (
              <div key={ds.id}
                onClick={() => ds.status === 'COMPLETED' && navigate(`/analysis/${ds.id}`)}
                className="flex items-center justify-between bg-navy-700/30 rounded-lg p-3 border border-navy-600/30 hover:border-cyber-blue/30 transition-all cursor-pointer">
                <div className="flex items-center gap-3">
                  <FileText className="w-4 h-4 text-cyber-blue" />
                  <div>
                    <p className="text-sm text-white font-medium">{ds.filename}</p>
                    <p className="text-[11px] text-gray-500">
                      {ds.totalRecords ? `${ds.totalRecords.toLocaleString()} records` : 'Unknown size'} · {ds.uploadedTime ? new Date(ds.uploadedTime).toLocaleDateString() : ''}
                    </p>
                  </div>
                </div>
                <span className={`text-xs font-medium px-2 py-0.5 rounded-full ${
                  ds.status === 'COMPLETED' ? 'text-cyber-green bg-cyber-green/10' :
                  ds.status === 'FAILED' ? 'text-red-400 bg-red-400/10' :
                  ds.status === 'ANALYZING' ? 'text-cyber-blue bg-cyber-blue/10' :
                  'text-gray-400 bg-gray-400/10'
                }`}>{ds.status}</span>
              </div>
            ))}
          </div>
        </div>
      )}

      <div className="grid grid-cols-1 xl:grid-cols-3 gap-6">
        <div className="xl:col-span-2 glass-card p-5">
          <div className="flex items-center justify-between mb-4">
            <div>
              <h3 className="text-sm font-semibold text-white">Network Traffic Activity</h3>
              <p className="text-xs text-gray-400">24-hour incoming/outgoing flow</p>
            </div>
          </div>
          <ResponsiveContainer width="100%" height={280}>
            <AreaChart data={trafficData}>
              <defs>
                <linearGradient id="gIn" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="5%" stopColor="#3b82f6" stopOpacity={0.3} />
                  <stop offset="95%" stopColor="#3b82f6" stopOpacity={0} />
                </linearGradient>
                <linearGradient id="gOut" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="5%" stopColor="#22c55e" stopOpacity={0.3} />
                  <stop offset="95%" stopColor="#22c55e" stopOpacity={0} />
                </linearGradient>
              </defs>
              <CartesianGrid strokeDasharray="3 3" stroke="#1b2741" />
              <XAxis dataKey="time" stroke="#4b5563" fontSize={11} />
              <YAxis stroke="#4b5563" fontSize={11} />
              <Tooltip contentStyle={{ backgroundColor: '#0f1729', border: '1px solid #1b2741', borderRadius: '8px', fontSize: '12px' }} />
              <Area type="monotone" dataKey="incoming" stroke="#3b82f6" fill="url(#gIn)" strokeWidth={2} />
              <Area type="monotone" dataKey="outgoing" stroke="#22c55e" fill="url(#gOut)" strokeWidth={2} />
            </AreaChart>
          </ResponsiveContainer>
        </div>

        <div className="glass-card p-5">
          <h3 className="text-sm font-semibold text-white mb-1">AI Feature Importance</h3>
          <p className="text-xs text-gray-400 mb-4">SHAP-based global feature importance</p>
          <div className="space-y-3">
            {globalFeatures.slice(0, 7).map((f, i) => {
              const name = f.name || f.feature
              const importance = typeof f.impact === 'number' ? Math.min(100, f.impact * 100) : (f.importance || 0)
              return (
                <div key={i}>
                  <div className="flex justify-between text-xs mb-1">
                    <span className="text-gray-300">{name}</span>
                    <span className="text-gray-400 font-mono">{importance.toFixed(1)}%</span>
                  </div>
                  <div className="h-2 bg-navy-700 rounded-full overflow-hidden">
                    <div
                      className="h-full rounded-full bg-gradient-to-r from-cyber-blue to-cyber-cyan transition-all duration-700"
                      style={{ width: `${importance}%` }}
                    />
                  </div>
                </div>
              )
            })}
          </div>
          <button
            onClick={() => navigate('/upload')}
            className="mt-5 w-full btn-secondary text-xs flex items-center justify-center gap-2"
          >
            Upload New Dataset <ArrowUpRight className="w-3.5 h-3.5" />
          </button>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <div className="glass-card p-5">
          <h3 className="text-sm font-semibold text-white mb-4">Attack Distribution</h3>
          <ResponsiveContainer width="100%" height={200}>
            <PieChart>
              <Pie data={pieData} cx="50%" cy="50%" innerRadius={55} outerRadius={80} paddingAngle={3} dataKey="value">
                {pieData.map((entry, i) => (
                  <Cell key={i} fill={entry.color} />
                ))}
              </Pie>
              <Tooltip contentStyle={{ backgroundColor: '#0f1729', border: '1px solid #1b2741', borderRadius: '8px', fontSize: '12px' }} />
            </PieChart>
          </ResponsiveContainer>
          <div className="flex flex-wrap gap-3 mt-2 justify-center">
            {pieData.map(d => (
              <div key={d.name} className="flex items-center gap-1.5">
                <div className="w-2.5 h-2.5 rounded-full" style={{ backgroundColor: d.color }} />
                <span className="text-[11px] text-gray-400">{d.name}</span>
              </div>
            ))}
          </div>
        </div>

        <div className="glass-card p-5">
          <h3 className="text-sm font-semibold text-white mb-4">Attack Frequency</h3>
          {barData.length > 0 ? (
            <ResponsiveContainer width="100%" height={220}>
              <BarChart data={barData} layout="vertical">
                <CartesianGrid strokeDasharray="3 3" stroke="#1b2741" horizontal={false} />
                <XAxis type="number" stroke="#4b5563" fontSize={11} />
                <YAxis dataKey="name" type="category" stroke="#4b5563" fontSize={11} width={80} />
                <Tooltip contentStyle={{ backgroundColor: '#0f1729', border: '1px solid #1b2741', borderRadius: '8px', fontSize: '12px' }} />
                <Bar dataKey={barData[0]?.count !== undefined ? 'count' : 'value'} radius={[0, 4, 4, 0]}>
                  {barData.map((entry, i) => <Cell key={i} fill={entry.color} />)}
                </Bar>
              </BarChart>
            </ResponsiveContainer>
          ) : (
            <p className="text-sm text-gray-500 text-center py-8">No attacks detected</p>
          )}
        </div>

        <div className="glass-card p-5">
          <h3 className="text-sm font-semibold text-white mb-4">Quick Actions</h3>
          <div className="space-y-3">
            <button onClick={() => navigate('/upload')} className="w-full btn-secondary text-xs flex items-center gap-3 py-3">
              <Upload className="w-4 h-4 text-cyber-blue" /> Upload New Dataset
            </button>
            <button onClick={() => navigate('/alerts')} className="w-full btn-secondary text-xs flex items-center gap-3 py-3">
              <ShieldAlert className="w-4 h-4 text-cyber-orange" /> View Alerts
            </button>
            <button onClick={() => navigate('/analytics')} className="w-full btn-secondary text-xs flex items-center gap-3 py-3">
              <TrendingUp className="w-4 h-4 text-cyber-purple" /> Attack Analytics
            </button>
          </div>
        </div>
      </div>

      {predictions.length > 0 && (
        <div className="glass-card p-5">
          <div className="flex items-center justify-between mb-4">
            <div>
              <h3 className="text-sm font-semibold text-white">Recent Predictions</h3>
              <p className="text-xs text-gray-400">Latest AI-classified network flows from dataset analysis</p>
            </div>
            <button onClick={() => navigate('/upload')} className="btn-secondary text-xs py-1.5">
              View Full Analysis
            </button>
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
                {predictions.slice(0, 10).map((p, i) => {
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
                      <td className="py-2.5 px-3"><SeverityBadge severity={severity} /></td>
                      <td className="py-2.5 px-3">
                        <span className={`text-xs font-medium px-2 py-0.5 rounded-full ${isAttack ? 'text-cyber-red bg-cyber-red/10' : 'text-cyber-green bg-cyber-green/10'}`}>
                          {isAttack ? 'Detected' : 'Normal'}
                        </span>
                      </td>
                    </tr>
                  )
                })}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </div>
  )
}
