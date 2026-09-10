import { NavLink, useNavigate } from "react-router-dom";
import {
  LayoutDashboard,
  Shield,
  Activity,
  Bell,
  BarChart3,
  LogOut,
  ChevronRight,
  Upload,
  User,
} from "lucide-react";
import { logout, getCurrentUser } from "../data/api";

const navItems = [
  { to: "/dashboard", label: "Dashboard", icon: LayoutDashboard },
  { to: "/upload", label: "Dataset Upload", icon: Upload },
  { to: "/monitoring", label: "Live Traffic & Threats", icon: Activity },
  { to: "/alerts", label: "Alert Management", icon: Bell },
  { to: "/analytics", label: "Analytics", icon: BarChart3 },
];

export default function Sidebar() {
  const navigate = useNavigate();

  const handleLogout = () => {
    logout();
    navigate("/login");
  };

  return (
    <aside className="fixed left-0 top-0 h-screen w-64 bg-navy-800 border-r border-slate-700/80 flex flex-col z-50 shadow-2xl">
      {/* Logo */}
      <div className="p-5 border-b border-slate-700/80 bg-navy-900/50">
        <div className="flex items-center gap-3">
          <div className="relative">
            <div className="w-10 h-10 rounded-xl bg-cyber-blue/15 border border-cyber-blue/40 flex items-center justify-center">
              <Shield className="w-6 h-6 text-cyber-blue" strokeWidth={2} />
            </div>
            <div className="absolute -top-0.5 -right-0.5 w-3 h-3 bg-cyber-green rounded-full border-2 border-navy-800 animate-pulse" />
          </div>
          <div>
            <h1 className="text-base font-bold text-white tracking-tight flex items-center gap-1.5">
              MedSentry
              <span className="text-cyber-cyan font-extrabold text-xs px-1.5 py-0.5 rounded bg-cyber-cyan/15 border border-cyber-cyan/30">
                XAI
              </span>
            </h1>
            <p className="text-[10px] text-slate-300 font-semibold tracking-wider uppercase mt-0.5">
              Healthcare Cyber-Defense
            </p>
          </div>
        </div>
      </div>

      {/* Nav */}
      <nav className="flex-1 px-3 py-4 space-y-1.5 overflow-y-auto">
        <p className="text-[11px] text-slate-400 font-bold uppercase tracking-widest px-3 mb-2">
          Main Navigation
        </p>
        {navItems.map(({ to, label, icon: Icon }) => (
          <NavLink
            key={to}
            to={to}
            className={({ isActive }) =>
              `flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium transition-all duration-200 group ${
                isActive
                  ? "bg-cyber-blue/20 text-white font-semibold border border-cyber-blue/50 shadow-md shadow-cyber-blue/10"
                  : "text-slate-300 hover:bg-slate-800 hover:text-white hover:border-slate-700/70 border border-transparent"
              }`
            }
          >
            <Icon
              className="w-4.5 h-4.5 flex-shrink-0 text-cyber-blue"
              strokeWidth={1.8}
            />
            <span className="flex-1">{label}</span>
            <ChevronRight className="w-3.5 h-3.5 opacity-0 group-hover:opacity-100 transition-opacity text-slate-400" />
          </NavLink>
        ))}

        <div className="pt-4 mt-4 border-t border-slate-700/60">
          <p className="text-[11px] text-slate-400 font-bold uppercase tracking-widest px-3 mb-2">
            System & Governance
          </p>

          <NavLink
            to="/profile"
            className={({ isActive }) =>
              `flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium transition-all duration-200 group ${
                isActive
                  ? "bg-cyber-blue/20 text-white font-semibold border border-cyber-blue/50"
                  : "text-slate-300 hover:bg-slate-800 hover:text-white border border-transparent"
              }`
            }
          >
            <User
              className="w-4.5 h-4.5 flex-shrink-0 text-slate-300"
              strokeWidth={1.8}
            />
            <span className="flex-1">User Account</span>
          </NavLink>
        </div>
      </nav>

      {/* Footer */}
      <div className="p-3 border-t border-slate-700/80 bg-navy-900/40">
        <button
          onClick={handleLogout}
          className="flex items-center gap-3 w-full px-3 py-2.5 rounded-lg text-sm font-medium text-rose-300 hover:bg-rose-950/40 hover:text-rose-200 border border-transparent hover:border-rose-800/60 transition-all duration-200"
        >
          <LogOut className="w-4.5 h-4.5 text-rose-400" strokeWidth={1.8} />
          <span>Sign Out</span>
        </button>
      </div>
    </aside>
  );
}
