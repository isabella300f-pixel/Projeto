/**
 * Lógica do ciclo da empresa: início de fevereiro a início de fevereiro do próximo ano.
 * Novo ciclo: a partir de Fevereiro de 2026.
 */

/** Mês de início do ciclo (fevereiro = 2) */
export const CICLO_INICIO_MES = 2

/** Ano de início do novo ciclo (configurável) */
export const CICLO_INICIO_ANO = 2026

/**
 * Converte período "DD/MM a DD/MM" ou "DD/MM/YYYY a DD/MM/YYYY" em Date.
 * Extrai ano quando presente; caso contrário infere pelo contexto.
 */
export function parsePeriodToDate(period: string, refDate?: Date): Date | null {
  const matchWithYear = period.match(/(\d{1,2})\/(\d{1,2})\/(\d{4})/)
  if (matchWithYear) {
    const day = parseInt(matchWithYear[1])
    const month = parseInt(matchWithYear[2]) - 1
    const year = parseInt(matchWithYear[3])
    return new Date(year, month, day)
  }

  const match = period.match(/(\d{1,2})\/(\d{1,2})/)
  if (!match) return null

  const day = parseInt(match[1])
  const month = parseInt(match[2]) - 1
  const today = refDate || new Date()
  const currentYear = today.getFullYear()
  const currentMonth = today.getMonth()

  let year = currentYear
  if (month === 11 && currentMonth <= 1) year = currentYear - 1
  else if (month === 0 && currentMonth === 11) year = currentYear + 1
  else if (month > currentMonth) year = currentYear - 1

  return new Date(year, month, day)
}

/**
 * Retorna o ano do ciclo para uma data.
 * Ciclo 2026: fev/2026 a jan/2027 → ano do ciclo = 2026
 * Ciclo 2027: fev/2027 a jan/2028 → ano do ciclo = 2027
 */
export function getCycleYear(date: Date): number {
  const year = date.getFullYear()
  const month = date.getMonth() + 1
  // Janeiro (1) pertence ao ciclo do ano anterior
  if (month < CICLO_INICIO_MES) return year - 1
  return year
}

/**
 * Verifica se um período está dentro do ciclo atual (a partir de fev/2026).
 */
export function isInCurrentCycle(period: string, refDate?: Date): boolean {
  const date = parsePeriodToDate(period, refDate)
  if (!date) return false
  const cycleYear = getCycleYear(date)
  return cycleYear >= CICLO_INICIO_ANO
}

/**
 * Filtra dados para incluir apenas períodos do ciclo atual (fev a fev).
 */
export function filterByCurrentCycle<T extends { period: string }>(
  data: T[],
  refDate?: Date
): T[] {
  return data.filter((d) => isInCurrentCycle(d.period, refDate))
}
