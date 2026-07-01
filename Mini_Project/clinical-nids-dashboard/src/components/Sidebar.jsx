import { NavLink } from 'react-router-dom'
import {
  LayoutDashboard, Shield, Activity, Bell, BarChart3,
  Search, Settings, LogOut, ChevronRight, Upload
} from 'lucide-react'

const navItems = [
  { to: '/dashboard', label: 'Dashboard', icon: LayoutDashboard },
  { to: '/upload', label: 'Dataset Upload', icon: Upload },
  { to: '/monitoring', label: 'Threat Monitoring', icon: Activity },
  { to: '/alerts', label: 'Alert Management', icon: Bell },
  { to: '/analytics', label: 'Analytics', icon: BarChart3 },
]

export default function Sidebar() {
  return (
    <aside className="fixed left-0 top-0 h-screen w-64 bg-navy-800 border-r border-navy-600/60 flex flex-col z-50">
      {/* Logo */}
      <div className="p-5 border-b border-navy-600/60">
        <div className="flex items-center gap-3">
          <div className="relative">
            <Shield className="w-9 h-9 text-cyber-blue" strokeWidth={1.5} />
            <div className="absolute -top-0.5 -right-0.5 w-3 h-3 bg-cyber-green rounded-full border-2 border-navy-800 animate-pulse" />
          </div>
          <div>
            <h1 className="text-base font-bold text-white leading-tight">Clinical-NIDS</h1>
            <p className="text-[10px] text-cyber-blue font-medium tracking-widest uppercase">AI Protection</p>
          </div>
        </div>
      </div>

      {/* Nav */}
      <nav className="flex-1 px-3 py-4 space-y-1 overflow-y-auto">
        <p className="text-[10px] text-gray-500 font-semibold uppercase tracking-widest px-3 mb-3">Main Menu</p>
        {navItems.map(({ to, label, icon: Icon }) => (
          <NavLink
            key={to}
            to={to}
            className={({ isActive }) =>
              `flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium transition-all duration-200 group ${
                isActive
                  ? 'bg-cyber-blue/15 text-cyber-blue border border-cyber-blue/30'
                  : 'text-gray-400 hover:bg-navy-700/60 hover:text-gray-200'
              }`
            }
          >
            <Icon className="w-4.5 h-4.5 flex-shrink-0" strokeWidth={1.8} />
            <span className="flex-1">{label}</span>
            <ChevronRight className="w-3.5 h-3.5 opacity-0 group-hover:opacity-60 transition-opacity" />
          </NavLink>
        ))}

        <div className="pt-4 mt-4 border-t border-navy-600/40">
          <p className="text-[10px] text-gray-500 font-semibold uppercase tracking-widest px-3 mb-3">System</p>
          <NavLink to="/search" className="flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium text-gray-400 hover:bg-navy-700/60 hover:text-gray-200 transition-all">
            <Search className="w-4.5 h-4.5" strokeWidth={1.8} />
            <span>Search Logs</span>
          </NavLink>
          <NavLink to="/settings" className="flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium text-gray-400 hover:bg-navy-700/60 hover:text-gray-200 transition-all">
            <Settings className="w-4.5 h-4.5" strokeWidth={1.8} />
            <span>Settings</span>
          </NavLink>
        </div>
      </nav>

      {/* Footer */}
      <div className="p-4 border-t border-navy-600/60">
        <button className="flex items-center gap-3 w-full px-3 py-2.5 rounded-lg text-sm font-medium text-gray-400 hover:bg-red-500/10 hover:text-red-400 transition-all">
          <LogOut className="w-4.5 h-4.5" strokeWidth={1.8} />
          <span>Sign Out</span>
        </button>
      </div>
    </aside>
  )
}
