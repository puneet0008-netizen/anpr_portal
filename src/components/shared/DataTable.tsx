import { ChevronLeft, ChevronRight, Inbox } from 'lucide-react'
import { Skeleton } from '@/components/ui/skeleton'
import { Button } from '@/components/ui/button'
import { cn } from '@/lib/utils'
import type { ReactNode } from 'react'

export interface Column<T> {
  header:    string
  accessor:  keyof T | ((row: T) => ReactNode)
  className?: string
  headerClassName?: string
}

interface PaginationState { page: number; totalPages: number; total: number; limit: number }

interface DataTableProps<T> {
  columns:       Column<T>[]
  data:          T[]
  loading?:      boolean
  pagination?:   PaginationState
  onPageChange?: (p: number) => void
  keyExtractor:  (row: T) => string
  onRowClick?:   (row: T) => void
  emptyMessage?: string
}

const SKELETON_ROWS = 6

export function DataTable<T>({
  columns, data, loading, pagination, onPageChange, keyExtractor, onRowClick, emptyMessage = 'No records found',
}: DataTableProps<T>) {
  return (
    <div className="flex flex-col gap-0">
      {/* Table */}
      <div className="overflow-x-auto rounded-xl border border-gray-200 bg-white">
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b border-gray-100 bg-gray-50">
              {columns.map((col) => (
                <th
                  key={col.header}
                  className={cn('px-4 py-3 text-left text-xs font-semibold text-gray-500 uppercase tracking-wider whitespace-nowrap', col.headerClassName)}
                >
                  {col.header}
                </th>
              ))}
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-50">
            {loading ? (
              Array.from({ length: SKELETON_ROWS }).map((_, i) => (
                <tr key={i}>
                  {columns.map((col) => (
                    <td key={col.header} className="px-4 py-3">
                      <Skeleton className="h-4 w-full rounded" />
                    </td>
                  ))}
                </tr>
              ))
            ) : data.length === 0 ? (
              <tr>
                <td colSpan={columns.length} className="py-16 text-center">
                  <div className="flex flex-col items-center gap-2 text-gray-400">
                    <Inbox className="h-8 w-8" />
                    <p className="text-sm">{emptyMessage}</p>
                  </div>
                </td>
              </tr>
            ) : (
              data.map((row) => (
                <tr
                  key={keyExtractor(row)}
                  onClick={() => onRowClick?.(row)}
                  className={cn('hover:bg-gray-50/70 transition-colors', onRowClick && 'cursor-pointer')}
                >
                  {columns.map((col) => (
                    <td key={col.header} className={cn('px-4 py-3 text-gray-700 whitespace-nowrap', col.className)}>
                      {typeof col.accessor === 'function'
                        ? col.accessor(row)
                        : (row[col.accessor] as ReactNode)}
                    </td>
                  ))}
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>

      {/* Pagination */}
      {pagination && pagination.totalPages > 1 && (
        <div className="flex items-center justify-between pt-3 px-1">
          <p className="text-xs text-gray-500">
            Showing <b>{(pagination.page - 1) * pagination.limit + 1}–{Math.min(pagination.page * pagination.limit, pagination.total)}</b> of <b>{pagination.total}</b>
          </p>
          <div className="flex items-center gap-1">
            <Button variant="outline" size="icon" className="h-7 w-7" onClick={() => onPageChange?.(pagination.page - 1)} disabled={pagination.page === 1}>
              <ChevronLeft className="h-4 w-4" />
            </Button>
            {Array.from({ length: Math.min(5, pagination.totalPages) }, (_, i) => {
              const p = Math.max(1, Math.min(pagination.page - 2, pagination.totalPages - 4)) + i
              return (
                <Button
                  key={p} variant={p === pagination.page ? 'default' : 'outline'}
                  size="icon" className="h-7 w-7 text-xs"
                  onClick={() => onPageChange?.(p)}
                >
                  {p}
                </Button>
              )
            })}
            <Button variant="outline" size="icon" className="h-7 w-7" onClick={() => onPageChange?.(pagination.page + 1)} disabled={pagination.page === pagination.totalPages}>
              <ChevronRight className="h-4 w-4" />
            </Button>
          </div>
        </div>
      )}
    </div>
  )
}
