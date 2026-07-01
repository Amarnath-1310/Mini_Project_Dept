import { useState, useRef, useCallback } from 'react'
import { useNavigate } from 'react-router-dom'
import {
  Upload, FileText, CheckCircle, AlertCircle, X, Loader2,
  Database, ArrowRight, Info
} from 'lucide-react'
import { uploadDataset, analyzeDataset } from '../data/api'

const MAX_FILE_SIZE = 500 * 1024 * 1024 // 500MB

export default function DatasetUpload() {
  const navigate = useNavigate()
  const fileInputRef = useRef(null)
  const [file, setFile] = useState(null)
  const [dragOver, setDragOver] = useState(false)
  const [uploading, setUploading] = useState(false)
  const [analyzing, setAnalyzing] = useState(false)
  const [progress, setProgress] = useState(0)
  const [error, setError] = useState('')
  const [success, setSuccess] = useState(null)

  const validateFile = (f) => {
    if (!f.name.endsWith('.parquet')) {
      return 'Only .parquet files are supported'
    }
    if (f.size > MAX_FILE_SIZE) {
      return `File size exceeds 500MB limit (${(f.size / 1024 / 1024).toFixed(1)}MB)`
    }
    return null
  }

  const handleFileSelect = (f) => {
    setError('')
    setSuccess(null)
    const err = validateFile(f)
    if (err) {
      setError(err)
      return
    }
    setFile(f)
  }

  const handleDrop = useCallback((e) => {
    e.preventDefault()
    setDragOver(false)
    const f = e.dataTransfer.files[0]
    if (f) handleFileSelect(f)
  }, [])

  const handleDragOver = (e) => {
    e.preventDefault()
    setDragOver(true)
  }

  const handleDragLeave = () => setDragOver(false)

  const formatSize = (bytes) => {
    if (bytes < 1024) return bytes + ' B'
    if (bytes < 1024 * 1024) return (bytes / 1024).toFixed(1) + ' KB'
    return (bytes / 1024 / 1024).toFixed(1) + ' MB'
  }

  const handleUploadAndAnalyze = async () => {
    if (!file) return
    setError('')
    setUploading(true)
    setProgress(10)

    try {
      // Step 1: Upload to Spring Boot backend
      setProgress(20)
      const uploadResult = await uploadDataset(file)
      setProgress(50)

      setUploading(false)
      setAnalyzing(true)
      setProgress(60)

      // Step 2: Trigger analysis through backend
      const analysisResult = await analyzeDataset(uploadResult.datasetId)
      setProgress(100)

      setSuccess({
        datasetId: uploadResult.datasetId,
        filename: file.name,
        ...analysisResult,
      })

      // Store datasetId in localStorage so Dashboard can show real data
      localStorage.setItem('datasetId', String(uploadResult.datasetId))

      setAnalyzing(false)

      // Auto-navigate after short delay
      setTimeout(() => {
        navigate(`/analysis/${uploadResult.datasetId}`, {
          state: { mlResult: analysisResult }
        })
      }, 2000)

    } catch (err) {
      console.error('Upload/analysis error:', err)
      setError(err.message || 'Upload or analysis failed')
      setUploading(false)
      setAnalyzing(false)
      setProgress(0)
    }
  }

  const clearFile = () => {
    setFile(null)
    setError('')
    setSuccess(null)
    setProgress(0)
  }

  return (
    <div className="space-y-6 animate-fade-in max-w-4xl mx-auto">
      {/* Header */}
      <div>
        <h1 className="text-2xl font-bold text-white">Dataset Upload & Analysis</h1>
        <p className="text-sm text-gray-400 mt-1">
          Upload a network traffic dataset (.parquet) for AI-powered intrusion detection analysis
        </p>
      </div>

      {/* Info card */}
      <div className="glass-card p-4 border-cyber-blue/30">
        <div className="flex items-start gap-3">
          <Info className="w-5 h-5 text-cyber-blue mt-0.5 flex-shrink-0" />
          <div className="text-xs text-gray-300 space-y-1">
            <p className="font-semibold text-white">How it works:</p>
            <p>1. Upload a .parquet file containing network traffic data (CICIDS2017 format)</p>
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
        onClick={() => !file && fileInputRef.current?.click()}
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
          accept=".parquet"
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
            <p className="text-sm text-gray-400 mb-3">
              or click to browse
            </p>
            <div className="flex items-center justify-center gap-4 text-xs text-gray-500">
              <span className="flex items-center gap-1">
                <FileText className="w-3 h-3" /> .parquet format
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
            {!uploading && !analyzing && (
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

      {/* Progress */}
      {(uploading || analyzing) && (
        <div className="glass-card p-5">
          <div className="flex items-center gap-3 mb-3">
            <Loader2 className="w-5 h-5 text-cyber-blue animate-spin" />
            <span className="text-sm font-medium text-white">
              {uploading ? 'Uploading dataset...' : analyzing ? 'Analyzing dataset (this may take a few minutes)...' : ''}
            </span>
          </div>
          <div className="h-2 bg-navy-700 rounded-full overflow-hidden">
            <div
              className="h-full rounded-full bg-gradient-to-r from-cyber-blue to-cyber-cyan transition-all duration-500"
              style={{ width: `${progress}%` }}
            />
          </div>
          <p className="text-xs text-gray-500 mt-2">{progress}% complete</p>
        </div>
      )}

      {/* Success */}
      {success && (
        <div className="flex items-start gap-3 bg-cyber-green/10 border border-cyber-green/30 rounded-xl p-4">
          <CheckCircle className="w-5 h-5 text-cyber-green mt-0.5 flex-shrink-0" />
          <div>
            <p className="text-sm font-medium text-cyber-green">Analysis Complete!</p>
            <p className="text-xs text-gray-400 mt-1">
              {success.security_summary
                ? `${success.security_summary.total_traffic?.toLocaleString()} flows analyzed, ${success.security_summary.attack_count?.toLocaleString()} attacks detected`
                : 'Redirecting to results...'}
            </p>
          </div>
        </div>
      )}

      {/* Upload button */}
      {file && !uploading && !analyzing && !success && (
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
