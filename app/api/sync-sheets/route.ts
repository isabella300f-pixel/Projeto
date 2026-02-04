import { NextResponse } from 'next/server'
import { createSupabaseServer } from '@/lib/supabase'
import { weeklyDataToRow } from '@/lib/supabase-mappers'

/**
 * POST /api/sync-sheets
 * Busca dados do Google Sheets (via /api/google-sheets) e grava/atualiza no Supabase.
 * Use após atualizar a planilha para refletir no dashboard.
 */
export async function POST() {
  try {
    const baseUrl =
      process.env.VERCEL_URL
        ? `https://${process.env.VERCEL_URL}`
        : process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000'

    const res = await fetch(`${baseUrl}/api/google-sheets`, {
      cache: 'no-store',
      headers: { 'Cache-Control': 'no-cache' },
    })

    if (!res.ok) {
      const err = await res.json().catch(() => ({}))
      return NextResponse.json(
        { success: false, error: err.error || 'Falha ao buscar Google Sheets', synced: 0 },
        { status: 502 }
      )
    }

    const json = await res.json()
    if (!json.success || !Array.isArray(json.data) || json.data.length === 0) {
      return NextResponse.json({
        success: true,
        message: 'Nenhum dado no Google Sheets para sincronizar',
        synced: 0,
      })
    }

    const supabase = createSupabaseServer()
    const rows = json.data.map((d: Record<string, unknown>) => weeklyDataToRow(d as any))

    const { data, error } = await supabase
      .from('kpi_weekly_data')
      .upsert(rows, { onConflict: 'period' })

    if (error) {
      console.error('❌ [sync-sheets] Supabase upsert:', error)
      return NextResponse.json(
        { success: false, error: error.message, synced: 0 },
        { status: 500 }
      )
    }

    return NextResponse.json({
      success: true,
      message: 'Dados do Google Sheets sincronizados com o Supabase',
      synced: rows.length,
      data,
    })
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : 'Erro ao sincronizar'
    console.error('❌ [sync-sheets]', err)
    return NextResponse.json(
      { success: false, error: message, synced: 0 },
      { status: 500 }
    )
  }
}
