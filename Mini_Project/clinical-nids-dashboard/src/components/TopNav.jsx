import { Bell, ShieldCheck, Activity, User, ChevronDown } from 'lucide-react'

export default function TopNav() {
  return (
    <header className="sticky top-0 z-40 h-16 bg-navy-800/80 backdrop-blur-md border-b border-navy-600/50 flex items-center justify-between px-6">
      {/* Left: Status */}
      <div className="flex items-center gap-4">
        <div className="flex items-center gap-2 bg-cyber-green/10 border border-cyber-green/30 rounded-full px-3 py-1.5">
          <ShieldCheck className="w-4 h-4 text-cyber-green" />
          <span className="text-xs font-semibold text-cyber-green">Network Protected</span>
        </div>
        <div className="flex items-center gap-2 bg-cyber-blue/10 border border-cyber-blue/30 rounded-full px-3 py-1.5">
          <Activity className="w-4 h-4 text-cyber-blue animate-pulse" />
          <span className="text-xs font-semibold text-cyber-blue">Monitoring Active</span>
        </div>
      </div>

      {/* Right: Actions */}
      <div className="flex items-center gap-4">
        {/* Live clock */}
        <div className="text-xs text-gray-400 font-mono hidden lg:block">
          {new Date().toLocaleTimeString()}
        </div>

        {/* Notifications */}
        <button className="relative p-2 rounded-lg hover:bg-navy-700/60 transition-colors">
          <Bell className="w-5 h-5 text-gray-400" />
          <span className="absolute top-1 right-1 w-2 h-2 bg-cyber-red rounded-full" />
        </button>

        {/* Profile */}
        <div className="flex items-center gap-3 pl-4 border-l border-navy-600/60">
          <div className="w-8 h-8 rounded-full bg-gradient-to-br from-cyber-blue to-cyber-purple flex items-center justify-center">
            <User className="w-4 h-4 text-white" />
          </div>
          <div className="hidden sm:block">
            <p className="text-sm font-medium text-gray-200">Dr. Sarah Chen</p>
            <p className="text-[10px] text-gray-500">Security Admin</p>
          </div>
          <ChevronDown className="w-4 h-4 text-gray-500" />
        </div>
      </div>
    </header>
  )
}
