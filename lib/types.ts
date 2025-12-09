export interface FilterState {
  period: string | 'all'
  paMin?: number
  paMax?: number
  nMin?: number
  nMax?: number
  performancePA?: 'all' | 'above' | 'below' | 'exact'
  performanceN?: 'all' | 'above' | 'below' | 'exact'
  month?: string | 'all'
  searchQuery?: string
}

