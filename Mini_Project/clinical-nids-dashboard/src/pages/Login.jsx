import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { Shield, Eye, EyeOff, Lock, Mail, AlertCircle, User, Building2, CheckCircle2 } from 'lucide-react'
import { login as apiLogin, register as apiRegister } from '../data/api'

export default function Login() {
  const navigate = useNavigate()
  const [isRegister, setIsRegister] = useState(false)
  const [showPassword, setShowPassword] = useState(false)

  // Login form state
  const [loginEmail, setLoginEmail] = useState('admin@hospital.org')
  const [loginPassword, setLoginPassword] = useState('admin123')

  // Register form state
  const [regFullName, setRegFullName] = useState('')
  const [regEmail, setRegEmail] = useState('')
  const [regPassword, setRegPassword] = useState('')
  const [regDepartment, setRegDepartment] = useState('Hospital SOC Operations')
  const [regRole, setRegRole] = useState('SECURITY_ANALYST')
  const [regPhone, setRegPhone] = useState('')

  const [error, setError] = useState('')
  const [successMsg, setSuccessMsg] = useState('')
  const [loading, setLoading] = useState(false)

  const handleLogin = async (e) => {
    e.preventDefault()
    setError('')
    setSuccessMsg('')
    setLoading(true)
    try {
      await apiLogin(loginEmail, loginPassword)
      navigate('/dashboard')
    } catch (err) {
      setError(err.message || 'Login failed. Please verify your hospital credentials.')
    } finally {
      setLoading(false)
    }
  }

  const handleRegister = async (e) => {
    e.preventDefault()
    setError('')
    setSuccessMsg('')
    if (!regFullName.trim() || !regEmail.trim() || !regPassword.trim()) {
      setError('Please fill in all required fields.')
      return
    }
    if (regPassword.length < 6) {
      setError('Password must be at least 6 characters long.')
      return
    }
    setLoading(true)
    try {
      await apiRegister({
        fullName: regFullName.trim(),
        email: regEmail.trim(),
        password: regPassword,
        department: regDepartment,
        phoneNumber: regPhone.trim() || null,
        role: regRole
      })
      setSuccessMsg('Account registered successfully! Redirecting to dashboard...')
      setTimeout(() => navigate('/dashboard'), 1000)
    } catch (err) {
      setError(err.message || 'Registration failed. Please check your details.')
    } finally {
      setLoading(false)
    }
  }

  const fillDemoAccount = (type) => {
    if (type === 'admin') {
      setLoginEmail('admin@hospital.org')
      setLoginPassword('admin123')
    } else {
      setLoginEmail('analyst@hospital.org')
      setLoginPassword('analyst123')
    }
  }

  return (
    <div className="min-h-screen bg-navy-900 flex items-center justify-center p-4 relative overflow-hidden">
      {/* Background grid effect */}
      <div className="absolute inset-0 opacity-10">
        <div className="absolute inset-0" style={{
          backgroundImage: 'linear-gradient(rgba(59,130,246,0.3) 1px, transparent 1px), linear-gradient(90deg, rgba(59,130,246,0.3) 1px, transparent 1px)',
          backgroundSize: '40px 40px'
        }} />
      </div>

      {/* Glow effects */}
      <div className="absolute top-1/4 left-1/4 w-96 h-96 bg-cyber-blue/15 rounded-full blur-3xl" />
      <div className="absolute bottom-1/4 right-1/4 w-96 h-96 bg-purple-600/15 rounded-full blur-3xl" />

      <div className="relative w-full max-w-md my-8">
        {/* Header Branding */}
        <div className="text-center mb-6">
          <div className="inline-flex items-center justify-center w-16 h-16 rounded-2xl bg-cyber-blue/20 border border-cyber-blue/50 mb-3 shadow-lg shadow-cyber-blue/20">
            <Shield className="w-9 h-9 text-cyber-blue" strokeWidth={1.8} />
          </div>
          <h1 className="text-2xl font-bold text-white tracking-tight flex items-center justify-center gap-2">
            MedSentry<span className="text-cyber-cyan font-black text-sm px-2 py-0.5 rounded bg-cyber-cyan/15 border border-cyber-cyan/40">XAI</span>
          </h1>
          <p className="text-xs text-slate-300 font-medium mt-1 max-w-xs mx-auto">
            Real-Time Traffic Analysis & Interactive Explainable Cyber-Defense for Healthcare
          </p>
        </div>

        {/* Auth Card */}
        <div className="glass-card p-7 border-slate-700 shadow-2xl">
          {/* Tab switch */}
          <div className="flex bg-slate-900/90 p-1 rounded-xl border border-slate-700/80 mb-6">
            <button
              type="button"
              onClick={() => { setIsRegister(false); setError(''); }}
              className={`flex-1 py-2 text-xs font-bold rounded-lg transition-all ${
                !isRegister
                  ? 'bg-cyber-blue text-white shadow-md'
                  : 'text-slate-300 hover:text-white'
              }`}
            >
              Sign In
            </button>
            <button
              type="button"
              onClick={() => { setIsRegister(true); setError(''); }}
              className={`flex-1 py-2 text-xs font-bold rounded-lg transition-all ${
                isRegister
                  ? 'bg-cyber-blue text-white shadow-md'
                  : 'text-slate-300 hover:text-white'
              }`}
            >
              Create Account
            </button>
          </div>

          {/* Error & Success alerts */}
          {error && (
            <div className="flex items-start gap-2.5 bg-rose-950/70 border border-rose-500/50 rounded-lg p-3 mb-4">
              <AlertCircle className="w-4 h-4 text-rose-400 mt-0.5 flex-shrink-0" />
              <p className="text-xs text-rose-200 font-medium">{error}</p>
            </div>
          )}

          {successMsg && (
            <div className="flex items-start gap-2.5 bg-emerald-950/70 border border-emerald-500/50 rounded-lg p-3 mb-4">
              <CheckCircle2 className="w-4 h-4 text-emerald-400 mt-0.5 flex-shrink-0" />
              <p className="text-xs text-emerald-200 font-medium">{successMsg}</p>
            </div>
          )}

          {!isRegister ? (
            /* ── Sign In Form ── */
            <form onSubmit={handleLogin} className="space-y-4">
              {/* Quick account selector */}
              <div className="flex gap-2 mb-2">
                <button
                  type="button"
                  onClick={() => fillDemoAccount('admin')}
                  className={`flex-1 py-1.5 px-2 rounded-lg text-xs font-semibold border transition-all ${
                    loginEmail === 'admin@hospital.org'
                      ? 'bg-purple-950/70 text-purple-200 border-purple-500/60'
                      : 'bg-slate-900/60 text-slate-300 border-slate-700/60 hover:text-white'
                  }`}
                >
                  Admin Demo
                </button>
                <button
                  type="button"
                  onClick={() => fillDemoAccount('analyst')}
                  className={`flex-1 py-1.5 px-2 rounded-lg text-xs font-semibold border transition-all ${
                    loginEmail === 'analyst@hospital.org'
                      ? 'bg-cyan-950/70 text-cyan-200 border-cyan-500/60'
                      : 'bg-slate-900/60 text-slate-300 border-slate-700/60 hover:text-white'
                  }`}
                >
                  Analyst Demo
                </button>
              </div>

              {/* Email */}
              <div>
                <label className="text-xs font-semibold text-slate-200 mb-1.5 block">Hospital Email</label>
                <div className="relative">
                  <Mail className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
                  <input
                    type="email"
                    required
                    value={loginEmail}
                    onChange={(e) => setLoginEmail(e.target.value)}
                    placeholder="user@hospital.org"
                    className="input-field pl-10"
                  />
                </div>
              </div>

              {/* Password */}
              <div>
                <label className="text-xs font-semibold text-slate-200 mb-1.5 block">Password</label>
                <div className="relative">
                  <Lock className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
                  <input
                    type={showPassword ? 'text' : 'password'}
                    required
                    value={loginPassword}
                    onChange={(e) => setLoginPassword(e.target.value)}
                    placeholder="••••••••"
                    className="input-field pl-10 pr-10"
                  />
                  <button
                    type="button"
                    onClick={() => setShowPassword(!showPassword)}
                    className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-200"
                  >
                    {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                  </button>
                </div>
              </div>

              {/* Submit */}
              <button
                type="submit"
                disabled={loading}
                className="btn-primary w-full py-2.5 text-sm font-semibold mt-2"
              >
                {loading ? 'Authenticating...' : 'Sign In Securely'}
              </button>
            </form>
          ) : (
            /* ── Registration Form ── */
            <form onSubmit={handleRegister} className="space-y-3.5">
              {/* Full Name */}
              <div>
                <label className="text-xs font-semibold text-slate-200 mb-1 block">Full Name *</label>
                <div className="relative">
                  <User className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
                  <input
                    type="text"
                    required
                    value={regFullName}
                    onChange={(e) => setRegFullName(e.target.value)}
                    placeholder="e.g. Dr. Alex Mercer"
                    className="input-field pl-10 text-sm"
                  />
                </div>
              </div>

              {/* Email */}
              <div>
                <label className="text-xs font-semibold text-slate-200 mb-1 block">Hospital Email *</label>
                <div className="relative">
                  <Mail className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
                  <input
                    type="email"
                    required
                    value={regEmail}
                    onChange={(e) => setRegEmail(e.target.value)}
                    placeholder="alex.mercer@hospital.org"
                    className="input-field pl-10 text-sm"
                  />
                </div>
              </div>

              {/* Department */}
              <div>
                <label className="text-xs font-semibold text-slate-200 mb-1 block">Healthcare Department</label>
                <div className="relative">
                  <Building2 className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
                  <select
                    value={regDepartment}
                    onChange={(e) => setRegDepartment(e.target.value)}
                    className="input-field pl-10 text-sm appearance-none cursor-pointer"
                  >
                    <option value="Hospital SOC Operations">Hospital SOC Operations</option>
                    <option value="Clinical Cybersecurity">Clinical Cybersecurity</option>
                    <option value="Radiology & PACS Network">Radiology & PACS Network</option>
                    <option value="ICU & Medical Device Telemetry">ICU & Medical Device Telemetry</option>
                    <option value="Hospital IT & Infrastructure">Hospital IT & Infrastructure</option>
                  </select>
                </div>
              </div>

              {/* Role */}
              <div>
                <label className="text-xs font-semibold text-slate-200 mb-1 block">Requested Role</label>
                <div className="grid grid-cols-2 gap-2">
                  <button
                    type="button"
                    onClick={() => setRegRole('SECURITY_ANALYST')}
                    className={`py-2 text-xs font-semibold rounded-lg border transition-all ${
                      regRole === 'SECURITY_ANALYST'
                        ? 'bg-cyan-950/70 text-cyan-200 border-cyan-500/60'
                        : 'bg-slate-900/60 text-slate-300 border-slate-700/60 hover:text-white'
                    }`}
                  >
                    Security Analyst
                  </button>
                  <button
                    type="button"
                    onClick={() => setRegRole('ADMIN')}
                    className={`py-2 text-xs font-semibold rounded-lg border transition-all ${
                      regRole === 'ADMIN'
                        ? 'bg-purple-950/70 text-purple-200 border-purple-500/60'
                        : 'bg-slate-900/60 text-slate-300 border-slate-700/60 hover:text-white'
                    }`}
                  >
                    Administrator
                  </button>
                </div>
              </div>

              {/* Password */}
              <div>
                <label className="text-xs font-semibold text-slate-200 mb-1 block">Password *</label>
                <div className="relative">
                  <Lock className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
                  <input
                    type={showPassword ? 'text' : 'password'}
                    required
                    value={regPassword}
                    onChange={(e) => setRegPassword(e.target.value)}
                    placeholder="Min 6 characters"
                    className="input-field pl-10 pr-10 text-sm"
                  />
                  <button
                    type="button"
                    onClick={() => setShowPassword(!showPassword)}
                    className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-200"
                  >
                    {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                  </button>
                </div>
              </div>

              {/* Submit Register */}
              <button
                type="submit"
                disabled={loading}
                className="btn-primary w-full py-2.5 text-sm font-semibold mt-2"
              >
                {loading ? 'Registering...' : 'Create Account & Sign In'}
              </button>
            </form>
          )}

          {/* Security Notice */}
          <div className="mt-5 p-3 rounded-lg bg-slate-900/80 border border-slate-700/70 flex items-start gap-2.5">
            <Shield className="w-4 h-4 text-cyber-blue mt-0.5 flex-shrink-0" />
            <p className="text-[11px] text-slate-300 leading-relaxed">
              MedSentry-XAI is restricted to authorized hospital security personnel. All activities and network captures are cryptographically logged.
            </p>
          </div>
        </div>

        <p className="text-center text-xs text-slate-400 font-medium mt-4">
          © 2026 MedSentry-XAI · HIPAA Security Rule & SOC 2 Type II Certified
        </p>
      </div>
    </div>
  )
}

