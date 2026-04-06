/**
 * KameraCapture — Foto-Aufnahme mit Browser MediaDevices API
 * Features:
 * - Live Kamera-Stream (rückwärts-Kamera auf Mobile)
 * - Foto-Aufnahme mit Preview
 * - Datei-Upload Fallback mit Drag&Drop
 * - Error-Handling wenn Kamera nicht verfügbar
 * - Mobile-first responsive Design
 */

import { useRef, useState } from 'react'
import { Camera, Upload, X, RotateCw, Check } from 'lucide-react'

interface KameraCaptureProps {
  onCapture: (imageDataUrl: string) => void
  onCancel?: () => void
  maxWidth?: number // Default 1280
  quality?: number // 0-1, default 0.8
}

type State = 'idle' | 'requesting' | 'streaming' | 'captured' | 'error'

export function KameraCapture({
  onCapture,
  onCancel,
  maxWidth = 1280,
  quality = 0.8,
}: KameraCaptureProps) {
  const videoRef = useRef<HTMLVideoElement>(null)
  const canvasRef = useRef<HTMLCanvasElement>(null)
  const fileInputRef = useRef<HTMLInputElement>(null)

  const [state, setstate] = useState<State>('idle')
  const [capturedImage, setCapturedImage] = useState<string | null>(null)
  const [errorMsg, setErrorMsg] = useState('')
  const [isDragging, setIsDragging] = useState(false)

  // Kamera starten
  const startCamera = async () => {
    setstate('requesting')
    setErrorMsg('')

    try {
      const constraints: MediaStreamConstraints = {
        video: {
          facingMode: 'environment', // Rückwärts-Kamera auf Mobile
          width: { ideal: maxWidth },
        },
        audio: false,
      }

      const stream = await navigator.mediaDevices.getUserMedia(constraints)
      if (videoRef.current) {
        videoRef.current.srcObject = stream
        setstate('streaming')
      }
    } catch (err: any) {
      const message = err.name === 'NotAllowedError'
        ? 'Kamerazugriff verweigert. Bitte Berechtigung gewähren.'
        : err.name === 'NotFoundError'
        ? 'Keine Kamera gefunden. Nutze Upload als Alternative.'
        : 'Fehler beim Kamerazugriff: ' + err.message

      setErrorMsg(message)
      setstate('error')
    }
  }

  // Kamera stoppen
  const stopCamera = () => {
    if (videoRef.current?.srcObject) {
      const stream = videoRef.current.srcObject as MediaStream
      stream.getTracks().forEach(track => track.stop())
      videoRef.current.srcObject = null
    }
    setstate('idle')
  }

  // Foto aufnehmen
  const capturePhoto = () => {
    if (!videoRef.current || !canvasRef.current) return

    const video = videoRef.current
    const canvas = canvasRef.current
    const ctx = canvas.getContext('2d')

    if (!ctx) return

    // Canvas Größe anpassen
    canvas.width = video.videoWidth
    canvas.height = video.videoHeight

    // Video auf Canvas zeichnen
    ctx.drawImage(video, 0, 0, canvas.width, canvas.height)

    // Als Base64 DataURL
    const dataUrl = canvas.toDataURL('image/jpeg', quality)
    setCapturedImage(dataUrl)
    setstate('captured')
  }

  // Foto verwenden
  const handleUseFoto = () => {
    if (capturedImage) {
      stopCamera()
      onCapture(capturedImage)
    }
  }

  // Nochmal Aufnahme
  const handleRetake = () => {
    setCapturedImage(null)
    setstate('streaming')
  }

  // Datei-Upload
  const handleFileSelect = (file: File) => {
    if (!file.type.startsWith('image/')) {
      setErrorMsg('Bitte nur Bilder uploaden.')
      return
    }

    const reader = new FileReader()
    reader.onload = (e) => {
      const dataUrl = e.target?.result as string
      onCapture(dataUrl)
    }
    reader.onerror = () => {
      setErrorMsg('Fehler beim Lesen der Datei.')
    }
    reader.readAsDataURL(file)
  }

  // Drag & Drop
  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault()
    setIsDragging(true)
  }

  const handleDragLeave = () => {
    setIsDragging(false)
  }

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault()
    setIsDragging(false)

    const files = e.dataTransfer.files
    if (files.length > 0) {
      handleFileSelect(files[0])
    }
  }

  // ───── Idle: Wähle Kamera oder Upload
  if (state === 'idle' || state === 'error') {
    return (
      <div className="w-full max-w-md mx-auto space-y-4">
        {/* Fehler */}
        {state === 'error' && (
          <div className="p-4 rounded-lg bg-red-50 border border-red-200">
            <p className="text-sm text-red-700 font-medium">Kamera nicht verfügbar</p>
            <p className="text-xs text-red-600 mt-1">{errorMsg}</p>
          </div>
        )}

        {/* Kamera-Button */}
        <button
          onClick={startCamera}
          className="w-full py-3 px-4 rounded-lg bg-black text-white font-medium flex items-center justify-center gap-3 hover:bg-gray-800 transition-colors disabled:opacity-40"
        >
          <Camera size={18} />
          Kamera starten
        </button>

        {/* Upload-Fallback mit Drag & Drop */}
        <div
          onClick={() => fileInputRef.current?.click()}
          onDragOver={handleDragOver}
          onDragLeave={handleDragLeave}
          onDrop={handleDrop}
          className={`p-6 rounded-lg border-2 border-dashed cursor-pointer transition-colors ${
            isDragging
              ? 'bg-blue-50 border-blue-400'
              : 'bg-gray-50 border-gray-300 hover:border-gray-400'
          }`}
        >
          <input
            ref={fileInputRef}
            type="file"
            accept="image/*"
            className="hidden"
            onChange={(e) => {
              if (e.target.files?.[0]) {
                handleFileSelect(e.target.files[0])
              }
            }}
          />
          <div className="flex flex-col items-center gap-2">
            <Upload className="text-gray-400" size={24} />
            <p className="text-sm font-medium text-gray-600">
              {isDragging ? 'Bild ablegen zum Hochladen' : 'Bild hochladen'}
            </p>
            <p className="text-xs text-gray-400">oder Datei hier ziehen</p>
          </div>
        </div>

        {/* Cancel-Button */}
        {onCancel && (
          <button
            onClick={onCancel}
            className="w-full py-2 px-4 rounded-lg border border-gray-200 text-gray-600 font-medium hover:bg-gray-50 transition-colors flex items-center justify-center gap-2"
          >
            <X size={16} />
            Abbrechen
          </button>
        )}
      </div>
    )
  }

  // ───── Requesting: Spinner
  if (state === 'requesting') {
    return (
      <div className="w-full max-w-md mx-auto">
        <div className="aspect-video bg-gray-100 rounded-lg flex items-center justify-center">
          <div className="w-8 h-8 border-2 border-gray-300 border-t-black rounded-full animate-spin" />
        </div>
        <p className="text-sm text-gray-500 text-center mt-4">Kamera wird aktiviert...</p>
      </div>
    )
  }

  // ───── Streaming: Video-Preview + Aufnahme-Button
  if (state === 'streaming') {
    return (
      <div className="w-full max-w-md mx-auto space-y-4">
        {/* Video Preview */}
        <div className="relative aspect-video bg-black rounded-lg overflow-hidden">
          <video
            ref={videoRef}
            autoPlay
            playsInline
            className="w-full h-full object-cover"
          />
        </div>

        {/* Hidden Canvas für Foto */}
        <canvas ref={canvasRef} className="hidden" />

        {/* Buttons */}
        <div className="flex gap-3">
          {/* Aufnahme-Button (großer Kreis wie Handy-Kamera) */}
          <button
            onClick={capturePhoto}
            className="flex-1 aspect-square max-h-24 rounded-full bg-white border-8 border-black flex items-center justify-center hover:scale-105 transition-transform shadow-lg"
          >
            <Camera size={32} className="text-black" />
          </button>

          {/* Abbrechen */}
          <button
            onClick={stopCamera}
            className="flex-1 py-3 px-4 rounded-lg border border-gray-300 text-gray-600 font-medium hover:bg-gray-50 transition-colors flex items-center justify-center gap-2"
          >
            <X size={16} />
            Abbrechen
          </button>
        </div>
      </div>
    )
  }

  // ───── Captured: Foto-Preview + Verwenden/Nochmal
  if (state === 'captured' && capturedImage) {
    return (
      <div className="w-full max-w-md mx-auto space-y-4">
        {/* Foto Preview */}
        <div className="aspect-video bg-gray-100 rounded-lg overflow-hidden">
          <img src={capturedImage} alt="Aufgenommenes Foto" className="w-full h-full object-cover" />
        </div>

        {/* Buttons */}
        <div className="flex gap-3">
          {/* Verwenden */}
          <button
            onClick={handleUseFoto}
            className="flex-1 py-3 px-4 rounded-lg bg-green-600 text-white font-medium hover:bg-green-700 transition-colors flex items-center justify-center gap-2"
          >
            <Check size={16} />
            Verwenden
          </button>

          {/* Nochmal */}
          <button
            onClick={handleRetake}
            className="flex-1 py-3 px-4 rounded-lg border border-gray-300 text-gray-600 font-medium hover:bg-gray-50 transition-colors flex items-center justify-center gap-2"
          >
            <RotateCw size={16} />
            Nochmal
          </button>
        </div>
      </div>
    )
  }

  return null
}
