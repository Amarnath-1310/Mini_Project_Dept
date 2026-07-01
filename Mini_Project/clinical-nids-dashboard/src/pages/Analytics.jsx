import { useState, useEffect } from 'react'
import { BarChart3, TrendingUp, Shield, AlertTriangle, Brain, AlertCircle } from 'lucide-react'
import {
  PieChart, Pie, Cell, BarChart, Bar, XAxis, YAxis, CartesianGrid,
  Tooltip, ResponsiveContainer
} from 'recharts'
import { getLatestDashboardSummary } from '../data/api'

const COLORS = ['#ef4444', '#f97316', '#8b5cf6', '#06b6d4', '#eab308', '#ec4899', '#14b8a6', '#3b82f6']

export default function Analytics() {
  const [summary, setSummary] = useState(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => { loadAnalytics() }, [])

  async function loadAnalytics() {
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
  const modelAccuracy = summary?.modelAccuracy || 0
  const riskLevel = summary?.riskLevel || 'N/A'
  const totalAttacks = summary?.attackTraffic || 0
  const totalRecords = summary?.totalRecords || 0

  const pieData = attackTypes.map((a, i) => ({ name: a.type, value: a.count, color: COLORS[i % COLORS.length] }))
  const barData = attackTypes.map((a, i) => ({ name: a.type, count: a.count, color: COLORS[i % COLORS.length] }))

  // Categorize attacks
  const dosAttacks = attackTypes.filter(a => ['DDoS', 'DoS'].includes(a.type)).reduce((s, a) => s + (a.count || 0), 0)
  const probeAttacks = attackTypes.filter(a => ['PortScan', 'Brute Force'].includes(a.type)).reduce((s, a) => s + (a.count || 0), 0)
  const webAttacks = attackTypes.filter(a => ['Web Attack', 'Infiltration', 'Botnet'].includes(a.type)).reduce((s, a) => s + (a.count || 0), 0)

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="text-center"><div className="w-8 h-8 border-2 border-cyber-blue border-t-transparent rounded-full animate-spin mx-auto mb-3" /><p className="text-sm text-gray-400">Loading analytics...</p></div>
      </div>
    )
  }

  return (
    <div className="space-y-6 animate-fade-in">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-white">Security Analytics</h1>
          <p className="text-sm text-gray-400 mt-1">{hasData ? `Analysis of: ${summary.filename}` : 'No analysis data available'}</p>
        </div>
      </div>

      {!hasData && (
        <div className="glass-card p-12 text-center">
          <AlertCircle className="w-16 h-16 text-cyber-blue mx-auto mb-4 opacity-50" />
          <h3 className="text-lg font-semibold text-white mb-2">No Analytics Data</h3>
          <p className="text-sm text-gray-400">Upload and analyze a dataset to see analytics.</p>
        </div>
      )}

      {hasData && (<>
        {/* KPI Cards */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          <div className="stat-card">
            <div className="flex items-center gap-3 mb-3"><div className="w-10 h-10 rounded-xl bg-cyber-red/15 flex items-center justify-center"><AlertTriangle className="w-5 h-5 text-cyber-red" /></div></div>
            <p className="text-2xl font-bold text-white">{totalAttacks.toLocaleString()}</p>
            <p className="text-xs text-gray-400 mt-1">Total Attacks Detected</p>
          </div>
          <div className="stat-card">
            <div className="flex items-center gap-3 mb-3"><div className="w-10 h-10 rounded-xl bg-cyber-purple/15 flex items-center justify-center"><BarChart3 className="w-5 h-5 text-cyber-purple" /></div></div>
            <p className="text-2xl font-bold text-white">{attackTypes.length}</p>
            <p className="text-xs text-gray-400 mt-1">Attack Categories</p>
          </div>
          <div className="stat-card">
            <div className="flex items-center gap-3 mb-3"><div className="w-10 h-10 rounded-xl bg-cyber-blue/15 flex items-center justify-center"><Brain className="w-5 h-5 text-cyber-blue" /></div></div>
            <p className="text-2xl font-bold text-white">{(modelAccuracy * 100).toFixed(1)}%</p>
            <p className="text-xs text-gray-400 mt-1">Model Accuracy</p>
          </div>
          <div className="stat-card">
            <div className="flex items-center gap-3 mb-3"><div className="w-10 h-10 rounded-xl bg-cyber-orange/15 flex items-center justify-center"><Shield className="w-5 h-5 text-cyber-orange" /></div></div>
            <p className="text-2xl font-bold text-white">{riskLevel}</p>
            <p className="text-xs text-gray-400 mt-1">Risk Level</p>
          </div>
        </div>

        {/* Charts Row */}
        <div className="grid grid-cols-1 xl:grid-cols-2 gap-6">
          <div className="glass-card p-5">
            <h3 className="text-sm font-semibold text-white mb-4">Attack Distribution</h3>
            {pieData.length > 0 ? (
              <ResponsiveContainer width="100%" height={280}>
                <PieChart>
                  <Pie data={pieData} cx="50%" cy="50%" innerRadius={55} outerRadius={95} paddingAngle={3} dataKey="value" label={({ name, percent }) => `${name}: ${(percent * 100).toFixed(1)}%`} labelLine={false}>
                    {pieData.map((e, i) => <Cell key={i} fill={e.color} />)}
                  </Pie>
                  <Tooltip contentStyle={{ backgroundColor: '#0f1729', border: '1px solid #1b2741', borderRadius: '8px', fontSize: '12px' }} />
                </PieChart>
              </ResponsiveContainer>
            ) : <p className="text-sm text-gray-500 text-center py-8">No attack data</p>}
          </div>
          <div className="glass-card p-5">
            <h3 className="text-sm font-semibold text-white mb-4">Attack Counts</h3>
            {barData.length > 0 ? (
              <ResponsiveContainer width="100%" height={280}>
                <BarChart data={barData}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#1b2741" />
                  <XAxis dataKey="name" stroke="#4b5563" fontSize={11} angle={-20} textAnchor="end" height={60} />
                  <YAxis stroke="#4b5563" fontSize={11} />
                  <Tooltip contentStyle={{ backgroundColor: '#0f1729', border: '1px solid #1b2741', borderRadius: '8px', fontSize: '12px' }} />
                  <Bar dataKey="count" radius={[4, 4, 0, 0]}>{barData.map((e, i) => <Cell key={i} fill={e.color} />)}</Bar>
                </BarChart>
              </ResponsiveContainer>
            ) : <p className="text-sm text-gray-500 text-center py-8">No attack data</p>}
          </div>
        </div>

        {/* Attack Categories Summary */}
        <div className="glass-card p-5">
          <h3 className="text-sm font-semibold text-white mb-4">Attack Category Summary</h3>
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
            <div className="bg-navy-700/30 rounded-lg p-4 border border-navy-600/30">
              <p className="text-xs text-gray-400 mb-1">DoS / DDoS Attacks</p>
              <p className="text-xl font-bold text-white">{dosAttacks.toLocaleString()}</p>
              <p className="text-[10px] text-gray-500 mt-1">{totalAttacks > 0 ? ((dosAttacks / totalAttacks) * 100).toFixed(1) : 0}% of total attacks</p>
            </div>
            <div className="bg-navy-700/30 rounded-lg p-4 border border-navy-600/30">
              <p className="text-xs text-gray-400 mb-1">Probe / Scanning Attacks</p>
              <p className="text-xl font-bold text-white">{probeAttacks.toLocaleString()}</p>
              <p className="text-[10px] text-gray-500 mt-1">{totalAttacks > 0 ? ((probeAttacks / totalAttacks) * 100).toFixed(1) : 0}% of total attacks</p>
            </div>
            <div className="bg-navy-700/30 rounded-lg p-4 border border-navy-600/30">
              <p className="text-xs text-gray-400 mb-1">Web / Infiltration Attacks</p>
              <p className="text-xl font-bold text-white">{webAttacks.toLocaleString()}</p>
              <p className="text-[10px] text-gray-500 mt-1">{totalAttacks > 0 ? ((webAttacks / totalAttacks) * 100).toFixed(1) : 0}% of total attacks</p>
            </div>
          </div>
        </div>

        {/* Severity Distribution */}
        <div className="glass-card p-5">
          <h3 className="text-sm font-semibold text-white mb-4">Severity Distribution</h3>
          <div className="grid grid-cols-2 sm:grid-cols-5 gap-3">
            {Object.entries(severityDist).map(([sev, count]) => (
              <div key={sev} className="bg-navy-700/30 rounded-lg p-3 border border-navy-600/30 text-center">
                <p className="text-lg font-bold text-white">{count?.toLocaleString?.() || 0}</p>
                <p className="text-[10px] text-gray-400 mt-1">{sev}</p>
              </div>
            ))}
          </div>
        </div>
      </>)}
    </div>
  )
}
