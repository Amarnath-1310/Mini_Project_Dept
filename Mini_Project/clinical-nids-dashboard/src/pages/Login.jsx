import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { Shield, Eye, EyeOff, Lock, Mail, AlertCircle } from 'lucide-react'
import { login as apiLogin, setToken } from '../data/api'

export default function Login() {
  const navigate = useNavigate()
  const [showPassword, setShowPassword] = useState(false)
  const [role, setRole] = useState('admin')
  const [email, setEmail] = useState('admin@hospital.org')
  const [password, setPassword] = useState('admin123')
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(false)

  const handleSubmit = async (e) => {
    e.preventDefault()
    setError('')
    setLoading(true)
    try {
      const result = await apiLogin(email, password)
      setToken(result.token)
      navigate('/dashboard')
    } catch (err) {
      setError(err.message || 'Login failed. Please check your credentials.')
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="min-h-screen bg-navy-900 flex items-center justify-center p-4 relative overflow-hidden">
      {/* Background grid effect */}
      <div className="absolute inset-0 opacity-5">
        <div className="absolute inset-0" style={{
          backgroundImage: 'linear-gradient(rgba(59,130,246,0.3) 1px, transparent 1px), linear-gradient(90deg, rgba(59,130,246,0.3) 1px, transparent 1px)',
          backgroundSize: '60px 60px'
        }} />
      </div>

      {/* Glow effects */}
      <div className="absolute top-1/4 left-1/4 w-96 h-96 bg-cyber-blue/10 rounded-full blur-3xl" />
      <div className="absolute bottom-1/4 right-1/4 w-96 h-96 bg-cyber-purple/10 rounded-full blur-3xl" />

      <div className="relative w-full max-w-md">
        {/* Logo section */}
        <div className="text-center mb-8">
          <div className="inline-flex items-center justify-center w-16 h-16 rounded-2xl bg-cyber-blue/15 border border-cyber-blue/30 mb-4">
            <Shield className="w-9 h-9 text-cyber-blue" strokeWidth={1.5} />
          </div>
          <h1 className="text-2xl font-bold text-white">Clinical-NIDS</h1>
          <p className="text-sm text-gray-400 mt-1">AI-Powered Network Intrusion Detection</p>
        </div>

        {/* Login card */}
        <div className="glass-card p-8">
          <h2 className="text-lg font-semibold text-white mb-1">Welcome Back</h2>
          <p className="text-sm text-gray-400 mb-6">Sign in to access the security dashboard</p>

          {/* Role selector */}
          <div className="flex gap-2 mb-6">
            <button
              onClick={() => setRole('admin')}
              className={`flex-1 py-2.5 rounded-lg text-sm font-medium transition-all ${
                role === 'admin'
                  ? 'bg-cyber-blue/20 text-cyber-blue border border-cyber-blue/50'
                  : 'bg-navy-700/50 text-gray-400 border border-navy-600/50 hover:text-gray-200'
              }`}
            >
              Admin
            </button>
            <button
              onClick={() => setRole('analyst')}
              className={`flex-1 py-2.5 rounded-lg text-sm font-medium transition-all ${
                role === 'analyst'
                  ? 'bg-cyber-blue/20 text-cyber-blue border border-cyber-blue/50'
                  : 'bg-navy-700/50 text-gray-400 border border-navy-600/50 hover:text-gray-200'
              }`}
            >
              Security Analyst
            </button>
          </div>

          <form onSubmit={handleSubmit} className="space-y-4">
            {/* Error message */}
            {error && (
              <div className="flex items-start gap-2 bg-red-500/10 border border-red-500/30 rounded-lg p-3">
                <AlertCircle className="w-4 h-4 text-red-400 mt-0.5 flex-shrink-0" />
                <p className="text-xs text-red-400">{error}</p>
              </div>
            )}

            {/* Email */}
            <div>
              <label className="text-xs font-medium text-gray-400 mb-1.5 block">Email Address</label>
              <div className="relative">
                <Mail className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-500" />
                <input
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="admin@hospital.org"
                  className="input-field pl-10"
                />
              </div>
            </div>

            {/* Password */}
            <div>
              <label className="text-xs font-medium text-gray-400 mb-1.5 block">Password</label>
              <div className="relative">
                <Lock className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-500" />
                <input
                  type={showPassword ? 'text' : 'password'}
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="••••••••"
                  className="input-field pl-10 pr-10"
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-500 hover:text-gray-300"
                >
                  {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                </button>
              </div>
            </div>

            {/* Remember + Forgot */}
            <div className="flex items-center justify-between">
              <label className="flex items-center gap-2 cursor-pointer">
                <input type="checkbox" className="w-4 h-4 rounded border-navy-500 bg-navy-700 text-cyber-blue focus:ring-cyber-blue/50" />
                <span className="text-xs text-gray-400">Remember me</span>
              </label>
              <button type="button" className="text-xs text-cyber-blue hover:text-blue-400 transition-colors">
                Forgot password?
              </button>
            </div>

            {/* Submit */}
            <button type="submit" className="btn-primary w-full py-3 text-sm font-semibold">
              Sign In Securely
            </button>
          </form>

          {/* Security notice */}
          <div className="mt-6 flex items-start gap-2 bg-cyber-blue/5 border border-cyber-blue/20 rounded-lg p-3">
            <AlertCircle className="w-4 h-4 text-cyber-blue mt-0.5 flex-shrink-0" />
            <p className="text-[11px] text-gray-400 leading-relaxed">
              This system is protected by AI-driven security protocols. All access attempts are logged and monitored.
            </p>
          </div>
        </div>

        <p className="text-center text-xs text-gray-600 mt-6">
          © 2026 Clinical-NIDS · HIPAA Compliant · SOC 2 Certified
        </p>
      </div>
    </div>
  )
}
