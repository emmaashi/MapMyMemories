"use client"

import { useState, useEffect } from "react"
import { createClient } from "@/lib/supabase/client"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { User, Phone, ArrowLeft, Check } from "lucide-react"
import Link from "next/link"
import type { User as SupabaseUser } from "@supabase/supabase-js"

interface UserProfile {
  id: string
  full_name?: string
  phone_number?: string
  date_of_birth?: string
  current_location?: string
  emergency_contact_name?: string
  emergency_contact_phone?: string
}

interface SettingsPageProps {
  user: SupabaseUser
}

export default function SettingsPage({ user }: SettingsPageProps) {
  const [profile, setProfile] = useState<UserProfile>({
    id: user.id,
    full_name: "",
    phone_number: "",
    date_of_birth: "",
    current_location: "",
    emergency_contact_name: "",
    emergency_contact_phone: "",
  })
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [lastSaved, setLastSaved] = useState<Date | null>(null)
  const supabase = createClient()

  useEffect(() => {
    fetchProfile()
  }, [])

  const fetchProfile = async () => {
    setLoading(true)
    const { data, error } = await supabase.from("user_profiles").select("*").eq("id", user.id).single()

    if (data) {
      setProfile(data)
    } else if (error && error.code !== "PGRST116") {
      // PGRST116 is "not found" error, which is expected for new users
      console.error("Error fetching profile:", error)
    }
    setLoading(false)
  }

  const autoSave = async (updatedProfile: UserProfile) => {
    setSaving(true)

    const { error } = await supabase.from("user_profiles").upsert({
      id: user.id,
      ...updatedProfile,
      updated_at: new Date().toISOString(),
    })

    if (error) {
      console.error("Error updating profile:", error)
    } else {
      setLastSaved(new Date())
    }

    setSaving(false)
  }

  const handleInputChange = (field: keyof UserProfile, value: string) => {
    const updatedProfile = { ...profile, [field]: value }
    setProfile(updatedProfile)

    // Auto-save after 1 second of no typing
    setTimeout(() => {
      autoSave(updatedProfile)
    }, 1000)
  }

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <div className="w-8 h-8 border-4 border-blue-600 border-t-transparent rounded-full animate-spin mx-auto mb-4"></div>
          <p className="text-gray-600 font-light">Loading your profile...</p>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Simplified Header */}
      <header className="bg-white border-b border-gray-200">
        <div className="max-w-4xl mx-auto px-6 py-6">
          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-4">
              <Link href="/dashboard">
                <Button variant="ghost" size="sm" className="flex items-center space-x-2">
                  <ArrowLeft className="h-4 w-4" />
                </Button>
              </Link>
              <div>
                <div className="flex items-center space-x-2">
                  {saving && (
                    <div className="flex items-center space-x-1 text-blue-600">
                      <div className="w-3 h-3 border-2 border-blue-600 border-t-transparent rounded-full animate-spin"></div>
                      <span className="text-xs font-light">Saving...</span>
                    </div>
                  )}
                  {lastSaved && !saving && (
                    <div className="flex items-center space-x-1 text-green-600">
                      <Check className="h-3 w-3" />
                      <span className="text-xs font-light">Saved {lastSaved.toLocaleTimeString()}</span>
                    </div>
                  )}
                </div>
              </div>
            </div>
          </div>
        </div>
      </header>

      {/* Main Content */}
      <div className="max-w-4xl mx-auto px-6 py-8">
        <div className="space-y-8">
          {/* Personal Information */}
          <Card className="border border-gray-200 shadow-sm">
            <CardHeader className="pb-6">
              <div className="flex items-center space-x-3">
                <div className="w-8 h-8 bg-blue-100 rounded-lg flex items-center justify-center">
                  <User className="h-5 w-5 text-blue-600" />
                </div>
                <div>
                  <CardTitle className="text-xl font-light text-gray-900">Personal Information</CardTitle>
                  <CardDescription className="text-gray-600 font-light">Update your personal details</CardDescription>
                </div>
              </div>
            </CardHeader>
            <CardContent className="space-y-6">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div className="space-y-2">
                  <Label htmlFor="fullName" className="text-gray-900 font-light">
                    Full Name
                  </Label>
                  <Input
                    id="fullName"
                    value={profile.full_name || ""}
                    onChange={(e) => handleInputChange("full_name", e.target.value)}
                    placeholder="Emma Shi"
                    className="h-12 border-gray-200 font-light"
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="email" className="text-gray-900 font-light">
                    Email Address
                  </Label>
                  <Input
                    id="email"
                    value={user.email || ""}
                    disabled
                    className="h-12 border-gray-200 bg-gray-50 font-light"
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="phone" className="text-gray-900 font-light">
                    Phone Number
                  </Label>
                  <Input
                    id="phone"
                    value={profile.phone_number || ""}
                    onChange={(e) => handleInputChange("phone_number", e.target.value)}
                    placeholder="6476310864"
                    className="h-12 border-gray-200 font-light"
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="dateOfBirth" className="text-gray-900 font-light">
                    Date of Birth
                  </Label>
                  <Input
                    id="dateOfBirth"
                    type="date"
                    value={profile.date_of_birth || ""}
                    onChange={(e) => handleInputChange("date_of_birth", e.target.value)}
                    className="h-12 border-gray-200 font-light"
                  />
                </div>
              </div>
              <div className="space-y-2">
                <Label htmlFor="currentLocation" className="text-gray-900 font-light">
                  Current Location
                </Label>
                <Input
                  id="currentLocation"
                  value={profile.current_location || ""}
                  onChange={(e) => handleInputChange("current_location", e.target.value)}
                  placeholder="Toronto, ON"
                  className="h-12 border-gray-200 font-light"
                />
              </div>
            </CardContent>
          </Card>

          {/* Emergency Contact */}
          <Card className="border border-gray-200 shadow-sm">
            <CardHeader className="pb-6">
              <div className="flex items-center space-x-3">
                <div className="w-8 h-8 bg-red-100 rounded-lg flex items-center justify-center">
                  <Phone className="h-5 w-5 text-red-600" />
                </div>
                <div>
                  <CardTitle className="text-xl font-light text-gray-900">Emergency Contact</CardTitle>
                  <CardDescription className="text-gray-600 font-light">
                    Who should we contact in case of emergency
                  </CardDescription>
                </div>
              </div>
            </CardHeader>
            <CardContent className="space-y-6">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div className="space-y-2">
                  <Label htmlFor="emergencyName" className="text-gray-900 font-light">
                    Emergency Contact Name
                  </Label>
                  <Input
                    id="emergencyName"
                    value={profile.emergency_contact_name || ""}
                    onChange={(e) => handleInputChange("emergency_contact_name", e.target.value)}
                    placeholder="Xiaoyan Zhai"
                    className="h-12 border-gray-200 font-light"
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="emergencyPhone" className="text-gray-900 font-light">
                    Emergency Contact Phone
                  </Label>
                  <Input
                    id="emergencyPhone"
                    value={profile.emergency_contact_phone || ""}
                    onChange={(e) => handleInputChange("emergency_contact_phone", e.target.value)}
                    placeholder="4165093800"
                    className="h-12 border-gray-200 font-light"
                  />
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Auto-save notice */}
          <div className="text-center text-sm text-gray-500 font-light">
            Changes are automatically saved as you type
          </div>
        </div>
      </div>
    </div>
  )
}
