import { Search, X } from 'lucide-react'
import { Input } from '@/components/ui/input'

interface SearchInputProps {
  value:       string
  onChange:    (v: string) => void
  placeholder?: string
  className?:   string
}

export const SearchInput = ({ value, onChange, placeholder = 'Search…', className }: SearchInputProps) => (
  <div className={`relative ${className ?? ''}`}>
    <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400 pointer-events-none" />
    <Input
      value={value}
      onChange={(e) => onChange(e.target.value)}
      placeholder={placeholder}
      className="pl-8 pr-8 h-9"
    />
    {value && (
      <button onClick={() => onChange('')} className="absolute right-2.5 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600">
        <X className="h-3.5 w-3.5" />
      </button>
    )}
  </div>
)
