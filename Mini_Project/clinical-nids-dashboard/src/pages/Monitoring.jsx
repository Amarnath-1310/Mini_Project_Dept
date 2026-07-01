import { useState } from 'react'
import {
  Activity, Wifi, WifiOff, Zap, RefreshCw, Filter, Eye
} from 'lucide-react'
import {
  AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer,
  LineChart, Line, Legend
} from 'recharts'
import { threatData, trafficData, aiFeatures } from '../data/mockData'
import { useNavigate } from 'react-router-dom'

const liveData = Array.from({ length: 60 }, (_, i) => ({
  sec: `${i}s`,
  packets: Math.floor(Math.random() * 800 + 200),
  threats: Math.floor(Math.random() * 30),
  bandwidth: Math.floor(Math.random() * 500 + 100),
}))

export default function Monitoring() {
  const navigate = useNavigate()
  const [filter, setFilter] = useState('all')

  return (
    <div className="space-y-6 animate-fade-in">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-white">Real-Time Threat Monitoring</h1>
          <p className="text-sm text-gray-400 mt-1">Live network traffic analysis and attack detection</p>
        </div>
        <div className="flex items-center gap-3">
          <div className="flex items-center gap-2 bg-cyber-green/10 border border-cyber-green/30 rounded-full px-3 py-1.5">
            <Activity className="w-3.5 h-3.5 text-cyber-green animate-pulse" />
            <span className="text-xs font-semibold text-cyber-green">Live</span>
          </div>
          <button className="btn-secondary flex items-center gap-2 text-xs py-2">
            <Filter className="w-3.5 h-3.5" /> Filter
          </button>
          <button className="btn-secondary flex items-center gap-2 text-xs py-2">
            <RefreshCw className="w-3.5 h-3.5" /> Refresh
          </button>
        </div>
      </div>

      {/* Live metrics */}
      <div className="grid grid-cols-1 sm:grid-cols-4 gap-4">
        {[
          { label: 'Active Connections', value: '12,847', icon: Wifi, color: 'text-cyber-blue' },
          { label: 'Blocked IPs', value: '89', icon: WifiOff, color: 'text-cyber-red' },
          { label: 'Events/sec', value: '2,340', icon: Zap, color: 'text-cyber-orange' },
          { label: 'Detection Rate', value: '99.2%', icon: Activity, color: 'text-cyber-green' },
        ].map(({ label, value, icon: Icon, color }) => (
          <div key={label} className="stat-card flex items-center gap-4">
            <div className={`w-10 h-10 rounded-xl bg-navy-700/60 flex items-center justify-center`}>
              <Icon className={`w-5 h-5 ${color}`} />
            </div>
            <div>
              <p className="text-xl font-bold text-white">{value}</p>
              <p className="text-xs text-gray-400">{label}</p>
            </div>
          </div>
        ))}
      </div>

      {/* Live traffic chart */}
      <div className="glass-card p-5">
        <div className="flex items-center justify-between mb-4">
          <div>
            <h3 className="text-sm font-semibold text-white">Live Packet Flow</h3>
            <p className="text-xs text-gray-400">Last 60 seconds — real-time stream</p>
          </div>
          <div className="flex items-center gap-4 text-xs">
            <span className="flex items-center gap-1.5"><span className="w-2 h-2 rounded-full bg-cyber-blue" />Packets</span>
            <span className="flex items-center gap-1.5 text-gray-400"><span className="w-2 h-2 rounded-full bg-cyber-red" />Threats</span>
          </div>
        </div>
        <ResponsiveContainer width="100%" height={250}>
          <LineChart data={liveData}>
            <CartesianGrid strokeDasharray="3 3" stroke="#1b2741" />
            <XAxis dataKey="sec" stroke="#4b5563" fontSize={10} interval={9} />
            <YAxis stroke="#4b5563" fontSize={10} />
            <Tooltip contentStyle={{ backgroundColor: '#0f1729', border: '1px solid #1b2741', borderRadius: '8px', fontSize: '12px' }} />
            <Line type="monotone" dataKey="packets" stroke="#3b82f6" strokeWidth={2} dot={false} />
            <Line type="monotone" dataKey="threats" stroke="#ef4444" strokeWidth={1.5} dot={false} />
          </LineChart>
        </ResponsiveContainer>
      </div>

      {/* Bandwidth + Threat events grid */}
      <div className="grid grid-cols-1 xl:grid-cols-2 gap-6">
        {/* Bandwidth area chart */}
        <div className="glass-card p-5">
          <h3 className="text-sm font-semibold text-white mb-1">Bandwidth Utilization</h3>
          <p className="text-xs text-gray-400 mb-4">Mbps over time</p>
          <ResponsiveContainer width="100%" height={200}>
            <AreaChart data={trafficData.slice(0, 12)}>
              <defs>
                <linearGradient id="gBw" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="5%" stopColor="#8b5cf6" stopOpacity={0.3} />
                  <stop offset="95%" stopColor="#8b5cf6" stopOpacity={0} />
                </linearGradient>
              </defs>
              <CartesianGrid strokeDasharray="3 3" stroke="#1b2741" />
              <XAxis dataKey="time" stroke="#4b5563" fontSize={10} />
              <YAxis stroke="#4b5563" fontSize={10} />
              <Tooltip contentStyle={{ backgroundColor: '#0f1729', border: '1px solid #1b2741', borderRadius: '8px', fontSize: '12px' }} />
              <Area type="monotone" dataKey="incoming" stroke="#8b5cf6" fill="url(#gBw)" strokeWidth={2} />
            </AreaChart>
          </ResponsiveContainer>
        </div>

        {/* AI Explanation panel */}
        <div className="glass-card p-5">
          <h3 className="text-sm font-semibold text-white mb-1">AI Explainability — Latest Detection</h3>
          <p className="text-xs text-gray-400 mb-4">SHAP feature importance for current alert</p>

          <div className="bg-navy-700/40 rounded-lg p-3 mb-4 border border-cyber-orange/20">
            <div className="flex justify-between items-center">
              <span className="text-xs text-gray-400">Attack</span>
              <span className="text-xs font-semibold text-cyber-orange">Port Scanning</span>
            </div>
            <div className="flex justify-between items-center mt-1">
              <span className="text-xs text-gray-400">Confidence</span>
              <span className="text-sm font-bold text-white">94%</span>
            </div>
          </div>

          <div className="space-y-3">
            {aiFeatures.map(({ name, importance }) => (
              <div key={name}>
                <div className="flex justify-between text-xs mb-1">
                  <span className="text-gray-300">{name}</span>
                  <span className="text-gray-400 font-mono">{importance}%</span>
                </div>
                <div className="h-2 bg-navy-700 rounded-full overflow-hidden">
                  <div
                    className="h-full rounded-full transition-all duration-700"
                    style={{
                      width: `${importance}%`,
                      background: importance > 70 ? '#3b82f6' : importance > 50 ? '#f97316' : '#6b7280'
                    }}
                  />
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Detection events table */}
      <div className="glass-card p-5">
        <h3 className="text-sm font-semibold text-white mb-4">Detection Events</h3>
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-navy-600/60 text-xs text-gray-500 uppercase tracking-wider">
                <th className="text-left py-3 px-3 font-medium">Time</th>
                <th className="text-left py-3 px-3 font-medium">Source</th>
                <th className="text-left py-3 px-3 font-medium">Destination</th>
                <th className="text-left py-3 px-3 font-medium">Attack Type</th>
                <th className="text-left py-3 px-3 font-medium">Confidence</th>
                <th className="text-left py-3 px-3 font-medium">Severity</th>
                <th className="text-left py-3 px-3 font-medium">Action</th>
              </tr>
            </thead>
            <tbody>
              {threatData.map(t => (
                <tr key={t.id} className="border-b border-navy-600/30 hover:bg-navy-700/30 transition-colors">
                  <td className="py-3 px-3 text-gray-300 font-mono text-xs">{t.time}</td>
                  <td className="py-3 px-3 text-gray-300 text-xs">{t.source}</td>
                  <td className="py-3 px-3 text-gray-300 text-xs">{t.destination}</td>
                  <td className="py-3 px-3 text-white text-xs font-medium">{t.attackType}</td>
                  <td className="py-3 px-3 text-xs font-mono text-gray-300">{t.confidence}%</td>
                  <td className="py-3 px-3">
                    <span className={`severity-${t.severity.toLowerCase()}`}>{t.severity}</span>
                  </td>
                  <td className="py-3 px-3">
                    <button onClick={() => navigate('/threats/1')} className="text-xs text-cyber-blue hover:text-blue-400 flex items-center gap-1">
                      <Eye className="w-3.5 h-3.5" /> Details
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  )
}
