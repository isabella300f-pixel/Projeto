// Script para atualizar dados locais a partir da planilha KPI DASH - Legatum.xlsx
const path = require('path');
const XLSX = require(path.join(__dirname, '..', 'node_modules', 'xlsx'));
const fs = require('fs');
const path = require('path');

const excelFile = path.join(__dirname, '..', 'KPI DASH - Legatum.xlsx');
const outputFile = path.join(__dirname, '..', 'lib', 'data.ts');

console.log('📊 Processando planilha: KPI DASH - Legatum.xlsx\n');

if (!fs.existsSync(excelFile)) {
  console.error('❌ Arquivo não encontrado:', excelFile);
  process.exit(1);
}

// Função para normalizar nomes de colunas
const normalizeKey = (key) => 
  String(key || '').toLowerCase()
    .trim()
    .replace(/\s+/g, ' ')
    .replace(/[%()]/g, '')
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/[^\w\s]/g, ' ')
    .replace(/\s+/g, ' ')
    .trim()

// Função para normalizar período
const normalizePeriod = (period) => {
  return String(period || '')
    .trim()
    .replace(/\s+/g, ' ')
    .replace(/\s*a\s*/g, ' a ')
}

// Função para validar período
const isValidPeriod = (value) => {
  if (!value || typeof value !== 'string') return false
  const normalized = value.trim().toLowerCase()
  if (normalized.length < 5 || normalized.length > 50) return false
  if (!/\d/.test(normalized)) return false
  const hasDatePattern = /\d{1,2}\/\d{1,2}/.test(normalized)
  const hasPeriodPattern = /\d{1,2}\/\d{1,2}\s+a\s+\d{1,2}\/\d{1,2}/.test(normalized)
  return hasDatePattern || hasPeriodPattern
}

// Função para converter valor para número
const parseNumber = (value) => {
  if (value === null || value === undefined || value === '') return undefined
  if (typeof value === 'number') return isNaN(value) ? undefined : value
  if (typeof value === 'string') {
    const cleaned = value.trim()
      .replace(/\./g, '')
      .replace(/,/g, '.')
      .replace(/[^\d.-]/g, '')
    const parsed = parseFloat(cleaned)
    return isNaN(parsed) ? undefined : parsed
  }
  return undefined
}

// Função para buscar valor
const getValue = (rowMap, variations) => {
  for (const variation of variations) {
    const normalized = normalizeKey(variation)
    if (rowMap[normalized] !== undefined && rowMap[normalized] !== null && rowMap[normalized] !== '') {
      const value = parseNumber(rowMap[normalized])
      if (value !== undefined) return value
    }
    for (const key in rowMap) {
      if (key.includes(normalized) || normalized.includes(key)) {
        const value = parseNumber(rowMap[key])
        if (value !== undefined) return value
      }
    }
  }
  return undefined
}

// Função para buscar texto
const getTextValue = (rowMap, variations) => {
  for (const variation of variations) {
    const normalized = normalizeKey(variation)
    if (rowMap[normalized] !== undefined && rowMap[normalized] !== null && rowMap[normalized] !== '') {
      const value = String(rowMap[normalized]).trim()
      if (value) return value
    }
  }
  return undefined
}

try {
  const workbook = XLSX.readFile(excelFile);
  const sheetName = workbook.SheetNames[0];
  const worksheet = workbook.Sheets[sheetName];
  
  const jsonData = XLSX.utils.sheet_to_json(worksheet, {
    defval: null,
    raw: false,
    dateNF: 'dd/mm/yyyy',
    blankrows: false
  });

  if (jsonData.length === 0) {
    console.error('❌ Planilha vazia!');
    process.exit(1);
  }

  console.log(`✅ Total de linhas encontradas: ${jsonData.length}\n`);

  const mappedData = jsonData
    .map((row) => {
      const rowMap = {};
      Object.keys(row).forEach(key => {
        rowMap[normalizeKey(key)] = row[key];
      });

      // Buscar período
      let periodRaw = getTextValue(rowMap, [
        'período', 'periodo', 'period', 'semana', 'data',
        'periodo semanal', 'periodo da semana', 'semana de',
        'data inicial', 'data final', 'range', 'intervalo',
        'data periodo', 'periodo data', 'semana periodo'
      ]) || '';

      // Se período vier como Date object
      if (!periodRaw) {
        for (const key in rowMap) {
          const value = rowMap[key];
          if (value instanceof Date) {
            const dateStr = value.toLocaleDateString('pt-BR');
            if (isValidPeriod(dateStr)) {
              periodRaw = dateStr;
              break;
            }
          }
        }
      }

      // Buscar em qualquer coluna que contenha "period", "semana" ou "data"
      if (!periodRaw) {
        for (const key in rowMap) {
          const normalizedKey = normalizeKey(key);
          if (normalizedKey.includes('period') || normalizedKey.includes('semana') || normalizedKey.includes('data')) {
            const value = String(rowMap[key] || '').trim();
            if (value && value.length > 0 && value !== 'undefined' && value !== 'null') {
              if (isValidPeriod(value)) {
                periodRaw = value;
                break;
              }
            }
          }
        }
      }

      // Se ainda não encontrou, usar primeira coluna válida
      if (!periodRaw) {
        for (const key in rowMap) {
          const value = String(rowMap[key] || '').trim();
          if (value && value.length > 0 && value !== 'undefined' && value !== 'null') {
            if (isValidPeriod(value)) {
              periodRaw = value;
              break;
            }
          }
        }
      }

      if (!periodRaw || !isValidPeriod(periodRaw)) {
        return null;
      }

      const periodNormalized = normalizePeriod(periodRaw);

      // Mapear todos os indicadores
      const data = {
        period: periodNormalized,
        paSemanal: getValue(rowMap, [
          'pa semanal realizado', 'pa semanal', 'pasemanal',
          'premio anual semanal', 'pa realizado',
          'pa semanal realizado r$', 'pa semanal r$',
          'premio anual semanal realizado'
        ]) || 0,
        paAcumuladoMes: getValue(rowMap, [
          'pa acumulado no mes', 'pa acumulado mes', 'paacumuladomes',
          'premio anual acumulado mes', 'pa acum mes',
          'pa acumulado mes r$', 'pa acum mes r$'
        ]) || 0,
        paAcumuladoAno: getValue(rowMap, [
          'pa acumulado no ano', 'pa acumulado ano', 'paacumuladoano',
          'premio anual acumulado ano', 'pa acum ano',
          'pa acumulado ano r$', 'pa acum ano r$', 'pa acumulado total ano'
        ]) || 0,
        metaPASemanal: getValue(rowMap, [
          'meta de pa semanal necessaria', 'meta pa semanal',
          'metapasemanal', 'meta pa semanal necessaria'
        ]) || 82000,
        percentualMetaPASemana: getValue(rowMap, [
          'meta de pa realizada da semana', '% meta pa semana',
          'meta pa semana', 'percentual meta pa semana',
          '% meta de pa realizada da semana', 'percentual meta pa realizada semana',
          '% meta pa realizada semana', 'meta pa realizada semana %'
        ]) || 0,
        percentualMetaPAAno: getValue(rowMap, [
          'meta de pa realizada do ano', '% meta pa ano',
          'meta pa ano', 'percentual meta pa ano',
          '% meta de pa realizada do ano', 'percentual meta pa realizada ano',
          '% meta pa realizada ano', 'meta pa realizada ano %'
        ]) || 0,
        paEmitido: getValue(rowMap, [
          'pa emitido na semana', 'pa emitido', 'paemitido',
          'premio anual emitido', 'pa emitido semana',
          'pa emitido r$', 'premio anual emitido semana'
        ]) || 0,
        apolicesEmitidas: getValue(rowMap, [
          'apolices emitidas por semana', 'apolices emitidas',
          'apolicesemitidas', 'apolices', 'numero de apolices',
          'apolices emitidas semana', 'qtd apolices emitidas',
          'quantidade apolices emitidas', 'n apolices emitidas'
        ]) || 0,
        metaNSemanal: getValue(rowMap, [
          'meta de n semanal', 'meta n semanal', 'metansemanal',
          'meta n', 'meta n semana', 'meta apolices semanal',
          'meta numero apolices semanal'
        ]) || 5,
        nSemana: getValue(rowMap, [
          'n da semana', 'n semana', 'nsemana', 'n semanal',
          'n semana realizado', 'numero apolices semana', 'qtd apolices semana'
        ]) || 0,
        nAcumuladoMes: getValue(rowMap, [
          'n acumulados do mes', 'n acumulado mes', 'nacumuladomes',
          'n acumulado mes', 'n acum mes', 'apolices acumuladas mes',
          'numero apolices acumulado mes'
        ]) || 0,
        nAcumuladoAno: getValue(rowMap, [
          'n acumulados do ano', 'n acumulado ano', 'nacumuladoano',
          'n acumulado ano', 'n acum ano', 'apolices acumuladas ano',
          'numero apolices acumulado ano', 'n acumulado total ano'
        ]) || 0,
        percentualMetaNSemana: getValue(rowMap, [
          'meta de n realizada da semana', '% meta n semana',
          'meta n semana', 'percentual meta n semana',
          '% meta de n realizada da semana', 'percentual meta n realizada semana',
          '% meta n realizada semana', 'meta n realizada semana %'
        ]) || 0,
        percentualMetaNAno: getValue(rowMap, [
          'meta de n realizada do ano', '% meta n ano',
          'meta n ano', 'percentual meta n ano',
          '% meta de n realizada do ano', 'percentual meta n realizada ano',
          '% meta n realizada ano', 'meta n realizada ano %'
        ]) || 0,
        metaOIsAgendadas: getValue(rowMap, [
          'meta ois agendadas', 'metaoisagendadas', 'meta ois',
          'meta oportunidades de inovacao agendadas', 'meta ois semana',
          'meta ois agendadas semana', 'meta oi agendadas'
        ]) || 8,
        oIsAgendadas: getValue(rowMap, [
          'ois agendadas', 'oisagendadas',
          'oportunidades de inovacao agendadas', 'ois agend',
          'ois agendadas semana', 'qtd ois agendadas', 'quantidade ois agendadas'
        ]) || 0,
        oIsRealizadas: getValue(rowMap, [
          'ois realizadas na semana', 'ois realizadas', 'oisrealizadas',
          'oportunidades de inovacao realizadas', 'ois realizadas semana',
          'qtd ois realizadas', 'quantidade ois realizadas'
        ]) || 0,
        metaRECS: getValue(rowMap, [
          'meta recs', 'metarecs', 'meta rec',
          'meta revisao de carteira', 'meta recs agendadas',
          'meta revisoes carteira', 'meta rec semana'
        ]),
        novasRECS: getValue(rowMap, [
          'novas recs', 'novasrecs', 'novas rec',
          'novas revisoes de carteira', 'novas recs realizadas',
          'qtd novas recs', 'quantidade novas recs'
        ]),
        metaPCsC2Agendados: getValue(rowMap, [
          'meta de pcs c2 agendados', 'meta pcs c2 agendados',
          'meta pcs/c2 agendados', 'metapcsc2agendados',
          'meta pcs agendados', 'meta pcs c2', 'meta pcs e c2 agendados',
          'meta pcs c2 semana'
        ]),
        pcsRealizados: getValue(rowMap, [
          'pcs realizados na semana', 'pcs realizados', 'pcsrealizados',
          'pcs', 'pcs realizados semana', 'qtd pcs realizados',
          'quantidade pcs realizados', 'pcs realiz'
        ]),
        c2Realizados: getValue(rowMap, [
          'quantidade de c2 realizados na semana', 'c2 realizados na semana',
          'c2 realizados', 'c2realizados', 'quantidade c2 realizados',
          'c2 realizados semana', 'qtd c2 realizados', 'quantidade c2',
          'c2 realiz'
        ]),
        apoliceEmAtraso: getValue(rowMap, [
          'apolice em atraso', 'apolice em atraso no', 'apoliceematraso',
          'apolices em atraso', 'numero de apolices em atraso',
          'qtd apolices atraso', 'quantidade apolices atraso',
          'apolices atrasadas', 'n apolices atraso'
        ]),
        premioEmAtraso: getValue(rowMap, [
          'premio em atraso de clientes', 'premio em atraso', 'premioematraso',
          'premios em atraso', 'valor premio em atraso',
          'premio atraso r$', 'valor premio atraso', 'premios atrasados r$',
          'pa em atraso'
        ]),
        taxaInadimplenciaGeral: getValue(rowMap, [
          'taxa de inadimplencia geral', 'taxa inadimplencia geral',
          'taxainadimplenciageral', 'inadimplencia geral',
          '% inadimplencia geral', 'taxa inadimplencia %',
          'inadimplencia % geral', 'taxa inad geral'
        ]),
        taxaInadimplenciaAssistente: getValue(rowMap, [
          'taxa de inadimplencia assistente', 'taxa inadimplencia assistente',
          'taxainadimplenciaassistente', 'inadimplencia assistente',
          '% inadimplencia assistente', 'taxa inadimplencia % assistente',
          'inadimplencia % assistente', 'taxa inad assistente'
        ]),
        metaRevisitasAgendadas: getValue(rowMap, [
          'meta revisitas agendadas', 'metarevisitasagendadas',
          'meta revisita', 'meta revisitas', 'meta revisitas semana',
          'meta revisitas agendadas semana'
        ]),
        revisitasAgendadas: getValue(rowMap, [
          'revisitas agendadas na semana', 'revisitas agendadas',
          'revisitasagendadas', 'revisita agendada',
          'revisitas agendadas semana', 'qtd revisitas agendadas',
          'quantidade revisitas agendadas'
        ]),
        revisitasRealizadas: getValue(rowMap, [
          'revisitas realizadas na semana', 'revisitas realizadas',
          'revisitasrealizadas', 'revisita realizada',
          'revisitas realizadas semana', 'qtd revisitas realizadas',
          'quantidade revisitas realizadas'
        ]),
        volumeTarefasTrello: getValue(rowMap, [
          'volume de tarefas concluidas no trello', 'volume tarefas trello',
          'volumetarefastrello', 'tarefas trello', 'tarefas concluidas trello',
          'qtd tarefas trello', 'quantidade tarefas trello',
          'tarefas concluidas', 'volume trello'
        ]),
        videosTreinamentoGravados: getValue(rowMap, [
          'numero de videos de treinamento gravados', 'videos treinamento gravados',
          'videostreinamentogravados', 'videos treinamento', 'videos gravados',
          'qtd videos treinamento', 'quantidade videos treinamento',
          'videos treinamento gravados semana', 'numero videos gravados'
        ]),
        deliveryApolices: getValue(rowMap, [
          'delivery apolices', 'deliveryapolices', 'delivery apolices',
          'delivery', 'entrega apolices', 'qtd delivery apolices',
          'quantidade delivery apolices', 'delivery apolices semana',
          'entregas apolices'
        ]),
        totalReunioes: getValue(rowMap, [
          'total de reunioes realizadas na semana', 'total reunioes',
          'totalreunioes', 'reunioes realizadas', 'total reunioes semana',
          'qtd reunioes', 'quantidade reunioes', 'reunioes realizadas semana',
          'numero reunioes'
        ]),
        listaAtrasosRaiza: getTextValue(rowMap, [
          'lista de atrasos atribuidos raiza', 'lista atrasos raiza',
          'listaatrasosraiza', 'atrasos raiza', 'lista de atrasos raiza'
        ]),
      };

      // Calcular campos derivados
      if (data.oIsAgendadas > 0 && data.oIsRealizadas !== undefined && data.oIsRealizadas >= 0) {
        data.percentualOIsRealizadas = (data.oIsRealizadas / data.oIsAgendadas) * 100;
      }
      
      if (data.apolicesEmitidas > 0 && data.paSemanal > 0) {
        data.ticketMedio = data.paSemanal / data.apolicesEmitidas;
      }
      
      if (data.oIsAgendadas > 0 && data.oIsRealizadas !== undefined && data.oIsRealizadas >= 0) {
        data.conversaoOIs = (data.oIsRealizadas / data.oIsAgendadas) * 100;
      }

      return data;
    })
    .filter(data => data && data.period && isValidPeriod(data.period));

  // Remover duplicatas (manter apenas o primeiro)
  const seenPeriods = new Map();
  const uniqueData = [];
  for (const data of mappedData) {
    if (!data || !data.period) continue;
    const periodKey = data.period.toLowerCase().trim();
    if (!seenPeriods.has(periodKey)) {
      seenPeriods.set(periodKey, true);
      uniqueData.push(data);
    }
  }

  console.log(`✅ Dados processados: ${uniqueData.length} registros únicos\n`);

  // Gerar código TypeScript
  const dataCode = `// Dados atualizados automaticamente da planilha KPI DASH - Legatum.xlsx
// Gerado em: ${new Date().toLocaleString('pt-BR')}
import { WeeklyData } from './types'

export const weeklyData: WeeklyData[] = ${JSON.stringify(uniqueData, null, 2).replace(/"/g, '').replace(/(\w+):/g, '$1:')};

// Função para formatar valores monetários
export function formatCurrency(value: number): string {
  return new Intl.NumberFormat('pt-BR', {
    style: 'currency',
    currency: 'BRL',
  }).format(value);
}

// Função para formatar percentuais
export function formatPercent(value: number): string {
  return \`\${value.toFixed(2)}%\`;
}

// Função para obter dados de um período específico
export function getDataByPeriod(period: string): WeeklyData | undefined {
  return weeklyData.find(d => d.period === period);
}

// Função para obter todos os períodos
export function getAllPeriods(data?: WeeklyData[]): string[] {
  const dataToUse = data || weeklyData
  return dataToUse.map(d => d.period);
}
`;

  // Salvar arquivo
  fs.writeFileSync(outputFile, dataCode, 'utf8');
  
  console.log('✅ Arquivo lib/data.ts atualizado com sucesso!');
  console.log(`📊 Total de registros: ${uniqueData.length}`);
  console.log(`📅 Períodos: ${uniqueData.map(d => d.period).join(', ')}\n`);
  console.log('🎉 Dados locais atualizados! A aplicação agora usará estes dados.');

} catch (error) {
  console.error('❌ Erro ao processar planilha:', error.message);
  console.error(error.stack);
  process.exit(1);
}

