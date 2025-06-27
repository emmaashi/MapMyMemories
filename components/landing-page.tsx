"use client"

import { useRef, useEffect } from "react"
import Link from "next/link"
import { Button } from "@/components/ui/button"
import { ArrowRight, MapPin, Camera, Globe, Sparkles } from "lucide-react"

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

  useEffect(() => {
    const updateCursor = (e: MouseEvent) => {
      document.body.style.setProperty("--x", `${e.clientX}px`)
      document.body.style.setProperty("--y", `${e.clientY}px`)
    }
    window.addEventListener("mousemove", updateCursor)
    return () => window.removeEventListener("mousemove", updateCursor)
  }, [])

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 via-indigo-50 to-purple-50 relative overflow-hidden">
      <header className="fixed top-6 left-1/2 transform -translate-x-1/2 z-50">
        <div className="flex items-center justify-between w-fit px-6 py-2 bg-white/20 backdrop-blur-xl shadow-md rounded-full border border-gray-200 space-x-8 text-sm font-medium">
          <div className="flex items-center space-x-2">
            <img src="/logo.png" alt="Map My Memories" className="h-8 w-auto" />
          </div>
          <nav className="hidden md:flex items-center space-x-6 text-slate-700">
            {/* Add future nav links here */}
          </nav>
          <div className="flex items-center space-x-3">
            <Link href="/auth/login" className="text-slate-600 hover:text-slate-900">
              Log in
            </Link>
            <Link href="/auth/signup">
              <Button className="bg-black text-white hover:bg-gray-900 px-5 py-2 rounded-full">
                Sign up <ArrowRight className="ml-1 h-4 w-4" />
              </Button>
            </Link>
          </div>
        </div>
      </header>

      {/* Hero */}
      <div className="text-center px-6 pt-36 max-w-4xl mx-auto">
        <div className="inline-flex mt-10 items-center rounded-full bg-blue-50 px-4 py-2 text-sm font-medium text-blue-700 ring-1 ring-blue-700/10 mb-6">
          <Sparkles className="mr-2 h-4 w-4" />
          Beautiful travel journaling
        </div>
        <h1 className="text-7xl sm:text-7xl font-bold text-slate-900 leading-tight">
          Your travel stories,
          <br />all in one place.
        </h1>
        <p className="mt-6 text-lg text-slate-600 leading-relaxed max-w-xl mx-auto">
          Pin your adventures, upload photos, and build a stunning map of memories that lasts forever.
        </p>
        <div className="mt-8 flex flex-col sm:flex-row justify-center gap-4">
          <Link href="/auth/signup">
            <Button size="lg" className="bg-slate-900 text-white hover:bg-slate-800 rounded-md px-6">
              Start mapping
              <ArrowRight className="ml-2 h-5 w-5" />
            </Button>
          </Link>
        </div>
      </div>

      {/* Map Section */}
      <div className="relative mt-24 max-w-6xl mx-auto rounded-3xl overflow-hidden shadow-2xl ring-1 ring-slate-900/10">
  <div ref={mapContainer} className="h-[75vh] w-full" />
  {/* Floating overlay */}
  <div className="absolute bottom-6 left-1/2 transform -translate-x-1/2 text-center text-white pointer-events-none z-10">
    <MapPin className="h-8 w-8 mx-auto mb-2 drop-shadow-lg" />
    <h3 className="text-lg font-light drop-shadow-lg">Interactive World Map</h3>
    <p className="text-sm font-light drop-shadow-lg">Click anywhere to add your memories</p>
  </div>
</div>
    </div>
  )
}