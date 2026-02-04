'use client'

import { Search, X } from 'lucide-react'
import { useState } from 'react'

interface SearchBarProps {
  onSearch: (query: string) => void
  placeholder?: string
}

export default function SearchBar({ onSearch, placeholder = "Buscar períodos, valores, metas..." }: SearchBarProps) {
  const [searchQuery, setSearchQuery] = useState('')

  const handleSearch = (value: string) => {
    setSearchQuery(value)
    onSearch(value)
  }

  const clearSearch = () => {
    setSearchQuery('')
    onSearch('')
  }

  return (
    <div className="relative w-full">
      <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
        <Search className="h-5 w-5 text-gray-400" />
      </div>
      <input
        type="text"
        value={searchQuery}
        onChange={(e) => handleSearch(e.target.value)}
        className="block w-full pl-10 pr-10 py-2 border border-gray-600 rounded-lg bg-gray-700 text-gray-100 placeholder-gray-400 focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
        placeholder={placeholder}
      />
      {searchQuery && (
        <button
          onClick={clearSearch}
          className="absolute inset-y-0 right-0 pr-3 flex items-center"
        >
          <X className="h-5 w-5 text-gray-400 hover:text-white" />
        </button>
      )}
    </div>
  )
}

