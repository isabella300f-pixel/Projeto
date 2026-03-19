import { NextResponse } from 'next/server'
import { createSupabaseServer } from '@/lib/supabase'
import { weeklyDataToRow } from '@/lib/supabase-mappers'
import { fetchGoogleSheetsData } from '@/app/api/google-sheets/route'
import { WeeklyData } from '@/lib/types'

/**
 * POST /api/sync-sheets
 * Busca dados do Google Sheets (função direta, sem fetch à própria API) e grava/atualiza no Supabase.
 * Evita 502 e problemas de chamada interna na Vercel.
 */
export async function POST() {
  try {
    const sheetData = await fetchGoogleSheetsData()

    if (!sheetData || sheetData.length === 0) {
      return NextResponse.json({
        success: true,
        message: 'Nenhum dado no Google Sheets para sincronizar',
        synced: 0,
      })
    }

    const supabase = createSupabaseServer()
    const rows = sheetData.map((d: WeeklyData) => weeklyDataToRow(d))

    const { data, error } = await supabase
      .from('kpi_weekly_data')
      .upsert(rows, { onConflict: 'period' })

    if (error) {
      console.warn('⚠️ [sync-sheets] Supabase upsert falhou (pode ser limite):', error.message)
      // Retorna sucesso com dados da planilha para o dashboard exibir (dupla checagem: preferência Supabase, fallback Sheets)
      return NextResponse.json({
        success: true,
        message: `Dados da planilha carregados (Supabase não gravou – ex.: limite). Use os dados exibidos.`,
        synced: 0,
        data: sheetData,
      })
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
