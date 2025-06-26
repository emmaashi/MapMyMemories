"use client"

import type React from "react"
import { useState } from "react"
import { createClient } from "@/lib/supabase/client"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { ArrowLeft, Mail, Lock, Eye, EyeOff } from "lucide-react"
import Link from "next/link"
import { useRouter } from "next/navigation"

export default function LoginForm() {
  const [email, setEmail] = useState("")
  const [password, setPassword] = useState("")
  const [showPassword, setShowPassword] = useState(false)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState("")
  const router = useRouter()
  const supabase = createClient()

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault()
    setLoading(true)
    setError("")

    const { error } = await supabase.auth.signInWithPassword({
      email,
      password,
    })

    if (error) {
      setError(error.message)
    } else {
      router.push("/dashboard")
    }
    setLoading(false)
  }

  return (
    <div className="min-h-screen w-full bg-gradient-to-br from-blue-50 via-indigo-50 to-purple-50 flex items-center justify-center">
      <div className="w-full max-w-md">
        {/* Card Header */}
        <div className="bg-[#f5f7ff] rounded-t-2xl px-8 pt-8 pb-6 flex items-center justify-between">
          <img src="/logo.png" alt="Map My Memories" className="h-10 w-auto" />
          <Link href="/auth/signup">
            <Button className="bg-indigo-500 hover:bg-indigo-600 text-white rounded-full px-6 font-light shadow-md">Sign up →</Button>
          </Link>
        </div>
        {/* Card Body */}
        <div className="bg-white rounded-b-2xl shadow-xl px-8 py-10 border border-gray-100">
          <form onSubmit={handleLogin} className="space-y-6 w-full">
            <div className="space-y-2 w-full">
              <Label htmlFor="email" className="text-base font-medium text-gray-700">Email Address</Label>
              <div className="relative">
                <Mail className="absolute left-3 top-1/2 transform -translate-y-1/2 h-5 w-5 text-gray-400" />
                <Input
                  id="email"
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="john@example.com"
                  required
                  className="pl-10 h-12 border border-gray-200 focus:border-indigo-400 focus:ring-0 rounded-lg w-full min-w-0 bg-white text-gray-900 text-base shadow-sm"
                />
              </div>
            </div>
            <div className="space-y-2 w-full">
              <Label htmlFor="password" className="text-base font-medium text-gray-700">Password</Label>
              <div className="relative">
                <Lock className="absolute left-3 top-1/2 transform -translate-y-1/2 h-5 w-5 text-gray-400" />
                <Input
                  id="password"
                  type={showPassword ? "text" : "password"}
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="Enter your password"
                  required
                  className="pl-10 pr-10 h-12 border border-gray-200 focus:border-indigo-400 focus:ring-0 rounded-lg w-full min-w-0 bg-white text-gray-900 text-base shadow-sm"
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="absolute right-3 top-1/2 transform -translate-y-1/2 text-gray-400 hover:text-indigo-500"
                >
                  {showPassword ? <EyeOff className="h-5 w-5" /> : <Eye className="h-5 w-5" />}
                </button>
              </div>
            </div>
            {error && (
              <div className="text-red-600 text-sm bg-red-50 p-3 rounded-lg border border-red-200">{error}</div>
            )}
            <Button
              type="submit"
              disabled={loading}
              className="w-full h-12 bg-indigo-500 hover:bg-indigo-600 text-white rounded-lg font-medium shadow-md text-base"
            >
              {loading ? "Signing in..." : "Sign In"}
            </Button>
          </form>
          <div className="mt-6 text-center">
            <p className="text-gray-600 text-base">
              {"Don't have an account? "}
              <Link href="/auth/signup" className="text-indigo-600 hover:text-indigo-700 font-medium">Sign up</Link>
            </p>
          </div>
        </div>
      </div>
    </div>
  )
}