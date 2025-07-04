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
    <div className="min-h-screen w-full bg-gradient-to-br from-blue-50 via-indigo-50 to-purple-50 flex flex-col inset-0">
      <header className="absolute top-0 left-0 right-0 p-6 z-10">
        <div className="max-w-6xl mx-auto flex items-center justify-between">
          <Link href="/" className="group">
            <ArrowLeft className="h-5 w-5 text-gray-600 group-hover:text-gray-900 transition-colors" />
          </Link>
          <Link href="/auth/signup" className="text-sm text-gray-600 hover:text-gray-900 transition-colors">
            Sign up
          </Link>
        </div>
      </header>

      {/* Main Content - Centered */}
      <div className="flex-1 flex items-center justify-center px-6">
        <div className="w-full max-w-sm">
          {/* Logo */}
          <div className="text-center mb-12">
            <img src="/logo.png" alt="Map My Memories" className="h-12 w-auto mx-auto mb-8" />
            <h1 className="text-4xl font-semibold text-gray-900 mb-2">Welcome back</h1>
            <p className="text-gray-600">Sign in to your account</p>
          </div>

          {/* Form */}
          <form onSubmit={handleLogin} className="space-y-6">
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
                autoFocus
              />
            </div>

            <div className="space-y-2">
              <div className="flex items-center justify-between">
                <Label htmlFor="password" className="text-sm font-medium text-gray-700">
                  Password
                </Label>
              </div>
              <div className="relative">
                <Input
                  id="password"
                  type={showPassword ? "text" : "password"}
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="Enter your password"
                  required
                  className="h-12 pr-12 bg-white/30 border-none focus:ring-2 focus:ring-primary/20 rounded-xl text-base transition-all placeholder-gray-400 shadow-none"
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="absolute right-3 top-1/2 -translate-y-1/2 p-1 text-gray-400 hover:text-gray-600 transition-colors"
                >
                  {showPassword ? <Eye className="h-5 w-5" /> : <EyeOff className="h-5 w-5" />}
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
              {loading ? "Signing in..." : "Sign in"}
            </Button>
          </form>

          {/* Footer */}
          <div className="mt-12 text-center">
            <p className="text-sm text-gray-600">
              Don't have an account?{" "}
              <Link href="/auth/signup" className="text-primary hover:text-primary/80 transition-colors font-medium">
                Sign up
              </Link>
            </p>
          </div>
        </div>
      </div>
    </div>
  )
}