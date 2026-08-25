import { useState, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import { ShieldCheck, Activity, User, ChevronDown } from 'lucide-react'
import { getCurrentUser } from '../data/api'

export default function TopNav() {
  const navigate = useNavigate()
  const [user, setUser] = useState(getCurrentUser())
  const [time, setTime] = useState(new Date().toLocaleTimeString())

  useEffect(() => {
    setUser(getCurrentUser())
    const timer = setInterval(() => setTime(new Date().toLocaleTimeString()), 1000)
    return () => clearInterval(timer)
  }, [])

  return (
    <header className="sticky top-0 z-40 h-16 bg-navy-800/90 backdrop-blur-md border-b border-slate-700/80 flex items-center justify-between px-6 shadow-md">
      {/* Left: Status */}
      <div className="flex items-center gap-3">
        <div className="flex items-center gap-2 bg-emerald-950/70 border border-emerald-500/50 rounded-full px-3 py-1.5 shadow-sm">
          <ShieldCheck className="w-4 h-4 text-emerald-400" />
          <span className="text-xs font-semibold text-emerald-300">Protected Clinical Network</span>
        </div>
        <div className="hidden sm:flex items-center gap-2 bg-cyan-950/70 border border-cyan-500/50 rounded-full px-3 py-1.5 shadow-sm">
          <Activity className="w-4 h-4 text-cyan-400 animate-pulse" />
          <span className="text-xs font-semibold text-cyan-300">Live Traffic Active</span>
        </div>
      </div>

      {/* Right: Actions */}
      <div className="flex items-center gap-4">
        {/* Live clock */}
        <div className="text-xs text-slate-300 font-mono hidden md:flex items-center gap-1.5 bg-slate-900/80 px-2.5 py-1 rounded-md border border-slate-700">
          <span className="w-2 h-2 rounded-full bg-emerald-400 animate-ping"></span>
          <span>{time}</span>
        </div>

        {/* Profile */}
        <button
          onClick={() => navigate('/profile')}
          className="flex items-center gap-3 pl-3 py-1 pr-2 rounded-xl hover:bg-slate-800/90 border border-transparent hover:border-slate-700 transition-all text-left group"
        >
          <div className="w-8 h-8 rounded-full bg-gradient-to-br from-cyber-blue to-purple-600 flex items-center justify-center shadow-md">
            <User className="w-4 h-4 text-white" />
          </div>
          <div className="hidden sm:block">
            <p className="text-sm font-semibold text-white group-hover:text-cyber-cyan transition-colors leading-tight">
              {user?.fullName || 'Authorized User'}
            </p>
            <p className="text-[11px] text-slate-300 font-medium tracking-wide">
              {user?.role === 'ADMIN' ? 'Administrator' : 'Security Analyst'}
            </p>
          </div>
          <ChevronDown className="w-3.5 h-3.5 text-slate-400 group-hover:text-white transition-colors" />
        </button>
      </div>
    </header>
  )
}

