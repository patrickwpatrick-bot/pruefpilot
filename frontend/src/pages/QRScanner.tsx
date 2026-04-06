/**
 * QR Scanner — Camera-based QR scanning with manual fallback
 */
import { useState, useEffect, useRef } from 'react'
import { Camera, AlertCircle, Loader, X, Eye, Play, Zap } from 'lucide-react'
import { useNavigate } from 'react-router-dom'
import api from '@/lib/api'
import type { Arbeitsmittel } from '@/types'

interface ArbeitsmittelDetail extends Arbeitsmittel {
  nachste_pruefung_am: string | null
}

const loadJsQR = async () => {
  return new Promise<any>((resolve) => {
    const script = document.createElement('script')
    script.src = 'https://cdn.jsdelivr.net/npm/jsqr@1.4.0/dist/jsQR.js'
    script.onload = () => {
      resolve((window as any).jsQR)
    }
    document.head.appendChild(script)
  })
}

export function QRScanner() {
  const navigate = useNavigate()
  const videoRef = useRef<HTMLVideoElement>(null)
  const canvasRef = useRef<HTMLCanvasElement>(null)
  const [cameraActive, setCameraActive] = useState(false)
  const [cameraPermission, setCameraPermission] = useState<'pending' | 'granted' | 'denied'>('pending')
  const [manualInput, setManualInput] = useState('')
  const [scannedItem, setScannedItem] = useState<ArbeitsmittelDetail | null>(null)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [jsQRLoaded, setJsQRLoaded] = useState(false)
  const scanningRef = useRef(false)

  // Load jsQR library on mount
  useEffect(() => {
    loadJsQR()
      .then(() => setJsQRLoaded(true))
      .catch(() => {
        setError('QR-Lesebibliothek konnte nicht geladen werden. Bitte verwende die manuelle Eingabe.')
      })
  }, [])

  // Request camera permission on mount
  useEffect(() => {
    if (cameraPermission === 'pending' && !cameraActive) {
      navigator.mediaDevices
        .getUserMedia({ video: { facingMode: 'environment' } })
        .then((stream) => {
          setCameraPermission('granted')
          if (videoRef.current) {
            videoRef.current.srcObject = stream
          }
        })
        .catch(() => {
          setCameraPermission('denied')
        })
    }
  }, [cameraPermission, cameraActive])

  // Scanning loop
  useEffect(() => {
    if (!cameraActive || !videoRef.current || !canvasRef.current || !jsQRLoaded || !scanningRef.current) {
      return
    }

    const video = videoRef.current
    const canvas = canvasRef.current
    const ctx = canvas.getContext('2d')
    const jsQR = (window as any).jsQR

    const scan = () => {
      if (video.readyState === video.HAVE_ENOUGH_DATA) {
        canvas.width = video.videoWidth
        canvas.height = video.videoHeight
        ctx!.drawImage(video, 0, 0, canvas.width, canvas.height)

        const imageData = ctx!.getImageData(0, 0, canvas.width, canvas.height)
        const code = jsQR(imageData.data, imageData.width, imageData.height)

        if (code && code.data) {
          handleQRDetected(code.data)
          scanningRef.current = false // Stop scanning after successful detection
          return
        }
      }
      requestAnimationFrame(scan)
    }

    scanningRef.current = true
    scan()
  }, [cameraActive, jsQRLoaded])

  const handleQRDetected = async (qrData: string) => {
    setCameraActive(false)
    await fetchArbeitsmittel(qrData)
  }

  const fetchArbeitsmittel = async (id: string) => {
    setLoading(true)
    setError(null)
    try {
      const response = await api.get(`/arbeitsmittel/${id}`)
      const data = response.data as ArbeitsmittelDetail
      setScannedItem(data)
      setManualInput('')
    } catch (err: any) {
      setError(err.response?.data?.detail || 'Arbeitsmittel nicht gefunden.')
      setScannedItem(null)
    } finally {
      setLoading(false)
    }
  }

  const handleManualSubmit = (e: React.FormEvent) => {
    e.preventDefault()
    if (!manualInput.trim()) return
    fetchArbeitsmittel(manualInput.trim())
  }

  const handleStartScan = () => {
    setError(null)
    setScannedItem(null)
    setCameraActive(true)
  }

  const handleViewDetails = () => {
    if (scannedItem?.id) {
      navigate(`/arbeitsmittel/${scannedItem.id}`)
    }
  }

  const handleStartPruefung = () => {
    if (scannedItem?.id) {
      navigate(`/pruefungen?arbeitsmittel_id=${scannedItem.id}`)
    }
  }

  const handleReset = () => {
    setScannedItem(null)
    setManualInput('')
    setError(null)
    setCameraActive(false)
  }

  const getAmpelColor = (status: string | undefined) => {
    if (status === 'rot') return { bg: 'bg-red-50', text: 'text-red-600', badge: 'bg-red-100' }
    if (status === 'gelb') return { bg: 'bg-amber-50', text: 'text-amber-600', badge: 'bg-amber-100' }
    return { bg: 'bg-green-50', text: 'text-green-600', badge: 'bg-green-100' }
  }

  return (
    <div className="p-6 md:p-8 max-w-2xl mx-auto">
      {/* Header */}
      <div className="mb-8">
        <h1 className="text-2xl font-bold text-black">QR-Scanner</h1>
        <p className="text-sm text-gray-400 mt-1">Scanne ein Arbeitsmittel oder gib die ID manuell ein</p>
      </div>

      {/* Permission Banner */}
      {cameraPermission === 'denied' && (
        <div className="mb-6 p-4 bg-amber-50 border border-amber-200 rounded-xl flex items-start gap-3">
          <AlertCircle size={18} className="text-amber-600 flex-shrink-0 mt-0.5" />
          <div>
            <p className="text-sm font-medium text-amber-900">Kamerazugriff erforderlich</p>
            <p className="text-xs text-amber-700 mt-1">
              Bitte aktiviere die Kameraberechtigung in deinen Browsereinstellungen, um die QR-Scanner-Funktion zu nutzen.
            </p>
          </div>
        </div>
      )}

      {/* Error Banner */}
      {error && (
        <div className="mb-6 p-4 bg-red-50 border border-red-200 rounded-xl flex items-start gap-3">
          <AlertCircle size={18} className="text-red-600 flex-shrink-0 mt-0.5" />
          <div className="flex-1">
            <p className="text-sm font-medium text-red-900">{error}</p>
          </div>
          <button
            onClick={() => setError(null)}
            className="text-red-600 hover:text-red-900 transition-colors flex-shrink-0"
          >
            <X size={16} />
          </button>
        </div>
      )}

      {!scannedItem ? (
        <div className="space-y-6">
          {/* Camera Section */}
          {cameraPermission === 'granted' && !cameraActive && (
            <button
              onClick={handleStartScan}
              className="w-full p-8 rounded-xl border-2 border-dashed border-gray-300 hover:border-gray-400 hover:bg-gray-50 transition-colors flex flex-col items-center justify-center gap-3 group"
            >
              <div className="p-3 bg-gray-100 rounded-lg group-hover:bg-gray-200 transition-colors">
                <Camera size={24} className="text-gray-600" />
              </div>
              <div className="text-center">
                <p className="text-base font-semibold text-black">QR-Code scannen</p>
                <p className="text-xs text-gray-400 mt-1">Klicke hier, um die Kamera zu starten</p>
              </div>
            </button>
          )}

          {cameraActive && (
            <div className="bg-black rounded-xl overflow-hidden relative">
              <video
                ref={videoRef}
                autoPlay
                playsInline
                className="w-full aspect-video object-cover"
              />
              <canvas ref={canvasRef} className="hidden" />
              <button
                onClick={() => setCameraActive(false)}
                className="absolute top-4 right-4 p-2 bg-white rounded-lg hover:bg-gray-100 transition-colors"
              >
                <X size={18} className="text-black" />
              </button>
              <div className="absolute inset-0 pointer-events-none flex items-center justify-center">
                <div className="w-48 h-48 border-2 border-white rounded-lg opacity-50" />
              </div>
            </div>
          )}

          {/* Divider */}
          <div className="flex items-center gap-3">
            <div className="flex-1 border-t border-gray-200" />
            <span className="text-xs text-gray-400 font-medium px-2">oder</span>
            <div className="flex-1 border-t border-gray-200" />
          </div>

          {/* Manual Input */}
          <form onSubmit={handleManualSubmit} className="space-y-3">
            <label className="block text-xs font-medium text-gray-600 mb-2">
              Arbeitsmittel-ID manuell eingeben
            </label>
            <div className="flex gap-2">
              <input
                type="text"
                value={manualInput}
                onChange={(e) => setManualInput(e.target.value)}
                placeholder="z.B. AM-001234"
                className="flex-1 px-4 py-3 rounded-lg border border-gray-200 focus:border-black focus:ring-1 focus:ring-black outline-none transition-colors text-sm"
              />
              <button
                type="submit"
                disabled={!manualInput.trim() || loading}
                className="px-6 py-3 bg-black text-white text-sm font-medium rounded-lg hover:bg-gray-800 disabled:opacity-50 disabled:cursor-not-allowed transition-colors flex items-center gap-2"
              >
                {loading ? <Loader size={16} className="animate-spin" /> : <Zap size={16} />}
                <span className="hidden sm:inline">Suchen</span>
              </button>
            </div>
          </form>
        </div>
      ) : (
        <div className="space-y-6">
          {/* Scanned Item Details Card */}
          <div className="bg-white rounded-xl border border-gray-200 overflow-hidden">
            <div className={`px-6 py-4 border-b border-gray-100 ${getAmpelColor(scannedItem.ampel_status).bg}`}>
              <div className="flex items-start justify-between gap-4">
                <div>
                  <h2 className="text-lg font-semibold text-black">{scannedItem.name}</h2>
                  <p className="text-sm text-gray-500 mt-1">ID: {scannedItem.id}</p>
                </div>
                <span className={`px-3 py-1.5 rounded-full text-xs font-semibold flex-shrink-0 ${getAmpelColor(scannedItem.ampel_status).badge} ${getAmpelColor(scannedItem.ampel_status).text}`}>
                  {scannedItem.ampel_status === 'rot' ? 'Überfällig' : scannedItem.ampel_status === 'gelb' ? 'Bald fällig' : 'Aktuell'}
                </span>
              </div>
            </div>

            <div className="p-6 space-y-4">
              {/* Typ */}
              <div>
                <p className="text-xs font-medium text-gray-500 mb-1">Typ</p>
                <p className="text-sm text-black">{scannedItem.typ || '—'}</p>
              </div>

              {/* Status */}
              <div>
                <p className="text-xs font-medium text-gray-500 mb-1">Status</p>
                <div className="flex items-center gap-2">
                  <div className={`w-3 h-3 rounded-full ${
                    scannedItem.ampel_status === 'rot' ? 'bg-red-500' :
                    scannedItem.ampel_status === 'gelb' ? 'bg-amber-500' :
                    'bg-green-500'
                  }`} />
                  <p className="text-sm text-black">
                    {scannedItem.ampel_status === 'rot' ? 'Prüfung überfällig' :
                     scannedItem.ampel_status === 'gelb' ? 'Prüfung bald fällig' :
                     'Prüfung aktuell'}
                  </p>
                </div>
              </div>

              {/* Nächste Prüfung */}
              <div>
                <p className="text-xs font-medium text-gray-500 mb-1">Nächste Prüfung fällig</p>
                <p className="text-sm text-black">
                  {scannedItem.naechste_pruefung_am
                    ? new Date(scannedItem.naechste_pruefung_am).toLocaleDateString('de-DE', {
                        year: 'numeric',
                        month: 'long',
                        day: 'numeric',
                      })
                    : '—'}
                </p>
              </div>
            </div>
          </div>

          {/* Action Buttons */}
          <div className="grid grid-cols-2 gap-3">
            <button
              onClick={handleStartPruefung}
              className="px-4 py-3 bg-black text-white text-sm font-medium rounded-lg hover:bg-gray-800 transition-colors flex items-center justify-center gap-2"
            >
              <Play size={16} />
              <span>Prüfung starten</span>
            </button>
            <button
              onClick={handleViewDetails}
              className="px-4 py-3 border border-gray-200 text-black text-sm font-medium rounded-lg hover:bg-gray-50 transition-colors flex items-center justify-center gap-2"
            >
              <Eye size={16} />
              <span>Details</span>
            </button>
          </div>

          {/* Reset Button */}
          <button
            onClick={handleReset}
            className="w-full px-4 py-2 text-gray-600 text-sm font-medium hover:bg-gray-50 rounded-lg transition-colors"
          >
            Neuer Scan
          </button>
        </div>
      )}

      {/* Loading State */}
      {loading && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center rounded-lg">
          <div className="bg-white rounded-xl p-6 flex flex-col items-center gap-3">
            <Loader size={24} className="animate-spin text-black" />
            <p className="text-sm font-medium text-black">Lädt...</p>
          </div>
        </div>
      )}
    </div>
  )
}
