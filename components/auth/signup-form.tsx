"use client"

import type React from "react"
import { useState } from "react"
import { createClient } from "@/lib/supabase/client"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { ArrowLeft, Eye, EyeOff } from "lucide-react"
import Link from "next/link"
import { useRouter } from "next/navigation"

export default function SignupForm() {
  const [fullName, setFullName] = useState("")
  const [email, setEmail] = useState("")
  const [password, setPassword] = useState("")
  const [confirmPassword, setConfirmPassword] = useState("")
  const [showPassword, setShowPassword] = useState(false)
  const [showConfirmPassword, setShowConfirmPassword] = useState(false)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState("")
  const router = useRouter()
  const supabase = createClient()

  const handleSignup = async (e: React.FormEvent) => {
    e.preventDefault()
    setLoading(true)
    setError("")

    if (!fullName.trim()) {
      setError("Please enter your full name")
      setLoading(false)
      return
    }

    if (password !== confirmPassword) {
      setError("Passwords do not match")
      setLoading(false)
      return
    }

    if (password.length < 6) {
      setError("Password must be at least 6 characters")
      setLoading(false)
      return
    }

    try {
      const { data: authData, error: authError } = await supabase.auth.signUp({
        email,
        password,
      })

      if (authError) {
        throw authError
      }

      if (authData.user) {
        const { error: profileError } = await supabase.from("user_profiles").insert({
          id: authData.user.id,
          full_name: fullName.trim(),
          created_at: new Date().toISOString(),
          updated_at: new Date().toISOString(),
        })

        if (profileError) {
          console.error("Error creating user profile:", profileError)
        }
      }

      router.push('/dashboard')
    } catch (err: any) {
      setError(err.message)
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="min-h-screen w-full bg-gradient-to-br from-blue-50 via-indigo-50 to-purple-50 flex flex-col">
      {/* Minimal Header */}
      <header className="absolute top-0 left-0 right-0 p-6 z-10">
        <div className="max-w-6xl mx-auto flex items-center justify-between">
          <Link href="/" className="group">
            <ArrowLeft className="h-5 w-5 text-gray-600 group-hover:text-gray-900 transition-colors" />
          </Link>
          <Link href="/auth/login" className="text-sm text-gray-600 hover:text-gray-900 transition-colors">
            Sign in
          </Link>
        </div>
      </header>

      {/* Main Content - Centered */}
      <div className="flex-1 flex items-center justify-center px-6 py-12">
        <div className="w-full max-w-sm">
          {/* Logo */}
          <div className="text-center mb-10">
            <img src="/logo.png" alt="Map My Memories" className="h-12 w-auto mx-auto mb-8" />
            <h1 className="text-4xl font-semibold text-gray-900 mb-2">Create account</h1>
            <p className="text-gray-600">Start your journey today</p>
          </div>

          {/* Form */}
          <form onSubmit={handleSignup} className="space-y-5">
            <div className="space-y-2">
              <Label htmlFor="fullName" className="text-sm font-medium text-gray-700">
                Full name
              </Label>
              <Input
                id="fullName"
                value={fullName}
                onChange={(e) => setFullName(e.target.value)}
                placeholder="John Doe"
                required
                className="h-12 bg-white/30 border-none focus:ring-2 focus:ring-primary/20 rounded-xl text-base transition-all placeholder-gray-400 shadow-none"
                autoFocus
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="email" className="text-sm font-medium text-gray-700">
                Email
              </Label>
              <Input
                id="email"
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="name@example.com"
                required
                className="h-12 bg-white/30 border-none focus:ring-2 focus:ring-primary/20 rounded-xl text-base transition-all placeholder-gray-400 shadow-none"
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="password" className="text-sm font-medium text-gray-700">
                Password
              </Label>
              <div className="relative">
                <Input
                  id="password"
                  type={showPassword ? "text" : "password"}
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="Create a password"
                  required
                  className="h-12 pr-12 bg-white/30 border-none focus:ring-2 focus:ring-primary/20 rounded-xl text-base transition-all placeholder-gray-400 shadow-none"
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="absolute right-3 top-1/2 -translate-y-1/2 p-1 text-gray-400 hover:text-gray-600 transition-colors"
                >
                  {showPassword ? <EyeOff className="h-5 w-5" /> : <Eye className="h-5 w-5" />}
                </button>
              </div>
            </div>

            <div className="space-y-2">
              <Label htmlFor="confirmPassword" className="text-sm font-medium text-gray-700">
                Confirm password
              </Label>
              <div className="relative">
                <Input
                  id="confirmPassword"
                  type={showConfirmPassword ? "text" : "password"}
                  value={confirmPassword}
                  onChange={(e) => setConfirmPassword(e.target.value)}
                  placeholder="Confirm your password"
                  required
                  className="h-12 pr-12 bg-white/30 border-none focus:ring-2 focus:ring-primary/20 rounded-xl text-base transition-all placeholder-gray-400 shadow-none"
                />
                <button
                  type="button"
                  onClick={() => setShowConfirmPassword(!showConfirmPassword)}
                  className="absolute right-3 top-1/2 -translate-y-1/2 p-1 text-gray-400 hover:text-gray-600 transition-colors"
                >
                  {showConfirmPassword ? <EyeOff className="h-5 w-5" /> : <Eye className="h-5 w-5" />}
                </button>
              </div>
            </div>

            {error && (
              <div className="text-red-600 text-sm">
                {error}
              </div>
            )}

            <Button
              type="submit"
              disabled={loading}
              className="w-full h-12 bg-slate-900 hover:bg-slate-800 text-white font-medium rounded-xl transition-all disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {loading ? "Creating account..." : "Create account"}
            </Button>

            <p className="text-xs text-gray-500 text-center">
              By creating an account, you agree to our{" "}
              <Link href="/terms" className="text-primary hover:text-primary/80 transition-colors">
                Terms
              </Link>{" "}
              and{" "}
              <Link href="/privacy" className="text-primary hover:text-primary/80 transition-colors">
                Privacy Policy
              </Link>
            </p>
          </form>

          {/* Footer */}
          <div className="mt-10 text-center">
            <p className="text-sm text-gray-600">
              Already have an account?{" "}
              <Link href="/auth/login" className="text-primary hover:text-primary/80 transition-colors font-medium">
                Sign in
              </Link>
            </p>
          </div>
        </div>
      </div>
    </div>
  )
}