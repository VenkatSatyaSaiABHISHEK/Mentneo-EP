import type { ReactNode } from 'react'

export type Column<T> = {
  key: keyof T
  header: string
  align?: 'left' | 'center' | 'right'
  render?: (value: T[keyof T], row: T) => ReactNode
}

export type TableProps<T> = {
  columns: Column<T>[]
  rows: T[]
  rowKey: (row: T) => string
}

export default function Table<T>({ columns, rows, rowKey }: TableProps<T>) {
  const alignClasses = {
    left: 'text-left',
    center: 'text-center',
    right: 'text-right',
  }

  return (
    <div className="overflow-hidden rounded-2xl border border-slate-200">
      <table className="w-full text-left text-sm">
        <thead className="bg-slate-100 text-xs uppercase tracking-[0.18em] text-slate-500">
          <tr>
            {columns.map((column) => (
              <th
                key={column.header}
                className={`px-4 py-3 ${alignClasses[column.align ?? 'left']}`}
              >
                {column.header}
              </th>
            ))}
          </tr>
        </thead>
        <tbody className="divide-y divide-slate-200">
          {rows.map((row) => (
            <tr key={rowKey(row)} className="bg-white">
              {columns.map((column) => (
                <td
                  key={column.header}
                  className={`px-4 py-3 text-slate-700 ${alignClasses[column.align ?? 'left']}`}
                >
                  {column.render
                    ? column.render(row[column.key], row)
                    : String(row[column.key])}
                </td>
              ))}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  )
}
