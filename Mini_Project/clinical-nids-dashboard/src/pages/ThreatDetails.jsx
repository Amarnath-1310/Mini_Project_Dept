import { useParams, useNavigate } from 'react-router-dom'
import {
  ArrowLeft, Shield, Clock, Target, Activity, Globe,
  AlertTriangle, Cpu, Zap, Ban, Download, CheckCircle
} from 'lucide-react'
import { threatDetailsData, aiFeatures } from '../data/mockData'

export default function ThreatDetails() {
  const { id } = useParams()
  const navigate = useNavigate()
  const t = threatDetailsData

  return (
    <div className="space-y-6 animate-fade-in max-w-6xl">
      {/* Back button + header */}
      <div className="flex items-center gap-4">
        <button onClick={() => navigate(-1)} className="p-2 rounded-lg hover:bg-navy-700/60 transition-colors">
          <ArrowLeft className="w-5 h-5 text-gray-400" />
        </button>
        <div className="flex-1">
          <div className="flex items-center gap-3">
            <h1 className="text-2xl font-bold text-white">{t.attackType}</h1>
            <span className="severity-critical">CRITICAL</span>
            <span className="text-xs font-medium px-2 py-0.5 rounded-full text-cyber-green bg-cyber-green/10 border border-cyber-green/30">Blocked</span>
          </div>
          <p className="text-sm text-gray-400 mt-1">Detected at {t.detectedTime} · AI confidence {t.confidence}%</p>
        </div>
        <div className="flex gap-2">
          <button className="btn-danger flex items-center gap-2 text-xs py-2">
            <Ban className="w-3.5 h-3.5" /> Block Source IP
          </button>
          <button className="btn-secondary flex items-center gap-2 text-xs py-2">
            <Download className="w-3.5 h-3.5" /> Export
          </button>
        </div>
      </div>

      {/* Top metrics */}
      <div className="grid grid-cols-1 sm:grid-cols-4 gap-4">
        {[
          { label: 'Confidence', value: `${t.confidence}%`, icon: Target, color: 'text-cyber-blue' },
          { label: 'Duration', value: t.duration, icon: Clock, color: 'text-cyber-orange' },
          { label: 'Packets/sec', value: t.packetsPerSecond.toLocaleString(), icon: Zap, color: 'text-cyber-red' },
          { label: 'Bytes/sec', value: `${(t.bytesPerSecond / 1e6).toFixed(1)} MB`, icon: Activity, color: 'text-cyber-purple' },
        ].map(({ label, value, icon: Icon, color }) => (
          <div key={label} className="stat-card flex items-center gap-4">
            <div className="w-10 h-10 rounded-xl bg-navy-700/60 flex items-center justify-center">
              <Icon className={`w-5 h-5 ${color}`} />
            </div>
            <div>
              <p className="text-xl font-bold text-white">{value}</p>
              <p className="text-xs text-gray-400">{label}</p>
            </div>
          </div>
        ))}
      </div>

      <div className="grid grid-cols-1 xl:grid-cols-2 gap-6">
        {/* Network info */}
        <div className="glass-card p-5">
          <div className="flex items-center gap-2 mb-4">
            <Globe className="w-4.5 h-4.5 text-cyber-blue" />
            <h3 className="text-sm font-semibold text-white">Network Information</h3>
          </div>
          <div className="grid grid-cols-2 gap-4">
            {[
              { label: 'Protocol', value: t.protocol },
              { label: 'Source IP', value: t.sourceIP },
              { label: 'Destination IP', value: t.destinationIP },
              { label: 'Source Port', value: t.sourcePort },
              { label: 'Destination Port', value: t.destinationPort },
              { label: 'Flag Pattern', value: t.networkInfo.flagsAbnormal },
              { label: 'Total Packets', value: t.networkInfo.totalPackets },
              { label: 'Total Bytes', value: t.networkInfo.totalBytes },
              { label: 'Unique Source IPs', value: t.networkInfo.uniqueSrcIPs },
              { label: 'Unique Dest IPs', value: t.networkInfo.uniqueDstIPs },
            ].map(({ label, value }) => (
              <div key={label} className="bg-navy-700/30 rounded-lg p-3 border border-navy-600/30">
                <p className="text-[10px] text-gray-500 uppercase tracking-wider mb-1">{label}</p>
                <p className="text-sm font-medium text-gray-200 font-mono">{value}</p>
              </div>
            ))}
          </div>
        </div>

        {/* AI Explanation */}
        <div className="glass-card p-5">
          <div className="flex items-center gap-2 mb-4">
            <Cpu className="w-4.5 h-4.5 text-cyber-purple" />
            <h3 className="text-sm font-semibold text-white">AI Explanation</h3>
          </div>

          <p className="text-xs text-gray-400 mb-4">
            Why was this traffic classified as <span className="text-cyber-orange font-semibold">{t.attackType}</span>?
          </p>

          {/* SHAP features */}
          <p className="text-[10px] text-gray-500 uppercase tracking-wider font-semibold mb-3">Feature Importance (SHAP Values)</p>
          <div className="space-y-3 mb-6">
            {aiFeatures.map(({ name, importance }) => (
              <div key={name}>
                <div className="flex justify-between text-xs mb-1">
                  <span className="text-gray-300">{name}</span>
                  <span className="text-gray-400 font-mono">{importance}%</span>
                </div>
                <div className="h-2.5 bg-navy-700 rounded-full overflow-hidden">
                  <div
                    className="h-full rounded-full transition-all duration-700"
                    style={{
                      width: `${importance}%`,
                      background: importance > 70 ? 'linear-gradient(90deg, #3b82f6, #06b6d4)' : importance > 50 ? '#f97316' : '#6b7280'
                    }}
                  />
                </div>
              </div>
            ))}
          </div>

          {/* Top contributing factors */}
          <p className="text-[10px] text-gray-500 uppercase tracking-wider font-semibold mb-3">Contributing Factors</p>
          <div className="space-y-2">
            {t.aiExplanation.map((reason, i) => (
              <div key={i} className="flex items-start gap-2.5 bg-navy-700/30 rounded-lg p-3 border border-navy-600/30">
                <AlertTriangle className={`w-4 h-4 mt-0.5 flex-shrink-0 ${i === 0 ? 'text-cyber-red' : i === 1 ? 'text-cyber-orange' : 'text-yellow-400'}`} />
                <p className="text-xs text-gray-300 leading-relaxed">{reason}</p>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Timeline */}
      <div className="glass-card p-5">
        <h3 className="text-sm font-semibold text-white mb-4">Event Timeline</h3>
        <div className="relative pl-6 space-y-4 before:absolute before:left-2 before:top-1 before:bottom-1 before:w-px before:bg-navy-600">
          {[
            { time: '12:30:00', event: 'Initial anomalous traffic detected', color: 'bg-cyber-blue' },
            { time: '12:30:15', event: 'AI model classifies as DDoS — confidence 97%', color: 'bg-cyber-orange' },
            { time: '12:30:18', event: 'Automatic mitigation triggered — rate limiting applied', color: 'bg-cyber-purple' },
            { time: '12:30:45', event: 'Source IP added to blocklist', color: 'bg-cyber-red' },
            { time: '12:34:32', event: 'Traffic normalized — attack mitigated', color: 'bg-cyber-green' },
          ].map(({ time, event, color }) => (
            <div key={time} className="relative flex items-start gap-3">
              <div className={`absolute -left-4 w-3 h-3 rounded-full ${color} border-2 border-navy-800`} />
              <span className="text-xs text-gray-500 font-mono w-20 flex-shrink-0">{time}</span>
              <p className="text-sm text-gray-300">{event}</p>
            </div>
          ))}
        </div>
      </div>

      {/* Recommended actions */}
      <div className="glass-card p-5 border-cyber-green/30">
        <div className="flex items-center gap-2 mb-3">
          <CheckCircle className="w-4.5 h-4.5 text-cyber-green" />
          <h3 className="text-sm font-semibold text-white">Recommended Actions</h3>
        </div>
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
          {[
            'Update firewall rules to block source subnet',
            'Review similar traffic patterns from last 7 days',
            'Notify SOC team for further investigation',
          ].map((action, i) => (
            <div key={i} className="bg-navy-700/30 rounded-lg p-3 border border-navy-600/30">
              <p className="text-xs text-gray-300">{action}</p>
              <button className="mt-2 text-[11px] text-cyber-blue hover:text-blue-400 font-medium">Execute →</button>
            </div>
          ))}
        </div>
      </div>
    </div>
  )
}
