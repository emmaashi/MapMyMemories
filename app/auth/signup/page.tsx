import { createClient } from "@/lib/supabase/server"
import { redirect } from "next/navigation"
import SignupForm from "@/components/auth/signup-form"

export default async function SignupPage() {
  const supabase = await createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()

  if (user) {
    redirect("/dashboard")
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 via-white to-purple-50 flex items-center justify-center p-4">
      <SignupForm />
    </div>
  )
}
