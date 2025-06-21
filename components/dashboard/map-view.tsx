"use client"

import type React from "react"

import { useRef, useEffect, useState } from "react"
import { createClient } from "@/lib/supabase/client"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Textarea } from "@/components/ui/textarea"
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import {
  MapPin,
  ImagePlus,
  ExternalLink,
  Search,
  Layers,
  Edit3,
  Filter,
  X,
  Calendar,
  FileText,
  Plus,
  Minus,
  RotateCcw,
} from "lucide-react"
import type { User } from "@supabase/supabase-js"

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

interface MapViewProps {
  locations: Location[]
  onLocationAdded: () => void
  user: User
}

const mapStyles = [
  { id: "outdoors-v12", name: "Outdoors", icon: "🏔️" },
  { id: "streets-v12", name: "Streets", icon: "🏙️" },
  { id: "satellite-v9", name: "Satellite", icon: "🛰️" },
  { id: "light-v11", name: "Light", icon: "☀️" },
  { id: "dark-v11", name: "Dark", icon: "🌙" },
]

const locationCategories = [
  { id: "general", name: "General", icon: "📍", color: "from-gray-500 to-gray-600" },
  { id: "historical", name: "Historical", icon: "🏛️", color: "from-amber-500 to-orange-600" },
  { id: "food", name: "Food & Dining", icon: "🍽️", color: "from-red-500 to-pink-600" },
  { id: "nature", name: "Nature", icon: "🏞️", color: "from-green-500 to-emerald-600" },
  { id: "beach", name: "Beach", icon: "🏖️", color: "from-blue-500 to-cyan-600" },
  { id: "urban", name: "Urban", icon: "🏙️", color: "from-purple-500 to-violet-600" },
  { id: "entertainment", name: "Entertainment", icon: "🎭", color: "from-pink-500 to-rose-600" },
  { id: "shopping", name: "Shopping", icon: "🛍️", color: "from-indigo-500 to-blue-600" },
  { id: "accommodation", name: "Hotels", icon: "🏨", color: "from-teal-500 to-green-600" },
  { id: "photo", name: "Photo Spot", icon: "📸", color: "from-yellow-500 to-orange-600" },
]

export default function MapView({ locations, onLocationAdded, user }: MapViewProps) {
  const mapContainer = useRef<HTMLDivElement>(null)
  const map = useRef<any>(null)
  const tempMarker = useRef<any>(null)
  const [showModal, setShowModal] = useState(false)
  const [showLocationModal, setShowLocationModal] = useState(false)
  const [selectedLocation, setSelectedLocation] = useState<Location | null>(null)
  const [currentPhotoIndex, setCurrentPhotoIndex] = useState(0)
  const [isEditMode, setIsEditMode] = useState(false)
  const [editingLocation, setEditingLocation] = useState<Location | null>(null)
  const [clickedCoords, setClickedCoords] = useState<{ lat: number; lng: number } | null>(null)
  const [cityName, setCityName] = useState("")
  const [notes, setNotes] = useState("")
  const [albumLink, setAlbumLink] = useState("")
  const [visitedDate, setVisitedDate] = useState("")
  const [category, setCategory] = useState("general")
  const [photos, setPhotos] = useState<File[]>([])
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState("")
  const [searchQuery, setSearchQuery] = useState("")
  const [searchLoading, setSearchLoading] = useState(false)
  const [currentMapStyle, setCurrentMapStyle] = useState("outdoors-v12")
  const [showMapStyles, setShowMapStyles] = useState(false)
  const [showFilters, setShowFilters] = useState(false)
  const [activeFilters, setActiveFilters] = useState<string[]>(locationCategories.map((cat) => cat.id))
  const supabase = createClient()
  const [existingPhotos, setExistingPhotos] = useState<string[]>([])

  // Get category info helper
  const getCategoryInfo = (categoryId: string) => {
    return locationCategories.find((cat) => cat.id === categoryId) || locationCategories[0]
  }

  // Filter locations based on active filters
  const filteredLocations = locations.filter((location) => activeFilters.includes(location.category || "general"))

  // Toggle filter
  const toggleFilter = (categoryId: string) => {
    setActiveFilters((prev) =>
      prev.includes(categoryId) ? prev.filter((id) => id !== categoryId) : [...prev, categoryId],
    )
  }

  // Map zoom controls
  const zoomIn = () => {
    if (map.current) {
      map.current.zoomIn({ duration: 300 })
    }
  }

  const zoomOut = () => {
    if (map.current) {
      map.current.zoomOut({ duration: 300 })
    }
  }

  const resetView = () => {
    if (map.current) {
      // If there are locations, fit to bounds, otherwise reset to world view
      if (filteredLocations.length > 0) {
        const bounds = new (window as any).mapboxgl.LngLatBounds()
        filteredLocations.forEach((location) => {
          bounds.extend([location.longitude, location.latitude])
        })
        map.current.fitBounds(bounds, { padding: 50, duration: 1000 })
      } else {
        map.current.flyTo({
          center: [0, 20],
          zoom: 2,
          duration: 1000,
        })
      }
    }
  }

  // Reset form when modal opens/closes
  const resetForm = () => {
    setCityName("")
    setNotes("")
    setAlbumLink("")
    setVisitedDate("")
    setCategory("general")
    setPhotos([])
    setExistingPhotos([])
    setClickedCoords(null)
    setError("")
    setIsEditMode(false)
    setEditingLocation(null)
  }

  const handleModalClose = () => {
    setShowModal(false)
    resetForm()
  }

  const handleLocationModalClose = () => {
    setShowLocationModal(false)
    setSelectedLocation(null)
    setCurrentPhotoIndex(0)
  }

  const populateFormWithLocation = (location: Location) => {
    setCityName(location.city_name)
    setNotes(location.notes || "")
    setAlbumLink(location.album_link || "")
    setVisitedDate(location.visited_date || "")
    setCategory(location.category || "general")
    setPhotos([]) // Can't pre-populate files, user will need to re-upload if they want to change photos
    setExistingPhotos(location.photo_urls || []) // Set existing photos for editing
  }

  const handleSearch = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!searchQuery.trim() || !map.current) return

    setSearchLoading(true)
    try {
      const response = await fetch(
        `https://api.mapbox.com/geocoding/v5/mapbox.places/${encodeURIComponent(searchQuery)}.json?access_token=${process.env.NEXT_PUBLIC_MAPBOX_ACCESS_TOKEN}&limit=1`,
      )
      const data = await response.json()

      if (data.features && data.features.length > 0) {
        const [lng, lat] = data.features[0].center
        const placeName = data.features[0].place_name

        // Remove existing temp marker
        if (tempMarker.current) {
          tempMarker.current.remove()
        }

        // Add temporary marker
        const mapboxgl = (window as any).mapboxgl
        const el = document.createElement("div")
        el.className = "temp-marker"
        el.innerHTML = `
          <div class="relative">
            <div class="w-10 h-10 bg-gradient-to-br from-yellow-400 to-orange-500 rounded-full border-3 border-white shadow-xl flex items-center justify-center animate-bounce">
              <svg class="w-5 h-5 text-white" fill="currentColor" viewBox="0 0 20 20">
                <path fillRule="evenodd" d="M5.05 4.05a7 7 0 119.9 9.9L10 18.9l-4.95-4.95a7 7 0 010-9.9zM10 11a2 2 0 100-4 2 2 0 000 4z" clipRule="evenodd" />
              </svg>
            </div>
            <div class="absolute -bottom-1 left-1/2 transform -translate-x-1/2 w-2 h-2 bg-gradient-to-br from-yellow-400 to-orange-500 rotate-45"></div>
          </div>
        `

        // Add click handler to temp marker
        el.addEventListener("click", (e) => {
          e.stopPropagation()
          // Reset form first
          resetForm()

          // Always add new location for search results
          setClickedCoords({ lat, lng })
          setCityName(placeName)
          setShowModal(true)

          // Remove temp marker
          if (tempMarker.current) {
            tempMarker.current.remove()
            tempMarker.current = null
          }
        })

        tempMarker.current = new mapboxgl.Marker(el).setLngLat([lng, lat]).addTo(map.current)

        // Fly to location
        map.current.flyTo({
          center: [lng, lat],
          zoom: 12,
          duration: 2000,
        })

        // Clear search after successful search
        setSearchQuery("")
      }
    } catch (error) {
      console.error("Search error:", error)
    } finally {
      setSearchLoading(false)
    }
  }

  const handleDeleteLocation = async (locationId: string) => {
    if (!confirm("Are you sure you want to delete this memory?")) return

    try {
      const { error } = await supabase.from("locations").delete().eq("id", locationId)

      if (error) throw error

      handleLocationModalClose()
      onLocationAdded() // This will refresh the locations and update all counters
    } catch (err: any) {
      console.error("Error deleting location:", err)
    }
  }

  const handleEditLocation = (location: Location) => {
    handleLocationModalClose()
    resetForm()
    setIsEditMode(true)
    setEditingLocation(location)
    populateFormWithLocation(location)
    setShowModal(true)
  }

  const changeMapStyle = (styleId: string) => {
    if (map.current) {
      map.current.setStyle(`mapbox://styles/mapbox/${styleId}`)
      setCurrentMapStyle(styleId)
      setShowMapStyles(false)

      // Re-add markers after style change
      map.current.on("styledata", () => {
        addLocationMarkers()
      })
    }
  }

  const nextPhoto = () => {
    if (selectedLocation?.photo_urls) {
      setCurrentPhotoIndex((prev) => (prev + 1) % selectedLocation.photo_urls!.length)
    }
  }

  const prevPhoto = () => {
    if (selectedLocation?.photo_urls) {
      setCurrentPhotoIndex((prev) => (prev === 0 ? selectedLocation.photo_urls!.length - 1 : prev - 1))
    }
  }

  useEffect(() => {
    if (!mapContainer.current) return

    // Initialize Mapbox map
    const mapboxgl = (window as any).mapboxgl
    if (!mapboxgl) {
      // Load Mapbox GL JS dynamically
      const script = document.createElement("script")
      script.src = "https://api.mapbox.com/mapbox-gl-js/v3.0.1/mapbox-gl.js"
      script.onload = initializeMap
      document.head.appendChild(script)
    } else {
      initializeMap()
    }

    function initializeMap() {
      const mapboxgl = (window as any).mapboxgl
      mapboxgl.accessToken = process.env.NEXT_PUBLIC_MAPBOX_ACCESS_TOKEN

      map.current = new mapboxgl.Map({
        container: mapContainer.current,
        style: `mapbox://styles/mapbox/${currentMapStyle}`,
        center: [-74.006, 40.7128],
        zoom: 2,
        preserveDrawingBuffer: true,
        // Enhanced zoom settings
        minZoom: 0.5,
        maxZoom: 20,
        scrollZoom: true,
        doubleClickZoom: true,
        touchZoomRotate: true,
      })

      // Get user's current location
      if (navigator.geolocation) {
        navigator.geolocation.getCurrentPosition(
          (position) => {
            const { latitude, longitude } = position.coords
            map.current.flyTo({
              center: [longitude, latitude],
              zoom: 10,
            })
          },
          (error) => {
            console.log("Geolocation error:", error)
          },
        )
      }

      // Add click handler - but prevent it when clicking on markers
      map.current.on("click", (e: any) => {
        // Check if click was on a marker by checking if the target has marker-related classes
        const clickTarget = e.originalEvent.target
        const isMarkerClick =
          clickTarget.closest(".custom-marker") ||
          clickTarget.closest(".mapboxgl-marker") ||
          clickTarget.closest(".mapboxgl-popup")

        if (isMarkerClick) return // Don't show modal if clicking on existing marker or popup

        const { lng, lat } = e.lngLat

        // Remove temp marker if exists
        if (tempMarker.current) {
          tempMarker.current.remove()
          tempMarker.current = null
        }

        // Reset form first
        resetForm()

        // Always add new location when clicking on map (no nearby detection)
        setClickedCoords({ lat, lng })

        // Reverse geocode to get location name
        fetch(
          `https://api.mapbox.com/geocoding/v5/mapbox.places/${lng},${lat}.json?access_token=${process.env.NEXT_PUBLIC_MAPBOX_ACCESS_TOKEN}`,
        )
          .then((response) => response.json())
          .then((data) => {
            if (data.features && data.features.length > 0) {
              setCityName(data.features[0].place_name)
            }
          })
          .catch((err) => console.log("Geocoding error:", err))

        setShowModal(true)
      })

      // Add existing location markers
      addLocationMarkers()
    }

    return () => {
      if (map.current) {
        map.current.remove()
      }
    }
  }, [])

  useEffect(() => {
    if (map.current) {
      addLocationMarkers()
    }
  }, [filteredLocations])

  const addLocationMarkers = () => {
    if (!map.current) return

    // Remove existing markers
    const existingMarkers = document.querySelectorAll(".custom-marker")
    existingMarkers.forEach((marker) => marker.remove())

    // Add markers for each filtered location
    filteredLocations.forEach((location) => {
      const mapboxgl = (window as any).mapboxgl
      const categoryInfo = getCategoryInfo(location.category || "general")

      // Create custom marker element with category-based colors
      const el = document.createElement("div")
      el.className = "custom-marker"
      el.innerHTML = `
        <div class="relative marker-container">
          <div class="marker-pulse absolute inset-0 w-8 h-8 bg-${categoryInfo.color.split(" ")[1].replace("to-", "")} rounded-full animate-ping opacity-20"></div>
          <div class="marker-main relative w-8 h-8 bg-gradient-to-br ${categoryInfo.color} rounded-full border-2 border-white shadow-lg flex items-center justify-center transform transition-all duration-200 hover:scale-110 cursor-pointer">
            <span class="text-white text-xs">${categoryInfo.icon}</span>
          </div>
          <div class="absolute -bottom-1 left-1/2 transform -translate-x-1/2 w-2 h-2 bg-gradient-to-br ${categoryInfo.color} rotate-45"></div>
        </div>
      `

      // Create the marker
      const marker = new mapboxgl.Marker(el).setLngLat([location.longitude, location.latitude]).addTo(map.current)

      // Add click event to marker element directly with animation
      el.addEventListener("click", (e) => {
        e.stopPropagation()

        // Add click animation to marker
        const markerMain = el.querySelector(".marker-main")
        if (markerMain) {
          markerMain.classList.add("animate-pulse")
          setTimeout(() => {
            markerMain.classList.remove("animate-pulse")
          }, 600)
        }

        // Show location modal
        setSelectedLocation(location)
        setCurrentPhotoIndex(0)
        setShowLocationModal(true)
      })
    })
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()

    if (!isEditMode && !clickedCoords) return
    if (isEditMode && !editingLocation) return

    setLoading(true)
    setError("")

    try {
      let photoUrls: string[] = []

      // Upload multiple photos if provided
      if (photos.length > 0) {
        const uploadPromises = photos.map(async (photo) => {
          const fileExt = photo.name.split(".").pop()
          const fileName = `${user.id}/${Date.now()}-${Math.random().toString(36).substring(7)}.${fileExt}`

          const { data: uploadData, error: uploadError } = await supabase.storage
            .from("travel-photos")
            .upload(fileName, photo)

          if (uploadError) throw uploadError

          const {
            data: { publicUrl },
          } = supabase.storage.from("travel-photos").getPublicUrl(fileName)

          return publicUrl
        })

        photoUrls = await Promise.all(uploadPromises)
      }

      const removeExistingPhoto = (index: number) => {
        setExistingPhotos(existingPhotos.filter((_, i) => i !== index))
      }

      if (isEditMode && editingLocation) {
        // Update existing location
        const updateData: any = {
          city_name: cityName,
          notes: notes || null,
          album_link: albumLink || null,
          visited_date: visitedDate || null,
          category: category,
        }

        // Handle photos - combine existing (not deleted) with new uploads
        const finalPhotoUrls = [...existingPhotos, ...photoUrls]
        updateData.photo_urls = finalPhotoUrls.length > 0 ? finalPhotoUrls : null

        const { error: updateError } = await supabase.from("locations").update(updateData).eq("id", editingLocation.id)

        if (updateError) throw updateError
      } else {
        // Insert new location
        const { error: insertError } = await supabase.from("locations").insert({
          user_id: user.id,
          city_name: cityName,
          latitude: clickedCoords!.lat,
          longitude: clickedCoords!.lng,
          notes: notes || null,
          photo_urls: photoUrls.length > 0 ? photoUrls : null,
          album_link: albumLink || null,
          visited_date: visitedDate || null,
          category: category,
        })

        if (insertError) throw insertError
      }

      onLocationAdded() // This will refresh the locations and update all counters
      handleModalClose()
    } catch (err: any) {
      setError(err.message)
    } finally {
      setLoading(false)
    }
  }

  const handlePhotoChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files) {
      setPhotos(Array.from(e.target.files))
    }
  }

  const removePhoto = (index: number) => {
    setPhotos(photos.filter((_, i) => i !== index))
  }

  const removeExistingPhoto = (index: number) => {
    setExistingPhotos(existingPhotos.filter((_, i) => i !== index))
  }

  return (
    <>
      <div className="relative flex">
        {/* Sidebar Filter */}
        <div
          className={`absolute left-0 top-0 h-full z-20 transition-transform duration-300 ${showFilters ? "translate-x-0" : "-translate-x-full"}`}
        >
          <div className="w-80 h-full bg-white/95 backdrop-blur-sm border-r border-gray-200 shadow-lg">
            <div className="p-4 border-b border-gray-200">
              <div className="flex items-center justify-between mb-4">
                <h3 className="text-lg font-semibold text-gray-900">Filter Locations</h3>
                <Button onClick={() => setShowFilters(false)} variant="ghost" size="sm" className="h-8 w-8 p-0">
                  <X className="h-4 w-4" />
                </Button>
              </div>
              <p className="text-sm text-gray-600">
                Showing {filteredLocations.length} of {locations.length} locations
              </p>
            </div>

            <div className="p-4 space-y-3 max-h-[calc(100vh-120px)] overflow-y-auto">
              {locationCategories.map((category) => {
                const count = locations.filter((loc) => (loc.category || "general") === category.id).length
                const isActive = activeFilters.includes(category.id)

                return (
                  <button
                    key={category.id}
                    onClick={() => toggleFilter(category.id)}
                    className={`w-full flex items-center justify-between p-3 rounded-xl transition-all duration-200 ${
                      isActive
                        ? "bg-blue-50 border-2 border-blue-200 text-blue-900"
                        : "bg-gray-50 border-2 border-transparent text-gray-700 hover:bg-gray-100"
                    }`}
                  >
                    <div className="flex items-center space-x-3">
                      <span className="text-lg">{category.icon}</span>
                      <div className="text-left">
                        <p className="font-medium text-sm">{category.name}</p>
                        <p className="text-xs opacity-70">
                          {count} location{count !== 1 ? "s" : ""}
                        </p>
                      </div>
                    </div>
                    <div
                      className={`w-5 h-5 rounded border-2 flex items-center justify-center ${
                        isActive ? "bg-blue-600 border-blue-600" : "border-gray-300"
                      }`}
                    >
                      {isActive && (
                        <svg className="w-3 h-3 text-white" fill="currentColor" viewBox="0 0 20 20">
                          <path
                            fillRule="evenodd"
                            d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z"
                            clipRule="evenodd"
                          />
                        </svg>
                      )}
                    </div>
                  </button>
                )
              })}
            </div>

            <div className="p-4 border-t border-gray-200">
              <Button
                onClick={() => setActiveFilters(locationCategories.map((cat) => cat.id))}
                variant="outline"
                className="w-full text-sm"
              >
                Show All Categories
              </Button>
            </div>
          </div>
        </div>

        {/* Main Map Container */}
        <div className="flex-1">
          {/* Transparent Search Bar */}
          <div className="absolute top-4 left-4 z-10">
            <div className="flex items-center space-x-2 mb-2">
              <Button
                onClick={() => setShowFilters(!showFilters)}
                variant="ghost"
                size="sm"
                className="h-10 w-10 bg-white/20 hover:bg-white/30 backdrop-blur-sm rounded-lg text-white border-white/20 p-0"
              >
                <Filter className="h-4 w-4" />
              </Button>
              <form onSubmit={handleSearch} className="flex items-center space-x-2">
                <div className="relative">
                  <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-white/70" />
                  <Input
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    placeholder="Search for a location..."
                    className="pl-10 pr-4 h-10 w-80 bg-black/20 backdrop-blur-sm border-white/20 text-white placeholder-white/70 rounded-lg font-light text-sm focus:bg-black/30 focus:border-white/40"
                  />
                </div>
                <Button
                  type="submit"
                  size="sm"
                  disabled={searchLoading}
                  variant="ghost"
                  className="h-10 px-4 bg-white/30 hover:bg-white/40 backdrop-blur-sm font-light rounded-lg text-white border border-white/30 hover:border-white/50"
                >
                  {searchLoading ? "..." : "Go"}
                </Button>
              </form>
            </div>
            <p className="text-xs text-white/80 font-light ml-12 drop-shadow-sm">
              {filteredLocations.length} locations shown • Click anywhere to add a memory
            </p>
          </div>

          {/* Map Controls - Top Right */}
          <div className="absolute top-4 right-4 z-10 flex flex-col space-y-2">
            {/* Map Style Toggle */}
            <div className="relative">
              <Button
                onClick={() => setShowMapStyles(!showMapStyles)}
                variant="ghost"
                size="sm"
                className="h-10 w-10 bg-white/20 hover:bg-white/30 backdrop-blur-sm rounded-lg text-white border-white/20 p-0"
              >
                <Layers className="h-4 w-4" />
              </Button>

              {showMapStyles && (
                <div className="absolute top-12 right-0 bg-white/95 backdrop-blur-sm rounded-lg shadow-lg border border-white/20 p-2 min-w-[140px]">
                  {mapStyles.map((style) => (
                    <button
                      key={style.id}
                      onClick={() => changeMapStyle(style.id)}
                      className={`w-full text-left px-3 py-2 rounded-md text-sm font-light transition-colors flex items-center space-x-2 ${
                        currentMapStyle === style.id ? "bg-blue-100 text-blue-900" : "text-gray-700 hover:bg-gray-100"
                      }`}
                    >
                      <span>{style.icon}</span>
                      <span>{style.name}</span>
                    </button>
                  ))}
                </div>
              )}
            </div>

            {/* Zoom Controls */}
            <div className="flex flex-col space-y-1">
              <Button
                onClick={zoomIn}
                variant="ghost"
                size="sm"
                className="h-10 w-10 bg-white/20 hover:bg-white/30 backdrop-blur-sm rounded-lg text-white border-white/20 p-0"
                title="Zoom In"
              >
                <Plus className="h-4 w-4" />
              </Button>
              <Button
                onClick={zoomOut}
                variant="ghost"
                size="sm"
                className="h-10 w-10 bg-white/20 hover:bg-white/30 backdrop-blur-sm rounded-lg text-white border-white/20 p-0"
                title="Zoom Out"
              >
                <Minus className="h-4 w-4" />
              </Button>
              <Button
                onClick={resetView}
                variant="ghost"
                size="sm"
                className="h-10 w-10 bg-white/20 hover:bg-white/30 backdrop-blur-sm rounded-lg text-white border-white/20 p-0"
                title="Reset View"
              >
                <RotateCcw className="h-4 w-4" />
              </Button>
            </div>
          </div>

          <div ref={mapContainer} className="w-full h-[600px] rounded-xl" />
        </div>
      </div>

      {/* Location Details Modal - Centered */}
      {showLocationModal && selectedLocation && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
          {/* Backdrop */}
          <div
            className="absolute inset-0 bg-black/50 backdrop-blur-sm"
            onClick={handleLocationModalClose}
            style={{
              animation: "fadeIn 0.3s ease-out",
            }}
          />

          {/* Modal Content */}
          <div
            className="relative bg-white rounded-2xl shadow-2xl max-w-md w-full max-h-[85vh] flex flex-col overflow-hidden"
            style={{
              animation: "slideInScale 0.4s cubic-bezier(0.16, 1, 0.3, 1)",
            }}
          >
            {/* Header - Fixed */}
            <div className="relative p-6 pb-4 border-b border-gray-100 flex-shrink-0">
              <button
                onClick={handleLocationModalClose}
                className="absolute top-4 right-4 w-8 h-8 bg-gray-100 hover:bg-gray-200 rounded-full flex items-center justify-center transition-colors"
              >
                <X className="h-4 w-4 text-gray-600" />
              </button>

              <div className="flex items-center justify-between pr-12">
                <div className="flex items-center space-x-3">
                  <span className="text-xl">{getCategoryInfo(selectedLocation.category || "general").icon}</span>
                  <span className="text-xs font-medium text-gray-500 bg-gray-100 px-3 py-1 rounded-full">
                    {getCategoryInfo(selectedLocation.category || "general").name}
                  </span>
                </div>

                {/* Inline Action Buttons */}
                <div className="flex items-center space-x-2">
                  <button
                    onClick={() => handleEditLocation(selectedLocation)}
                    className="flex items-center space-x-1 px-3 py-1.5 bg-blue-50 hover:bg-blue-100 text-blue-700 rounded-lg transition-colors text-sm font-medium"
                  >
                    <Edit3 className="h-3 w-3" />
                    <span>Edit</span>
                  </button>
                  <button
                    onClick={() => handleDeleteLocation(selectedLocation.id)}
                    className="w-8 h-8 bg-red-50 hover:bg-red-100 text-red-600 rounded-lg flex items-center justify-center transition-colors"
                  >
                    <svg className="h-3.5 w-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path
                        strokeLinecap="round"
                        strokeLinejoin="round"
                        strokeWidth="2"
                        d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16"
                      />
                    </svg>
                  </button>
                </div>
              </div>

              <h2 className="text-xl font-semibold text-gray-900 leading-tight mt-3">{selectedLocation.city_name}</h2>
              <div className="flex items-center text-gray-500 mt-1">
                <MapPin className="h-4 w-4 mr-1.5" />
                <span className="text-sm">Memory location</span>
              </div>
            </div>

            {/* Scrollable Content */}
            <div className="flex-1 overflow-y-auto">
              {/* Photo Section - Only show if photos exist */}
              {selectedLocation.photo_urls && selectedLocation.photo_urls.length > 0 && (
                <div className="relative flex-shrink-0">
                  <img
                    src={selectedLocation.photo_urls[currentPhotoIndex] || "/placeholder.svg"}
                    alt={selectedLocation.city_name}
                    className="w-full h-64 object-cover"
                  />

                  {selectedLocation.photo_urls.length > 1 && (
                    <>
                      <button
                        onClick={prevPhoto}
                        className="absolute left-3 top-1/2 transform -translate-y-1/2 w-8 h-8 bg-black/60 backdrop-blur-sm text-white rounded-full flex items-center justify-center hover:bg-black/80 transition-all"
                      >
                        <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M15 19l-7-7 7-7" />
                        </svg>
                      </button>
                      <button
                        onClick={nextPhoto}
                        className="absolute right-3 top-1/2 transform -translate-y-1/2 w-8 h-8 bg-black/60 backdrop-blur-sm text-white rounded-full flex items-center justify-center hover:bg-black/80 transition-all"
                      >
                        <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M9 5l7 7-7 7" />
                        </svg>
                      </button>

                      <div className="absolute bottom-3 left-1/2 transform -translate-x-1/2 flex space-x-2">
                        {selectedLocation.photo_urls.map((_, index) => (
                          <button
                            key={index}
                            onClick={() => setCurrentPhotoIndex(index)}
                            className={`w-2 h-2 rounded-full transition-all ${
                              index === currentPhotoIndex ? "bg-white scale-125" : "bg-white/60"
                            }`}
                          />
                        ))}
                      </div>
                    </>
                  )}
                </div>
              )}

              {/* Content Details */}
              <div className="p-6 space-y-4">
                {/* Visit Date - Only show if date exists */}
                {selectedLocation.visited_date && (
                  <div className="flex items-center space-x-3 p-3 bg-blue-50 rounded-xl">
                    <div className="w-8 h-8 bg-blue-100 rounded-lg flex items-center justify-center">
                      <Calendar className="h-4 w-4 text-blue-600" />
                    </div>
                    <div>
                      <p className="text-sm font-medium text-gray-900">Visited</p>
                      <p className="text-sm text-gray-600">
                        {new Date(selectedLocation.visited_date).toLocaleDateString("en-US", {
                          year: "numeric",
                          month: "long",
                          day: "numeric",
                        })}
                      </p>
                    </div>
                  </div>
                )}

                {/* Notes - Only show if notes exist */}
                {selectedLocation.notes && selectedLocation.notes.trim() && (
                  <div>
                    <div className="flex items-center space-x-2 mb-2">
                      <FileText className="h-4 w-4 text-gray-500" />
                      <span className="text-sm font-medium text-gray-700">Memory</span>
                    </div>
                    <p className="text-gray-700 leading-relaxed text-sm bg-gray-50 p-3 rounded-xl">
                      {selectedLocation.notes}
                    </p>
                  </div>
                )}

                {/* Album Link - Only show if link exists */}
                {selectedLocation.album_link && selectedLocation.album_link.trim() && (
                  <div>
                    <a
                      href={selectedLocation.album_link}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="inline-flex items-center space-x-2 text-blue-600 hover:text-blue-700 transition-colors text-sm font-medium"
                    >
                      <ExternalLink className="h-4 w-4" />
                      <span>View Full Album</span>
                    </a>
                  </div>
                )}
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Add/Edit Location Modal */}
      {showModal && (
        <Dialog open={true} onOpenChange={handleModalClose}>
          <DialogContent className="sm:max-w-lg max-h-[85vh] overflow-y-auto">
            <DialogHeader>
              <DialogTitle className="text-lg font-light flex items-center space-x-2">
                {isEditMode ? (
                  <>
                    <Edit3 className="h-4 w-4 text-blue-600" />
                    <span>Edit Memory</span>
                  </>
                ) : (
                  <>
                    <MapPin className="h-4 w-4 text-blue-600" />
                    <span>Add Memory</span>
                  </>
                )}
              </DialogTitle>
              {isEditMode && (
                <p className="text-sm text-gray-600 font-light">
                  Updating your memory for {editingLocation?.city_name}
                </p>
              )}
            </DialogHeader>

            <form onSubmit={handleSubmit} className="space-y-4">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="cityName" className="font-light">
                    Location Name *
                  </Label>
                  <Input
                    id="cityName"
                    value={cityName}
                    onChange={(e) => setCityName(e.target.value)}
                    placeholder="e.g., Paris, France"
                    required
                    className="rounded-xl font-light text-sm"
                  />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="category" className="font-light">
                    Category *
                  </Label>
                  <Select value={category} onValueChange={setCategory}>
                    <SelectTrigger className="rounded-xl text-sm">
                      <SelectValue placeholder="Select category" />
                    </SelectTrigger>
                    <SelectContent>
                      {locationCategories.map((cat) => (
                        <SelectItem key={cat.id} value={cat.id}>
                          <div className="flex items-center space-x-2">
                            <span>{cat.icon}</span>
                            <span>{cat.name}</span>
                          </div>
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              </div>

              <div className="space-y-2">
                <Label htmlFor="visitedDate" className="font-light">
                  Date Visited
                </Label>
                <Input
                  id="visitedDate"
                  type="date"
                  value={visitedDate}
                  onChange={(e) => setVisitedDate(e.target.value)}
                  className="rounded-xl text-sm"
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="notes" className="font-light">
                  Your Memory
                </Label>
                <Textarea
                  id="notes"
                  value={notes}
                  onChange={(e) => setNotes(e.target.value)}
                  placeholder="What made this place special?"
                  rows={2}
                  className="rounded-xl font-light text-sm"
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="photos" className="font-light">
                  {isEditMode ? "Add More Photos" : "Photos"} {photos.length > 0 && `(${photos.length} selected)`}
                </Label>
                <div className="space-y-3">
                  <Input
                    id="photos"
                    type="file"
                    accept="image/*"
                    multiple
                    onChange={handlePhotoChange}
                    className="hidden"
                  />
                  <Button
                    type="button"
                    variant="outline"
                    onClick={() => document.getElementById("photos")?.click()}
                    className="flex items-center space-x-2 rounded-xl font-light w-full h-10 border-dashed border-2 hover:bg-gray-50 text-sm"
                  >
                    <ImagePlus className="h-4 w-4" />
                    <span>{isEditMode ? "Add More Photos" : "Choose Photos"}</span>
                  </Button>

                  {photos.length > 0 && (
                    <div className="grid grid-cols-3 gap-2">
                      {photos.map((photo, index) => (
                        <div key={index} className="relative group">
                          <img
                            src={URL.createObjectURL(photo) || "/placeholder.svg"}
                            alt={`Preview ${index + 1}`}
                            className="w-full h-16 object-cover rounded-lg"
                          />
                          <button
                            type="button"
                            onClick={() => removePhoto(index)}
                            className="absolute -top-1 -right-1 w-4 h-4 bg-red-500 text-white rounded-full flex items-center justify-center text-xs hover:bg-red-600 opacity-0 group-hover:opacity-100 transition-opacity"
                          >
                            ×
                          </button>
                        </div>
                      ))}
                    </div>
                  )}

                  {isEditMode && existingPhotos.length > 0 && (
                    <div className="mt-3">
                      <p className="text-sm text-gray-600 font-light mb-2">Existing Photos:</p>
                      <div className="grid grid-cols-3 gap-2">
                        {existingPhotos.map((url, index) => (
                          <div key={index} className="relative group">
                            <img
                              src={url || "/placeholder.svg"}
                              alt={`Existing ${index + 1}`}
                              className="w-full h-16 object-cover rounded-lg"
                            />
                            <button
                              type="button"
                              onClick={() => removeExistingPhoto(index)}
                              className="absolute -top-1 -right-1 w-4 h-4 bg-red-500 text-white rounded-full flex items-center justify-center text-xs hover:bg-red-600 opacity-0 group-hover:opacity-100 transition-opacity"
                            >
                              ×
                            </button>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}
                </div>
              </div>

              <div className="space-y-2">
                <Label htmlFor="albumLink" className="font-light flex items-center space-x-1">
                  <span>Album Link</span>
                  <ExternalLink className="h-3 w-3" />
                </Label>
                <Input
                  id="albumLink"
                  value={albumLink}
                  onChange={(e) => setAlbumLink(e.target.value)}
                  placeholder="Link to photo album (optional)"
                  className="rounded-xl font-light text-sm"
                />
              </div>

              {error && <div className="text-red-600 text-sm bg-red-50 p-3 rounded-xl font-light">{error}</div>}

              <div className="flex justify-end space-x-2 pt-2">
                <Button
                  type="button"
                  variant="outline"
                  onClick={handleModalClose}
                  className="rounded-xl font-light text-sm"
                >
                  Cancel
                </Button>
                <Button
                  type="submit"
                  disabled={loading}
                  className="bg-blue-600 hover:bg-blue-700 rounded-xl font-light text-sm"
                >
                  {loading ? (isEditMode ? "Updating..." : "Adding...") : isEditMode ? "Update Memory" : "Add Memory"}
                </Button>
              </div>
            </form>
          </DialogContent>
        </Dialog>
      )}

      <style jsx global>{`
        @keyframes fadeIn {
          from {
            opacity: 0;
          }
          to {
            opacity: 1;
          }
        }

        @keyframes slideInScale {
          0% {
            opacity: 0;
            transform: translateY(20px) scale(0.95);
          }
          100% {
            opacity: 1;
            transform: translateY(0) scale(1);
          }
        }

        .marker-container:hover .marker-pulse {
          animation-duration: 1s;
        }

        .temp-marker {
          cursor: pointer;
        }

        .temp-marker:hover {
          transform: scale(1.1);
        }
      `}</style>
    </>
  )
}
