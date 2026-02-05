import { NextResponse } from 'next/server'
import { createSupabaseServer } from '@/lib/supabase'
import { rowToWeeklyData, weeklyDataToRow } from '@/lib/supabase-mappers'
import { WeeklyData } from '@/lib/types'

/**
 * GET /api/kpi — Fonte única de dados para o dashboard.
 * Retorna apenas dados do Supabase (kpi_weekly_data). Se a tabela estiver vazia,
 * busca da planilha Google Sheets e faz upsert no Supabase. Não há dados de exemplo/fallback.
 */

/** Ordena períodos cronologicamente (DD/MM a DD/MM) */
function parsePeriodToDate(period: string): Date | null {
  const match = period.match(/(\d{1,2})\/(\d{1,2})/)
  if (!match) return null
  const day = parseInt(match[1])
  const month = parseInt(match[2]) - 1
  const today = new Date()
  const currentYear = today.getFullYear()
  const currentMonth = today.getMonth()
  let year = currentYear
  if (month === 11 && currentMonth <= 1) year = currentYear - 1
  else if (month === 0 && currentMonth === 11) year = currentYear + 1
  else if (month > currentMonth) year = currentYear - 1
  else if (month < currentMonth) year = currentYear
  return new Date(year, month, day)
}

function sortByPeriod(list: WeeklyData[]) {
  list.sort((a, b) => {
    const dateA = parsePeriodToDate(a.period)
    const dateB = parsePeriodToDate(b.period)
    if (!dateA || !dateB) return a.period.localeCompare(b.period)
    return dateA.getTime() - dateB.getTime()
  })
}

export async function GET() {
  try {
    const supabase = createSupabaseServer()
    const { data: rows, error } = await supabase
      .from('kpi_weekly_data')
      .select('*')
      .order('period', { ascending: true })

    if (error) {
      console.error('❌ [API KPI] Erro Supabase:', error)
      return NextResponse.json(
        { success: false, error: error.message, data: [] },
        { status: 500 }
      )
    }

    let list: WeeklyData[] = (rows || []).map(rowToWeeklyData)
    let meta: { source?: string; message?: string } = {}

    // Se o Supabase estiver vazio: buscar do Google Sheets, popular o Supabase e retornar
    if (list.length === 0) {
      const baseUrl = process.env.VERCEL_URL
        ? `https://${process.env.VERCEL_URL}`
        : process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000'
      try {
        const res = await fetch(`${baseUrl}/api/google-sheets`, {
          cache: 'no-store',
          headers: { 'Cache-Control': 'no-cache' },
        })
        const json = await res.json().catch(() => ({}))
        if (res.ok && json.success && Array.isArray(json.data) && json.data.length > 0) {
          const rowsToUpsert = json.data.map((d: WeeklyData) => weeklyDataToRow(d))
          const { error: upsertError } = await supabase.from('kpi_weekly_data').upsert(rowsToUpsert, { onConflict: 'period' })
          if (upsertError) {
            meta = { source: 'google_sheets', message: `Planilha carregada mas falha ao gravar no Supabase: ${upsertError.message}` }
          } else {
            list = json.data
            meta = { source: 'google_sheets', message: `${list.length} registros da planilha gravados no Supabase.` }
          }
        } else {
          meta = { source: 'google_sheets', message: json.error || (res.ok ? 'Planilha vazia ou formato inválido.' : `Erro HTTP ${res.status}`) }
        }
      } catch (e) {
        const msg = e instanceof Error ? e.message : String(e)
        meta = { source: 'google_sheets', message: `Erro ao buscar planilha: ${msg}` }
      }
    }

    sortByPeriod(list)

    return NextResponse.json({
      success: true,
      data: list,
      count: list.length,
      periods: list.map((d) => d.period),
      ...(Object.keys(meta).length ? { _meta: meta } : {}),
    })
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : 'Erro ao buscar dados do Supabase'
    console.error('❌ [API KPI]', err)
    return NextResponse.json(
      { success: false, error: message, data: [] },
      { status: 500 }
    )
  }
}

/**
 * POST /api/kpi/seed
 * Body: { data: WeeklyData[] }
 * Grava/atualiza os registros no Supabase (upsert por period).
 * Use para popular a base manualmente (ex: dados da planilha em JSON).
 */
export async function POST(request: Request) {
  try {
    const body = await request.json().catch(() => ({}))
    const data = Array.isArray(body.data) ? body.data : []
    if (data.length === 0) {
      return NextResponse.json(
        { success: false, error: 'Envie { "data": [ { "period": "...", ... }, ... ] } com pelo menos um registro.' },
        { status: 400 }
      )
    }
    const supabase = createSupabaseServer()
    const rows = data.map((d: WeeklyData) => weeklyDataToRow(d))
    const { error: upsertErr } = await supabase.from('kpi_weekly_data').upsert(rows, { onConflict: 'period' })
    if (upsertErr) {
      return NextResponse.json({ success: false, error: upsertErr.message, synced: 0 }, { status: 500 })
    }
    return NextResponse.json({ success: true, message: `${rows.length} registros gravados no Supabase.`, synced: rows.length })
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : 'Erro ao gravar dados'
    return NextResponse.json({ success: false, error: message, synced: 0 }, { status: 500 })
  }
}
