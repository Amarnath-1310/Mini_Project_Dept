import { useState, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import {
  ShieldAlert, Users, Database, Server, RefreshCw,
  Trash2, CheckCircle2, AlertCircle, Search, Shield,
  Activity, HardDrive, Cpu, AlertTriangle, ArrowRight
} from 'lucide-react'
import {
  getAdminUsers, updateUserStatus, updateUserRole, deleteUser,
  getDatasets, deleteDataset, getSystemStatus, getCurrentUser
} from '../data/api'
import { formatSize, formatDate } from '../utils/formatters'

export default function AdminManagement() {
  const navigate = useNavigate()
  const currentUser = getCurrentUser()
  const isAdmin = currentUser?.role === 'ADMIN'

  const [activeTab, setActiveTab] = useState('users') // users | datasets | system
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [success, setSuccess] = useState('')

  // Users tab state
  const [users, setUsers] = useState([])
  const [userSearch, setUserSearch] = useState('')
  const [userToDelete, setUserToDelete] = useState(null)

  // Datasets tab state
  const [datasets, setDatasets] = useState([])
  const [datasetToDelete, setDatasetToDelete] = useState(null)

  // System tab state
  const [systemInfo, setSystemInfo] = useState(null)

  useEffect(() => {
    if (isAdmin) {
      loadTabData(activeTab)
    }
  }, [activeTab])

  async function loadTabData(tab) {
    setLoading(true)
    setError('')
    try {
      if (tab === 'users') {
        const data = await getAdminUsers()
        setUsers(Array.isArray(data) ? data : [])
      } else if (tab === 'datasets') {
        const data = await getDatasets()
        setDatasets(Array.isArray(data) ? data : [])
      } else if (tab === 'system') {
        const data = await getSystemStatus()
        setSystemInfo(data)
      }
    } catch (err) {
      setError(err.message || 'Failed to fetch admin data.')
    } finally {
      setLoading(false)
    }
  }

  const handleToggleStatus = async (userId, currentActive) => {
    try {
      await updateUserStatus(userId, !currentActive)
      setSuccess(`User status ${!currentActive ? 'activated' : 'deactivated'} successfully.`)
      setTimeout(() => setSuccess(''), 3000)
      loadTabData('users')
    } catch (err) {
      setError(err.message || 'Failed to update user status.')
    }
  }

  const handleRoleChange = async (userId, newRole) => {
    try {
      await updateUserRole(userId, newRole)
      setSuccess(`User role updated to ${newRole}.`)
      setTimeout(() => setSuccess(''), 3000)
      loadTabData('users')
    } catch (err) {
      setError(err.message || 'Failed to update user role.')
    }
  }

  const handleConfirmDeleteUser = async () => {
    if (!userToDelete) return
    try {
      await deleteUser(userToDelete.id)
      setSuccess(`User account ${userToDelete.email} removed permanently.`)
      setUserToDelete(null)
      setTimeout(() => setSuccess(''), 3000)
      loadTabData('users')
    } catch (err) {
      setError(err.message || 'Failed to delete user.')
    }
  }

  const handleConfirmDeleteDataset = async () => {
    if (!datasetToDelete) return
    try {
      await deleteDataset(datasetToDelete.id)
      setSuccess(`Dataset "${datasetToDelete.filename}" and its analysis records deleted.`)
      setDatasetToDelete(null)
      setTimeout(() => setSuccess(''), 3000)
      loadTabData('datasets')
    } catch (err) {
      setError(err.message || 'Failed to delete dataset.')
    }
  }

  if (!isAdmin) {
    return (
      <div className="glass-card p-12 text-center max-w-xl mx-auto my-12 border-rose-500/40">
        <ShieldAlert className="w-16 h-16 text-rose-400 mx-auto mb-4 opacity-80" />
        <h2 className="text-xl font-bold text-white mb-2">Administrative Privileges Required</h2>
        <p className="text-sm text-slate-300 mb-6">
          Access to this console is restricted to hospital security administrators. Your account ({currentUser?.email || 'Guest'}) has role <span className="font-semibold text-cyan-300">{currentUser?.role || 'None'}</span>.
        </p>
        <button onClick={() => navigate('/dashboard')} className="btn-primary mx-auto text-sm">
          Return to Dashboard
        </button>
      </div>
    )
  }

  const filteredUsers = users.filter(u =>
    (u.fullName?.toLowerCase() || '').includes(userSearch.toLowerCase()) ||
    (u.email?.toLowerCase() || '').includes(userSearch.toLowerCase()) ||
    (u.department?.toLowerCase() || '').includes(userSearch.toLowerCase())
  )

  return (
    <div className="space-y-6 animate-fade-in pb-12">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-lg bg-purple-950/80 border border-purple-500/50 flex items-center justify-center">
              <ShieldAlert className="w-5 h-5 text-purple-400" />
            </div>
            <h1 className="text-2xl font-bold text-white tracking-tight">Admin Governance Console</h1>
          </div>
          <p className="text-sm text-slate-300 mt-1">Full administrative control, user permissions, dataset lifecycle, and system telemetry</p>
        </div>
        <button
          onClick={() => loadTabData(activeTab)}
          className="btn-secondary flex items-center gap-2 text-xs py-2 px-3 self-start sm:self-auto"
        >
          <RefreshCw className="w-3.5 h-3.5" /> Refresh View
        </button>
      </div>

      {/* Feedback Alerts */}
      {success && (
        <div className="flex items-center gap-3 bg-emerald-950/80 border border-emerald-500/60 rounded-xl p-3.5 shadow-lg">
          <CheckCircle2 className="w-5 h-5 text-emerald-400 flex-shrink-0" />
          <p className="text-xs text-emerald-200 font-semibold">{success}</p>
        </div>
      )}

      {error && (
        <div className="flex items-center gap-3 bg-rose-950/80 border border-rose-500/60 rounded-xl p-3.5 shadow-lg">
          <AlertCircle className="w-5 h-5 text-rose-400 flex-shrink-0" />
          <p className="text-xs text-rose-200 font-semibold">{error}</p>
        </div>
      )}

      {/* Tabs */}
      <div className="flex border-b border-slate-700/80 gap-3">
        {[
          { id: 'users', label: 'User Governance', icon: Users, count: users.length },
          { id: 'datasets', label: 'Dataset Storage', icon: Database, count: datasets.length },
          { id: 'system', label: 'System Health & Telemetry', icon: Server },
        ].map(({ id, label, icon: Icon, count }) => (
          <button
            key={id}
            onClick={() => setActiveTab(id)}
            className={`flex items-center gap-2.5 py-3 px-4 text-xs font-bold border-b-2 transition-all ${
              activeTab === id
                ? 'border-purple-500 text-white bg-purple-950/20'
                : 'border-transparent text-slate-400 hover:text-slate-200 hover:border-slate-600'
            }`}
          >
            <Icon className="w-4 h-4" />
            <span>{label}</span>
            {count !== undefined && (
              <span className="text-[10px] bg-slate-800 text-slate-300 px-2 py-0.5 rounded-full border border-slate-700">
                {count}
              </span>
            )}
          </button>
        ))}
      </div>

      {/* Tab Content */}
      {loading ? (
        <div className="flex items-center justify-center h-56">
          <div className="text-center">
            <div className="w-8 h-8 border-2 border-purple-500 border-t-transparent rounded-full animate-spin mx-auto mb-3" />
            <p className="text-sm text-slate-300 font-medium">Loading administrative data...</p>
          </div>
        </div>
      ) : activeTab === 'users' ? (
        /* ════════════════════════════════════════════════════════════════
           TAB 1: USER GOVERNANCE
        ════════════════════════════════════════════════════════════════ */
        <div className="space-y-4">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 bg-slate-900/60 p-3 rounded-xl border border-slate-700">
            <div className="relative flex-1 max-w-sm">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
              <input
                type="text"
                value={userSearch}
                onChange={(e) => setUserSearch(e.target.value)}
                placeholder="Search user name, email, department..."
                className="input-field pl-9 py-2 text-xs"
              />
            </div>
            <div className="text-xs text-slate-300 font-medium">
              Showing <span className="font-bold text-white">{filteredUsers.length}</span> of {users.length} accounts
            </div>
          </div>

          <div className="glass-card overflow-hidden border-slate-700">
            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs">
                <thead>
                  <tr className="bg-navy-900/90 border-b border-slate-700 text-slate-200 font-bold uppercase tracking-wider">
                    <th className="py-3.5 px-4">User Account</th>
                    <th className="py-3.5 px-4">Department</th>
                    <th className="py-3.5 px-4">Role Privileges</th>
                    <th className="py-3.5 px-4">Status</th>
                    <th className="py-3.5 px-4">Created Date</th>
                    <th className="py-3.5 px-4 text-right">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-700/60 text-slate-200">
                  {filteredUsers.length > 0 ? (
                    filteredUsers.map((u) => {
                      const isSelf = u.email?.toLowerCase() === currentUser?.email?.toLowerCase()
                      return (
                        <tr key={u.id} className="hover:bg-slate-800/60 transition-colors">
                          <td className="py-3 px-4">
                            <div className="font-semibold text-white">{u.fullName || 'No Name'}</div>
                            <div className="text-slate-400 font-mono text-[11px]">{u.email}</div>
                          </td>
                          <td className="py-3 px-4 font-medium text-slate-300">
                            {u.department || 'Clinical Staff'}
                          </td>
                          <td className="py-3 px-4">
                            <select
                              value={u.role}
                              disabled={isSelf}
                              onChange={(e) => handleRoleChange(u.id, e.target.value)}
                              className={`text-xs font-bold py-1 px-2 rounded-lg border cursor-pointer focus:outline-none ${
                                u.role === 'ADMIN'
                                  ? 'bg-purple-950/80 text-purple-200 border-purple-500/60'
                                  : 'bg-cyan-950/80 text-cyan-200 border-cyan-500/60'
                              } ${isSelf ? 'opacity-80 cursor-not-allowed' : ''}`}
                            >
                              <option value="SECURITY_ANALYST">Security Analyst</option>
                              <option value="ADMIN">Administrator</option>
                            </select>
                          </td>
                          <td className="py-3 px-4">
                            <span className={`inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-[11px] font-bold border ${
                              u.active
                                ? 'bg-emerald-950/80 text-emerald-300 border-emerald-500/50'
                                : 'bg-slate-900 text-slate-400 border-slate-700'
                            }`}>
                              <span className={`w-1.5 h-1.5 rounded-full ${u.active ? 'bg-emerald-400' : 'bg-slate-500'}`} />
                              {u.active ? 'Active' : 'Disabled'}
                            </span>
                          </td>
                          <td className="py-3 px-4 text-slate-300 font-mono text-[11px]">
                            {u.createdAt ? formatDate(u.createdAt) : '—'}
                          </td>
                          <td className="py-3 px-4 text-right">
                            <div className="flex items-center justify-end gap-2">
                              {!isSelf && (
                                <button
                                  onClick={() => handleToggleStatus(u.id, u.active)}
                                  className="text-[11px] font-semibold px-2.5 py-1 rounded bg-slate-800 hover:bg-slate-700 text-slate-200 border border-slate-600 transition-colors"
                                >
                                  {u.active ? 'Deactivate' : 'Activate'}
                                </button>
                              )}
                              {!isSelf && (
                                <button
                                  onClick={() => setUserToDelete(u)}
                                  className="p-1.5 rounded hover:bg-rose-950/60 text-rose-400 border border-transparent hover:border-rose-700 transition-colors"
                                  title="Delete User"
                                >
                                  <Trash2 className="w-4 h-4" />
                                </button>
                              )}
                              {isSelf && (
                                <span className="text-[10px] text-slate-400 font-semibold italic">Current Admin</span>
                              )}
                            </div>
                          </td>
                        </tr>
                      )
                    })
                  ) : (
                    <tr>
                      <td colSpan={6} className="py-8 text-center text-slate-400 font-medium">
                        No user accounts matched your search.
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      ) : activeTab === 'datasets' ? (
        /* ════════════════════════════════════════════════════════════════
           TAB 2: DATASET GOVERNANCE & DELETION
        ════════════════════════════════════════════════════════════════ */
        <div className="space-y-4">
          <div className="glass-card overflow-hidden border-slate-700">
            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs">
                <thead>
                  <tr className="bg-navy-900/90 border-b border-slate-700 text-slate-200 font-bold uppercase tracking-wider">
                    <th className="py-3.5 px-4">Dataset Filename</th>
                    <th className="py-3.5 px-4">Format</th>
                    <th className="py-3.5 px-4">File Size</th>
                    <th className="py-3.5 px-4">Total Records</th>
                    <th className="py-3.5 px-4">Analysis Status</th>
                    <th className="py-3.5 px-4">Uploaded</th>
                    <th className="py-3.5 px-4 text-right">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-700/60 text-slate-200">
                  {datasets.length > 0 ? (
                    datasets.map((ds) => (
                      <tr key={ds.id} className="hover:bg-slate-800/60 transition-colors">
                        <td className="py-3 px-4 font-semibold text-white">
                          {ds.filename || `dataset_${ds.id}`}
                        </td>
                        <td className="py-3 px-4">
                          <span className="text-[10px] font-extrabold uppercase px-2 py-0.5 rounded bg-slate-800 text-slate-300 border border-slate-700">
                            {ds.fileType || 'parquet'}
                          </span>
                        </td>
                        <td className="py-3 px-4 font-mono text-slate-300">
                          {ds.fileSize ? formatSize(ds.fileSize) : '—'}
                        </td>
                        <td className="py-3 px-4 font-mono text-slate-200 font-semibold">
                          {ds.totalRecords ? ds.totalRecords.toLocaleString() : '—'}
                        </td>
                        <td className="py-3 px-4">
                          <span className={`inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-[11px] font-bold border ${
                            ds.status === 'COMPLETED'
                              ? 'bg-emerald-950/80 text-emerald-300 border-emerald-500/50'
                              : ds.status === 'ANALYZING'
                              ? 'bg-cyan-950/80 text-cyan-300 border-cyan-500/50'
                              : 'bg-slate-900 text-slate-300 border-slate-700'
                          }`}>
                            {ds.status}
                          </span>
                        </td>
                        <td className="py-3 px-4 text-slate-300 font-mono text-[11px]">
                          {ds.uploadedTime ? formatDate(ds.uploadedTime) : '—'}
                        </td>
                        <td className="py-3 px-4 text-right">
                          <div className="flex items-center justify-end gap-2">
                            {ds.status === 'COMPLETED' && (
                              <button
                                onClick={() => navigate(`/analysis/${ds.id}`)}
                                className="text-[11px] font-semibold px-2.5 py-1 rounded bg-cyber-blue/20 hover:bg-cyber-blue/30 text-cyber-blue border border-cyber-blue/40 transition-colors flex items-center gap-1"
                              >
                                View <ArrowRight className="w-3 h-3" />
                              </button>
                            )}
                            <button
                              onClick={() => setDatasetToDelete(ds)}
                              className="p-1.5 rounded hover:bg-rose-950/60 text-rose-400 border border-transparent hover:border-rose-700 transition-colors"
                              title="Delete Dataset"
                            >
                              <Trash2 className="w-4 h-4" />
                            </button>
                          </div>
                        </td>
                      </tr>
                    ))
                  ) : (
                    <tr>
                      <td colSpan={7} className="py-8 text-center text-slate-400 font-medium">
                        No uploaded datasets found in database.
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      ) : (
        /* ════════════════════════════════════════════════════════════════
           TAB 3: SYSTEM HEALTH & TELEMETRY
        ════════════════════════════════════════════════════════════════ */
        <div className="grid grid-cols-1 md:grid-cols-3 gap-5">
          {/* Spring Boot Backend Card */}
          <div className="glass-card p-5 border-slate-700 space-y-3">
            <div className="flex items-center justify-between pb-3 border-b border-slate-700/80">
              <div className="flex items-center gap-2.5">
                <Server className="w-5 h-5 text-cyber-blue" />
                <h3 className="text-sm font-bold text-white">Spring Boot Backend</h3>
              </div>
              <span className="text-[11px] font-bold px-2 py-0.5 rounded-full bg-emerald-950 text-emerald-300 border border-emerald-500/50">
                Active · Port 8080
              </span>
            </div>
            <div className="space-y-2 text-xs">
              <div className="flex justify-between text-slate-300">
                <span>Java Runtime:</span>
                <span className="font-mono text-white font-semibold">{systemInfo?.jvm?.javaVersion || '26.0.1'}</span>
              </div>
              <div className="flex justify-between text-slate-300">
                <span>Uptime:</span>
                <span className="font-mono text-white font-semibold">{Math.round(systemInfo?.jvm?.uptimeSeconds || 0)}s</span>
              </div>
              <div className="flex justify-between text-slate-300">
                <span>JVM Memory:</span>
                <span className="font-mono text-white font-semibold">
                  {systemInfo?.jvm?.usedMemoryMb || 0} MB / {systemInfo?.jvm?.maxMemoryMb || 0} MB
                </span>
              </div>
              <div className="w-full bg-slate-900 rounded-full h-2 overflow-hidden mt-2 border border-slate-700">
                <div
                  className="bg-cyber-blue h-full rounded-full transition-all duration-500"
                  style={{ width: `${Math.min(100, Math.round(((systemInfo?.jvm?.usedMemoryMb || 1) / (systemInfo?.jvm?.maxMemoryMb || 100)) * 100))}%` }}
                />
              </div>
            </div>
          </div>

          {/* PostgreSQL Database Card */}
          <div className="glass-card p-5 border-slate-700 space-y-3">
            <div className="flex items-center justify-between pb-3 border-b border-slate-700/80">
              <div className="flex items-center gap-2.5">
                <Database className="w-5 h-5 text-emerald-400" />
                <h3 className="text-sm font-bold text-white">PostgreSQL Database</h3>
              </div>
              <span className="text-[11px] font-bold px-2 py-0.5 rounded-full bg-emerald-950 text-emerald-300 border border-emerald-500/50">
                Connected · 5432
              </span>
            </div>
            <div className="space-y-2 text-xs">
              <div className="flex justify-between text-slate-300">
                <span>Total Registered Users:</span>
                <span className="font-mono text-white font-bold">{systemInfo?.database?.totalUsers ?? users.length}</span>
              </div>
              <div className="flex justify-between text-slate-300">
                <span>Total Datasets:</span>
                <span className="font-mono text-white font-bold">{systemInfo?.database?.totalDatasets ?? datasets.length}</span>
              </div>
              <div className="flex justify-between text-slate-300">
                <span>Recorded Detections:</span>
                <span className="font-mono text-white font-bold">{systemInfo?.database?.totalDetections ?? 0}</span>
              </div>
              <div className="flex justify-between text-slate-300">
                <span>Active Security Alerts:</span>
                <span className="font-mono text-rose-300 font-bold">{systemInfo?.database?.totalAlerts ?? 0}</span>
              </div>
            </div>
          </div>

          {/* FastAPI ML Engine Card */}
          <div className="glass-card p-5 border-slate-700 space-y-3">
            <div className="flex items-center justify-between pb-3 border-b border-slate-700/80">
              <div className="flex items-center gap-2.5">
                <Activity className="w-5 h-5 text-purple-400" />
                <h3 className="text-sm font-bold text-white">ML & XAI Engine</h3>
              </div>
              <span className={`text-[11px] font-bold px-2 py-0.5 rounded-full border ${
                systemInfo?.mlService?.online
                  ? 'bg-emerald-950 text-emerald-300 border-emerald-500/50'
                  : 'bg-rose-950 text-rose-300 border-rose-500/50'
              }`}>
                {systemInfo?.mlService?.online ? 'Online · Port 8000' : 'Offline'}
              </span>
            </div>
            <div className="space-y-2 text-xs">
              <div className="flex justify-between text-slate-300">
                <span>Primary Classifier:</span>
                <span className="font-semibold text-white">XGBoost NIDS</span>
              </div>
              <div className="flex justify-between text-slate-300">
                <span>XAI Architecture:</span>
                <span className="font-semibold text-cyan-300">TreeSHAP Explainers</span>
              </div>
              <div className="flex justify-between text-slate-300">
                <span>Model Status:</span>
                <span className="font-semibold text-emerald-300">Loaded in Memory</span>
              </div>
              <div className="flex justify-between text-slate-300">
                <span>Live Sniffer:</span>
                <span className="font-semibold text-purple-300">Scapy / Flow Engine</span>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Confirmation Modal: Delete User */}
      {userToDelete && (
        <div className="fixed inset-0 z-50 bg-black/70 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="glass-card p-6 max-w-md w-full border-rose-500/50 shadow-2xl animate-fade-in">
            <div className="flex items-center gap-3 text-rose-400 mb-3">
              <AlertTriangle className="w-6 h-6 flex-shrink-0" />
              <h3 className="text-base font-bold text-white">Confirm User Deletion</h3>
            </div>
            <p className="text-xs text-slate-300 mb-6 leading-relaxed">
              Are you sure you want to permanently delete the user account for{' '}
              <strong className="text-white font-semibold">{userToDelete.email}</strong> ({userToDelete.fullName})? This action cannot be undone.
            </p>
            <div className="flex items-center justify-end gap-3">
              <button
                onClick={() => setUserToDelete(null)}
                className="btn-secondary py-2 px-4 text-xs font-semibold"
              >
                Cancel
              </button>
              <button
                onClick={handleConfirmDeleteUser}
                className="btn-danger py-2 px-4 text-xs font-semibold flex items-center gap-1.5"
              >
                <Trash2 className="w-3.5 h-3.5" /> Delete Permanently
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Confirmation Modal: Delete Dataset */}
      {datasetToDelete && (
        <div className="fixed inset-0 z-50 bg-black/70 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="glass-card p-6 max-w-md w-full border-rose-500/50 shadow-2xl animate-fade-in">
            <div className="flex items-center gap-3 text-rose-400 mb-3">
              <AlertTriangle className="w-6 h-6 flex-shrink-0" />
              <h3 className="text-base font-bold text-white">Delete Dataset & Analysis</h3>
            </div>
            <p className="text-xs text-slate-300 mb-6 leading-relaxed">
              Are you sure you want to delete <strong className="text-white">{datasetToDelete.filename}</strong>? All associated prediction records, attack breakdown details, and physical files will be permanently erased.
            </p>
            <div className="flex items-center justify-end gap-3">
              <button
                onClick={() => setDatasetToDelete(null)}
                className="btn-secondary py-2 px-4 text-xs font-semibold"
              >
                Cancel
              </button>
              <button
                onClick={handleConfirmDeleteDataset}
                className="btn-danger py-2 px-4 text-xs font-semibold flex items-center gap-1.5"
              >
                <Trash2 className="w-3.5 h-3.5" /> Delete Dataset
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
