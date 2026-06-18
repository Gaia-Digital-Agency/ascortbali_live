import { useCallback, useRef, useState } from "react"
import Cropper, { Area } from "react-easy-crop"

type Props = {
  image: string // object URL
  onCropDone: (croppedBlob: Blob) => void
  onCancel: () => void
}

export default function ImageCropModal({ image, onCropDone, onCancel }: Props) {
  const [crop, setCrop] = useState({ x: 0, y: 0 })
  const [zoom, setZoom] = useState(1)
  const [croppedAreaPixels, setCroppedAreaPixels] = useState<Area | null>(null)
  const [saving, setSaving] = useState(false)

  const onCropComplete = useCallback((_: Area, pixels: Area) => {
    setCroppedAreaPixels(pixels)
  }, [])

  const handleConfirm = useCallback(async () => {
    if (!croppedAreaPixels) return
    setSaving(true)
    try {
      const img = new Image()
      img.crossOrigin = "anonymous"
      await new Promise<void>((resolve, reject) => {
        img.onload = () => resolve()
        img.onerror = reject
        img.src = image
      })
      const canvas = document.createElement("canvas")
      const ctx = canvas.getContext("2d")!
      canvas.width = croppedAreaPixels.width
      canvas.height = croppedAreaPixels.height
      ctx.drawImage(
        img,
        croppedAreaPixels.x, croppedAreaPixels.y,
        croppedAreaPixels.width, croppedAreaPixels.height,
        0, 0,
        croppedAreaPixels.width, croppedAreaPixels.height
      )
      canvas.toBlob((blob) => {
        if (blob) onCropDone(blob)
        setSaving(false)
      }, "image/jpeg", 0.9)
    } catch {
      setSaving(false)
    }
  }, [image, croppedAreaPixels, onCropDone])

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 p-4">
      <div className="w-full max-w-lg rounded-3xl bg-brand-surface p-6">
        <div className="mb-4 text-sm font-medium tracking-luxe text-brand-text">CROP IMAGE (3:4)</div>
        <div className="relative h-80 w-full overflow-hidden rounded-xl bg-black">
          <Cropper
            image={image}
            crop={crop}
            zoom={zoom}
            aspect={3 / 4}
            onCropChange={setCrop}
            onZoomChange={setZoom}
            onCropComplete={onCropComplete}
          />
        </div>
        <div className="mt-4 flex items-center gap-3">
          <label className="text-xs text-brand-muted">Zoom:</label>
          <input
            type="range"
            min={1}
            max={3}
            step={0.1}
            value={zoom}
            onChange={(e) => setZoom(Number(e.target.value))}
            className="flex-1"
          />
        </div>
        <div className="mt-6 flex justify-end gap-3">
          <button onClick={onCancel} disabled={saving} className="btn btn-outline px-5 py-2 text-xs">
            CANCEL
          </button>
          <button onClick={handleConfirm} disabled={saving} className="btn btn-primary px-5 py-2 text-xs">
            {saving ? "CROPPING..." : "CROP & ADD"}
          </button>
        </div>
      </div>
    </div>
  )
}
