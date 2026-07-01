import {
  PieChart, Pie, Cell, BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip,
  ResponsiveContainer, LineChart, Line, Legend, AreaChart, Area
} from 'recharts'
import { TrendingUp, Shield, Target, Clock } from 'lucide-react'
import { attackDistribution, attackTimeline, protocolUsage, trafficData } from '../data/mockData'

export default function Analytics() {
  return (
    <div className="space-y-6 animate-fade-in">
      {/* Header */}
      <div>
        <h1 className="text-2xl font-bold text-white">Attack Analytics</h1>
        <p className="text-sm text-gray-400 mt-1">Comprehensive threat intelligence and trend analysis</p>
      </div>

      {/* KPIs */}
      <div className="grid grid-cols-1 sm:grid-cols-4 gap-4">
        {[
          { label: 'Total Attacks Blocked', value: '1,247', icon: Shield, color: 'text-cyber-green', change: '+18% vs last month' },
          { label: 'Avg Detection Time', value: '0.8s', icon: Clock, color: 'text-cyber-blue', change: '-12% improvement' },
          { label: 'True Positive Rate', value: '98.4%', icon: Target, color: 'text-cyber-purple', change: '+0.6% vs last month' },
          { label: 'Attack Trend', value: '+23%', icon: TrendingUp, color: 'text-cyber-orange', change: 'DDoS increasing' },
        ].map(({ label, value, icon: Icon, color, change }) => (
          <div key={label} className="stat-card">
            <div className="flex items-center gap-3 mb-3">
              <Icon className={`w-5 h-5 ${color}`} />
              <span className="text-xs text-gray-400">{label}</span>
            </div>
            <p className="text-2xl font-bold text-white">{value}</p>
            <p className="text-[11px] text-gray-500 mt-1">{change}</p>
          </div>
        ))}
      </div>

      {/* Charts row 1 */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Attack distribution pie */}
        <div className="glass-card p-5">
          <h3 className="text-sm font-semibold text-white mb-1">Attack Type Distribution</h3>
          <p className="text-xs text-gray-400 mb-4">Percentage breakdown of all classified traffic</p>
          <ResponsiveContainer width="100%" height={280}>
            <PieChart>
              <Pie data={attackDistribution} cx="50%" cy="50%" innerRadius={70} outerRadius={110} paddingAngle={3} dataKey="value" label={({ name, value }) => `${name}: ${value}%`} labelLine={false}>
                {attackDistribution.map((entry, i) => (
                  <Cell key={i} fill={entry.color} />
                ))}
              </Pie>
              <Tooltip contentStyle={{ backgroundColor: '#0f1729', border: '1px solid #1b2741', borderRadius: '8px', fontSize: '12px' }} />
            </PieChart>
          </ResponsiveContainer>
          <div className="flex flex-wrap gap-4 mt-3 justify-center">
            {attackDistribution.map(d => (
              <div key={d.name} className="flex items-center gap-2">
                <div className="w-3 h-3 rounded-full" style={{ backgroundColor: d.color }} />
                <span className="text-xs text-gray-400">{d.name} ({d.value}%)</span>
              </div>
            ))}
          </div>
        </div>

        {/* Protocol usage bar */}
        <div className="glass-card p-5">
          <h3 className="text-sm font-semibold text-white mb-1">Network Protocol Usage</h3>
          <p className="text-xs text-gray-400 mb-4">Flow count by protocol type</p>
          <ResponsiveContainer width="100%" height={280}>
            <BarChart data={protocolUsage}>
              <CartesianGrid strokeDasharray="3 3" stroke="#1b2741" />
              <XAxis dataKey="name" stroke="#4b5563" fontSize={11} />
              <YAxis stroke="#4b5563" fontSize={11} />
              <Tooltip contentStyle={{ backgroundColor: '#0f1729', border: '1px solid #1b2741', borderRadius: '8px', fontSize: '12px' }} />
              <Bar dataKey="count" radius={[4, 4, 0, 0]}>
                {protocolUsage.map((_, i) => (
                  <Cell key={i} fill={['#3b82f6', '#22c55e', '#f97316', '#8b5cf6', '#06b6d4'][i]} />
                ))}
              </Bar>
            </BarChart>
          </ResponsiveContainer>
        </div>
      </div>

      {/* Attack timeline */}
      <div className="glass-card p-5">
        <h3 className="text-sm font-semibold text-white mb-1">Attack Timeline (30 Days)</h3>
        <p className="text-xs text-gray-400 mb-4">Daily attack count by category</p>
        <ResponsiveContainer width="100%" height={300}>
          <LineChart data={attackTimeline}>
            <CartesianGrid strokeDasharray="3 3" stroke="#1b2741" />
            <XAxis dataKey="day" stroke="#4b5563" fontSize={10} interval={4} />
            <YAxis stroke="#4b5563" fontSize={10} />
            <Tooltip contentStyle={{ backgroundColor: '#0f1729', border: '1px solid #1b2741', borderRadius: '8px', fontSize: '12px' }} />
            <Legend wrapperStyle={{ fontSize: '12px' }} />
            <Line type="monotone" dataKey="DDoS" stroke="#ef4444" strokeWidth={2} dot={false} />
            <Line type="monotone" dataKey="PortScan" stroke="#f97316" strokeWidth={2} dot={false} />
            <Line type="monotone" dataKey="Malware" stroke="#8b5cf6" strokeWidth={2} dot={false} />
            <Line type="monotone" dataKey="BruteForce" stroke="#06b6d4" strokeWidth={2} dot={false} />
          </LineChart>
        </ResponsiveContainer>
      </div>

      {/* Threats over time area chart */}
      <div className="glass-card p-5">
        <h3 className="text-sm font-semibold text-white mb-1">Threat Intensity Heatmap</h3>
        <p className="text-xs text-gray-400 mb-4">Hourly threat count over 24 hours</p>
        <ResponsiveContainer width="100%" height={220}>
          <AreaChart data={trafficData}>
            <defs>
              <linearGradient id="gThreat" x1="0" y1="0" x2="0" y2="1">
                <stop offset="5%" stopColor="#ef4444" stopOpacity={0.4} />
                <stop offset="95%" stopColor="#ef4444" stopOpacity={0} />
              </linearGradient>
            </defs>
            <CartesianGrid strokeDasharray="3 3" stroke="#1b2741" />
            <XAxis dataKey="time" stroke="#4b5563" fontSize={10} />
            <YAxis stroke="#4b5563" fontSize={10} />
            <Tooltip contentStyle={{ backgroundColor: '#0f1729', border: '1px solid #1b2741', borderRadius: '8px', fontSize: '12px' }} />
            <Area type="monotone" dataKey="threats" stroke="#ef4444" fill="url(#gThreat)" strokeWidth={2} />
          </AreaChart>
        </ResponsiveContainer>
      </div>
    </div>
  )
}
