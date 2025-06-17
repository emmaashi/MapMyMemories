"use client"

import { useState, useEffect } from "react"
import { createClient } from "@/lib/supabase/client"
import { Button } from "@/components/ui/button"
import { Globe2, Download, Settings, LogOut, MapPin, Camera, Calendar, User, TrendingUp } from "lucide-react"
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

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Modern Header */}
      <header className="bg-white/80 backdrop-blur-sm border-b border-gray-200/50 sticky top-0 z-50">
        <div className="max-w-7xl mx-auto px-6 py-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-3">
              <div className="w-8 h-8 bg-gradient-to-r from-blue-600 to-purple-600 rounded-lg flex items-center justify-center">
                <Globe2 className="h-5 w-5 text-white" />
              </div>
              <span className="text-xl font-light text-gray-900">Map My Memories</span>
            </div>

            <div className="flex items-center space-x-4">
              <Button
                onClick={exportMap}
                variant="outline"
                className="hidden sm:flex items-center space-x-2 rounded-full font-light border-gray-200 hover:bg-gray-50"
              >
                <Download className="h-4 w-4" />
                <span>Export</span>
              </Button>

              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <Button variant="ghost" className="relative h-10 w-10 rounded-full bg-gray-100 hover:bg-gray-200">
                    <User className="h-5 w-5" />
                  </Button>
                </DropdownMenuTrigger>
                <DropdownMenuContent className="w-56" align="end">
                  <div className="flex items-center justify-start gap-2 p-2">
                    <div className="flex flex-col space-y-1 leading-none">
                      <p className="font-light">{user.email}</p>
                      <p className="w-[200px] truncate text-sm text-muted-foreground font-light">
                        {locations.length} locations mapped
                      </p>
                    </div>
                  </div>
                  <DropdownMenuSeparator />
                  <DropdownMenuItem asChild>
                    <Link href="/settings" className="flex items-center font-light">
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
      <div className="max-w-7xl mx-auto px-6 py-8">
        {/* Enhanced Stats Section */}
        <div className="mb-8">
          <div className="flex items-center justify-between mb-6">
            <div>
              <h2 className="text-3xl font-light text-gray-900">Your Journey</h2>
              <p className="text-gray-600 font-light">Track your adventures around the world</p>
            </div>
            <div className="flex items-center space-x-2 text-sm text-gray-500">
              <TrendingUp className="h-4 w-4" />
              <span className="font-light">Updated just now</span>
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
            {/* Locations Card */}
            <div className="relative overflow-hidden bg-gradient-to-br from-blue-50 to-blue-100 rounded-2xl p-6 border border-blue-200/50">
              <div className="flex items-center justify-between mb-4">
                <div className="w-12 h-12 bg-blue-500 rounded-xl flex items-center justify-center shadow-lg">
                  <MapPin className="h-6 w-6 text-white" />
                </div>
                <div className="text-right">
                  <div className="text-2xl font-light text-blue-900">{locations.length}</div>
                  <div className="text-sm font-light text-blue-700">Locations</div>
                </div>
              </div>
              <div className="space-y-1">
                <div className="text-sm font-light text-blue-900">Places Visited</div>
                <div className="text-xs text-blue-600 font-light">
                  {locations.length > 0 ? `Latest: ${recentLocations[0]?.city_name.split(",")[0]}` : "Start exploring!"}
                </div>
              </div>
              <div className="absolute -bottom-2 -right-2 w-16 h-16 bg-blue-200/30 rounded-full"></div>
            </div>

            {/* Photos Card */}
            <div className="relative overflow-hidden bg-gradient-to-br from-green-50 to-emerald-100 rounded-2xl p-6 border border-green-200/50">
              <div className="flex items-center justify-between mb-4">
                <div className="w-12 h-12 bg-green-500 rounded-xl flex items-center justify-center shadow-lg">
                  <Camera className="h-6 w-6 text-white" />
                </div>
                <div className="text-right">
                  <div className="text-2xl font-light text-green-900">{totalPhotos}</div>
                  <div className="text-sm font-light text-green-700">Photos</div>
                </div>
              </div>
              <div className="space-y-1">
                <div className="text-sm font-light text-green-900">Memories Captured</div>
                <div className="text-xs text-green-600 font-light">
                  {totalPhotos > 0
                    ? `${locations.filter((l) => l.photo_urls?.length).length} locations with photos`
                    : "Upload your first photo!"}
                </div>
              </div>
              <div className="absolute -bottom-2 -right-2 w-16 h-16 bg-green-200/30 rounded-full"></div>
            </div>

            {/* Countries Card */}
            <div className="relative overflow-hidden bg-gradient-to-br from-purple-50 to-purple-100 rounded-2xl p-6 border border-purple-200/50">
              <div className="flex items-center justify-between mb-4">
                <div className="w-12 h-12 bg-purple-500 rounded-xl flex items-center justify-center shadow-lg">
                  <Globe2 className="h-6 w-6 text-white" />
                </div>
                <div className="text-right">
                  <div className="text-2xl font-light text-purple-900">{countriesCount}</div>
                  <div className="text-sm font-light text-purple-700">Countries</div>
                </div>
              </div>
              <div className="space-y-1">
                <div className="text-sm font-light text-purple-900">Countries Explored</div>
                <div className="text-xs text-purple-600 font-light">
                  {countriesCount > 0
                    ? `Across ${countriesCount} ${countriesCount === 1 ? "country" : "countries"}`
                    : "Discover new countries!"}
                </div>
              </div>
              <div className="absolute -bottom-2 -right-2 w-16 h-16 bg-purple-200/30 rounded-full"></div>
            </div>

            {/* Recent Activity Card */}
            <div className="relative overflow-hidden bg-gradient-to-br from-orange-50 to-orange-100 rounded-2xl p-6 border border-orange-200/50">
              <div className="flex items-center justify-between mb-4">
                <div className="w-12 h-12 bg-orange-500 rounded-xl flex items-center justify-center shadow-lg">
                  <Calendar className="h-6 w-6 text-white" />
                </div>
                <div className="text-right">
                  <div className="text-2xl font-light text-orange-900">
                    {
                      locations.filter(
                        (l) =>
                          l.visited_date && new Date(l.visited_date) > new Date(Date.now() - 30 * 24 * 60 * 60 * 1000),
                      ).length
                    }
                  </div>
                  <div className="text-sm font-light text-orange-700">This Month</div>
                </div>
              </div>
              <div className="space-y-1">
                <div className="text-sm font-light text-orange-900">Recent Visits</div>
                <div className="text-xs text-orange-600 font-light">
                  {recentLocations.length > 0 && recentLocations[0].visited_date
                    ? `Last visit: ${new Date(recentLocations[0].visited_date).toLocaleDateString()}`
                    : "Add visit dates to track activity"}
                </div>
              </div>
              <div className="absolute -bottom-2 -right-2 w-16 h-16 bg-orange-200/30 rounded-full"></div>
            </div>
          </div>
        </div>

        {/* Map Section with Thin Typography */}
        <div className="bg-white rounded-2xl shadow-sm border border-gray-100 overflow-hidden">
          <MapView locations={locations} onLocationAdded={handleLocationAdded} user={user} />
        </div>
      </div>
    </div>
  )
}
