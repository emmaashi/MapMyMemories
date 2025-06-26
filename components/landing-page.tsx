"use client"

import { useRef, useEffect } from "react"
import Link from "next/link"
import { Button } from "@/components/ui/button"
import { MapPin } from "lucide-react"

export default function LandingPage() {
  const mapContainer = useRef<HTMLDivElement>(null)
  const map = useRef<any>(null)

  useEffect(() => {
    if (!mapContainer.current) return

    const mapboxgl = (window as any).mapboxgl
    if (!mapboxgl) {
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
        style: "mapbox://styles/mapbox/light-v11",
        center: [20, 20],
        zoom: 1.5,
        interactive: true,
        attributionControl: false,
      })

      const demoLocations = [
        { lng: -74.006, lat: 40.7128, color: "#ef4444" },
        { lng: 2.3522, lat: 48.8566, color: "#3b82f6" },
        { lng: 139.6917, lat: 35.6895, color: "#10b981" },
        { lng: -0.1276, lat: 51.5074, color: "#f59e0b" },
        { lng: 151.2093, lat: -33.8688, color: "#8b5cf6" },
      ]

      map.current.on("load", () => {
        demoLocations.forEach((location, index) => {
          const el = document.createElement("div")
          el.className = "demo-marker"
          el.style.cssText = `
            width: 12px;
            height: 12px;
            background: ${location.color};
            border: 2px solid white;
            border-radius: 50%;
            box-shadow: 0 2px 8px rgba(0,0,0,0.2);
            animation: pulse 2s infinite ${index * 0.5}s;
          `

          new mapboxgl.Marker(el).setLngLat([location.lng, location.lat]).addTo(map.current)
        })
      })
    }

    return () => {
      if (map.current) {
        map.current.remove()
      }
    }
  }, [])

  // Custom cursor tracker
  useEffect(() => {
    const updateCursor = (e: MouseEvent) => {
      document.body.style.setProperty('--x', `${e.clientX}px`)
      document.body.style.setProperty('--y', `${e.clientY}px`)
    }
    window.addEventListener('mousemove', updateCursor)
    return () => window.removeEventListener('mousemove', updateCursor)
  }, [])

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 via-indigo-50 to-purple-50">
      <nav className="flex items-center justify-between p-6 max-w-6xl mx-auto">
        <div className="flex items-center space-x-2">
          <img src="/logo.png" alt="Map My Memories" className="h-20 w-auto" />
        </div>
        <div className="flex items-center space-x-3">
          <Link href="/auth/login">
            <Button variant="ghost" className="text-gray-600 hover:text-gray-900 font-light">Log in</Button>
          </Link>
          <Link href="/auth/signup">
            <Button className="bg-gray-900 hover:bg-gray-800 text-white rounded-full px-6 font-light">Sign up →</Button>
          </Link>
        </div>
      </nav>

      <div className="max-w-4xl mx-auto px-6 pt-20 pb-16 text-center">
        <div className="mb-8">
          <h1 className="text-5xl md:text-7xl font-bold text-gray-900 leading-[0.9] mb-6 tracking-tight">
            Your travel stories,<br />all in one place.
          </h1>
          <p className="text-xl text-gray-600 mb-10 max-w-2xl mx-auto leading-relaxed font-light">
            Login to pin your adventures and memories around the world.
          </p>
        </div>

        <div className="relative">
          <div className="bg-white/80 backdrop-blur-sm rounded-2xl p-6 shadow-2xl border border-white/20">
            <div className="relative overflow-hidden rounded-xl h-[75vh]">
              <div ref={mapContainer} className="w-full h-full" />
              <div className="absolute inset-0 bg-gradient-to-t from-black/20 to-transparent pointer-events-none" />
              <div className="absolute bottom-6 left-1/2 transform -translate-x-1/2 text-center text-white pointer-events-none">
                <MapPin className="h-8 w-8 mx-auto mb-2 drop-shadow-lg" />
                <h3 className="text-lg font-light drop-shadow-lg">Interactive World Map</h3>
                <p className="text-sm font-light drop-shadow-lg">Click anywhere to add your memories</p>
              </div>
            </div>
          </div>
        </div>
      </div>

      <style jsx global>{`
  body {
    cursor: none;
    --x: 0px;
    --y: 0px;
  }

  body::after {
    content: '';
    position: fixed;
    top: var(--y);
    left: var(--x);
    width: 120px;
    height: 120px;
    border-radius: 50%;
    pointer-events: none;
    transform: translate(-50%, -50%);
    z-index: 9999;
    background: radial-gradient(
      circle,
      rgba(168, 85, 247, 0.18) 0%,
      rgba(168, 85, 247, 0.08) 50%,
      transparent 100%
    );
  }
`}</style>
    </div>
  )
}