import type { ButtonHTMLAttributes, ReactNode } from 'react'

const variantStyles = {
  primary:
    'bg-sky-600 text-white hover:bg-sky-500 focus-visible:ring-sky-300',
  outline:
    'border border-slate-300 text-slate-700 hover:border-slate-400 hover:bg-slate-100',
  ghost: 'text-slate-600 hover:bg-slate-100',
}

const sizeStyles = {
  sm: 'px-3 py-1.5 text-xs',
  md: 'px-4 py-2 text-sm',
  lg: 'px-5 py-2.5 text-sm',
}

type ButtonProps = ButtonHTMLAttributes<HTMLButtonElement> & {
  children: ReactNode
  variant?: keyof typeof variantStyles
  size?: keyof typeof sizeStyles
}

export default function Button({
  children,
  className = '',
  variant = 'primary',
  size = 'md',
  ...props
}: ButtonProps) {
  return (
    <button
      className={`inline-flex items-center justify-center rounded-full font-semibold transition focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-offset-2 focus-visible:ring-offset-transparent ${variantStyles[variant]} ${sizeStyles[size]} ${className}`}
      {...props}
    >
      {children}
    </button>
  )
}
