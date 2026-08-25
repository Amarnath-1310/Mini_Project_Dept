import { useState, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import {
  User, Mail, Shield, LogOut, Save, Key, Building2, Phone,
  FileText, CheckCircle2, AlertCircle, Clock, Calendar
} from 'lucide-react'
import { getProfile, updateProfile, logout } from '../data/api'

export default function Profile() {
  const navigate = useNavigate()
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)

  // Form states
  const [fullName, setFullName] = useState('')
  const [email, setEmail] = useState('')
  const [role, setRole] = useState('SECURITY_ANALYST')
  const [department, setDepartment] = useState('')
  const [phoneNumber, setPhoneNumber] = useState('')
  const [bio, setBio] = useState('')
  const [newPassword, setNewPassword] = useState('')
  const [createdAt, setCreatedAt] = useState('')
  const [updatedAt, setUpdatedAt] = useState('')

  const [message, setMessage] = useState('')
  const [error, setError] = useState('')

  useEffect(() => {
    loadUserProfile()
  }, [])

  async function loadUserProfile() {
    setLoading(true)
    setError('')
    try {
      const data = await getProfile()
      if (data) {
        setFullName(data.fullName || '')
        setEmail(data.email || '')
        setRole(data.role || 'SECURITY_ANALYST')
        setDepartment(data.department || '')
        setPhoneNumber(data.phoneNumber || '')
        setBio(data.bio || '')
        setCreatedAt(data.createdAt || '')
        setUpdatedAt(data.updatedAt || '')
      }
    } catch (err) {
      setError(err.message || 'Failed to load user profile from server.')
    } finally {
      setLoading(false)
    }
  }

  const handleSave = async (e) => {
    e.preventDefault()
    if (!fullName.trim()) {
      setError('Full Name cannot be empty.')
      return
    }
    setError('')
    setMessage('')
    setSaving(true)
    try {
      const updated = await updateProfile({
        fullName: fullName.trim(),
        department: department.trim(),
        phoneNumber: phoneNumber.trim() || null,
        bio: bio.trim() || null,
        newPassword: newPassword.trim() || null
      })
      setMessage('Profile updated and persisted successfully.')
      setNewPassword('')
      if (updated.updatedAt) setUpdatedAt(updated.updatedAt)
      setTimeout(() => setMessage(''), 4000)
    } catch (err) {
      setError(err.message || 'Failed to update profile.')
    } finally {
      setSaving(false)
    }
  }

  const handleLogout = () => {
    logout()
    navigate('/login')
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="text-center">
          <div className="w-8 h-8 border-2 border-cyber-blue border-t-transparent rounded-full animate-spin mx-auto mb-3" />
          <p className="text-sm text-slate-300 font-medium">Loading user profile from database...</p>
        </div>
      </div>
    )
  }

  return (
    <div className="space-y-6 animate-fade-in max-w-3xl mx-auto pb-12">
      <div>
        <h1 className="text-2xl font-bold text-white tracking-tight">User Account & Profile</h1>
        <p className="text-sm text-slate-300 mt-1">Manage your hospital identity and security credentials</p>
      </div>

      {message && (
        <div className="flex items-center gap-3 bg-emerald-950/80 border border-emerald-500/60 rounded-xl p-4 shadow-lg shadow-emerald-950/40">
          <CheckCircle2 className="w-5 h-5 text-emerald-400 flex-shrink-0" />
          <p className="text-sm text-emerald-200 font-semibold">{message}</p>
        </div>
      )}

      {error && (
        <div className="flex items-center gap-3 bg-rose-950/80 border border-rose-500/60 rounded-xl p-4 shadow-lg shadow-rose-950/40">
          <AlertCircle className="w-5 h-5 text-rose-400 flex-shrink-0" />
          <p className="text-sm text-rose-200 font-semibold">{error}</p>
        </div>
      )}

      <form onSubmit={handleSave} className="space-y-6">
        {/* Profile Header Card */}
        <div className="glass-card p-6 border-slate-700">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-6 border-b border-slate-700/70">
            <div className="flex items-center gap-4">
              <div className="w-16 h-16 rounded-2xl bg-gradient-to-br from-cyber-blue to-purple-600 border border-white/20 flex items-center justify-center shadow-lg">
                <User className="w-8 h-8 text-white" />
              </div>
              <div>
                <h2 className="text-lg font-bold text-white">{fullName || 'Authorized Personnel'}</h2>
                <p className="text-sm text-slate-300 font-medium">{email}</p>
                <div className="flex items-center gap-2 mt-1.5">
                  <span className={`text-[11px] font-bold px-2.5 py-0.5 rounded-full border ${
                    role === 'ADMIN'
                      ? 'bg-purple-950/80 text-purple-200 border-purple-500/60'
                      : 'bg-cyan-950/80 text-cyan-200 border-cyan-500/60'
                  }`}>
                    {role === 'ADMIN' ? '🛡️ System Administrator' : '🔍 Security Analyst'}
                  </span>
                  <span className="text-xs text-slate-400 font-medium">· {department || 'Clinical Operations'}</span>
                </div>
              </div>
            </div>

            <div className="text-xs text-slate-400 space-y-1 sm:text-right border-t sm:border-t-0 pt-3 sm:pt-0 border-slate-700/60">
              {createdAt && (
                <div className="flex sm:justify-end items-center gap-1.5">
                  <Calendar className="w-3.5 h-3.5 text-slate-500" />
                  <span>Joined: {new Date(createdAt).toLocaleDateString()}</span>
                </div>
              )}
              {updatedAt && (
                <div className="flex sm:justify-end items-center gap-1.5">
                  <Clock className="w-3.5 h-3.5 text-slate-500" />
                  <span>Modified: {new Date(updatedAt).toLocaleTimeString()}</span>
                </div>
              )}
            </div>
          </div>

          {/* Form Fields Grid */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-5 mt-6">
            {/* Full Name */}
            <div>
              <label className="text-xs font-bold text-slate-200 mb-1.5 block">Full Name *</label>
              <div className="relative">
                <User className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
                <input
                  type="text"
                  required
                  value={fullName}
                  onChange={(e) => setFullName(e.target.value)}
                  className="input-field pl-10"
                />
              </div>
            </div>

            {/* Email Address (Read-only for security) */}
            <div>
              <label className="text-xs font-bold text-slate-200 mb-1.5 block">Hospital Email Address</label>
              <div className="relative">
                <Mail className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-500" />
                <input
                  type="email"
                  disabled
                  value={email}
                  className="input-field pl-10 bg-slate-900/50 opacity-70 cursor-not-allowed border-slate-800 text-slate-300"
                />
              </div>
              <span className="text-[10px] text-slate-400 mt-1 block">Primary login identifier (managed by CISO)</span>
            </div>

            {/* Department */}
            <div>
              <label className="text-xs font-bold text-slate-200 mb-1.5 block">Healthcare Department</label>
              <div className="relative">
                <Building2 className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
                <input
                  type="text"
                  value={department}
                  onChange={(e) => setDepartment(e.target.value)}
                  placeholder="e.g. Hospital SOC Operations"
                  className="input-field pl-10"
                />
              </div>
            </div>

            {/* Phone Number */}
            <div>
              <label className="text-xs font-bold text-slate-200 mb-1.5 block">Duty Phone Number</label>
              <div className="relative">
                <Phone className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
                <input
                  type="text"
                  value={phoneNumber}
                  onChange={(e) => setPhoneNumber(e.target.value)}
                  placeholder="+1 (555) 000-0000"
                  className="input-field pl-10"
                />
              </div>
            </div>

            {/* Bio / Responsibility */}
            <div className="md:col-span-2">
              <label className="text-xs font-bold text-slate-200 mb-1.5 block">Bio & SOC Role Summary</label>
              <div className="relative">
                <FileText className="absolute left-3 top-3 w-4 h-4 text-slate-400" />
                <textarea
                  rows={3}
                  value={bio}
                  onChange={(e) => setBio(e.target.value)}
                  placeholder="Briefly describe your clinical network monitoring duties..."
                  className="input-field pl-10 pt-2.5 resize-none"
                />
              </div>
            </div>

            {/* New Password */}
            <div className="md:col-span-2 pt-2 border-t border-slate-700/60">
              <label className="text-xs font-bold text-slate-200 mb-1.5 block">Change Password</label>
              <div className="relative">
                <Key className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
                <input
                  type="password"
                  value={newPassword}
                  onChange={(e) => setNewPassword(e.target.value)}
                  placeholder="Leave blank to retain current password"
                  className="input-field pl-10"
                />
              </div>
              <span className="text-[10px] text-slate-400 mt-1 block">Requires at least 6 characters</span>
            </div>
          </div>

          <div className="mt-6 pt-4 border-t border-slate-700/70 flex justify-end">
            <button
              type="submit"
              disabled={saving}
              className="btn-primary py-2.5 px-6 text-sm font-semibold flex items-center justify-center gap-2"
            >
              <Save className="w-4 h-4" />
              {saving ? 'Saving to Database...' : 'Save Profile Changes'}
            </button>
          </div>
        </div>
      </form>

      {/* Session Management */}
      <div className="glass-card p-6 border-slate-700 flex items-center justify-between">
        <div>
          <h3 className="text-sm font-bold text-white">Active Session</h3>
          <p className="text-xs text-slate-300 mt-0.5">Secure JWT authentication token active on this workstation</p>
        </div>
        <button
          onClick={handleLogout}
          className="btn-danger py-2 px-4 text-xs font-semibold flex items-center gap-2"
        >
          <LogOut className="w-4 h-4" /> Sign Out
        </button>
      </div>
    </div>
  )
}

