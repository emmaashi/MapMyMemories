"use client"

import { useState, useEffect } from "react"
import { createClient } from "@/lib/supabase/client"
import { Button } from "@/components/ui/button"
import { Globe2, Download, Settings, LogOut, MapPin, Camera, User, TrendingUp, MoreHorizontal } from 'lucide-react'
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
  const recentLocations = locations.slice(0, 3)
  const thisMonthCount = locations.filter(
    (l) => l.visited_date && new Date(l.visited_date) > new Date(Date.now() - 30 * 24 * 60 * 60 * 1000),
  ).length

  return (
    <div className="min-h-screen bg-gray-50/30">
      {/* Minimal Header */}
      <header className="bg-white/70 backdrop-blur-xl border-b border-gray-200/40 sticky top-0 z-50">
        <div className="max-w-7xl mx-auto px-6 py-3">
          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-8">
              <img src="/logo.png" alt="Map My Memories" className="h-8 w-auto" />

              {/* Compact Stats Bar */}
              <div className="hidden lg:flex items-center space-x-6 text-sm">
                <div className="flex items-center space-x-2 text-gray-600">
                  <MapPin className="h-4 w-4 text-blue-500" />
                  <span className="font-medium text-gray-900">{locations.length}</span>
                  <span className="text-gray-500">places</span>
                </div>
                <div className="w-px h-4 bg-gray-200"></div>
                <div className="flex items-center space-x-2 text-gray-600">
                  <Camera className="h-4 w-4 text-green-500" />
                  <span className="font-medium text-gray-900">{totalPhotos}</span>
                  <span className="text-gray-500">photos</span>
                </div>
                <div className="w-px h-4 bg-gray-200"></div>
                <div className="flex items-center space-x-2 text-gray-600">
                  <Globe2 className="h-4 w-4 text-purple-500" />
                  <span className="font-medium text-gray-900">{countriesCount}</span>
                  <span className="text-gray-500">countries</span>
                </div>
              </div>
            </div>

            <div className="flex items-center space-x-3">
              <Button
                onClick={exportMap}
                variant="ghost"
                size="sm"
                className="hidden sm:flex items-center space-x-2 text-gray-600 hover:text-gray-900 hover:bg-gray-100/50"
              >
                <Download className="h-4 w-4" />
                <span className="text-sm font-medium">Export</span>
              </Button>

              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <Button
                    variant="ghost"
                    size="sm"
                    className="flex items-center space-x-2 text-gray-600 hover:text-gray-900 hover:bg-gray-100/50"
                  >
                    <User className="h-4 w-4" />
                    <span className="hidden sm:inline text-sm font-medium">{user.email?.split("@")[0]}</span>
                    <MoreHorizontal className="h-4 w-4 sm:hidden" />
                  </Button>
                </DropdownMenuTrigger>
                <DropdownMenuContent className="w-56" align="end">
                  <div className="flex items-center justify-start gap-2 p-3">
                    <div className="flex flex-col space-y-1 leading-none">
                      <p className="font-medium text-sm">{user.email}</p>
                      <p className="text-xs text-gray-500">{locations.length} locations mapped</p>
                    </div>
                  </div>
                  <DropdownMenuSeparator />
                  <DropdownMenuItem asChild>
                    <Link href="/settings" className="flex items-center">
                      <Settings className="mr-2 h-4 w-4" />
                      <span>Settings</span>
                    </Link>
                  </DropdownMenuItem>
                  <DropdownMenuItem onClick={exportMap}>
                    <Download className="mr-2 h-4 w-4" />
                    <span>Export Map</span>
                  </DropdownMenuItem>
                  <DropdownMenuSeparator />
                  <DropdownMenuItem onClick={handleSignOut}>
                    <LogOut className="mr-2 h-4 w-4" />
                    <span>Log out</span>
                  </DropdownMenuItem>
                </DropdownMenuContent>
              </DropdownMenu>
            </div>
          </div>
        </div>
      </header>

      {/* Main Content */}
      <div className="max-w-7xl mx-auto px-3 py-6">
        {/* Mobile Stats Cards - Only visible on mobile */}
        <div className="lg:hidden mb-6">
          <div className="grid grid-cols-2 gap-3">
            <div className="bg-white rounded-xl p-4 border border-gray-200/60 shadow-sm">
              <div className="flex items-center justify-between">
                <div>
                  <div className="text-2xl font-semibold text-gray-900">{locations.length}</div>
                  <div className="text-sm text-gray-500">Places</div>
                </div>
                <MapPin className="h-5 w-5 text-blue-500" />
              </div>
            </div>
            <div className="bg-white rounded-xl p-4 border border-gray-200/60 shadow-sm">
              <div className="flex items-center justify-between">
                <div>
                  <div className="text-2xl font-semibold text-gray-900">{totalPhotos}</div>
                  <div className="text-sm text-gray-500">Photos</div>
                </div>
                <Camera className="h-5 w-5 text-green-500" />
              </div>
            </div>
          </div>
        </div>

        {/* Hero Section with Map */}
        <div className="space-y-4">
          {/* Minimal Title Section */}
          <div className="flex items-center justify-between">
            <div>
              <h1 className="text-2xl font-semibold text-gray-900">Your Journey</h1>
              <p className="text-gray-500 text-sm mt-1">
                {locations.length > 0
                  ? `${locations.length} places across ${countriesCount} ${countriesCount === 1 ? "country" : "countries"}`
                  : "Start mapping your adventures"}
              </p>
            </div>

            {/* Activity Indicator */}
            {thisMonthCount > 0 && (
              <div className="hidden sm:flex items-center space-x-2 text-sm text-gray-500 bg-white rounded-full px-3 py-1.5 border border-gray-200/60">
                <div className="w-2 h-2 bg-green-400 rounded-full animate-pulse"></div>
                <span>{thisMonthCount} this month</span>
              </div>
            )}
          </div>

          {/* Map Container - Now the hero element */}
          <div
            className="bg-white rounded-2xl shadow-sm border border-gray-200/60 overflow-hidden"
            style={{ height: "calc(100vh - 220px)", minHeight: "500px" }}
          >
            <MapView locations={locations} onLocationAdded={handleLocationAdded} user={user} />
          </div>
        </div>
      </div>
    </div>
  )
}
