import { NextResponse } from 'next/server'
import { createSupabaseServer } from '@/lib/supabase'
import { rowToWeeklyData, weeklyDataToRow } from '@/lib/supabase-mappers'
import { WeeklyData } from '@/lib/types'

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

    // Se o Supabase estiver vazio: buscar do Google Sheets, popular o Supabase e retornar
    if (list.length === 0) {
      const baseUrl = process.env.VERCEL_URL
        ? `https://${process.env.VERCEL_URL}`
        : process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000'
      const res = await fetch(`${baseUrl}/api/google-sheets`, {
        cache: 'no-store',
        headers: { 'Cache-Control': 'no-cache' },
      })
      if (res.ok) {
        const json = await res.json()
        if (json.success && Array.isArray(json.data) && json.data.length > 0) {
          const rowsToUpsert = json.data.map((d: WeeklyData) => weeklyDataToRow(d))
          await supabase.from('kpi_weekly_data').upsert(rowsToUpsert, { onConflict: 'period' })
          list = json.data
        }
      }
    }

    sortByPeriod(list)

    return NextResponse.json({
      success: true,
      data: list,
      count: list.length,
      periods: list.map((d) => d.period),
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
