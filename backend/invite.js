require('dotenv').config()
const { createClient } = require('@supabase/supabase-js')

const supabase = createClient(
  process.env.SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY
)

const email = process.argv[2]

if (!email) {
  console.error("❌ Usage: node invite.js user@example.com")
  process.exit(1)
}

async function inviteUser() {
  console.log("📨 Inviting:", email)

  const { data, error } = await supabase.auth.admin.inviteUserByEmail(email)

  if (error) {
    console.error("❌ Invite failed:", error.message)
    return
  }

  console.log("✅ Invite sent!")
  console.log(data)
}

inviteUser()