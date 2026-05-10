import type { ReactNode } from 'react'

type CardProps = {
  title?: string
  value?: string
  subtitle?: string
  className?: string
  children?: ReactNode
}

export default function Card({
  title,
  value,
  subtitle,
  className = '',
  children,
}: CardProps) {
  return (
    <div className={`glass-card rounded-2xl p-5 ${className}`}>
      {(title || value || subtitle) && (
        <div className="mb-4">
          {title && <p className="text-xs uppercase tracking-[0.2em] text-slate-500">{title}</p>}
          {value && <p className="mt-2 text-2xl font-semibold text-slate-900">{value}</p>}
          {subtitle && <p className="text-sm text-muted mt-1">{subtitle}</p>}
        </div>
      )}
      {children}
    </div>
  )
}
