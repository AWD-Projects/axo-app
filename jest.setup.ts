import "@testing-library/jest-dom"

// Env vars required by Next.js / Supabase modules at import time
process.env.NEXT_PUBLIC_SUPABASE_URL = "https://test.supabase.co"
process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY = "test-anon-key"
process.env.SUPABASE_SERVICE_ROLE_KEY = "test-service-role-key"
process.env.ANTHROPIC_API_KEY = "test-anthropic-key"
process.env.CRON_SECRET = "test-cron-secret"
process.env.NEXT_PUBLIC_APP_URL = "http://localhost:3000"
