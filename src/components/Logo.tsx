interface LogoProps {
  className?: string
  size?: 'sm' | 'md' | 'lg' | 'xl'
}

export default function Logo({ className = '', size = 'md' }: LogoProps) {
  const sizeMap = {
    sm: { img: 28, text: 'text-xl' },
    md: { img: 36, text: 'text-3xl' },
    lg: { img: 44, text: 'text-4xl' },
    xl: { img: 52, text: 'text-5xl' },
  }

  const { img, text } = sizeMap[size]

  return (
    <div className={`flex items-center gap-2 select-none ${className}`}>
      <img
        src="https://i.ibb.co/LbQGyJJ/Screenshot-2025-08-05-170614-removebg-preview-20260208-085437-0000-1.png"
        alt="Mentneo Logo"
        width={img}
        height={img}
        style={{ objectFit: 'contain' }}
      />
      <span className={`font-['Anton'] tracking-wider ${text} bg-gradient-to-r from-[#7B61FF] to-[#4D96FF] bg-clip-text text-transparent`}>
        MENTNEO
      </span>
    </div>
  )
}
