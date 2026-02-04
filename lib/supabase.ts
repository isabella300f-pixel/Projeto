import { createClient } from '@supabase/supabase-js'

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!
const supabaseServiceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY!

/**
 * Cliente Supabase para uso no servidor (API routes).
 * Usa service_role para leitura/escrita na tabela kpi_weekly_data.
 * NUNCA exponha SUPABASE_SERVICE_ROLE_KEY no cliente.
 */
export function createSupabaseServer() {
  if (!supabaseUrl || !supabaseServiceRoleKey) {
    throw new Error('Faltam NEXT_PUBLIC_SUPABASE_URL ou SUPABASE_SERVICE_ROLE_KEY')
  }
  return createClient(supabaseUrl, supabaseServiceRoleKey)
}
