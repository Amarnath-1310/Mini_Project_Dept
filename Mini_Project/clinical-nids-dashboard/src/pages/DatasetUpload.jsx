import { useState, useRef, useCallback, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import {
  Upload, FileText, CheckCircle, AlertCircle, X, Loader2,
  Database, ArrowRight, Info, Clock, Zap, HardDrive
} from 'lucide-react'
import { uploadDataset, analyzeDataset, getAnalysisProgress } from '../data/api'
import { useToast } from '../contexts/ToastContext'
import { formatSize, formatDuration, formatNumber } from '../utils/formatters'

const MAX_FILE_SIZE = 500 * 1024 * 1024 // 500MB
const ACCEPTED_TYPES = '.csv,.xlsx,.xls,.parquet,.feather,.tsv,.txt'

const ANALYSIS_STEPS = [
  { key: 'upload', label: 'Uploading dataset' },
  { key: 'validate', label: 'Validating dataset' },
  { key: 'preprocess', label: 'Preprocessing features' },
  { key: 'predict', label: 'Running ML predictions' },
  { key: 'shap', label: 'Computing SHAP explanations' },
  { key: 'report', label: 'Generating report' },
]

export default function DatasetUpload() {
  const navigate = useNavigate()
  const toast = useToast()
  const fileInputRef = useRef(null)
  const pollRef = useRef(null)

  const [file, setFile] = useState(null)
  const [dragOver, setDragOver] = useState(false)
  const [phase, setPhase] = useState('idle') // idle | uploading | analyzing | success | error
  const [error, setError] = useState('')
  const [datasetId, setDatasetId] = useState(null)
  const [progress, setProgress] = useState(null)

  // Cleanup polling on unmount
  useEffect(() => {
    return () => { if (pollRef.current) clearInterval(pollRef.current) }
  }, [])

  const validateFile = (f) => {
    const ext = f.name.substring(f.name.lastIndexOf('.')).toLowerCase()
    const supported = ['.csv', '.xlsx', '.xls', '.parquet', '.feather', '.tsv', '.txt']
    if (!supported.includes(ext)) {
      return `Unsupported format '${ext}'. Supported: ${supported.join(', ')}`
    }
    if (f.size > MAX_FILE_SIZE) {
      return `File size exceeds 500MB limit (${formatSize(f.size)})`
    }
    return null
  }

  const handleFileSelect = (f) => {
    setError('')
    setPhase('idle')
    setProgress(null)
    const err = validateFile(f)
    if (err) { setError(err); toast.error(err); return }
    setFile(f)
  }

  const handleDrop = useCallback((e) => {
    e.preventDefault()
    setDragOver(false)
    const f = e.dataTransfer.files[0]
    if (f) handleFileSelect(f)
  }, [])

  const handleDragOver = (e) => { e.preventDefault(); setDragOver(true) }
  const handleDragLeave = () => setDragOver(false)

  const getStepStatus = (stepKey) => {
    if (!progress?.steps) return 'pending'
    const step = progress.steps.find(s => s.name?.toLowerCase().includes(stepKey) || s.key === stepKey)
    if (step) return step.status
    return 'pending'
  }

  const isStepReached = (stepKey) => {
    if (phase === 'idle') return false
    const stepOrder = ANALYSIS_STEPS.map(s => s.key)
    const currentIdx = ANALYSIS_STEPS.findIndex(s => s.key === stepKey)
    
    if (phase === 'uploading') return stepOrder.indexOf(stepKey) <= 0
    if (phase === 'analyzing') {
      if (progress?.steps) {
        const completedSteps = progress.steps.filter(s => s.status === 'completed').length
        return currentIdx <= completedSteps
      }
      return true
    }
    if (phase === 'success') return true
    return false
  }

  const handleUploadAndAnalyze = async () => {
    if (!file) return
    setError('')
    setPhase('uploading')
    setProgress(null)

    try {
      // Step 1: Upload
      const uploadResult = await uploadDataset(file)
      setDatasetId(uploadResult.datasetId)

      // Step 2: Trigger analysis (backend will poll ML service)
      setPhase('analyzing')

      // Start polling progress
      const pollInterval = setInterval(async () => {
        try {
          const prog = await getAnalysisProgress(uploadResult.datasetId)
          setProgress(prog)
          if (prog.status === 'completed' || prog.status === 'COMPLETED') {
            clearInterval(pollInterval)
          } else if (prog.status === 'FAILED' || prog.status === 'failed') {
            clearInterval(pollInterval)
            throw new Error(prog.error || 'Analysis failed')
          }
        } catch (err) {
          clearInterval(pollInterval)
          throw err
        }
      }, 1000)
      pollRef.current = pollInterval

      // Also call analyzeDataset which blocks until complete
      const analysisResult = await analyzeDataset(uploadResult.datasetId)

      clearInterval(pollInterval)
      pollRef.current = null

      setPhase('success')
      toast.success('Analysis complete! Redirecting to results...')
      localStorage.setItem('datasetId', String(uploadResult.datasetId))

      setTimeout(() => {
        navigate(`/analysis/${uploadResult.datasetId}`, {
          state: { mlResult: analysisResult }
        })
      }, 2000)

    } catch (err) {
      console.error('Upload/analysis error:', err)
      const msg = err.message || 'Upload or analysis failed'
      setError(msg)
      setPhase('error')
      toast.error(msg)
      if (pollRef.current) { clearInterval(pollRef.current); pollRef.current = null }
    }
  }

  const clearFile = () => {
    setFile(null)
    setError('')
    setPhase('idle')
    setProgress(null)
  }

  const isProcessing = phase === 'uploading' || phase === 'analyzing'

  return (
    <div className="space-y-6 animate-fade-in max-w-4xl mx-auto">
      {/* Header */}
      <div>
        <h1 className="text-2xl font-bold text-white">Dataset Upload & Analysis</h1>
        <p className="text-sm text-gray-400 mt-1">
          Upload a network traffic dataset for AI-powered intrusion detection analysis
        </p>
      </div>

      {/* Info card */}
      <div className="glass-card p-4 border-cyber-blue/30">
        <div className="flex items-start gap-3">
          <Info className="w-5 h-5 text-cyber-blue mt-0.5 flex-shrink-0" />
          <div className="text-xs text-gray-300 space-y-1">
            <p className="font-semibold text-white">How it works:</p>
            <p>1. Upload a dataset file (CSV, Excel, Parquet, Feather, TSV, TXT) in CICIDS2017 format</p>
            <p>2. The system validates, preprocesses, and runs ML prediction on all flows</p>
            <p>3. SHAP-based explainable AI generates reasons for each detected attack</p>
            <p>4. A comprehensive security report is generated with attack statistics</p>
          </div>
        </div>
      </div>

      {/* Upload zone */}
      <div
        onDrop={handleDrop}
        onDragOver={handleDragOver}
        onDragLeave={handleDragLeave}
        onClick={() => !file && !isProcessing && fileInputRef.current?.click()}
        className={`glass-card p-12 text-center cursor-pointer transition-all duration-300 ${
          dragOver
            ? 'border-cyber-blue border-2 bg-cyber-blue/5'
            : file
              ? 'border-cyber-green/40 cursor-default'
              : 'border-dashed border-2 border-navy-500 hover:border-cyber-blue/50 hover:bg-navy-800/40'
        }`}
      >
        <input
          ref={fileInputRef}
          type="file"
          accept={ACCEPTED_TYPES}
          className="hidden"
          onChange={(e) => e.target.files[0] && handleFileSelect(e.target.files[0])}
        />

        {!file ? (
          <div>
            <div className="w-16 h-16 rounded-2xl bg-cyber-blue/10 border border-cyber-blue/30 flex items-center justify-center mx-auto mb-4">
              <Upload className="w-8 h-8 text-cyber-blue" />
            </div>
            <p className="text-lg font-semibold text-white mb-1">
              Drop your dataset file here
            </p>
            <p className="text-sm text-gray-400 mb-3">or click to browse</p>
            <div className="flex items-center justify-center gap-4 text-xs text-gray-500">
              <span className="flex items-center gap-1">
                <FileText className="w-3 h-3" /> CSV, Excel, Parquet, Feather, TSV, TXT
              </span>
              <span>Max 500MB</span>
            </div>
          </div>
        ) : (
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-4">
              <div className="w-12 h-12 rounded-xl bg-cyber-green/10 border border-cyber-green/30 flex items-center justify-center">
                <Database className="w-6 h-6 text-cyber-green" />
              </div>
              <div className="text-left">
                <p className="text-sm font-semibold text-white">{file.name}</p>
                <p className="text-xs text-gray-400">{formatSize(file.size)}</p>
              </div>
            </div>
            {!isProcessing && (
              <button onClick={(e) => { e.stopPropagation(); clearFile() }}
                className="p-2 rounded-lg hover:bg-navy-700/60 text-gray-400 hover:text-red-400 transition-colors">
                <X className="w-5 h-5" />
              </button>
            )}
          </div>
        )}
      </div>

      {/* Error */}
      {error && (
        <div className="flex items-start gap-3 bg-red-500/10 border border-red-500/30 rounded-xl p-4">
          <AlertCircle className="w-5 h-5 text-red-400 mt-0.5 flex-shrink-0" />
          <div>
            <p className="text-sm font-medium text-red-400">Error</p>
            <p className="text-xs text-gray-400 mt-1">{error}</p>
          </div>
        </div>
      )}

      {/* Progress Steps */}
      {(phase === 'uploading' || phase === 'analyzing') && (
        <div className="glass-card p-5">
          <div className="flex items-center gap-3 mb-4">
            <Loader2 className="w-5 h-5 text-cyber-blue animate-spin" />
            <span className="text-sm font-medium text-white">
              {phase === 'uploading' ? 'Uploading dataset...' : 'Analyzing dataset...'}
            </span>
          </div>

          {/* Step list */}
          <div className="space-y-2 mb-4">
            {ANALYSIS_STEPS.map((step, idx) => {
              const reached = isStepReached(step.key)
              const currentStepIdx = progress?.steps
                ? progress.steps.findIndex(s => s.status === 'in_progress')
                : -1
              const isCurrent = phase === 'analyzing' && (
                currentStepIdx >= 0
                  ? idx === Math.min(currentStepIdx + 1, ANALYSIS_STEPS.length - 1)
                  : idx === 0
              )
              const completed = phase === 'success' || (progress?.steps && 
                progress.steps.filter(s => s.status === 'completed').length > idx)

              return (
                <div key={step.key} className="flex items-center gap-3">
                  {completed ? (
                    <CheckCircle className="w-4 h-4 text-cyber-green flex-shrink-0" />
                  ) : isCurrent || (reached && phase === 'analyzing') ? (
                    <Loader2 className="w-4 h-4 text-cyber-blue animate-spin flex-shrink-0" />
                  ) : (
                    <div className="w-4 h-4 rounded-full border border-navy-600 flex-shrink-0" />
                  )}
                  <span className={`text-xs ${completed ? 'text-cyber-green' : reached ? 'text-white' : 'text-gray-500'}`}>
                    {step.label}
                  </span>
                </div>
              )
            })}
          </div>

          {/* Progress bar */}
          <div className="h-2 bg-navy-700 rounded-full overflow-hidden mb-2">
            <div
              className="h-full rounded-full bg-gradient-to-r from-cyber-blue to-cyber-cyan transition-all duration-500"
              style={{ width: `${progress?.progress_percent || (phase === 'uploading' ? 10 : 50)}%` }}
            />
          </div>

          {/* Stats row */}
          <div className="flex items-center justify-between text-xs text-gray-500">
            <span>{progress?.progress_percent || 0}% complete</span>
            {progress?.rows_processed > 0 && (
              <span className="flex items-center gap-1">
                <HardDrive className="w-3 h-3" />
                {formatNumber(progress.rows_processed)} / {formatNumber(progress.total_rows)} rows
              </span>
            )}
            {progress?.speed_rows_per_sec > 0 && (
              <span className="flex items-center gap-1">
                <Zap className="w-3 h-3" />
                {formatNumber(progress.speed_rows_per_sec)} rows/s
              </span>
            )}
            {progress?.estimated_seconds_remaining > 0 && (
              <span className="flex items-center gap-1">
                <Clock className="w-3 h-3" />
                {formatDuration(progress.estimated_seconds_remaining)} remaining
              </span>
            )}
          </div>
        </div>
      )}

      {/* Success */}
      {phase === 'success' && (
        <div className="flex items-start gap-3 bg-cyber-green/10 border border-cyber-green/30 rounded-xl p-4">
          <CheckCircle className="w-5 h-5 text-cyber-green mt-0.5 flex-shrink-0" />
          <div>
            <p className="text-sm font-medium text-cyber-green">Analysis Complete!</p>
            <p className="text-xs text-gray-400 mt-1">Redirecting to results...</p>
          </div>
        </div>
      )}

      {/* Upload button */}
      {file && phase === 'idle' && (
        <button
          onClick={handleUploadAndAnalyze}
          className="btn-primary w-full py-3 text-sm font-semibold flex items-center justify-center gap-2"
        >
          <Upload className="w-4 h-4" /> Upload & Analyze Dataset
          <ArrowRight className="w-4 h-4" />
        </button>
      )}
    </div>
  )
}
