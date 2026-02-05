import { NextResponse } from 'next/server'
import * as XLSX from 'xlsx'

// URL do Google Sheets (formato CSV)
const GOOGLE_SHEETS_URL = 'https://docs.google.com/spreadsheets/d/e/2PACX-1vSQk309WH9kRymm3yLfzMluGJLRgAjMtWiil22Du0UGwdS55YOafE0C-EVCNiKKkw/pub?output=csv'

export async function GET() {
  try {
    console.log('🔍 [DEBUG] Buscando dados do Google Sheets para debug...')
    
    const response = await fetch(GOOGLE_SHEETS_URL, {
      cache: 'no-store',
      headers: {
        'Accept': 'text/csv',
        'User-Agent': 'Mozilla/5.0'
      }
    })
    
    if (!response.ok) {
      return NextResponse.json({
        success: false,
        error: `Erro HTTP: ${response.status} ${response.statusText}`
      }, { status: response.status })
    }
    
    const csvText = await response.text()
    
    if (!csvText || csvText.trim().length === 0) {
      return NextResponse.json({
        success: false,
        error: 'CSV vazio retornado'
      })
    }
    
    // Converter CSV para JSON
    const workbook = XLSX.read(csvText, { 
      type: 'string',
      cellDates: false,
      cellNF: false,
      cellText: false
    })
    
    if (!workbook.SheetNames || workbook.SheetNames.length === 0) {
      return NextResponse.json({
        success: false,
        error: 'Nenhuma planilha encontrada'
      })
    }
    
    const sheetName = workbook.SheetNames[0]
    const worksheet = workbook.Sheets[sheetName]
    
    const jsonData: any[] = XLSX.utils.sheet_to_json(worksheet, {
      defval: null,
      raw: false,
      dateNF: 'dd/mm/yyyy',
      blankrows: false
    })
    
    if (!jsonData || jsonData.length === 0) {
      return NextResponse.json({
        success: false,
        error: 'Nenhum dado encontrado após conversão'
      })
    }
    
    // Retornar informações de debug
    const firstRow = jsonData[0]
    const columns = Object.keys(firstRow)
    
    // Identificar períodos
    const normalizeKey = (key: string) => 
      key.toLowerCase()
        .trim()
        .replace(/\s+/g, ' ')
        .replace(/[%()]/g, '')
        .normalize('NFD')
        .replace(/[\u0300-\u036f]/g, '')
        .replace(/[^\w\s]/g, ' ')
        .replace(/\s+/g, ' ')
        .trim()
    
    const normalizePeriod = (period: string): string => {
      return period
        .trim()
        .replace(/\s+/g, ' ')
        .replace(/\s*[Aa]\s*/g, ' a ')
        .replace(/\//g, '/')
    }
    
    const isValidPeriod = (value: string): boolean => {
      if (!value || typeof value !== 'string') return false
      const normalized = value.trim().toLowerCase()
      if (normalized.length < 8 || normalized.length > 20) return false
      const invalidPatterns = ['simples nacional', 'anexo', 'indica', 'célula', 'celula', 'output', 'input']
      for (const pattern of invalidPatterns) {
        if (normalized.includes(pattern)) return false
      }
      const hasDatePattern = /\d{1,2}\/\d{1,2}/.test(normalized)
      if (!hasDatePattern) return false
      const dateMatches = normalized.match(/(\d{1,2})\/(\d{1,2})/g)
      if (dateMatches) {
        for (const match of dateMatches) {
          const [day, month] = match.split('/').map(Number)
          if (day < 1 || day > 31 || month < 1 || month > 12) return false
        }
      }
      return true
    }
    
    const periodColumns: { originalKey: string, period: string }[] = []
    for (const col of columns) {
      const normalizedCol = normalizeKey(col)
      if (normalizedCol === 'indicador' || normalizedCol === 'indicator') continue
      const periodValue = String(col).trim()
      if (isValidPeriod(periodValue)) {
        periodColumns.push({
          originalKey: col,
          period: normalizePeriod(periodValue)
        })
      }
    }
    
    // Mapear dados para um período específico (primeiro período como exemplo)
    const examplePeriod = periodColumns[0]
    const mappingDetails: any[] = []
    
    if (examplePeriod) {
      for (const row of jsonData) {
        const indicadorKey = Object.keys(row).find(k => normalizeKey(k) === 'indicador' || normalizeKey(k) === 'indicator')
        const indicador = indicadorKey ? row[indicadorKey] : ''
        const value = row[examplePeriod.originalKey]
        if (indicador && value !== null && value !== undefined && value !== '' && String(value).trim() !== '-') {
          mappingDetails.push({
            indicador: String(indicador).trim(),
            valorOriginal: value,
            valorTipo: typeof value,
            coluna: examplePeriod.originalKey,
            periodo: examplePeriod.period
          })
        }
      }
    }
    
    return NextResponse.json({
      success: true,
      csvLength: csvText.length,
      csvPreview: csvText.substring(0, 1000),
      sheetName,
      totalRows: jsonData.length,
      totalColumns: columns.length,
      columns: columns,
      periodColumns: periodColumns.map(p => ({ original: p.originalKey, period: p.period })),
      firstRow: firstRow,
      firstRowKeys: Object.keys(firstRow),
      firstRowValues: Object.values(firstRow),
      sampleRows: jsonData.slice(0, 5),
      mappingDetails: mappingDetails.slice(0, 50), // Primeiros 50 indicadores mapeados
      examplePeriod: examplePeriod?.period || 'N/A',
      totalPeriods: periodColumns.length
    })
  } catch (error: any) {
    console.error('❌ [DEBUG] Erro:', error)
    return NextResponse.json({
      success: false,
      error: error.message || 'Erro desconhecido',
      stack: error.stack
    }, { status: 500 })
  }
}
