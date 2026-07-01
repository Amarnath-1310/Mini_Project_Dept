import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { User, Mail, Shield, LogOut, Save, Key } from 'lucide-react'
import { logout } from '../data/api'

export default function Profile() {
  const navigate = useNavigate()
  const [name] = useState('Admin User')
  const [email] = useState('admin@hospital.org')
  const [role] = useState('Administrator')
  const [message, setMessage] = useState('')

  const handleLogout = () => {
    logout()
    navigate('/login')
  }

  const handleSave = () => {
    setMessage('Profile updated successfully')
    setTimeout(() => setMessage(''), 3000)
  }

  return (
    <div className="space-y-6 animate-fade-in max-w-2xl mx-auto">
      <div>
        <h1 className="text-2xl font-bold text-white">User Profile</h1>
        <p className="text-sm text-gray-400 mt-1">Manage your account settings</p>
      </div>

      {message && (
        <div className="bg-cyber-green/10 border border-cyber-green/30 rounded-xl p-4">
          <p className="text-sm text-cyber-green">{message}</p>
        </div>
      )}

      <div className="glass-card p-6">
        <div className="flex items-center gap-4 mb-6">
          <div className="w-16 h-16 rounded-full bg-cyber-blue/20 border border-cyber-blue/30 flex items-center justify-center">
            <User className="w-8 h-8 text-cyber-blue" />
          </div>
          <div>
            <h2 className="text-lg font-semibold text-white">{name}</h2>
            <p className="text-sm text-gray-400">{role}</p>
          </div>
        </div>

        <div className="space-y-4">
          <div>
            <label className="text-xs font-medium text-gray-400 mb-1.5 block">Full Name</label>
            <div className="relative">
              <User className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-500" />
              <input
                type="text"
                defaultValue={name}
                className="input-field pl-10"
              />
            </div>
          </div>

          <div>
            <label className="text-xs font-medium text-gray-400 mb-1.5 block">Email Address</label>
            <div className="relative">
              <Mail className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-500" />
              <input
                type="email"
                defaultValue={email}
                className="input-field pl-10"
              />
            </div>
          </div>

          <div>
            <label className="text-xs font-medium text-gray-400 mb-1.5 block">Role</label>
            <div className="relative">
              <Shield className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-500" />
              <input
                type="text"
                defaultValue={role}
                disabled
                className="input-field pl-10 opacity-60 cursor-not-allowed"
              />
            </div>
          </div>

          <div>
            <label className="text-xs font-medium text-gray-400 mb-1.5 block">New Password</label>
            <div className="relative">
              <Key className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-500" />
              <input
                type="password"
                placeholder="Leave blank to keep current password"
                className="input-field pl-10"
              />
            </div>
          </div>

          <button onClick={handleSave} className="btn-primary w-full py-3 text-sm font-semibold flex items-center justify-center gap-2">
            <Save className="w-4 h-4" /> Save Changes
          </button>
        </div>
      </div>

      <div className="glass-card p-6">
        <h3 className="text-sm font-semibold text-white mb-4">Session</h3>
        <button onClick={handleLogout} className="btn-danger w-full py-3 text-sm font-semibold flex items-center justify-center gap-2">
          <LogOut className="w-4 h-4" /> Sign Out
        </button>
      </div>
    </div>
  )
}
