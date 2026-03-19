import { NextResponse } from 'next/server'
import { createSupabaseServer } from '@/lib/supabase'
import { rowToWeeklyData, weeklyDataToRow } from '@/lib/supabase-mappers'
import { WeeklyData } from '@/lib/types'
import { fetchGoogleSheetsData } from '@/app/api/google-sheets/route'
import { parsePeriodToDate } from '@/lib/filters'

/**
 * GET /api/kpi — Preferência Supabase, fallback Google Sheets.
 * 1) Tenta ler do Supabase (kpi_weekly_data).
 * 2) Se Supabase falhar (erro, limite gratuito, etc.) OU retornar vazio, busca da planilha e retorna esses dados.
 * 3) Só tenta gravar no Supabase quando a leitura foi ok e veio vazia; se o upsert falhar, ainda devolve os dados da planilha.
 */

function sortByPeriod(list: WeeklyData[]) {
  list.sort((a, b) => {
    const dateA = parsePeriodToDate(a.period)
    const dateB = parsePeriodToDate(b.period)
    if (!dateA || !dateB) return a.period.localeCompare(b.period)
    return dateA.getTime() - dateB.getTime()
  })
}

function applyOIsPercent(list: WeeklyData[]): WeeklyData[] {
  return list.map((d) => {
    const den = (d.metaOIsAgendadas && d.metaOIsAgendadas > 0) ? d.metaOIsAgendadas : d.oIsAgendadas
    if (den && den > 0 && d.oIsRealizadas >= 0) {
      return { ...d, percentualOIsRealizadas: Math.round((d.oIsRealizadas / den) * 1000) / 10 }
    }
    return d
  })
}

function getLatestPeriodTime(list: WeeklyData[]): number {
  let latest = 0
  for (const d of list) {
    const dt = parsePeriodToDate(d.period)
    if (dt && dt.getTime() > latest) latest = dt.getTime()
  }
  return latest
}

export async function GET() {
  try {
    const supabase = createSupabaseServer()
    let list: WeeklyData[] = []
    let meta: { source?: string; message?: string } = {}

    const { data: rows, error } = await supabase
      .from('kpi_weekly_data')
      .select('*')
      .order('period', { ascending: true })

    if (error) {
      console.warn('⚠️ [API KPI] Supabase falhou (pode ser limite):', error.message)
      // Fallback: buscar da planilha e retornar (não tentar upsert para não falhar de novo)
      try {
        const sheetData = await fetchGoogleSheetsData()
        if (sheetData && sheetData.length > 0) {
          list = applyOIsPercent(sheetData)
          sortByPeriod(list)
          return NextResponse.json({
            success: true,
            data: list,
            count: list.length,
            periods: list.map((d) => d.period),
            _meta: { source: 'google_sheets', message: 'Supabase indisponível. Dados da planilha (somente leitura).' },
          })
        }
      } catch (e) {
        const msg = e instanceof Error ? e.message : String(e)
        console.error('❌ [API KPI] Fallback planilha falhou:', msg)
        return NextResponse.json(
          { success: false, error: `Supabase: ${error.message}. Planilha: ${msg}`, data: [] },
          { status: 502 }
        )
      }
      return NextResponse.json(
        { success: false, error: error.message, data: [] },
        { status: 500 }
      )
    }

    list = (rows || []).map(rowToWeeklyData)
    list = applyOIsPercent(list)

    // Supabase retornou vazio: buscar da planilha e, se possível, gravar no Supabase
    if (list.length === 0) {
      try {
        const sheetData = await fetchGoogleSheetsData()
        if (sheetData && sheetData.length > 0) {
          list = applyOIsPercent(sheetData)
          const rowsToUpsert = sheetData.map((d: WeeklyData) => weeklyDataToRow(d))
          const { error: upsertError } = await supabase.from('kpi_weekly_data').upsert(rowsToUpsert, { onConflict: 'period' })
          if (upsertError) {
            meta = { source: 'google_sheets', message: `Dados da planilha. Supabase não gravou (ex.: limite): ${upsertError.message}` }
          } else {
            meta = { source: 'google_sheets', message: `${list.length} registros da planilha gravados no Supabase.` }
          }
        } else {
          meta = { source: 'google_sheets', message: 'Planilha vazia ou formato inválido.' }
        }
      } catch (e) {
        const msg = e instanceof Error ? e.message : String(e)
        meta = { source: 'google_sheets', message: `Erro ao buscar planilha: ${msg}` }
      }
    }
    // Dupla checagem obrigatória: mesmo com Supabase OK, consultar planilha e usar a fonte mais atual
    else {
      try {
        const sheetData = await fetchGoogleSheetsData()
        if (sheetData && sheetData.length > 0) {
          const normalizedSheet = applyOIsPercent(sheetData)
          const supaLatest = getLatestPeriodTime(list)
          const sheetLatest = getLatestPeriodTime(normalizedSheet)
          const sheetHasMorePeriods = normalizedSheet.length > list.length
          const sheetIsNewer = sheetLatest > supaLatest

          if (sheetHasMorePeriods || sheetIsNewer) {
            list = normalizedSheet
            const rowsToUpsert = sheetData.map((d: WeeklyData) => weeklyDataToRow(d))
            const { error: upsertError } = await supabase.from('kpi_weekly_data').upsert(rowsToUpsert, { onConflict: 'period' })
            if (upsertError) {
              meta = {
                source: 'google_sheets',
                message: `Planilha mais atual detectada e usada no dashboard. Supabase não gravou (ex.: limite): ${upsertError.message}`,
              }
            } else {
              meta = {
                source: 'google_sheets',
                message: `Planilha mais atual detectada (${normalizedSheet.length} períodos) e sincronizada no Supabase.`,
              }
            }
          } else {
            meta = { source: 'supabase', message: 'Supabase atualizado. Dupla checagem com planilha concluída.' }
          }
        } else {
          meta = { source: 'supabase', message: 'Supabase atualizado. Planilha sem dados na dupla checagem.' }
        }
      } catch (e) {
        const msg = e instanceof Error ? e.message : String(e)
        meta = { source: 'supabase', message: `Supabase usado. Dupla checagem com planilha falhou: ${msg}` }
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
    const message = err instanceof Error ? err.message : 'Erro ao buscar dados'
    console.error('❌ [API KPI]', err)
    // Última tentativa: fallback direto na planilha
    try {
      const sheetData = await fetchGoogleSheetsData()
      if (sheetData && sheetData.length > 0) {
        const list = applyOIsPercent(sheetData)
        sortByPeriod(list)
        return NextResponse.json({
          success: true,
          data: list,
          count: list.length,
          periods: list.map((d) => d.period),
          _meta: { source: 'google_sheets', message: 'Erro no servidor. Dados da planilha.' },
        })
      }
    } catch (_) {}
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
