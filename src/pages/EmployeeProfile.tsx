import { useEffect, useState, useRef, MouseEvent } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import { getEmployeeByEmployeeId } from '../services/employeeService'
import type { EmployeeRecord } from '../types/employee'

// --- Canvas Particle Background Component ---
const ParticleBackground = ({ isLightMode }: { isLightMode: boolean }) => {
  const canvasRef = useRef<HTMLCanvasElement>(null)

  useEffect(() => {
    const canvas = canvasRef.current
    if (!canvas) return
    const ctx = canvas.getContext('2d')
    if (!ctx) return

    let animationFrameId: number
    let particles: { x: number; y: number; vx: number; vy: number; radius: number }[] = []

    const init = () => {
      canvas.width = window.innerWidth
      canvas.height = window.innerHeight
      particles = []
      const particleCount = Math.min(window.innerWidth / 10, 100) // Responsive count
      for (let i = 0; i < particleCount; i++) {
        particles.push({
          x: Math.random() * canvas.width,
          y: Math.random() * canvas.height,
          vx: (Math.random() - 0.5) * 1.5,
          vy: (Math.random() - 0.5) * 1.5,
          radius: Math.random() * 2 + 1,
        })
      }
    }

    const draw = () => {
      if (!ctx || !canvas) return
      ctx.clearRect(0, 0, canvas.width, canvas.height)
      
      const dotColor = isLightMode ? 'rgba(16, 185, 129, 0.3)' : 'rgba(16, 185, 129, 0.4)'
      const lineBaseAlpha = isLightMode ? 0.2 : 0.15
      
      particles.forEach((p, i) => {
        p.x += p.vx
        p.y += p.vy
        if (p.x < 0 || p.x > canvas.width) p.vx *= -1
        if (p.y < 0 || p.y > canvas.height) p.vy *= -1

        ctx.beginPath()
        ctx.arc(p.x, p.y, p.radius, 0, Math.PI * 2)
        ctx.fillStyle = dotColor
        ctx.fill()

        // Draw connecting lines
        for (let j = i + 1; j < particles.length; j++) {
          const p2 = particles[j]
          const dist = Math.hypot(p.x - p2.x, p.y - p2.y)
          if (dist < 120) {
            ctx.beginPath()
            ctx.moveTo(p.x, p.y)
            ctx.lineTo(p2.x, p2.y)
            ctx.strokeStyle = `rgba(16, 185, 129, ${lineBaseAlpha - dist / 800})`
            ctx.stroke()
          }
        }
      })
      animationFrameId = requestAnimationFrame(draw)
    }

    init()
    draw()

    const handleResize = () => init()
    window.addEventListener('resize', handleResize)
    return () => {
      window.removeEventListener('resize', handleResize)
      cancelAnimationFrame(animationFrameId)
    }
  }, [isLightMode])

  return <canvas ref={canvasRef} className={`absolute inset-0 z-0 pointer-events-none opacity-40 ${isLightMode ? 'mix-blend-multiply' : 'mix-blend-screen'}`} />
}

export default function EmployeeProfile() {
  const { employeeId } = useParams()
  const navigate = useNavigate()
  const [employee, setEmployee] = useState<EmployeeRecord | null>(null)
  const [isLoading, setIsLoading] = useState(true)
  const [isLightMode, setIsLightMode] = useState(false)

  // Spotlight Hover State
  const cardRef = useRef<HTMLDivElement>(null)
  const [mousePos, setMousePos] = useState({ x: 0, y: 0 })
  const [isHovered, setIsHovered] = useState(false)

  useEffect(() => {
    if (!employeeId) {
      setIsLoading(false)
      return
    }

    const loadProfile = async () => {
      setIsLoading(true)
      try {
        const record = await getEmployeeByEmployeeId(employeeId)
        setEmployee(record)
      } catch (error) {
        console.error('Error fetching employee profile:', error)
      } finally {
        setIsLoading(false)
      }
    }
    void loadProfile()
  }, [employeeId])

  const handleShare = async () => {
    if (navigator.share) {
      try {
        await navigator.share({
          title: `${employee?.name} - Mentneo`,
          text: `Digital Visiting Card for ${employee?.name}, ${employee?.role} at Mentneo.`,
          url: window.location.href,
        })
      } catch (err) {
        console.log('Error sharing', err)
      }
    }
  }

  // Spotlight Mouse Move Logic
  const handleMouseMove = (e: MouseEvent<HTMLDivElement>) => {
    if (!cardRef.current) return
    const rect = cardRef.current.getBoundingClientRect()
    setMousePos({
      x: e.clientX - rect.left,
      y: e.clientY - rect.top,
    })
  }

  const handleMouseEnter = () => setIsHovered(true)
  const handleMouseLeave = () => setIsHovered(false)

  if (isLoading) {
    return (
      <div className={`flex min-h-screen items-center justify-center ${isLightMode ? 'bg-slate-50' : 'bg-[#050505]'}`}>
        <div className="flex flex-col items-center gap-4">
          <div className="h-12 w-12 rounded-full border-4 border-emerald-500/20 border-t-emerald-500 animate-spin"></div>
          <div className="text-sm font-semibold tracking-widest text-emerald-500/60 uppercase">Loading Identity...</div>
        </div>
      </div>
    )
  }

  if (!employee) {
    return (
      <div className={`flex min-h-screen items-center justify-center p-6 relative overflow-hidden ${isLightMode ? 'bg-slate-50' : 'bg-[#050505]'}`}>
        <ParticleBackground isLightMode={isLightMode} />
        <div className={`rounded-[2rem] p-10 text-center shadow-2xl backdrop-blur-xl w-full max-w-sm relative overflow-hidden z-10 ${isLightMode ? 'bg-white/80 border-slate-200 text-slate-900' : 'bg-white/5 border-white/10 text-white'}`}>
          <h2 className="text-2xl font-bold tracking-tight">Identity Not Found</h2>
          <p className={`mt-3 text-sm leading-relaxed ${isLightMode ? 'text-slate-500' : 'text-white/50'}`}>The scanned secure code is invalid or no longer exists.</p>
        </div>
      </div>
    )
  }

  return (
    <div className={`min-h-screen relative overflow-hidden flex flex-col font-sans selection:bg-emerald-500/30 transition-colors duration-500 ${isLightMode ? 'bg-slate-50 text-slate-900' : 'bg-[#020617] text-white'}`}>
      
      {/* Immersive Background Effects */}
      <ParticleBackground isLightMode={isLightMode} />
      <div className={`absolute top-[-20%] left-[-10%] w-[70%] h-[70%] rounded-full blur-[150px] animate-pulse pointer-events-none ${isLightMode ? 'bg-emerald-200/50 mix-blend-multiply' : 'bg-emerald-900/20 mix-blend-screen'}`}></div>
      <div className={`absolute bottom-[-20%] right-[-10%] w-[70%] h-[70%] rounded-full blur-[150px] animate-pulse pointer-events-none ${isLightMode ? 'bg-sky-200/50 mix-blend-multiply' : 'bg-sky-900/20 mix-blend-screen'}`} style={{ animationDelay: '2s' }}></div>
      <div className={`absolute inset-0 bg-[url('https://grainy-gradients.vercel.app/noise.svg')] opacity-10 pointer-events-none ${isLightMode ? 'mix-blend-darken' : 'mix-blend-overlay'}`}></div>

      {/* Top Navigation */}
      <div className="w-full flex items-center justify-between px-6 lg:px-12 py-6 z-20 mx-auto w-full max-w-7xl">
        <div className="flex items-center gap-3">
          <div className="w-3 h-3 rounded-full bg-emerald-400 animate-pulse shadow-[0_0_15px_rgba(52,211,153,0.8)]"></div>
          <span className={`font-bold tracking-[0.3em] text-xs uppercase ${isLightMode ? 'text-slate-800' : 'text-white/90'}`}>Mentneo</span>
        </div>
        <div className="flex items-center gap-3">
          <button
            onClick={() => setIsLightMode(!isLightMode)}
            className={`p-2.5 rounded-full transition-colors ${isLightMode ? 'bg-slate-200 text-slate-700 hover:bg-slate-300' : 'bg-white/10 text-white hover:bg-white/20'}`}
          >
            {isLightMode ? (
              <svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M21 12.79A9 9 0 1 1 11.21 3 7 7 0 0 0 21 12.79z"></path></svg>
            ) : (
              <svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><circle cx="12" cy="12" r="5"></circle><line x1="12" y1="1" x2="12" y2="3"></line><line x1="12" y1="21" x2="12" y2="23"></line><line x1="4.22" y1="4.22" x2="5.64" y2="5.64"></line><line x1="18.36" y1="18.36" x2="19.78" y2="19.78"></line><line x1="1" y1="12" x2="3" y2="12"></line><line x1="21" y1="12" x2="23" y2="12"></line><line x1="4.22" y1="19.78" x2="5.64" y2="18.36"></line><line x1="18.36" y1="5.64" x2="19.78" y2="4.22"></line></svg>
            )}
          </button>
          <button 
            onClick={() => navigate(`/app/${employee.employeeId}`)}
            className="group relative px-6 py-2.5 text-xs font-bold text-emerald-950 bg-emerald-400 hover:bg-emerald-300 rounded-full transition-all shadow-[0_0_20px_rgba(52,211,153,0.3)] hover:shadow-[0_0_30px_rgba(52,211,153,0.5)] overflow-hidden"
          >
            <span className="relative z-10">Employee Portal</span>
          </button>
        </div>
      </div>

      {/* Main Dual Layout Content */}
      <div className="flex-1 w-full max-w-7xl mx-auto px-6 lg:px-12 grid grid-cols-1 lg:grid-cols-2 gap-12 lg:gap-24 items-center z-10 pb-12 lg:pb-0">
        
        {/* Left Side: Massive Typography & Context (Desktop mainly) */}
        <div className="hidden lg:flex flex-col justify-center max-w-xl">
          <div className={`inline-flex items-center gap-2 px-4 py-2 rounded-full border backdrop-blur-md w-max mb-8 ${isLightMode ? 'bg-white/80 border-slate-200' : 'bg-white/5 border-white/10'}`}>
            <span className="h-2 w-2 rounded-full bg-emerald-400"></span>
            <span className={`text-xs font-bold uppercase tracking-widest ${isLightMode ? 'text-slate-600' : 'text-white/70'}`}>Verified Digital Identity</span>
          </div>
          <h1 className="text-6xl xl:text-7xl font-black tracking-tighter leading-[1.1] mb-6">
            Meet <br/>
            <span className="text-transparent bg-clip-text bg-gradient-to-r from-emerald-500 to-sky-500">
              {employee.name.split(' ')[0]}
            </span>
          </h1>
          <p className={`text-lg leading-relaxed mb-10 max-w-md ${isLightMode ? 'text-slate-600' : 'text-slate-400'}`}>
            This is an official, verified Mentneo secure digital identity pass. The individual listed here is an active team member holding the position of <strong>{employee.role}</strong>.
          </p>
          <div className="flex items-center gap-6 text-sm font-semibold text-emerald-600 uppercase tracking-widest">
            <span className="flex items-center gap-2"><svg className="w-5 h-5 text-emerald-500" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" /></svg> Active Access</span>
            <span className="flex items-center gap-2"><svg className="w-5 h-5 text-emerald-500" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z" /></svg> End-to-End Secure</span>
          </div>
        </div>

        {/* Right Side: The Spotlight Card */}
        <div className="flex items-center justify-center lg:justify-end w-full">
          <div 
            ref={cardRef}
            onMouseMove={handleMouseMove}
            onMouseEnter={handleMouseEnter}
            onMouseLeave={handleMouseLeave}
            className="w-full max-w-sm z-20 group relative"
          >
            {/* The Actual Card Surface */}
            <div className={`relative rounded-[2.5rem] p-[1px] shadow-[0_20px_50px_rgba(0,0,0,0.5)] ${isLightMode ? 'bg-gradient-to-b from-slate-200 to-slate-100 shadow-slate-300' : 'bg-gradient-to-b from-white/10 to-white/5'}`}>
              
              {/* Outer Glow Spotlight (Follows Mouse) */}
              <div 
                className="pointer-events-none absolute -inset-1 rounded-[2.5rem] opacity-0 transition-opacity duration-300 group-hover:opacity-100 blur-2xl -z-10"
                style={{
                  background: isHovered ? `radial-gradient(400px circle at ${mousePos.x}px ${mousePos.y}px, ${isLightMode ? 'rgba(52,211,153,0.4)' : 'rgba(52,211,153,0.3)'}, transparent 40%)` : ''
                }}
              />
              
              <div className={`relative h-full w-full rounded-[2.5rem] backdrop-blur-3xl overflow-hidden shadow-2xl flex flex-col border ${isLightMode ? 'bg-white/90 border-white' : 'bg-slate-900/80 border-white/10'}`}>
                
                {/* Inner Glow Spotlight (Follows Mouse) */}
                <div 
                  className="pointer-events-none absolute inset-0 opacity-0 transition-opacity duration-300 group-hover:opacity-100"
                  style={{
                    background: isHovered ? `radial-gradient(600px circle at ${mousePos.x}px ${mousePos.y}px, ${isLightMode ? 'rgba(52,211,153,0.1)' : 'rgba(52,211,153,0.05)'}, transparent 40%)` : ''
                  }}
                />
                
                <div className="p-8 pt-10 relative z-10 flex flex-col items-center">
                  
                  {/* Premium Avatar */}
                  <div className="relative mb-6 cursor-default">
                    <div className="absolute -inset-2 bg-gradient-to-tr from-emerald-400 to-sky-400 rounded-full blur opacity-30 group-hover:opacity-60 group-hover:rotate-180 transition-all duration-1000"></div>
                    {employee.profileImageUrl ? (
                      <img src={employee.profileImageUrl} alt={employee.name} className={`relative h-36 w-36 rounded-full object-cover border-4 shadow-2xl ${isLightMode ? 'border-white bg-slate-100' : 'border-slate-900 bg-slate-800'}`} />
                    ) : (
                      <div className={`relative flex h-36 w-36 items-center justify-center rounded-full border-4 shadow-2xl text-6xl font-black ${isLightMode ? 'border-white bg-slate-100 text-slate-800' : 'border-slate-900 bg-gradient-to-br from-slate-800 to-slate-900 text-white'}`}>
                        {employee.name.charAt(0)}
                      </div>
                    )}
                    {/* Verified Badge */}
                    <div className={`absolute bottom-1 right-2 h-10 w-10 rounded-full bg-emerald-500 border-4 flex items-center justify-center shadow-lg transform hover:scale-110 transition-transform ${isLightMode ? 'border-white' : 'border-slate-900'}`}>
                      <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="#fff" strokeWidth="4" strokeLinecap="round" strokeLinejoin="round"><polyline points="20 6 9 17 4 12"></polyline></svg>
                    </div>
                  </div>
                  
                  <h2 className="text-3xl font-black tracking-tight mb-1 text-center">{employee.name}</h2>
                  <p className="text-sm font-bold text-emerald-500 tracking-widest uppercase text-center mb-8">{employee.role}</p>
                  
                  <div className="w-full space-y-3">
                    {/* ID Block */}
                    <div className={`flex flex-col items-center justify-center py-4 rounded-2xl border transition-colors ${isLightMode ? 'bg-slate-50 border-slate-200 hover:border-slate-300' : 'bg-black/40 border-white/5 hover:border-white/20'}`}>
                      <span className={`text-[10px] font-bold uppercase tracking-[0.2em] mb-1 ${isLightMode ? 'text-slate-500' : 'text-slate-400'}`}>Employee ID</span>
                      <span className="text-lg font-mono font-bold tracking-widest">{employee.employeeId}</span>
                    </div>

                    {/* Contact Block */}
                    {(employee.email || employee.phone) && (
                      <div className={`flex flex-col gap-1 p-2 rounded-2xl border ${isLightMode ? 'bg-slate-50 border-slate-200' : 'bg-black/40 border-white/5'}`}>
                        {employee.email && (
                          <div className={`flex items-center gap-4 p-3 rounded-xl transition-colors cursor-pointer group/item ${isLightMode ? 'hover:bg-white' : 'hover:bg-white/5'}`}>
                            <div className={`h-10 w-10 shrink-0 rounded-full flex items-center justify-center transition-all ${isLightMode ? 'bg-slate-200 text-slate-500 group-hover/item:text-slate-900 group-hover/item:bg-emerald-100' : 'bg-slate-800 text-slate-400 group-hover/item:text-white group-hover/item:bg-emerald-500/20'}`}>
                              <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M4 4h16c1.1 0 2 .9 2 2v12c0 1.1-.9 2-2 2H4c-1.1 0-2-.9-2-2V6c0-1.1.9-2 2-2z"></path><polyline points="22,6 12,13 2,6"></polyline></svg>
                            </div>
                            <div className="flex flex-col overflow-hidden w-full">
                              <span className={`text-[10px] font-bold uppercase tracking-wider ${isLightMode ? 'text-slate-500' : 'text-slate-400'}`}>Email Address</span>
                              <span className={`text-sm font-semibold truncate ${isLightMode ? 'text-slate-900' : 'text-slate-200'}`}>{employee.email}</span>
                            </div>
                          </div>
                        )}
                        {employee.phone && (
                          <div className={`flex items-center gap-4 p-3 rounded-xl transition-colors cursor-pointer group/item ${isLightMode ? 'hover:bg-white' : 'hover:bg-white/5'}`}>
                            <div className={`h-10 w-10 shrink-0 rounded-full flex items-center justify-center transition-all ${isLightMode ? 'bg-slate-200 text-slate-500 group-hover/item:text-slate-900 group-hover/item:bg-emerald-100' : 'bg-slate-800 text-slate-400 group-hover/item:text-white group-hover/item:bg-emerald-500/20'}`}>
                              <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M22 16.92v3a2 2 0 0 1-2.18 2 19.79 19.79 0 0 1-8.63-3.07 19.5 19.5 0 0 1-6-6 19.79 19.79 0 0 1-3.07-8.67A2 2 0 0 1 4.11 2h3a2 2 0 0 1 2 1.72 12.84 12.84 0 0 0 .7 2.81 2 2 0 0 1-.45 2.11L8.09 9.91a16 16 0 0 0 6 6l1.27-1.27a2 2 0 0 1 2.11-.45 12.84 12.84 0 0 0 2.81.7A2 2 0 0 1 22 16.92z"></path></svg>
                            </div>
                            <div className="flex flex-col">
                              <span className={`text-[10px] font-bold uppercase tracking-wider ${isLightMode ? 'text-slate-500' : 'text-slate-400'}`}>Phone Number</span>
                              <span className={`text-sm font-semibold ${isLightMode ? 'text-slate-900' : 'text-slate-200'}`}>{employee.phone}</span>
                            </div>
                          </div>
                        )}
                      </div>
                    )}
                  </div>
                </div>

                {/* Card Action Footer */}
                <div className={`mt-auto p-4 border-t backdrop-blur-md flex ${isLightMode ? 'border-slate-100 bg-slate-50/50' : 'border-white/10 bg-black/50'}`}>
                  <button 
                    onClick={handleShare}
                    className={`flex-1 flex items-center justify-center gap-2 py-3 rounded-xl text-sm font-bold transition-all hover:scale-[1.02] active:scale-[0.98] ${isLightMode ? 'bg-slate-200 hover:bg-slate-300 text-slate-900' : 'bg-white/10 hover:bg-white/20 text-white'}`}
                  >
                    <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><circle cx="18" cy="5" r="3"></circle><circle cx="6" cy="12" r="3"></circle><circle cx="18" cy="19" r="3"></circle><line x1="8.59" y1="13.51" x2="15.42" y2="17.49"></line><line x1="15.41" y1="6.51" x2="8.59" y2="10.49"></line></svg>
                    Share Digital Pass
                  </button>
                </div>
                
              </div>
            </div>
          </div>
        </div>
      </div>
      
      {/* Mobile Footer Credit */}
      <div className={`lg:hidden mt-auto py-8 text-center text-[10px] font-bold uppercase tracking-widest flex items-center justify-center gap-2 ${isLightMode ? 'text-slate-400' : 'text-slate-500'}`}>
        <svg xmlns="http://www.w3.org/2000/svg" width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><rect x="3" y="11" width="18" height="11" rx="2" ry="2"></rect><path d="M7 11V7a5 5 0 0 1 10 0v4"></path></svg>
        Secured by Mentneo
      </div>

    </div>
  )
}
