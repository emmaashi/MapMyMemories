import { createClient } from "@/lib/supabase/server"
import { redirect } from "next/navigation"
import SettingsPage from "@/components/settings/settings-page"

export default async function Settings() {
  const supabase = await createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()

  if (!user) {
    redirect("/auth/login")
  }

  return <SettingsPage user={user} />
}
