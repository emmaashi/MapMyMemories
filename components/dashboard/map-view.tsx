"use client"

import type React from "react"

import { useRef, useEffect, useState } from "react"
import { createClient } from "@/lib/supabase/client"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Textarea } from "@/components/ui/textarea"
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog"
import { MapPin, ImagePlus, ExternalLink, Search, Layers, Edit3 } from "lucide-react"
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

export default function MapView({ locations, onLocationAdded, user }: MapViewProps) {
  const mapContainer = useRef<HTMLDivElement>(null)
  const map = useRef<any>(null)
  const tempMarker = useRef<any>(null)
  const [showModal, setShowModal] = useState(false)
  const [isEditMode, setIsEditMode] = useState(false)
  const [editingLocation, setEditingLocation] = useState<Location | null>(null)
  const [clickedCoords, setClickedCoords] = useState<{ lat: number; lng: number } | null>(null)
  const [cityName, setCityName] = useState("")
  const [notes, setNotes] = useState("")
  const [albumLink, setAlbumLink] = useState("")
  const [visitedDate, setVisitedDate] = useState("")
  const [photos, setPhotos] = useState<File[]>([])
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState("")
  const [searchQuery, setSearchQuery] = useState("")
  const [searchLoading, setSearchLoading] = useState(false)
  const [currentMapStyle, setCurrentMapStyle] = useState("outdoors-v12")
  const [showMapStyles, setShowMapStyles] = useState(false)
  const supabase = createClient()

  // Reset form when modal opens/closes
  const resetForm = () => {
    setCityName("")
    setNotes("")
    setAlbumLink("")
    setVisitedDate("")
    setPhotos([])
    setClickedCoords(null)
    setError("")
    setIsEditMode(false)
    setEditingLocation(null)
  }

  const handleModalClose = () => {
    setShowModal(false)
    resetForm()
  }

  const populateFormWithLocation = (location: Location) => {
    setCityName(location.city_name)
    setNotes(location.notes || "")
    setAlbumLink(location.album_link || "")
    setVisitedDate(location.visited_date || "")
    setPhotos([]) // Can't pre-populate files, user will need to re-upload if they want to change photos
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

      onLocationAdded() // This will refresh the locations and update all counters
    } catch (err: any) {
      console.error("Error deleting location:", err)
    }
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
  }, [locations])

  const addLocationMarkers = () => {
    if (!map.current) return

    // Remove existing markers
    const existingMarkers = document.querySelectorAll(".custom-marker")
    existingMarkers.forEach((marker) => marker.remove())

    // Add markers for each location
    locations.forEach((location) => {
      const mapboxgl = (window as any).mapboxgl

      // Create custom marker element with beautiful design and animation
      const el = document.createElement("div")
      el.className = "custom-marker"
      el.innerHTML = `
        <div class="relative marker-container">
          <div class="marker-pulse absolute inset-0 w-8 h-8 bg-red-400 rounded-full animate-ping opacity-20"></div>
          <div class="marker-main relative w-8 h-8 bg-gradient-to-br from-red-500 to-pink-600 rounded-full border-2 border-white shadow-lg flex items-center justify-center transform transition-all duration-200 hover:scale-110 cursor-pointer">
            <svg class="w-4 h-4 text-white" fill="currentColor" viewBox="0 0 20 20">
              <path fillRule="evenodd" d="M5.05 4.05a7 7 0 119.9 9.9L10 18.9l-4.95-4.95a7 7 0 010-9.9zM10 11a2 2 0 100-4 2 2 0 000 4z" clipRule="evenodd" />
            </svg>
          </div>
          <div class="absolute -bottom-1 left-1/2 transform -translate-x-1/2 w-2 h-2 bg-gradient-to-br from-red-500 to-pink-600 rotate-45"></div>
        </div>
      `

      // Create modern popup with Vercel-inspired design
      const createPhotoCarousel = (photos: string[]) => {
        if (!photos || photos.length === 0) return ""

        if (photos.length === 1) {
          return `
            <div class="relative mb-6 group">
              <img src="${photos[0]}" alt="${location.city_name}" class="w-full h-48 object-cover rounded-xl" />
              <div class="absolute inset-0 bg-gradient-to-t from-black/20 to-transparent rounded-xl opacity-0 group-hover:opacity-100 transition-opacity duration-200"></div>
            </div>
          `
        }

        return `
          <div class="relative mb-6">
            <div class="photo-carousel overflow-hidden rounded-xl">
              <div class="photo-container flex transition-transform duration-300" style="width: ${photos.length * 100}%">
                ${photos
                  .map(
                    (url, index) =>
                      `<img src="${url}" alt="${location.city_name} ${index + 1}" class="w-full h-48 object-cover flex-shrink-0" style="width: ${100 / photos.length}%" />`,
                  )
                  .join("")}
              </div>
            </div>
            <button class="absolute left-3 top-1/2 transform -translate-y-1/2 w-8 h-8 bg-black/60 backdrop-blur-sm text-white rounded-full flex items-center justify-center hover:bg-black/80 transition-all duration-200 photo-nav-btn" data-direction="prev">
              <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M15 19l-7-7 7-7"></path>
              </svg>
            </button>
            <button class="absolute right-3 top-1/2 transform -translate-y-1/2 w-8 h-8 bg-black/60 backdrop-blur-sm text-white rounded-full flex items-center justify-center hover:bg-black/80 transition-all duration-200 photo-nav-btn" data-direction="next">
              <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M9 5l7 7-7 7"></path>
              </svg>
            </button>
            <div class="absolute bottom-3 left-1/2 transform -translate-x-1/2 flex space-x-2">
              ${photos
                .map(
                  (_, index) =>
                    `<div class="w-2 h-2 rounded-full bg-white/60 backdrop-blur-sm photo-indicator transition-all duration-200 ${index === 0 ? "bg-white scale-110" : ""}" data-index="${index}"></div>`,
                )
                .join("")}
            </div>
          </div>
        `
      }

      const popup = new mapboxgl.Popup({
        offset: 25,
        className: "modern-popup",
        maxWidth: "380px",
        closeButton: false,
      }).setHTML(`
        <div class="popup-container bg-white rounded-2xl overflow-hidden shadow-2xl border border-gray-100">
          <!-- Header with close button -->
          <div class="relative">
            <button class="close-popup-btn absolute top-4 right-4 z-30 w-8 h-8 bg-white/90 backdrop-blur-sm rounded-full flex items-center justify-center hover:bg-white transition-all duration-200 shadow-sm">
              <svg class="w-4 h-4 text-gray-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M6 18L18 6M6 6l12 12"></path>
              </svg>
            </button>
            
            <div class="p-6 pb-4">
              ${createPhotoCarousel(location.photo_urls || [])}
              
              <!-- Location Title -->
              <div class="mb-4">
                <h3 class="text-xl font-semibold text-gray-900 leading-tight mb-1">${location.city_name}</h3>
                <div class="flex items-center text-gray-500">
                  <svg class="w-4 h-4 mr-1.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M17.657 16.657L13.414 20.9a1.998 1.998 0 01-2.827 0l-4.244-4.243a8 8 0 1111.314 0z"></path>
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M15 11a3 3 0 11-6 0 3 3 0 016 0z"></path>
                  </svg>
                  <span class="text-sm">Memory location</span>
                </div>
              </div>
              
              <!-- Visit Date -->
              ${
                location.visited_date
                  ? `
                <div class="flex items-center mb-4 p-3 bg-gray-50 rounded-xl">
                  <div class="w-8 h-8 bg-blue-100 rounded-lg flex items-center justify-center mr-3">
                    <svg class="w-4 h-4 text-blue-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z"></path>
                    </svg>
                  </div>
                  <div>
                    <p class="text-sm font-medium text-gray-900">Visited</p>
                    <p class="text-sm text-gray-600">${new Date(location.visited_date).toLocaleDateString("en-US", {
                      year: "numeric",
                      month: "long",
                      day: "numeric",
                    })}</p>
                  </div>
                </div>
              `
                  : ""
              }
              
              <!-- Notes -->
              ${
                location.notes
                  ? `
                <div class="mb-4">
                  <div class="flex items-center mb-2">
                    <svg class="w-4 h-4 text-gray-500 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z"></path>
                    </svg>
                    <span class="text-sm font-medium text-gray-700">Memory</span>
                  </div>
                  <p class="text-gray-700 leading-relaxed text-sm bg-gray-50 p-3 rounded-xl">${location.notes}</p>
                </div>
              `
                  : ""
              }
              
              <!-- Album Link -->
              ${
                location.album_link
                  ? `
                <div class="mb-6">
                  <a href="${location.album_link}" target="_blank" class="inline-flex items-center px-4 py-2 bg-blue-50 hover:bg-blue-100 text-blue-700 rounded-xl transition-colors duration-200 text-sm font-medium">
                    <svg class="w-4 h-4 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M10 6H6a2 2 0 00-2 2v10a2 2 0 002 2h10a2 2 0 002-2v-4M14 4h6m0 0v6m0-6L10 14"></path>
                    </svg>
                    View Full Album
                  </a>
                </div>
              `
                  : ""
              }
            </div>
            
            <!-- Action Buttons -->
            <div class="border-t border-gray-100 p-4 bg-gray-50/50">
              <div class="flex space-x-2">
                <button class="edit-location-btn flex-1 inline-flex items-center justify-center px-4 py-2.5 bg-white border border-gray-200 text-gray-700 rounded-xl hover:bg-gray-50 transition-all duration-200 text-sm font-medium" data-location-id="${location.id}">
                  <svg class="w-4 h-4 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z"></path>
                  </svg>
                  Edit
                </button>
                <button class="delete-location-btn inline-flex items-center justify-center px-4 py-2.5 bg-red-50 border border-red-200 text-red-700 rounded-xl hover:bg-red-100 transition-all duration-200 text-sm font-medium" data-location-id="${location.id}">
                  <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16"></path>
                  </svg>
                </button>
              </div>
            </div>
          </div>
        </div>
      `)

      // Create the marker and add click event
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

        // Close any existing popups
        const existingPopups = document.querySelectorAll(".mapboxgl-popup")
        existingPopups.forEach((popup) => popup.remove())

        // Add the popup to the marker and open it
        marker.setPopup(popup)
        popup.addTo(map.current)

        // Setup popup event handlers after it's added
        setTimeout(() => {
          setupPopupHandlers(popup, location)
        }, 100)
      })
    })

    // Add this helper function after the locations.forEach loop:
    const setupPopupHandlers = (popup: any, location: Location) => {
      let currentPhotoIndex = 0
      const photoContainer = document.querySelector(".photo-container") as HTMLElement
      const indicators = document.querySelectorAll(".photo-indicator")
      const navButtons = document.querySelectorAll(".photo-nav-btn")
      const closeBtn = document.querySelector(".close-popup-btn")
      const deleteBtn = document.querySelector(".delete-location-btn")
      const editBtn = document.querySelector(".edit-location-btn")

      // Close button handler
      closeBtn?.addEventListener("click", (e) => {
        e.stopPropagation()
        popup.remove()
      })

      // Delete button handler
      deleteBtn?.addEventListener("click", (e) => {
        e.stopPropagation()
        const locationId = (deleteBtn as HTMLElement).dataset.locationId
        if (locationId) {
          popup.remove()
          handleDeleteLocation(locationId)
        }
      })

      // Edit button handler
      editBtn?.addEventListener("click", (e) => {
        e.stopPropagation()
        const locationId = (editBtn as HTMLElement).dataset.locationId
        const locationToEdit = locations.find((loc) => loc.id === locationId)
        if (locationToEdit) {
          popup.remove()
          resetForm()
          setIsEditMode(true)
          setEditingLocation(locationToEdit)
          populateFormWithLocation(locationToEdit)
          setShowModal(true)
        }
      })

      const updateCarousel = () => {
        if (photoContainer) {
          photoContainer.style.transform = `translateX(-${(currentPhotoIndex * 100) / (location.photo_urls?.length || 1)}%)`
        }
        indicators.forEach((indicator, index) => {
          if (index === currentPhotoIndex) {
            indicator.classList.add("bg-white", "scale-110")
            indicator.classList.remove("bg-white/60")
          } else {
            indicator.classList.remove("bg-white", "scale-110")
            indicator.classList.add("bg-white/60")
          }
        })
      }

      navButtons.forEach((button) => {
        button.addEventListener("click", (e) => {
          e.stopPropagation()
          const direction = (button as HTMLElement).dataset.direction
          const totalPhotos = location.photo_urls?.length || 1

          if (direction === "next") {
            currentPhotoIndex = (currentPhotoIndex + 1) % totalPhotos
          } else {
            currentPhotoIndex = currentPhotoIndex === 0 ? totalPhotos - 1 : currentPhotoIndex - 1
          }
          updateCarousel()
        })
      })

      indicators.forEach((indicator, index) => {
        indicator.addEventListener("click", (e) => {
          e.stopPropagation()
          currentPhotoIndex = index
          updateCarousel()
        })
      })
    }
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

      if (isEditMode && editingLocation) {
        // Update existing location
        const updateData: any = {
          city_name: cityName,
          notes: notes || null,
          album_link: albumLink || null,
          visited_date: visitedDate || null,
        }

        // Only update photos if new ones were uploaded
        if (photoUrls.length > 0) {
          // Combine existing photos with new ones
          const existingPhotos = editingLocation.photo_urls || []
          updateData.photo_urls = [...existingPhotos, ...photoUrls]
        }

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

  return (
    <>
      <div className="relative">
        {/* Transparent Search Bar */}
        <div className="absolute top-4 left-4 z-10">
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
          <p className="text-xs text-white/80 font-light mt-2 ml-3 drop-shadow-sm">
            {locations.length} locations mapped • Click anywhere to add a memory
          </p>
        </div>

        {/* Map Style Toggle */}
        <div className="absolute top-4 right-4 z-10">
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
        </div>

        <div ref={mapContainer} className="w-full h-[600px] rounded-xl" />
      </div>

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

                  {isEditMode && editingLocation?.photo_urls && editingLocation.photo_urls.length > 0 && (
                    <div className="mt-3">
                      <p className="text-sm text-gray-600 font-light mb-2">Existing Photos:</p>
                      <div className="grid grid-cols-3 gap-2">
                        {editingLocation.photo_urls.map((url, index) => (
                          <img
                            key={index}
                            src={url || "/placeholder.svg"}
                            alt={`Existing ${index + 1}`}
                            className="w-full h-16 object-cover rounded-lg"
                          />
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
        .modern-popup .mapboxgl-popup-content {
          padding: 0 !important;
          border-radius: 16px !important;
          box-shadow: 0 25px 50px -12px rgba(0, 0, 0, 0.25) !important;
          border: none !important;
          background: transparent !important;
          max-width: 380px !important;
        }
        .modern-popup .mapboxgl-popup-tip {
          border-top-color: white !important;
        }
        .popup-container {
          animation: popupSlideIn 0.3s ease-out;
        }
        @keyframes popupSlideIn {
          from {
            opacity: 0;
            transform: translateY(-10px) scale(0.95);
          }
          to {
            opacity: 1;
            transform: translateY(0) scale(1);
          }
        }
        .marker-container:hover .marker-pulse {
          animation-duration: 1s;
        }
        .photo-container {
          transition: transform 0.3s ease-in-out;
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
