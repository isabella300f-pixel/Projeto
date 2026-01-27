// Script para analisar a planilha KPI DASH - Legatum.xlsx
const XLSX = require('xlsx');
const fs = require('fs');
const path = require('path');

const excelFile = path.join(__dirname, '..', 'KPI DASH - Legatum.xlsx');

if (!fs.existsSync(excelFile)) {
  console.error('❌ Arquivo não encontrado:', excelFile);
  process.exit(1);
}

console.log('📊 Analisando planilha: KPI DASH - Legatum.xlsx\n');

try {
  const workbook = XLSX.readFile(excelFile);
  
  console.log('📋 Planilhas encontradas:', workbook.SheetNames);
  console.log('');
  
  // Analisar primeira planilha
  const sheetName = workbook.SheetNames[0];
  const worksheet = workbook.Sheets[sheetName];
  
  console.log('📄 Analisando planilha:', sheetName);
  console.log('');
  
  // Converter para JSON
  const jsonData = XLSX.utils.sheet_to_json(worksheet, { 
    defval: null,
    raw: false 
  });
  
  if (jsonData.length === 0) {
    console.error('❌ Planilha vazia!');
    process.exit(1);
  }
  
  console.log(`✅ Total de linhas: ${jsonData.length}`);
  console.log('');
  
  // Mostrar colunas da primeira linha
  const firstRow = jsonData[0];
  const columns = Object.keys(firstRow);
  
  console.log('📑 COLUNAS ENCONTRADAS NA PLANILHA:');
  console.log('='.repeat(80));
  columns.forEach((col, idx) => {
    const value = firstRow[col];
    const valueType = value !== null && value !== undefined ? typeof value : 'null';
    const valuePreview = value !== null && value !== undefined 
      ? String(value).substring(0, 50) 
      : '(vazio)';
    console.log(`${String(idx + 1).padStart(3, ' ')}. "${col}"`);
    console.log(`     Tipo: ${valueType} | Exemplo: ${valuePreview}`);
  });
  
  console.log('');
  console.log('📊 PRIMEIRAS 3 LINHAS DE DADOS:');
  console.log('='.repeat(80));
  jsonData.slice(0, 3).forEach((row, idx) => {
    console.log(`\n🔹 Linha ${idx + 1}:`);
    Object.keys(row).forEach(key => {
      const value = row[key];
      if (value !== null && value !== undefined && String(value).trim() !== '') {
        console.log(`   ${key}: ${value}`);
      }
    });
  });
  
  // Verificar coluna de período
  console.log('');
  console.log('🔍 VERIFICANDO COLUNA DE PERÍODO:');
  console.log('='.repeat(80));
  const periodColumns = columns.filter(col => {
    const normalized = col.toLowerCase()
      .normalize('NFD')
      .replace(/[\u0300-\u036f]/g, '')
      .replace(/[^\w\s]/g, ' ')
      .trim();
    return normalized.includes('period') || 
           normalized.includes('semana') || 
           normalized.includes('data');
  });
  
  if (periodColumns.length > 0) {
    console.log('✅ Colunas que podem ser período:', periodColumns);
    periodColumns.forEach(col => {
      const values = jsonData
        .map(row => row[col])
        .filter(v => v !== null && v !== undefined && String(v).trim() !== '')
        .slice(0, 5);
      console.log(`   "${col}": ${values.join(', ')}`);
    });
  } else {
    console.log('⚠️ Nenhuma coluna óbvia de período encontrada');
    console.log('   Verificando primeira coluna...');
    const firstCol = columns[0];
    const firstValues = jsonData
      .map(row => row[firstCol])
      .filter(v => v !== null && v !== undefined && String(v).trim() !== '')
      .slice(0, 5);
    console.log(`   "${firstCol}": ${firstValues.join(', ')}`);
  }
  
  // Gerar relatório de mapeamento
  console.log('');
  console.log('📝 RELATÓRIO DE MAPEAMENTO:');
  console.log('='.repeat(80));
  console.log('Colunas na planilha que precisam ser mapeadas:');
  columns.forEach(col => {
    console.log(`- "${col}"`);
  });
  
} catch (error) {
  console.error('❌ Erro ao analisar planilha:', error.message);
  console.error(error.stack);
  process.exit(1);
}

