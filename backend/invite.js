require('dotenv').config()
const { createClient } = require('@supabase/supabase-js')

// ==========================
// ENV VARIABLES
// ==========================
const SUPABASE_URL = process.env.SUPABASE_URL
const SUPABASE_SECRET_KEY = process.env.SUPABASE_SECRET_KEY

// Safety check
if (!SUPABASE_URL || !SUPABASE_SECRET_KEY) {
  console.error("❌ Missing SUPABASE_URL or SUPABASE_SECRET_KEY in .env")
  process.exit(1)
}

// Supabase client (service role key)
const supabase = createClient(SUPABASE_URL, SUPABASE_SECRET_KEY)

// ==========================
// GET EMAIL FROM COMMAND LINE
// ==========================
const email = process.argv[2]

if (!email) {
  console.error("❌ No email provided")
  console.log("👉 Usage: node invite.js user@example.com")
  process.exit(1)
}

// ==========================
// INVITE FUNCTION
// ==========================
async function inviteUser() {
  try {
    console.log(`📨 Sending invite to: ${email}`)

    const { data, error } = await supabase.auth.admin.inviteUserByEmail(email)

    if (error) {
      console.error("❌ Error:", error.message)
      return
    }

    console.log("✅ Invite sent successfully!")
    console.log(data)

  } catch (err) {
    console.error("❌ Unexpected error:", err)
  }
}

// Run
inviteUser()