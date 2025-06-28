"use client"

import type React from "react"

import { useState } from "react"
import { createClient } from "@/lib/supabase/client"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Textarea } from "@/components/ui/textarea"
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog"
import { Upload } from "lucide-react"
import type { User } from "@supabase/supabase-js"

interface AddLocationModalProps {
  user: User
  onClose: () => void
  onLocationAdded: () => void
}

export default function AddLocationModal({ user, onClose, onLocationAdded }: AddLocationModalProps) {
  const [cityName, setCityName] = useState("")
  const [notes, setNotes] = useState("")
  const [albumLink, setAlbumLink] = useState("")
  const [visitedDate, setVisitedDate] = useState("")
  const [photo, setPhoto] = useState<File | null>(null)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState("")
  const supabase = createClient()

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setLoading(true)
    setError("")

    try {
      const latitude = Math.random() * 180 - 90
      const longitude = Math.random() * 360 - 180

      let photoUrl = null

      if (photo) {
        const fileExt = photo.name.split(".").pop()
        const fileName = `${user.id}/${Date.now()}.${fileExt}`

        const { data: uploadData, error: uploadError } = await supabase.storage
          .from("travel-photos")
          .upload(fileName, photo)

        if (uploadError) {
          throw uploadError
        }

        const {
          data: { publicUrl },
        } = supabase.storage.from("travel-photos").getPublicUrl(fileName)

        photoUrl = publicUrl
      }

      // Insert location
      const { error: insertError } = await supabase.from("locations").insert({
        user_id: user.id,
        city_name: cityName,
        latitude,
        longitude,
        notes: notes || null,
        photo_url: photoUrl,
        album_link: albumLink || null,
        visited_date: visitedDate || null,
      })

      if (insertError) {
        throw insertError
      }

      onLocationAdded()
    } catch (err: any) {
      setError(err.message)
    } finally {
      setLoading(false)
    }
  }

  return (
    <Dialog open={true} onOpenChange={onClose}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle className="text-xl font-semibold">Add New Location</DialogTitle>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="space-y-2">
          <div className="space-y-2">
            <Label htmlFor="cityName">City Name *</Label>
            <Input
              id="cityName"
              value={cityName}
              onChange={(e) => setCityName(e.target.value)}
              placeholder="e.g., Paris, France"
              required
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="visitedDate">Date Visited</Label>
            <Input id="visitedDate" type="date" value={visitedDate} onChange={(e) => setVisitedDate(e.target.value)} />
          </div>

          <div className="space-y-2">
            <Label htmlFor="notes">Notes</Label>
            <Textarea
              id="notes"
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              placeholder="Share your memories from this place..."
              rows={3}
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="photo">Photo</Label>
            <div className="flex items-center space-x-2">
              <Input
                id="photo"
                type="file"
                accept="image/*"
                onChange={(e) => setPhoto(e.target.files?.[0] || null)}
                className="hidden"
              />
              <Button
                type="button"
                variant="outline"
                onClick={() => document.getElementById("photo")?.click()}
                className="flex items-center space-x-2"
              >
                <Upload className="h-4 w-4" />
                <span>{photo ? photo.name : "Choose Photo"}</span>
              </Button>
            </div>
          </div>

          <div className="space-y-2">
            <Label htmlFor="albumLink">Album Link</Label>
            <Input
              id="albumLink"
              value={albumLink}
              onChange={(e) => setAlbumLink(e.target.value)}
              placeholder="Link to photo album (optional)"
            />
          </div>

          {error && <div className="text-red-600 text-sm bg-red-50 p-3 rounded-lg">{error}</div>}

          <div className="flex justify-end space-x-2 pt-4">
            <Button type="button" variant="outline" onClick={onClose}>
              Cancel
            </Button>
            <Button type="submit" disabled={loading} className="bg-blue-600 hover:bg-blue-700">
              {loading ? "Adding..." : "Add Location"}
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  )
}
