import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import {
  Bell, ShieldAlert, CheckCircle, Clock, AlertTriangle,
  Eye, Check, Ban, Download, Search, Filter
} from 'lucide-react'
import { alerts } from '../data/mockData'

const statusColors = {
  Active: 'text-cyber-red bg-cyber-red/10 border border-cyber-red/30',
  Pending: 'text-cyber-orange bg-cyber-orange/10 border border-cyber-orange/30',
  Resolved: 'text-cyber-green bg-cyber-green/10 border border-cyber-green/30',
}

export default function Alerts() {
  const navigate = useNavigate()
  const [tab, setTab] = useState('all')
  const [search, setSearch] = useState('')

  const filtered = alerts.filter(a => {
    const matchTab = tab === 'all' || a.status.toLowerCase() === tab
    const matchSearch = a.type.toLowerCase().includes(search.toLowerCase()) || a.source.includes(search)
    return matchTab && matchSearch
  })

  const counts = {
    all: alerts.length,
    active: alerts.filter(a => a.status === 'Active').length,
    pending: alerts.filter(a => a.status === 'Pending').length,
    resolved: alerts.filter(a => a.status === 'Resolved').length,
  }

  return (
    <div className="space-y-6 animate-fade-in">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-white">Alert Management</h1>
          <p className="text-sm text-gray-400 mt-1">Review and manage security alerts</p>
        </div>
        <button className="btn-secondary flex items-center gap-2 text-xs py-2">
          <Download className="w-3.5 h-3.5" /> Export Report
        </button>
      </div>

      {/* Summary cards */}
      <div className="grid grid-cols-1 sm:grid-cols-4 gap-4">
        {[
          { label: 'Total Alerts', value: counts.all, icon: Bell, color: 'text-cyber-blue', bg: 'bg-cyber-blue/15' },
          { label: 'Active Threats', value: counts.active, icon: ShieldAlert, color: 'text-cyber-red', bg: 'bg-cyber-red/15' },
          { label: 'Pending Review', value: counts.pending, icon: Clock, color: 'text-cyber-orange', bg: 'bg-cyber-orange/15' },
          { label: 'Resolved', value: counts.resolved, icon: CheckCircle, color: 'text-cyber-green', bg: 'bg-cyber-green/15' },
        ].map(({ label, value, icon: Icon, color, bg }) => (
          <div key={label} className="stat-card flex items-center gap-4">
            <div className={`w-10 h-10 rounded-xl ${bg} flex items-center justify-center`}>
              <Icon className={`w-5 h-5 ${color}`} />
            </div>
            <div>
              <p className="text-xl font-bold text-white">{value}</p>
              <p className="text-xs text-gray-400">{label}</p>
            </div>
          </div>
        ))}
      </div>

      {/* Filters */}
      <div className="flex items-center justify-between gap-4 flex-wrap">
        <div className="flex gap-2">
          {[
            { key: 'all', label: 'All Alerts' },
            { key: 'active', label: 'Active' },
            { key: 'pending', label: 'Pending' },
            { key: 'resolved', label: 'Resolved' },
          ].map(({ key, label }) => (
            <button
              key={key}
              onClick={() => setTab(key)}
              className={`px-4 py-2 rounded-lg text-xs font-medium transition-all ${
                tab === key
                  ? 'bg-cyber-blue/20 text-cyber-blue border border-cyber-blue/40'
                  : 'bg-navy-700/50 text-gray-400 border border-navy-600/50 hover:text-gray-200'
              }`}
            >
              {label}
              <span className="ml-2 text-[10px] opacity-70">{counts[key]}</span>
            </button>
          ))}
        </div>
        <div className="relative">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-500" />
          <input
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Search alerts..."
            className="input-field pl-10 w-64 text-sm"
          />
        </div>
      </div>

      {/* Alert list */}
      <div className="space-y-3">
        {filtered.map(alert => (
          <div key={alert.id} className="glass-card p-4 hover:border-cyber-blue/30 transition-all">
            <div className="flex items-start justify-between gap-4">
              <div className="flex items-start gap-3 flex-1">
                <div className={`w-9 h-9 rounded-lg flex items-center justify-center flex-shrink-0 mt-0.5 ${
                  alert.severity === 'CRITICAL' ? 'bg-red-500/15' : alert.severity === 'HIGH' ? 'bg-orange-500/15' : 'bg-yellow-500/15'
                }`}>
                  <AlertTriangle className={`w-4.5 h-4.5 ${
                    alert.severity === 'CRITICAL' ? 'text-cyber-red' : alert.severity === 'HIGH' ? 'text-cyber-orange' : 'text-yellow-400'
                  }`} />
                </div>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 mb-1">
                    <h4 className="text-sm font-semibold text-white">{alert.type}</h4>
                    <span className={`severity-${alert.severity.toLowerCase()}`}>{alert.severity}</span>
                    <span className={`text-[10px] font-medium px-2 py-0.5 rounded-full ${statusColors[alert.status]}`}>{alert.status}</span>
                  </div>
                  <p className="text-xs text-gray-400 mb-2">{alert.description}</p>
                  <div className="flex items-center gap-4 text-[11px] text-gray-500">
                    <span>Source: <span className="text-gray-300 font-mono">{alert.source}</span></span>
                    <span>Time: <span className="text-gray-300">{alert.timestamp}</span></span>
                  </div>
                </div>
              </div>

              {/* Actions */}
              <div className="flex items-center gap-2 flex-shrink-0">
                <button onClick={() => navigate('/threats/1')} className="btn-secondary text-xs py-1.5 px-3 flex items-center gap-1.5">
                  <Eye className="w-3.5 h-3.5" /> View
                </button>
                {alert.status !== 'Resolved' && (
                  <>
                    <button className="btn-secondary text-xs py-1.5 px-3 flex items-center gap-1.5 text-cyber-green">
                      <Check className="w-3.5 h-3.5" /> Review
                    </button>
                    <button className="btn-danger text-xs py-1.5 px-3 flex items-center gap-1.5">
                      <Ban className="w-3.5 h-3.5" /> Block IP
                    </button>
                  </>
                )}
              </div>
            </div>
          </div>
        ))}

        {filtered.length === 0 && (
          <div className="glass-card p-12 text-center">
            <CheckCircle className="w-12 h-12 text-cyber-green mx-auto mb-3 opacity-50" />
            <p className="text-sm text-gray-400">No alerts matching your filters</p>
          </div>
        )}
      </div>
    </div>
  )
}
