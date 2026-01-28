import { NextResponse } from 'next/server'
import * as XLSX from 'xlsx'

// URL do Google Sheets (formato CSV)
const GOOGLE_SHEETS_URL = 'https://docs.google.com/spreadsheets/d/e/2PACX-1vSQk309WH9kRymm3yLfzMluGJLRgAjMtWiil22Du0UGwdS55YOafE0C-EVCNiKKkw/pub?gid=1893200293&single=true&output=csv'

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
    
    return NextResponse.json({
      success: true,
      csvLength: csvText.length,
      csvPreview: csvText.substring(0, 1000),
      sheetName,
      totalRows: jsonData.length,
      totalColumns: columns.length,
      columns: columns,
      firstRow: firstRow,
      firstRowKeys: Object.keys(firstRow),
      firstRowValues: Object.values(firstRow),
      sampleRows: jsonData.slice(0, 5)
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
