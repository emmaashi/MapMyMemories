"use client"

import { useState, useEffect } from "react"
import { createClient } from "@/lib/supabase/client"
import { Button } from "@/components/ui/button"
import { Globe2, Download, Settings, LogOut, MapPin, Camera, Map, Plus } from 'lucide-react'
import { useRouter } from "next/navigation"
import type { User as SupabaseUser } from "@supabase/supabase-js"
import MapView from "./map-view"
import Link from "next/link"
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"

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

interface DashboardProps {
  user: SupabaseUser
}

export default function Dashboard({ user }: DashboardProps) {
  const [locations, setLocations] = useState<Location[]>([])
  const [loading, setLoading] = useState(true)
  const router = useRouter()
  const supabase = createClient()

  useEffect(() => {
    fetchLocations()
  }, [])

  const fetchLocations = async () => {
    const { data, error } = await supabase
      .from("locations")
      .select("*")
      .eq("user_id", user.id)
      .order("visited_date", { ascending: false })

    if (error) {
      console.error("Error fetching locations:", error)
    } else {
      setLocations(data || [])
    }
    setLoading(false)
  }

  const handleSignOut = async () => {
    await supabase.auth.signOut()
    router.push("/")
  }

  const handleLocationAdded = () => {
    fetchLocations()
  }

  const exportMap = () => {
    if ((window as any).map?.current) {
      const canvas = (window as any).map.current.getCanvas()
      const link = document.createElement("a")
      link.download = "my-travel-map.png"
      link.href = canvas.toDataURL()
      link.click()
    }
  }

  const totalPhotos = locations.reduce((sum, location) => sum + (location.photo_urls?.length || 0), 0)
  const countriesCount = new Set(locations.map((l) => l.city_name.split(",").pop()?.trim())).size

  return (
    <div className="h-screen flex flex-col bg-white overflow-hidden">
      <nav className="bg-white/72 backdrop-blur-apple border-b border-gray-200/50 z-50">
        <div className="px-4 sm:px-6 h-14 flex items-center justify-between">
          <Link href="/" className="flex items-center">
            <img src="/logo.png" alt="Map My Memories" className="h-8 w-auto" />
          </Link>

          <div className="hidden sm:flex items-center space-x-6 text-sm">
            <div className="flex items-center space-x-2">
              <MapPin className="h-4 w-4 text-primary" />
              <span className="font-semibold text-gray-900">{locations.length}</span>
              <span className="text-gray-500">places</span>
            </div>
            <div className="flex items-center space-x-2">
              <Camera className="h-4 w-4 text-primary" />
              <span className="font-semibold text-gray-900">{totalPhotos}</span>
              <span className="text-gray-500">photos</span>
            </div>
            <div className="flex items-center space-x-2">
              <Globe2 className="h-4 w-4 text-primary" />
              <span className="font-semibold text-gray-900">{countriesCount}</span>
              <span className="text-gray-500">countries</span>
            </div>
          </div>

          <div className="flex items-center space-x-2">
            <Button
              onClick={exportMap}
              variant="ghost"
              size="sm"
              className="hidden sm:flex text-gray-600 hover:text-gray-900 hover:bg-gray-100/60 rounded-xl transition-apple"
            >
              <Download className="h-4 w-4" />
              <span className="ml-2 hidden md:inline">Export</span>
            </Button>
            
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button
                  variant="ghost"
                  size="sm"
                  className="h-9 w-9 p-0 hover:bg-gray-100/60 rounded-xl transition-apple"
                >
                  <div className="h-7 w-7 rounded-full bg-primary text-white flex items-center justify-center text-xs font-medium">
                    {user.email?.charAt(0).toUpperCase()}
                  </div>
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent className="w-56 rounded-2xl" align="end">
                <div className="px-3 py-2">
                  <p className="text-sm font-medium text-gray-900">{user.email}</p>
                  <p className="text-xs text-gray-500 mt-0.5">{locations.length} locations mapped</p>
                </div>
                <DropdownMenuSeparator />
                <DropdownMenuItem asChild className="rounded-lg">
                  <Link href="/settings" className="flex items-center">
                    <Settings className="mr-2 h-4 w-4" />
                    <span>Settings</span>
                  </Link>
                </DropdownMenuItem>
                <DropdownMenuItem onClick={exportMap} className="rounded-lg">
                  <Download className="mr-2 h-4 w-4" />
                  <span>Export Map</span>
                </DropdownMenuItem>
                <DropdownMenuSeparator />
                <DropdownMenuItem onClick={handleSignOut} className="rounded-lg text-red-600">
                  <LogOut className="mr-2 h-4 w-4" />
                  <span>Sign out</span>
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
          </div>
        </div>
      </nav>

<main className="relative overflow-hidden bg-gray-50" style={{ height: "calc(100vh - 56px)" }}>
        {loading ? (
          <div className="flex items-center justify-center h-full">
            <div className="text-center">
              <Map className="h-12 w-12 text-primary animate-pulse mx-auto mb-4" />
              <p className="text-gray-600">Loading your map...</p>
            </div>
          </div>
        ) : (
          <div className="absolute inset-0 h-full">
            <MapView 
              locations={locations} 
              onLocationAdded={handleLocationAdded} 
              user={user} 
            />
          </div>
        )}
      </main>
    </div>
  )
}