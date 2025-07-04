"use client"

import type React from "react"
import { useRef, useEffect, useState } from "react"
import { createClient } from "@/lib/supabase/client"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Textarea } from "@/components/ui/textarea"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import {
  ImagePlus,
  ExternalLink,
  Search,
  Layers,
  Filter,
  X,
  Calendar,
  Plus,
  Minus,
  RotateCcw,
  Maximize,
  Minimize,
  Check,
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
    if (!e.target.files) return
    const newFiles = Array.from(e.target.files)
    setPhotos((prev) => [...prev, ...newFiles])
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
        {/* Apple-Style Ultra-Minimal Filter Sidebar */}
        <div
          className={`absolute left-0 top-0 h-full z-20 transition-all duration-500 ease-out ${
            showFilters ? "translate-x-0" : "-translate-x-full"
          }`}
        >
          <div className="w-56 h-full bg-white/80 backdrop-blur-2xl border-r border-white/20 shadow-2xl">
            {/* Ultra-minimal header */}
            <div className="p-3 border-b border-white/10">
              <div className="flex items-center justify-between">
                <div>
                  <h3 className="text-sm font-medium text-gray-900 tracking-tight">Filters</h3>
                  <p className="text-xs text-gray-500 mt-0.5 font-light">
                    {filteredLocations.length} of {locations.length}
                  </p>
                </div>
                <button
                  onClick={() => setShowFilters(false)}
                  className="w-6 h-6 rounded-full bg-gray-100/80 hover:bg-gray-200/80 flex items-center justify-center transition-all duration-200"
                >
                  <X className="h-3 w-3 text-gray-600" />
                </button>
              </div>
            </div>

            <div className="p-2 space-y-0.5 max-h-[calc(100vh-120px)] overflow-y-auto">
              {locationCategories.map((category) => {
                const count = locations.filter((loc) => (loc.category || "general") === category.id).length
                const isActive = activeFilters.includes(category.id)

                return (
                  <button
                    key={category.id}
                    onClick={() => toggleFilter(category.id)}
                    className={`w-full flex items-center justify-between p-2.5 rounded-lg transition-all duration-200 text-sm group ${
                      isActive ? "bg-blue-500/10 text-blue-900 shadow-sm" : "text-gray-700 hover:bg-gray-100/50"
                    }`}
                  >
                    <div className="flex items-center space-x-2.5">
                      <span className="text-base leading-none">{category.icon}</span>
                      <div className="text-left">
                        <span className="font-medium tracking-tight">{category.name}</span>
                      </div>
                    </div>
                    <div className="flex items-center space-x-2">
                      <span className={`text-xs font-medium ${isActive ? "text-blue-600" : "text-gray-400"}`}>
                        {count}
                      </span>
                      <div
                        className={`w-4 h-4 rounded-full border-2 flex items-center justify-center transition-all duration-200 ${
                          isActive
                            ? "bg-blue-500 border-blue-500 scale-110"
                            : "border-gray-300 group-hover:border-gray-400"
                        }`}
                      >
                        {isActive && <Check className="w-2.5 h-2.5 text-white" strokeWidth={3} />}
                      </div>
                    </div>
                  </button>
                )
              })}
            </div>
          </div>
        </div>

        {/* Main Map Container */}
        <div className="flex-1">
          <div className="absolute top-4 left-4 z-10">
            <div className="flex items-center space-x-2">
              <button
                onClick={() => setShowFilters(!showFilters)}
                className="w-9 h-9 bg-white/20 hover:bg-white/30 backdrop-blur-xl rounded-xl border border-white/20 flex items-center justify-center transition-all duration-200 shadow-lg hover:shadow-xl"
              >
                <Filter className="h-4 w-4 text-white drop-shadow-sm" />
              </button>

              <form onSubmit={handleSearch} className="flex items-center space-x-2">
                <div className="relative">
                  <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-white/70 drop-shadow-sm" />
                  <input
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    placeholder="Search places..."
                    className="pl-10 pr-4 h-9 w-72 bg-white/20 backdrop-blur-xl border border-white/20 text-white placeholder-white/70 rounded-xl text-sm font-light shadow-lg focus:bg-white/30 focus:border-white/40 focus:outline-none transition-all duration-200"
                  />
                </div>
                <button
                  type="submit"
                  disabled={searchLoading}
                  className="h-9 px-4 bg-white/20 hover:bg-white/30 backdrop-blur-xl rounded-xl border border-white/20 text-sm font-medium text-white shadow-lg transition-all duration-200 disabled:opacity-50"
                >
                  {searchLoading ? "..." : "Go"}
                </button>
              </form>
            </div>
          </div>

          {/* Apple-Style Translucent Map Controls */}
          <div className="absolute top-4 right-4 z-10 flex flex-col space-y-2">
            {/* Apple-style Map Style Selector */}
            <div className="relative">
              <button
                onClick={() => setShowMapStyles(!showMapStyles)}
                className="w-9 h-9 bg-white/20 hover:bg-white/30 backdrop-blur-xl rounded-xl border border-white/20 flex items-center justify-center transition-all duration-200 shadow-lg hover:shadow-xl"
              >
                <Layers className="h-4 w-4 text-white drop-shadow-sm" />
              </button>

              {showMapStyles && (
                <div className="absolute top-11 right-0 bg-white/90 backdrop-blur-2xl rounded-2xl shadow-2xl border border-white/20 p-2 min-w-[140px] animate-in slide-in-from-top-2 duration-300">
                  {mapStyles.map((style) => (
                    <button
                      key={style.id}
                      onClick={() => changeMapStyle(style.id)}
                      className={`w-full text-left px-3 py-2.5 rounded-xl text-sm transition-all duration-200 flex items-center space-x-3 ${
                        currentMapStyle === style.id
                          ? "bg-blue-500/10 text-blue-900 shadow-sm"
                          : "text-gray-700 hover:bg-gray-100/50"
                      }`}
                    >
                      <span className="text-base">{style.icon}</span>
                      <span className="font-medium tracking-tight">{style.name}</span>
                      {currentMapStyle === style.id && (
                        <Check className="w-4 h-4 text-blue-600 ml-auto" strokeWidth={2.5} />
                      )}
                    </button>
                  ))}
                </div>
              )}
            </div>

            <div className="flex flex-col space-y-1">
              <button
                onClick={zoomIn}
                className="w-9 h-9 bg-white/20 hover:bg-white/30 backdrop-blur-xl rounded-xl border border-white/20 flex items-center justify-center transition-all duration-200 shadow-lg hover:shadow-xl"
                title="Zoom In"
              >
                <Plus className="h-4 w-4 text-white drop-shadow-sm" strokeWidth={2.5} />
              </button>
              <button
                onClick={zoomOut}
                className="w-9 h-9 bg-white/20 hover:bg-white/30 backdrop-blur-xl rounded-xl border border-white/20 flex items-center justify-center transition-all duration-200 shadow-lg hover:shadow-xl"
                title="Zoom Out"
              >
                <Minus className="h-4 w-4 text-white drop-shadow-sm" strokeWidth={2.5} />
              </button>
              <button
                onClick={resetView}
                className="w-9 h-9 bg-white/20 hover:bg-white/30 backdrop-blur-xl rounded-xl border border-white/20 flex items-center justify-center transition-all duration-200 shadow-lg hover:shadow-xl"
                title="Reset View"
              >
                <RotateCcw className="h-4 w-4 text-white drop-shadow-sm" strokeWidth={2.5} />
              </button>
            </div>
          </div>

          <div
            ref={mapContainer}
            className={`w-full transition-all duration-300 h-screen rounded-none" : "h-[950px]"}`}
          />
        </div>
      </div>

      {/* Location Details Modal */}
      {showLocationModal && selectedLocation && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
          {/* Backdrop */}
          <div
            className="absolute inset-0 bg-black/20 backdrop-blur-md"
            onClick={handleLocationModalClose}
            style={{
              animation: "fadeIn 0.3s ease-out",
            }}
          />

          {/* Modal Content */}
          <div
            className="relative bg-white/95 backdrop-blur-xl rounded-3xl shadow-2xl max-w-md w-full max-h-[90vh] flex flex-col overflow-hidden border border-white/50"
            style={{
              animation: "slideInScale 0.4s cubic-bezier(0.16, 1, 0.3, 1)",
            }}
          >
            {/* Photo Section - Full width at top */}
            {selectedLocation.photo_urls && selectedLocation.photo_urls.length > 0 && (
              <div className="relative flex-shrink-0 bg-gray-100">
                <img
                  src={selectedLocation.photo_urls[currentPhotoIndex] || "/placeholder.svg"}
                  alt={selectedLocation.city_name}
                  className="w-full h-72 object-cover"
                />

                {/* Close button overlaid on photo */}
                <button
                  onClick={handleLocationModalClose}
                  className="absolute top-4 right-4 w-10 h-10 bg-white/90 backdrop-blur-sm hover:bg-white text-gray-700 rounded-full flex items-center justify-center transition-all shadow-lg"
                >
                  <X className="h-5 w-5" />
                </button>

                {selectedLocation.photo_urls.length > 1 && (
                  <>
                    <button
                      onClick={prevPhoto}
                      className="absolute left-4 top-1/2 transform -translate-y-1/2 w-10 h-10 bg-white/90 backdrop-blur-sm text-gray-700 rounded-full flex items-center justify-center hover:bg-white transition-all shadow-lg"
                    >
                      <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M15 19l-7-7 7-7" />
                      </svg>
                    </button>
                    <button
                      onClick={nextPhoto}
                      className="absolute right-4 top-1/2 transform -translate-y-1/2 w-10 h-10 bg-white/90 backdrop-blur-sm text-gray-700 rounded-full flex items-center justify-center hover:bg-white transition-all shadow-lg"
                    >
                      <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M9 5l7 7-7 7" />
                      </svg>
                    </button>

                    <div className="absolute bottom-4 left-1/2 transform -translate-x-1/2 flex items-center space-x-1.5 bg-black/20 backdrop-blur-sm rounded-full px-3 py-1.5">
                      {selectedLocation.photo_urls.map((_, index) => (
                        <button
                          key={index}
                          onClick={() => setCurrentPhotoIndex(index)}
                          className={`transition-all ${
                            index === currentPhotoIndex ? "w-6 h-1.5 bg-white rounded-full" : "w-1.5 h-1.5 bg-white/60 rounded-full"
                          }`}
                        />
                      ))}
                    </div>
                  </>
                )}
              </div>
            )}

            {/* Header - Without photo */}
            {(!selectedLocation.photo_urls || selectedLocation.photo_urls.length === 0) && (
              <div className="relative pt-6">
                <button
                  onClick={handleLocationModalClose}
                  className="absolute top-4 right-4 w-10 h-10 bg-gray-100 hover:bg-gray-200 rounded-full flex items-center justify-center transition-apple"
                >
                  <X className="h-5 w-5 text-gray-600" />
                </button>
              </div>
            )}

            {/* Content */}
            <div className="flex-1 overflow-y-auto">
              <div className="p-6 pt-4">
                {/* Location Info */}
                <div className="mb-6">
                  <div className="flex items-start justify-between mb-3">
                    <div className="flex-1 pr-2">
                      <h2 className="text-2xl font-semibold text-gray-900 mb-1">{selectedLocation.city_name}</h2>
                      <div className="flex items-center space-x-3">
                        <span className="text-2xl">{getCategoryInfo(selectedLocation.category || "general").icon}</span>
                        <span className="text-sm text-gray-600">
                          {getCategoryInfo(selectedLocation.category || "general").name}
                        </span>
                      </div>
                    </div>
                  </div>

                  {/* Action Buttons */}
                  <div className="flex items-center space-x-4 mt-3">
                    <button
                      onClick={() => handleEditLocation(selectedLocation)}
                      className="text-primary hover:text-primary/80 transition-colors text-sm font-medium"
                    >
                      Edit
                    </button>
                    <button
                      onClick={() => handleDeleteLocation(selectedLocation.id)}
                      className="text-red-600 hover:text-red-700 transition-colors text-sm font-medium"
                    >
                      Delete
                    </button>
                  </div>
                </div>

                {/* Details */}
                <div className="space-y-4">
                  {/* Visit Date */}
                  {selectedLocation.visited_date && (
                    <div className="flex items-center space-x-3">
                      <Calendar className="h-4 w-4 text-gray-400" />
                      <p className="text-sm text-gray-600">
                        {(() => {
                          const [year, month, day] = selectedLocation.visited_date.split("-");
                          const localDate = new Date(Number(year), Number(month) - 1, Number(day));
                          return localDate.toLocaleDateString("en-US", {
                            year: "numeric",
                            month: "long",
                            day: "numeric",
                          });
                        })()}
                      </p>
                    </div>
                  )}

                  {/* Notes */}
                  {selectedLocation.notes && selectedLocation.notes.trim() && (
                    <div className="pt-3 border-t border-gray-100">
                      <p className="text-gray-700 leading-relaxed text-sm">
                        {selectedLocation.notes}
                      </p>
                    </div>
                  )}

                  {/* Album Link */}
                  {selectedLocation.album_link && selectedLocation.album_link.trim() && (
                    <a
                      href={selectedLocation.album_link}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="inline-flex items-center space-x-2 text-primary hover:text-primary/80 transition-colors text-sm font-medium pt-3"
                    >
                      <ExternalLink className="h-4 w-4" />
                      <span>View Full Album</span>
                    </a>
                  )}
                </div>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Edit Location Modal */}
      {showModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
          {/* Backdrop */}
          <div
            className="absolute inset-0 bg-black/20 backdrop-blur-md"
            onClick={handleModalClose}
            style={{
              animation: "fadeIn 0.3s ease-out",
            }}
          />

          {/* Modal Content */}
          <div
            className="relative bg-white/95 backdrop-blur-xl rounded-3xl shadow-2xl max-w-lg w-full max-h-[90vh] overflow-hidden border border-white/50"
            style={{
              animation: "slideInScale 0.4s cubic-bezier(0.16, 1, 0.3, 1)",
            }}
          >
            {/* Header */}
            <div className="px-6 py-5 border-b border-gray-100">
              <div className="flex items-start justify-between">
                <div className="flex-1 pr-3">
                  <h2 className="text-xl font-semibold text-gray-900">
                    {isEditMode ? "Edit Location" : "Add New Location"}
                  </h2>
                  {isEditMode && (
                    <p className="text-sm text-gray-600 mt-1">
                      {editingLocation?.city_name}
                    </p>
                  )}
                </div>
                <button
                  onClick={handleModalClose}
                  className="w-9 h-9 bg-gray-100 hover:bg-gray-200 rounded-full flex items-center justify-center transition-apple flex-shrink-0"
                >
                  <X className="h-5 w-5 text-gray-600" />
                </button>
              </div>
            </div>

            {/* Form */}
            <form onSubmit={handleSubmit} className="p-6 space-y-5 overflow-y-auto max-h-[calc(90vh-180px)]">
              {/* Location & Category */}
              <div className="space-y-4">
                <div>
                  <Label htmlFor="cityName" className="text-sm font-medium text-gray-700 mb-1.5 block">
                    Location Name
                  </Label>
                  <Input
                    id="cityName"
                    value={cityName}
                    onChange={(e) => setCityName(e.target.value)}
                    placeholder="e.g., Paris, France"
                    required
                    className="h-11 bg-gray-50 border-gray-200 focus:border-primary focus:ring-2 focus:ring-primary/20 rounded-2xl text-base transition-all placeholder-gray-400"
                  />
                </div>

                <div>
                  <Label htmlFor="category" className="text-sm font-medium text-gray-700 mb-1.5 block">
                    Category
                  </Label>
                  <Select value={category} onValueChange={setCategory}>
                    <SelectTrigger className="h-11 bg-gray-50 border-gray-200 focus:border-primary focus:ring-2 focus:ring-primary/20 rounded-2xl text-base">
                      <SelectValue placeholder="Select a category" />
                    </SelectTrigger>
                    <SelectContent className="rounded-2xl">
                      {locationCategories.map((cat) => (
                        <SelectItem key={cat.id} value={cat.id} className="rounded-xl">
                          <div className="flex items-center space-x-3">
                            <span className="text-lg">{cat.icon}</span>
                            <span className="text-sm">{cat.name}</span>
                          </div>
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              </div>

              {/* Date */}
              <div>
                <Label htmlFor="visitedDate" className="text-sm font-medium text-gray-700 mb-1.5 block">
                  Date Visited
                </Label>
                <Input
                  id="visitedDate"
                  type="date"
                  value={visitedDate}
                  onChange={(e) => setVisitedDate(e.target.value)}
                  className="h-11 bg-gray-50 border-gray-200 focus:border-primary focus:ring-2 focus:ring-primary/20 rounded-2xl text-base"
                />
              </div>

              {/* Memory */}
              <div>
                <Label htmlFor="notes" className="text-sm font-medium text-gray-700 mb-1.5 block">
                  Your Memory
                </Label>
                <Textarea
                  id="notes"
                  value={notes}
                  onChange={(e) => setNotes(e.target.value)}
                  placeholder="What made this place special?"
                  rows={3}
                  className="bg-gray-50 border-gray-200 focus:border-primary focus:ring-2 focus:ring-primary/20 rounded-2xl text-base resize-none placeholder-gray-400"
                />
              </div>

              {/* Photos */}
              <div>
                <Label htmlFor="photos" className="text-sm font-medium text-gray-700 mb-1.5 block">
                  Photos {photos.length > 0 && <span className="text-gray-500 font-normal">({photos.length})</span>}
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
                  <button
                    type="button"
                    onClick={() => document.getElementById("photos")?.click()}
                    className="w-full h-24 border-2 border-dashed border-gray-300 hover:border-primary rounded-2xl flex flex-col items-center justify-center space-y-2 transition-colors bg-gray-50 hover:bg-gray-100"
                  >
                    <ImagePlus className="h-6 w-6 text-gray-400" />
                    <span className="text-sm text-gray-600">{isEditMode ? "Add More Photos" : "Add Photos"}</span>
                  </button>

                  {/* Photo Previews */}
                  {(photos.length > 0 || (isEditMode && existingPhotos.length > 0)) && (
                    <div className="grid grid-cols-4 gap-2">
                      {/* New Photos */}
                      {photos.map((photo, index) => (
                        <div key={`new-${index}`} className="relative group">
                          <img
                            src={URL.createObjectURL(photo) || "/placeholder.svg"}
                            alt={`Preview ${index + 1}`}
                            className="w-full h-20 object-cover rounded-xl"
                          />
                          <button
                            type="button"
                            onClick={() => removePhoto(index)}
                            className="absolute -top-2 -right-2 w-6 h-6 bg-red-500 text-white rounded-full flex items-center justify-center text-xs hover:bg-red-600 shadow-sm"
                          >
                            ×
                          </button>
                          <div className="absolute bottom-1 left-1 px-1.5 py-0.5 bg-black/50 text-white text-xs rounded-md">
                            New
                          </div>
                        </div>
                      ))}
                      
                      {/* Existing Photos */}
                      {isEditMode && existingPhotos.map((url, index) => (
                        <div key={`existing-${index}`} className="relative group">
                          <img
                            src={url || "/placeholder.svg"}
                            alt={`Existing ${index + 1}`}
                            className="w-full h-20 object-cover rounded-xl"
                          />
                          <button
                            type="button"
                            onClick={() => removeExistingPhoto(index)}
                            className="absolute -top-2 -right-2 w-6 h-6 bg-red-500 text-white rounded-full flex items-center justify-center text-xs hover:bg-red-600 shadow-sm"
                          >
                            ×
                          </button>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              </div>

              {/* Album Link */}
              <div>
                <Label htmlFor="albumLink" className="text-sm font-medium text-gray-700 mb-1.5 block">
                  Album Link <span className="text-gray-500 font-normal">(optional)</span>
                </Label>
                <div className="relative">
                  <Input
                    id="albumLink"
                    value={albumLink}
                    onChange={(e) => setAlbumLink(e.target.value)}
                    placeholder="https://photos.app/..."
                    className="h-11 pl-4 pr-10 bg-gray-50 border-gray-200 focus:border-primary focus:ring-2 focus:ring-primary/20 rounded-2xl text-base placeholder-gray-400"
                  />
                  <ExternalLink className="absolute right-4 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400 pointer-events-none" />
                </div>
              </div>

              {error && (
                <div className="bg-red-50 border border-red-100 text-red-600 text-sm px-4 py-3 rounded-2xl">
                  {error}
                </div>
              )}
            </form>

            {/* Footer */}
            <div className="px-6 py-4 border-t border-gray-100 bg-gray-50/50">
              <div className="flex justify-end space-x-3">
                <Button
                  type="button"
                  variant="ghost"
                  onClick={handleModalClose}
                  className="px-6 py-2.5 text-gray-600 hover:text-gray-900 hover:bg-gray-100 rounded-2xl transition-apple font-medium"
                >
                  Cancel
                </Button>
                <Button
                  onClick={handleSubmit}
                  disabled={loading}
                  className="px-6 py-2.5 bg-primary hover:bg-primary/90 text-white rounded-2xl transition-apple font-medium disabled:opacity-50 disabled:cursor-not-allowed shadow-sm"
                >
                  {loading ? (
                    <span className="flex items-center">
                      <span className="animate-pulse">{isEditMode ? "Updating..." : "Adding..."}</span>
                    </span>
                  ) : (
                    <span>{isEditMode ? "Update Location" : "Add Location"}</span>
                  )}
                </Button>
              </div>
            </div>
          </div>
        </div>
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
        
        /* Fullscreen styles */
        .fullscreen-map {
          position: fixed !important;
          top: 0 !important;
          left: 0 !important;
          width: 100vw !important;
          height: 100vh !important;
          z-index: 9999 !important;
          border-radius: 0 !important;
        }
      `}</style>
    </>
  )
}
