"use client"

import { useState } from "react"
import { Button } from "@/components/ui/button"
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog"
import { Label } from "@/components/ui/label"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Switch } from "@/components/ui/switch"
import { Download, Share2, Instagram, Twitter, Facebook, Loader2 } from "lucide-react"

interface Location {
  id: string
  city_name: string
  latitude: number
  longitude: number
  notes?: string
  photo_urls?: string[]
  album_link?: string
  visited_date?: string
  category?: string
  user_id: string
}

interface MapExportProps {
  locations: Location[]
  isOpen: boolean
  onClose: () => void
  userEmail: string
}

interface ExportOptions {
  format: "png" | "jpg"
  quality: "standard" | "high" | "ultra"
  size: "social" | "story" | "post" | "custom"
  showStats: boolean
  showTitle: boolean
  showWatermark: boolean
  mapStyle: "light" | "dark" | "satellite" | "outdoors"
  theme: "modern" | "vintage" | "minimal"
}

const exportSizes = {
  social: { width: 1200, height: 630, name: "Social Media (1200×630)" },
  story: { width: 1080, height: 1920, name: "Instagram Story (1080×1920)" },
  post: { width: 1080, height: 1080, name: "Instagram Post (1080×1080)" },
  custom: { width: 1920, height: 1080, name: "Custom HD (1920×1080)" },
}

const qualitySettings = {
  standard: { dpi: 72, compression: 0.8 },
  high: { dpi: 150, compression: 0.9 },
  ultra: { dpi: 300, compression: 1.0 },
}

export default function MapExport({ locations, isOpen, onClose, userEmail }: MapExportProps) {
  const [options, setOptions] = useState<ExportOptions>({
    format: "png",
    quality: "high",
    size: "social",
    showStats: true,
    showTitle: true,
    showWatermark: true,
    mapStyle: "light",
    theme: "modern",
  })
  const [isExporting, setIsExporting] = useState(false)
  const [exportedImageUrl, setExportedImageUrl] = useState<string | null>(null)

  const locationCategories = [
    { id: "general", name: "General", icon: "📍", color: "#6b7280" },
    { id: "historical", name: "Historical", icon: "🏛️", color: "#f59e0b" },
    { id: "food", name: "Food & Dining", icon: "🍽️", color: "#ef4444" },
    { id: "nature", name: "Nature", icon: "🏞️", color: "#10b981" },
    { id: "beach", name: "Beach", icon: "🏖️", color: "#3b82f6" },
    { id: "urban", name: "Urban", icon: "🏙️", color: "#8b5cf6" },
    { id: "entertainment", name: "Entertainment", icon: "🎭", color: "#ec4899" },
    { id: "shopping", name: "Shopping", icon: "🛍️", color: "#6366f1" },
    { id: "accommodation", name: "Hotels", icon: "🏨", color: "#059669" },
    { id: "photo", name: "Photo Spot", icon: "📸", color: "#f59e0b" },
  ]

  const getCategoryInfo = (categoryId: string) => {
    return locationCategories.find((cat) => cat.id === categoryId) || locationCategories[0]
  }

  const generateMapImage = async (): Promise<string> => {
    const size = exportSizes[options.size]
    const quality = qualitySettings[options.quality]

    // Create canvas
    const canvas = document.createElement("canvas")
    const ctx = canvas.getContext("2d")!

    // Set canvas size based on DPI
    const scale = quality.dpi / 72
    canvas.width = size.width * scale
    canvas.height = size.height * scale
    canvas.style.width = `${size.width}px`
    canvas.style.height = `${size.height}px`
    ctx.scale(scale, scale)

    // Background
    const isDark = options.mapStyle === "dark"
    ctx.fillStyle = isDark ? "#0f172a" : "#f8fafc"
    ctx.fillRect(0, 0, size.width, size.height)

    // Create map bounds
    if (locations.length === 0) {
      throw new Error("No locations to export")
    }

    const lats = locations.map((l) => l.latitude)
    const lngs = locations.map((l) => l.longitude)
    const minLat = Math.min(...lats)
    const maxLat = Math.max(...lats)
    const minLng = Math.min(...lngs)
    const maxLng = Math.max(...lngs)

    // Add padding
    const latPadding = (maxLat - minLat) * 0.1
    const lngPadding = (maxLng - minLng) * 0.1

    const bounds = {
      north: maxLat + latPadding,
      south: minLat - latPadding,
      east: maxLng + lngPadding,
      west: minLng - lngPadding,
    }

    // Map area (leave space for stats and title)
    const mapArea = {
      x: 40,
      y: options.showTitle ? 120 : 40,
      width: size.width - 80,
      height: size.height - (options.showTitle ? 160 : 80) - (options.showStats ? 120 : 0),
    }

    // Draw map background
    ctx.fillStyle = isDark ? "#1e293b" : "#ffffff"
    ctx.fillRect(mapArea.x, mapArea.y, mapArea.width, mapArea.height)

    // Draw subtle grid
    ctx.strokeStyle = isDark ? "#334155" : "#e2e8f0"
    ctx.lineWidth = 1
    const gridSize = 50
    for (let x = mapArea.x; x <= mapArea.x + mapArea.width; x += gridSize) {
      ctx.beginPath()
      ctx.moveTo(x, mapArea.y)
      ctx.lineTo(x, mapArea.y + mapArea.height)
      ctx.stroke()
    }
    for (let y = mapArea.y; y <= mapArea.y + mapArea.height; y += gridSize) {
      ctx.beginPath()
      ctx.moveTo(mapArea.x, y)
      ctx.lineTo(mapArea.x + mapArea.width, y)
      ctx.stroke()
    }

    // Convert lat/lng to canvas coordinates
    const latToY = (lat: number) => {
      const ratio = (bounds.north - lat) / (bounds.north - bounds.south)
      return mapArea.y + ratio * mapArea.height
    }

    const lngToX = (lng: number) => {
      const ratio = (lng - bounds.west) / (bounds.east - bounds.west)
      return mapArea.x + ratio * mapArea.width
    }

    // Draw connection lines between locations (if more than 1)
    if (locations.length > 1 && options.theme !== "minimal") {
      ctx.strokeStyle = isDark ? "#475569" : "#cbd5e1"
      ctx.lineWidth = 2
      ctx.setLineDash([5, 5])

      const sortedLocations = [...locations].sort((a, b) => {
        if (a.visited_date && b.visited_date) {
          return new Date(a.visited_date).getTime() - new Date(b.visited_date).getTime()
        }
        return 0
      })

      for (let i = 0; i < sortedLocations.length - 1; i++) {
        const current = sortedLocations[i]
        const next = sortedLocations[i + 1]

        ctx.beginPath()
        ctx.moveTo(lngToX(current.longitude), latToY(current.latitude))
        ctx.lineTo(lngToX(next.longitude), latToY(next.latitude))
        ctx.stroke()
      }
      ctx.setLineDash([])
    }

    // Draw markers
    locations.forEach((location, index) => {
      const x = lngToX(location.longitude)
      const y = latToY(location.latitude)
      const categoryInfo = getCategoryInfo(location.category || "general")

      // Marker shadow
      ctx.fillStyle = "rgba(0, 0, 0, 0.2)"
      ctx.beginPath()
      ctx.arc(x + 2, y + 2, 16, 0, 2 * Math.PI)
      ctx.fill()

      // Marker background
      ctx.fillStyle = categoryInfo.color
      ctx.beginPath()
      ctx.arc(x, y, 16, 0, 2 * Math.PI)
      ctx.fill()

      // Marker border
      ctx.strokeStyle = "#ffffff"
      ctx.lineWidth = 3
      ctx.stroke()

      // Marker icon (simplified)
      ctx.fillStyle = "#ffffff"
      ctx.font = "16px Arial"
      ctx.textAlign = "center"
      ctx.textBaseline = "middle"
      ctx.fillText(categoryInfo.icon, x, y)

      // Location label
      if (options.theme !== "minimal") {
        const cityName = location.city_name.split(",")[0]
        ctx.fillStyle = isDark ? "#f1f5f9" : "#1e293b"
        ctx.font = "bold 12px Arial"
        ctx.textAlign = "center"
        ctx.fillText(cityName, x, y + 35)
      }
    })

    // Title
    if (options.showTitle) {
      ctx.fillStyle = isDark ? "#f1f5f9" : "#1e293b"
      ctx.font = "bold 36px Arial"
      ctx.textAlign = "center"
      ctx.fillText("My Travel Memories", size.width / 2, 60)
    }

    // Stats panel
    if (options.showStats) {
      const statsY = size.height - 100
      const totalPhotos = locations.reduce((sum, loc) => sum + (loc.photo_urls?.length || 0), 0)
      const countries = [...new Set(locations.map((loc) => loc.city_name.split(",").pop()?.trim()))].length

      // Stats background
      ctx.fillStyle = isDark ? "rgba(30, 41, 59, 0.9)" : "rgba(255, 255, 255, 0.9)"
      ctx.fillRect(40, statsY - 20, size.width - 80, 80)

      // Stats border
      ctx.strokeStyle = isDark ? "#475569" : "#e2e8f0"
      ctx.lineWidth = 1
      ctx.strokeRect(40, statsY - 20, size.width - 80, 80)

      // Stats text
      ctx.fillStyle = isDark ? "#f1f5f9" : "#1e293b"
      ctx.font = "bold 18px Arial"
      ctx.textAlign = "left"

      const stats = [
        `📍 ${locations.length} Locations`,
        `🌍 ${countries} Countries`,
        `📸 ${totalPhotos} Photos`,
        `✈️ ${userEmail.split("@")[0]}'s Journey`,
      ]

      const statWidth = (size.width - 120) / stats.length
      stats.forEach((stat, index) => {
        ctx.fillText(stat, 60 + index * statWidth, statsY + 10)
      })
    }

    // Watermark
    if (options.showWatermark) {
      ctx.fillStyle = isDark ? "rgba(241, 245, 249, 0.6)" : "rgba(30, 41, 59, 0.6)"
      ctx.font = "12px Arial"
      ctx.textAlign = "right"
      ctx.fillText("Created with Map My Memories", size.width - 20, size.height - 20)
    }

    // Convert to blob
    return new Promise((resolve) => {
      canvas.toBlob(
        (blob) => {
          if (blob) {
            const url = URL.createObjectURL(blob)
            resolve(url)
          }
        },
        `image/${options.format}`,
        quality.compression,
      )
    })
  }

  const handleExport = async () => {
    if (locations.length === 0) {
      alert("No locations to export. Add some memories first!")
      return
    }

    setIsExporting(true)
    try {
      const imageUrl = await generateMapImage()
      setExportedImageUrl(imageUrl)
    } catch (error) {
      console.error("Export failed:", error)
      alert("Export failed. Please try again.")
    } finally {
      setIsExporting(false)
    }
  }

  const downloadImage = () => {
    if (!exportedImageUrl) return

    const link = document.createElement("a")
    link.href = exportedImageUrl
    link.download = `my-travel-map-${Date.now()}.${options.format}`
    document.body.appendChild(link)
    link.click()
    document.body.removeChild(link)
  }

  const shareToSocial = (platform: string) => {
    if (!exportedImageUrl) return

    const text = `Check out my travel map! I've visited ${locations.length} locations across ${[...new Set(locations.map((loc) => loc.city_name.split(",").pop()?.trim()))].length} countries 🌍✈️`

    const urls = {
      twitter: `https://twitter.com/intent/tweet?text=${encodeURIComponent(text)}`,
      facebook: `https://www.facebook.com/sharer/sharer.php?u=${encodeURIComponent(window.location.href)}`,
      instagram: "https://www.instagram.com/", // Instagram doesn't support direct sharing
    }

    if (platform === "instagram") {
      alert("Download the image and share it manually on Instagram!")
      downloadImage()
    } else {
      window.open(urls[platform as keyof typeof urls], "_blank")
    }
  }

  const resetExport = () => {
    setExportedImageUrl(null)
  }

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="sm:max-w-2xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center space-x-2">
            <Share2 className="h-5 w-5 text-blue-600" />
            <span>Export Your Travel Map</span>
          </DialogTitle>
        </DialogHeader>

        {!exportedImageUrl ? (
          <div className="space-y-6">
            {/* Export Options */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div className="space-y-4">
                <div className="space-y-2">
                  <Label>Format</Label>
                  <Select
                    value={options.format}
                    onValueChange={(value: "png" | "jpg") => setOptions({ ...options, format: value })}
                  >
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="png">PNG (Best Quality)</SelectItem>
                      <SelectItem value="jpg">JPG (Smaller Size)</SelectItem>
                    </SelectContent>
                  </Select>
                </div>

                <div className="space-y-2">
                  <Label>Size</Label>
                  <Select value={options.size} onValueChange={(value: any) => setOptions({ ...options, size: value })}>
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      {Object.entries(exportSizes).map(([key, size]) => (
                        <SelectItem key={key} value={key}>
                          {size.name}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>

                <div className="space-y-2">
                  <Label>Quality</Label>
                  <Select
                    value={options.quality}
                    onValueChange={(value: any) => setOptions({ ...options, quality: value })}
                  >
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="standard">Standard (72 DPI)</SelectItem>
                      <SelectItem value="high">High (150 DPI)</SelectItem>
                      <SelectItem value="ultra">Ultra (300 DPI)</SelectItem>
                    </SelectContent>
                  </Select>
                </div>

                <div className="space-y-2">
                  <Label>Map Style</Label>
                  <Select
                    value={options.mapStyle}
                    onValueChange={(value: any) => setOptions({ ...options, mapStyle: value })}
                  >
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="light">Light</SelectItem>
                      <SelectItem value="dark">Dark</SelectItem>
                      <SelectItem value="satellite">Satellite</SelectItem>
                      <SelectItem value="outdoors">Outdoors</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>

              <div className="space-y-4">
                <div className="space-y-2">
                  <Label>Theme</Label>
                  <Select
                    value={options.theme}
                    onValueChange={(value: any) => setOptions({ ...options, theme: value })}
                  >
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="modern">Modern</SelectItem>
                      <SelectItem value="vintage">Vintage</SelectItem>
                      <SelectItem value="minimal">Minimal</SelectItem>
                    </SelectContent>
                  </Select>
                </div>

                <div className="space-y-4">
                  <div className="flex items-center justify-between">
                    <Label htmlFor="show-title">Show Title</Label>
                    <Switch
                      id="show-title"
                      checked={options.showTitle}
                      onCheckedChange={(checked) => setOptions({ ...options, showTitle: checked })}
                    />
                  </div>

                  <div className="flex items-center justify-between">
                    <Label htmlFor="show-stats">Show Statistics</Label>
                    <Switch
                      id="show-stats"
                      checked={options.showStats}
                      onCheckedChange={(checked) => setOptions({ ...options, showStats: checked })}
                    />
                  </div>

                  <div className="flex items-center justify-between">
                    <Label htmlFor="show-watermark">Show Watermark</Label>
                    <Switch
                      id="show-watermark"
                      checked={options.showWatermark}
                      onCheckedChange={(checked) => setOptions({ ...options, showWatermark: checked })}
                    />
                  </div>
                </div>
              </div>
            </div>

            {/* Preview Info */}
            <div className="bg-slate-50 rounded-xl p-4">
              <h3 className="font-medium text-slate-900 mb-2">Export Preview</h3>
              <div className="grid grid-cols-2 gap-4 text-sm text-slate-600">
                <div>
                  <span className="font-medium">Dimensions:</span> {exportSizes[options.size].width} ×{" "}
                  {exportSizes[options.size].height}px
                </div>
                <div>
                  <span className="font-medium">Locations:</span> {locations.length} markers
                </div>
                <div>
                  <span className="font-medium">Countries:</span>{" "}
                  {[...new Set(locations.map((loc) => loc.city_name.split(",").pop()?.trim()))].length}
                </div>
                <div>
                  <span className="font-medium">Photos:</span>{" "}
                  {locations.reduce((sum, loc) => sum + (loc.photo_urls?.length || 0), 0)}
                </div>
              </div>
            </div>

            {/* Export Button */}
            <Button
              onClick={handleExport}
              disabled={isExporting || locations.length === 0}
              className="w-full h-12 bg-blue-600 hover:bg-blue-700 text-white rounded-xl transition-all btn-hover-lift"
            >
              {isExporting ? (
                <div className="flex items-center">
                  <Loader2 className="w-4 h-4 animate-spin mr-2" />
                  Generating Map...
                </div>
              ) : (
                <div className="flex items-center">
                  <Download className="w-4 h-4 mr-2" />
                  Generate Map Export
                </div>
              )}
            </Button>
          </div>
        ) : (
          <div className="space-y-6">
            {/* Preview */}
            <div className="text-center">
              <img
                src={exportedImageUrl || "/placeholder.svg"}
                alt="Exported map"
                className="max-w-full h-auto rounded-xl border border-slate-200 shadow-lg mx-auto"
                style={{ maxHeight: "400px" }}
              />
            </div>

            {/* Download and Share Options */}
            <div className="space-y-4">
              <Button
                onClick={downloadImage}
                className="w-full h-12 bg-green-600 hover:bg-green-700 text-white rounded-xl transition-all btn-hover-lift"
              >
                <Download className="w-4 h-4 mr-2" />
                Download Image
              </Button>

              <div className="grid grid-cols-3 gap-3">
                <Button
                  onClick={() => shareToSocial("twitter")}
                  variant="outline"
                  className="h-12 rounded-xl border-blue-200 hover:bg-blue-50 transition-all"
                >
                  <Twitter className="w-4 h-4 mr-2 text-blue-500" />
                  Twitter
                </Button>
                <Button
                  onClick={() => shareToSocial("facebook")}
                  variant="outline"
                  className="h-12 rounded-xl border-blue-200 hover:bg-blue-50 transition-all"
                >
                  <Facebook className="w-4 h-4 mr-2 text-blue-600" />
                  Facebook
                </Button>
                <Button
                  onClick={() => shareToSocial("instagram")}
                  variant="outline"
                  className="h-12 rounded-xl border-pink-200 hover:bg-pink-50 transition-all"
                >
                  <Instagram className="w-4 h-4 mr-2 text-pink-500" />
                  Instagram
                </Button>
              </div>

              <Button onClick={resetExport} variant="outline" className="w-full h-10 rounded-xl bg-transparent">
                Create Another Export
              </Button>
            </div>
          </div>
        )}
      </DialogContent>
    </Dialog>
  )
}
