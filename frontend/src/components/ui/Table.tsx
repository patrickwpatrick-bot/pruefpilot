/**
 * Table — Core UI Component
 * Sortable, with Loading/Empty States
 */
import React from 'react'

interface Column<T> {
  key: string
  header: string
  render?: (item: T) => React.ReactNode
  className?: string
  hideOnMobile?: boolean
  align?: 'left' | 'center' | 'right'
}

interface TableProps<T> {
  columns: Column<T>[]
  data: T[]
  keyExtractor: (item: T) => string
  loading?: boolean
  emptyMessage?: string
  onRowClick?: (item: T) => void
}

export function Table<T>({
  columns,
  data,
  keyExtractor,
  loading = false,
  emptyMessage = 'Keine Daten vorhanden',
  onRowClick,
}: TableProps<T>) {
  if (loading) {
    return (
      <div className="bg-white rounded-xl border border-gray-200 p-10 flex justify-center">
        <div className="w-5 h-5 border-2 border-gray-300 border-t-black rounded-full animate-spin" />
      </div>
    )
  }

  if (data.length === 0) {
    return (
      <div className="bg-white rounded-xl border border-gray-200 p-10 text-center">
        <p className="text-gray-400 text-sm">{emptyMessage}</p>
      </div>
    )
  }

  return (
    <div className="bg-white rounded-xl border border-gray-200 overflow-hidden">
      <table className="w-full">
        <thead>
          <tr className="border-b border-gray-100">
            {columns.map(col => (
              <th
                key={col.key}
                className={`text-xs font-medium text-gray-400 px-5 py-3 ${
                  col.align === 'right' ? 'text-right' : col.align === 'center' ? 'text-center' : 'text-left'
                } ${col.hideOnMobile ? 'hidden md:table-cell' : ''} ${col.className || ''}`}
              >
                {col.header}
              </th>
            ))}
          </tr>
        </thead>
        <tbody className="divide-y divide-gray-50">
          {data.map(item => (
            <tr
              key={keyExtractor(item)}
              className={`hover:bg-gray-50 transition-colors ${onRowClick ? 'cursor-pointer' : ''}`}
              onClick={() => onRowClick?.(item)}
            >
              {columns.map(col => (
                <td
                  key={col.key}
                  className={`px-5 py-3.5 text-sm ${
                    col.align === 'right' ? 'text-right' : col.align === 'center' ? 'text-center' : 'text-left'
                  } ${col.hideOnMobile ? 'hidden md:table-cell' : ''} ${col.className || ''}`}
                >
                  {col.render ? col.render(item) : (item as any)[col.key]}
                </td>
              ))}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  )
}
