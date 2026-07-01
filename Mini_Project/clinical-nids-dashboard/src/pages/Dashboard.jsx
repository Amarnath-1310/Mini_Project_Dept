import { useState } from 'react'
import {
  Network, AlertTriangle, ShieldAlert, Brain, Server,
  TrendingUp, TrendingDown, ArrowUpRight, RefreshCw
} from 'lucide-react'
import {
  AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer,
  LineChart, Line, PieChart, Pie, Cell, BarChart, Bar, Legend
} from 'recharts'
import { threatData, trafficData, attackDistribution, protocolUsage, aiFeatures } from '../data/mockData'
import { useNavigate } from 'react-router-dom'

const stats = [
  { label: 'Total Network Flows', value: '245,890', icon: Network, change: '+12.5%', up: true, color: 'text-cyber-blue', bg: 'bg-cyber-blue/15' },
  { label: 'Detected Threats', value: '342', icon: AlertTriangle, change: '-8.2%', up: false, color: 'text-cyber-orange', bg: 'bg-cyber-orange/15' },
  { label: 'Critical Alerts', value: '18', icon: ShieldAlert, change: '+3.1%', up: true, color: 'text-cyber-red', bg: 'bg-cyber-red/15' },
  { label: 'Model Accuracy', value: '98.7%', icon: Brain, change: '+0.3%', up: true, color: 'text-cyber-purple', bg: 'bg-cyber-purple/15' },
  { label: 'Active Devices', value: '156', icon: Server, change: '+5', up: true, color: 'text-cyber-cyan', bg: 'bg-cyber-cyan/15' },
]

function SeverityBadge({ severity }) {
  const cls = severity === 'CRITICAL' ? 'severity-critical' : severity === 'HIGH' ? 'severity-high' : severity === 'MEDIUM' ? 'severity-medium' : 'severity-low'
  return <span className={cls}>{severity}</span>
}

function StatusBadge({ status }) {
  const colors = {
    Blocked: 'text-cyber-green bg-cyber-green/10',
    Monitoring: 'text-cyber-blue bg-cyber-blue/10',
    Investigating: 'text-cyber-orange bg-cyber-orange/10',
    Quarantined: 'text-cyber-purple bg-cyber-purple/10',
  }
  return <span className={`text-xs font-medium px-2 py-0.5 rounded-full ${colors[status] || 'text-gray-400 bg-gray-400/10'}`}>{status}</span>
}

export default function Dashboard() {
  const navigate = useNavigate()
  const [activeTab, setActiveTab] = useState('all')

  return (
    <div className="space-y-6 animate-fade-in">
      {/* Page header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-white">Security Dashboard</h1>
          <p className="text-sm text-gray-400 mt-1">Real-time network intrusion detection overview</p>
        </div>
        <div className="flex items-center gap-3">
          <span className="text-xs text-gray-500">Last updated: 2 min ago</span>
          <button className="btn-secondary flex items-center gap-2 text-xs py-2">
            <RefreshCw className="w-3.5 h-3.5" /> Refresh
          </button>
        </div>
      </div>

      {/* Stat cards */}
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

      {/* Traffic graph + AI panel row */}
      <div className="grid grid-cols-1 xl:grid-cols-3 gap-6">
        {/* Traffic graph */}
        <div className="xl:col-span-2 glass-card p-5">
          <div className="flex items-center justify-between mb-4">
            <div>
              <h3 className="text-sm font-semibold text-white">Network Traffic Activity</h3>
              <p className="text-xs text-gray-400">24-hour incoming/outgoing flow</p>
            </div>
            <div className="flex gap-2">
              {['24h', '7d', '30d'].map(t => (
                <button key={t} className={`px-3 py-1 rounded-lg text-xs font-medium transition-all ${t === '24h' ? 'bg-cyber-blue/20 text-cyber-blue' : 'text-gray-400 hover:text-gray-200'}`}>{t}</button>
              ))}
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

        {/* AI Explainability panel */}
        <div className="glass-card p-5">
          <h3 className="text-sm font-semibold text-white mb-1">AI Prediction Explanation</h3>
          <p className="text-xs text-gray-400 mb-4">Why was this traffic flagged?</p>

          <div className="bg-navy-700/40 rounded-lg p-3 mb-4 border border-navy-600/40">
            <div className="flex justify-between items-center mb-1">
              <span className="text-xs text-gray-400">Detected Attack</span>
              <span className="text-xs font-semibold text-cyber-orange">Port Scanning</span>
            </div>
            <div className="flex justify-between items-center">
              <span className="text-xs text-gray-400">Confidence</span>
              <span className="text-sm font-bold text-white">94%</span>
            </div>
          </div>

          <p className="text-[10px] text-gray-500 uppercase font-semibold tracking-wider mb-3">Feature Importance (SHAP)</p>
          <div className="space-y-3">
            {aiFeatures.map(({ name, importance }) => (
              <div key={name}>
                <div className="flex justify-between text-xs mb-1">
                  <span className="text-gray-300">{name}</span>
                  <span className="text-gray-400 font-mono">{importance}%</span>
                </div>
                <div className="h-2 bg-navy-700 rounded-full overflow-hidden">
                  <div
                    className="h-full rounded-full bg-gradient-to-r from-cyber-blue to-cyber-cyan transition-all duration-700"
                    style={{ width: `${importance}%` }}
                  />
                </div>
              </div>
            ))}
          </div>

          <button
            onClick={() => navigate('/monitoring')}
            className="mt-5 w-full btn-secondary text-xs flex items-center justify-center gap-2"
          >
            View All Detections <ArrowUpRight className="w-3.5 h-3.5" />
          </button>
        </div>
      </div>

      {/* Attack Analytics Row */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Pie chart */}
        <div className="glass-card p-5">
          <h3 className="text-sm font-semibold text-white mb-4">Attack Distribution</h3>
          <ResponsiveContainer width="100%" height={200}>
            <PieChart>
              <Pie data={attackDistribution} cx="50%" cy="50%" innerRadius={55} outerRadius={80} paddingAngle={3} dataKey="value">
                {attackDistribution.map((entry, i) => (
                  <Cell key={i} fill={entry.color} />
                ))}
              </Pie>
              <Tooltip contentStyle={{ backgroundColor: '#0f1729', border: '1px solid #1b2741', borderRadius: '8px', fontSize: '12px' }} />
            </PieChart>
          </ResponsiveContainer>
          <div className="flex flex-wrap gap-3 mt-2 justify-center">
            {attackDistribution.map(d => (
              <div key={d.name} className="flex items-center gap-1.5">
                <div className="w-2.5 h-2.5 rounded-full" style={{ backgroundColor: d.color }} />
                <span className="text-[11px] text-gray-400">{d.name}</span>
              </div>
            ))}
          </div>
        </div>

        {/* Protocol bar chart */}
        <div className="glass-card p-5">
          <h3 className="text-sm font-semibold text-white mb-4">Protocol Usage</h3>
          <ResponsiveContainer width="100%" height={220}>
            <BarChart data={protocolUsage} layout="vertical">
              <CartesianGrid strokeDasharray="3 3" stroke="#1b2741" horizontal={false} />
              <XAxis type="number" stroke="#4b5563" fontSize={11} />
              <YAxis dataKey="name" type="category" stroke="#4b5563" fontSize={11} width={50} />
              <Tooltip contentStyle={{ backgroundColor: '#0f1729', border: '1px solid #1b2741', borderRadius: '8px', fontSize: '12px' }} />
              <Bar dataKey="count" fill="#3b82f6" radius={[0, 4, 4, 0]} />
            </BarChart>
          </ResponsiveContainer>
        </div>

        {/* Mini threat stats */}
        <div className="glass-card p-5">
          <h3 className="text-sm font-semibold text-white mb-4">Threat Breakdown (24h)</h3>
          <div className="space-y-3">
            {[
              { label: 'DDoS Attempts', count: 87, color: 'bg-cyber-red', pct: 'w-[72%]' },
              { label: 'Port Scans', count: 64, color: 'bg-cyber-orange', pct: 'w-[53%]' },
              { label: 'Brute Force', count: 52, color: 'bg-cyber-blue', pct: 'w-[43%]' },
              { label: 'Malware C2', count: 38, color: 'bg-cyber-purple', pct: 'w-[31%]' },
              { label: 'SQL Injection', count: 29, color: 'bg-cyber-cyan', pct: 'w-[24%]' },
            ].map(t => (
              <div key={t.label}>
                <div className="flex justify-between text-xs mb-1.5">
                  <span className="text-gray-300">{t.label}</span>
                  <span className="text-gray-400 font-mono">{t.count}</span>
                </div>
                <div className="h-1.5 bg-navy-700 rounded-full overflow-hidden">
                  <div className={`h-full rounded-full ${t.color} ${t.pct}`} />
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Threat Detection Table */}
      <div className="glass-card p-5">
        <div className="flex items-center justify-between mb-4">
          <div>
            <h3 className="text-sm font-semibold text-white">Recent Threat Detections</h3>
            <p className="text-xs text-gray-400">Latest AI-classified network events</p>
          </div>
          <div className="flex gap-2">
            {['all', 'critical', 'high'].map(tab => (
              <button
                key={tab}
                onClick={() => setActiveTab(tab)}
                className={`px-3 py-1 rounded-lg text-xs font-medium capitalize transition-all ${activeTab === tab ? 'bg-cyber-blue/20 text-cyber-blue' : 'text-gray-400 hover:text-gray-200'}`}
              >
                {tab}
              </button>
            ))}
          </div>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-navy-600/60 text-xs text-gray-500 uppercase tracking-wider">
                <th className="text-left py-3 px-3 font-medium">Time</th>
                <th className="text-left py-3 px-3 font-medium">Source</th>
                <th className="text-left py-3 px-3 font-medium">Destination</th>
                <th className="text-left py-3 px-3 font-medium">Protocol</th>
                <th className="text-left py-3 px-3 font-medium">Attack Type</th>
                <th className="text-left py-3 px-3 font-medium">Confidence</th>
                <th className="text-left py-3 px-3 font-medium">Severity</th>
                <th className="text-left py-3 px-3 font-medium">Status</th>
              </tr>
            </thead>
            <tbody>
              {threatData
                .filter(t => activeTab === 'all' || (activeTab === 'critical' && t.severity === 'CRITICAL') || (activeTab === 'high' && t.severity === 'HIGH'))
                .map(t => (
                <tr key={t.id} className="border-b border-navy-600/30 hover:bg-navy-700/30 transition-colors cursor-pointer" onClick={() => navigate('/threats/1')}>
                  <td className="py-3 px-3 text-gray-300 font-mono text-xs">{t.time}</td>
                  <td className="py-3 px-3 text-gray-300 text-xs">{t.source}</td>
                  <td className="py-3 px-3 text-gray-300 text-xs">{t.destination}</td>
                  <td className="py-3 px-3"><span className="text-xs bg-navy-700 text-gray-300 px-2 py-0.5 rounded">{t.protocol}</span></td>
                  <td className="py-3 px-3 text-white text-xs font-medium">{t.attackType}</td>
                  <td className="py-3 px-3">
                    <div className="flex items-center gap-2">
                      <div className="w-12 h-1.5 bg-navy-700 rounded-full overflow-hidden">
                        <div className="h-full rounded-full bg-cyber-blue" style={{ width: `${t.confidence}%` }} />
                      </div>
                      <span className="text-xs text-gray-300 font-mono">{t.confidence}%</span>
                    </div>
                  </td>
                  <td className="py-3 px-3"><SeverityBadge severity={t.severity} /></td>
                  <td className="py-3 px-3"><StatusBadge status={t.status} /></td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  )
}
