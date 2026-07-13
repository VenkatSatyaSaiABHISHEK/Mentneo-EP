import { useState, useEffect } from 'react'
import Logo from '../components/Logo'

export default function Maintenance() {
  const [email, setEmail] = useState('')
  const [isSubmitted, setIsSubmitted] = useState(false)
  const [progress, setProgress] = useState(82)
  const [activeStep, setActiveStep] = useState(2) // 0: Init, 1: Migrating, 2: Optimizing, 3: Verifying

  // Check if already subscribed previously
  useEffect(() => {
    const savedEmail = localStorage.getItem('mentneo_maintenance_notify')
    if (savedEmail) {
      setIsSubmitted(true)
    }
  }, [])

  // Slowly increment progress towards 98% to make it feel alive
  useEffect(() => {
    const timer = setInterval(() => {
      setProgress((prev) => {
        if (prev >= 98) {
          clearInterval(timer)
          return 98
        }
        const nextProgress = prev + Math.random() * 0.8
        if (nextProgress > 90 && activeStep === 2) {
          setActiveStep(3)
        }
        return nextProgress
      })
    }, 4000)

    return () => clearInterval(timer)
  }, [activeStep])

  const handleNotifySubmit = (e: React.FormEvent) => {
    e.preventDefault()
    if (email.trim() && email.includes('@')) {
      localStorage.setItem('mentneo_maintenance_notify', email)
      setIsSubmitted(true)
      setEmail('')
    }
  }

  return (
    <div className="relative flex min-h-screen flex-col items-center justify-center overflow-hidden bg-slate-50/80 px-6 py-12 text-slate-800 antialiased font-sans">
      
      {/* Background glowing ambient elements */}
      <div className="absolute top-1/4 left-1/4 h-[500px] w-[500px] -translate-x-1/2 -translate-y-1/2 rounded-full bg-violet-200/40 blur-[150px] pointer-events-none animate-pulse duration-[6000ms]" />
      <div className="absolute bottom-1/4 right-1/4 h-[600px] w-[600px] translate-x-1/2 translate-y-1/2 rounded-full bg-sky-200/40 blur-[180px] pointer-events-none animate-pulse duration-[8000ms]" />
      <div className="absolute top-1/2 left-1/2 h-[400px] w-[400px] -translate-x-1/2 -translate-y-1/2 rounded-full bg-amber-100/30 blur-[130px] pointer-events-none animate-pulse duration-[7000ms]" />
      
      {/* Decorative Grid Overlay */}
      <div className="absolute inset-0 bg-[radial-gradient(rgba(15,23,42,0.03)_1px,transparent_1px)] [background-size:24px_24px] pointer-events-none" />

      {/* Grid Container for Laptop/Desktop layout */}
      <div className="relative w-full max-w-6xl grid grid-cols-1 lg:grid-cols-12 gap-12 lg:gap-16 items-center z-10 animate-rise px-4">
        
        {/* Left Side: Branding + Big Typography + Gears */}
        <div className="lg:col-span-7 flex flex-col items-center lg:items-start text-center lg:text-left">
          
          {/* Logo container */}
          <div className="bg-white/90 px-6 py-3 rounded-full border border-slate-100 shadow-[0_4px_12px_rgba(0,0,0,0.02)] flex items-center justify-center mb-8">
            <Logo size="lg" />
          </div>

          {/* Gears Icon Container */}
          <div className="relative flex items-center justify-center h-48 w-48 mb-8 lg:mb-10">
            {/* Outer glowing rings */}
            <div className="absolute h-40 w-40 rounded-full border-2 border-dashed border-indigo-600/10 animate-spin" style={{ animationDuration: '40s' }} />
            <div className="absolute h-32 w-32 rounded-full border border-sky-400/15 animate-spin" style={{ animationDuration: '20s', animationDirection: 'reverse' }} />
            
            {/* Visual SVG Gears */}
            <svg className="w-24 h-24 text-indigo-600 z-10 filter drop-shadow-[0_0_12px_rgba(79,70,229,0.25)]" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5">
              <path 
                className="animate-spin" 
                style={{ transformOrigin: 'center', animationDuration: '15s' }}
                d="M12 8a4 4 0 1 0 0 8 4 4 0 0 0 0-8z M12 2v2M12 20v2M4.22 4.22l1.42 1.42M18.36 18.36l1.42 1.42M2 12h2M20 12h2M4.22 19.78l1.42-1.42M18.36 5.64l1.42-1.42" 
              />
            </svg>

            {/* Gear 2 (Smaller Gear) */}
            <svg className="absolute w-14 h-14 text-sky-500 z-10 ml-20 -mt-12 filter drop-shadow-[0_0_8px_rgba(56,189,248,0.3)]" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5">
              <path 
                className="animate-spin" 
                style={{ transformOrigin: 'center', animationDuration: '8s', animationDirection: 'reverse' }}
                d="M12 8a4 4 0 1 0 0 8 4 4 0 0 0 0-8z M12 2v2M12 20v2M4.22 4.22l1.42 1.42M18.36 18.36l1.42 1.42M2 12h2M20 12h2M4.22 19.78l1.42-1.42M18.36 5.64l1.42-1.42" 
              />
            </svg>
          </div>

          <h1 className="text-4xl sm:text-5xl lg:text-6xl font-black tracking-tight bg-gradient-to-br from-slate-900 via-indigo-950 to-slate-800 bg-clip-text text-transparent leading-[1.1] mb-6">
            System Upgrades <br className="hidden lg:block" />In Progress
          </h1>
          
          <p className="text-lg text-slate-600 max-w-lg leading-relaxed font-medium mb-8">
            Mentneo is currently undergoing scheduled enhancements to optimize performance and security. We'll be live again shortly.
          </p>

          {/* Task Status Bulletins */}
          <div className="grid grid-cols-3 gap-4 text-xs w-full max-w-md">
            <div className="flex items-center justify-center lg:justify-start gap-2.5 px-4 py-3 bg-white/80 rounded-2xl border border-slate-200/50 shadow-[0_2px_8px_rgba(0,0,0,0.01)]">
              <span className="h-2.5 w-2.5 rounded-full bg-emerald-500 shadow-[0_0_8px_rgba(16,185,129,0.4)]" />
              <span className="text-slate-700 font-bold">Database</span>
            </div>
            <div className="flex items-center justify-center lg:justify-start gap-2.5 px-4 py-3 bg-white/80 rounded-2xl border border-slate-200/50 shadow-[0_2px_8px_rgba(0,0,0,0.01)]">
              <span className="h-2.5 w-2.5 rounded-full bg-emerald-500 shadow-[0_0_8px_rgba(16,185,129,0.4)]" />
              <span className="text-slate-700 font-bold">Security Wall</span>
            </div>
            <div className="flex items-center justify-center lg:justify-start gap-2.5 px-4 py-3 bg-white/80 rounded-2xl border border-slate-200/50 shadow-[0_2px_8px_rgba(0,0,0,0.01)]">
              <span className="h-2.5 w-2.5 rounded-full bg-indigo-500 animate-pulse shadow-[0_0_8px_rgba(129,140,248,0.4)]" />
              <span className="text-slate-700 font-bold">CDN Refresh</span>
            </div>
          </div>

        </div>

        {/* Right Side: Interactive Console Card */}
        <div className="lg:col-span-5 w-full bg-white/70 border border-white rounded-[32px] p-8 md:p-10 shadow-[0_30px_70px_rgba(79,70,229,0.08)] backdrop-blur-2xl flex flex-col justify-between">
          
          <div>
            <h2 className="text-xl font-extrabold text-slate-800 tracking-tight mb-2">Upgrade Console</h2>
            <p className="text-xs text-slate-500 font-medium mb-6">Real-time optimization status</p>
            
            {/* Live Progress Bar */}
            <div className="bg-slate-50/80 rounded-2xl p-6 border border-slate-100 shadow-inner mb-6">
              <div className="flex justify-between items-center mb-2.5 text-xs font-bold uppercase tracking-wider text-slate-500">
                <span>Progress Tracker</span>
                <span className="text-indigo-600 font-mono font-extrabold">{Math.floor(progress)}%</span>
              </div>
              
              {/* Progress track */}
              <div className="h-3 w-full bg-slate-200/60 rounded-full overflow-hidden border border-slate-100">
                <div 
                  className="h-full bg-gradient-to-r from-indigo-500 via-purple-500 to-sky-400 transition-all duration-1000 ease-out" 
                  style={{ width: `${progress}%` }}
                />
              </div>

              {/* Current action indicator */}
              <div className="mt-5 flex items-center justify-center gap-2 text-xs text-slate-600 font-semibold bg-white py-2 px-3 rounded-xl border border-slate-100">
                <span className="relative flex h-2 w-2">
                  <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-sky-500 opacity-75"></span>
                  <span className="relative inline-flex rounded-full h-2 w-2 bg-sky-500"></span>
                </span>
                <span>
                  {activeStep === 0 && 'Initializing update sequences...'}
                  {activeStep === 1 && 'Running schema migrations...'}
                  {activeStep === 2 && 'Optimizing assets & server cache...'}
                  {activeStep === 3 && 'Performing integrity verifications...'}
                </span>
              </div>
            </div>
          </div>

          {/* Notify Me Form */}
          <div className="border-t border-slate-100 pt-6">
            <h3 className="text-sm font-bold text-slate-800 mb-3">Launch Notification</h3>
            {!isSubmitted ? (
              <form onSubmit={handleNotifySubmit} className="flex flex-col gap-2">
                <input
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="Enter email address"
                  className="w-full px-4 py-3 rounded-xl border border-slate-200 bg-white text-sm text-slate-800 placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500"
                  required
                />
                <button
                  type="submit"
                  className="w-full py-3 rounded-xl bg-gradient-to-r from-indigo-600 to-violet-600 hover:from-indigo-500 hover:to-violet-500 text-sm font-semibold text-white shadow-lg shadow-indigo-600/15 hover:shadow-indigo-600/25 transition-all focus:outline-none focus:ring-2 focus:ring-indigo-500"
                >
                  Notify Me
                </button>
              </form>
            ) : (
              <div className="flex items-center justify-center gap-2.5 text-emerald-700 bg-emerald-50 py-3.5 px-4 rounded-xl border border-emerald-100 text-sm animate-rise">
                <svg className="w-5 h-5 flex-shrink-0 text-emerald-600" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2">
                  <path strokeLinecap="round" strokeLinejoin="round" d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
                </svg>
                <span className="font-semibold">We will notify you when we go live!</span>
              </div>
            )}
          </div>

        </div>

      </div>

      {/* Footer Info */}
      <div className="mt-16 text-xs text-slate-400 z-10 flex flex-col items-center gap-1">
        <p>&copy; {new Date().getFullYear()} Mentneo. All rights reserved.</p>
        <p className="opacity-80">Scheduled updates typically resolve within 30 minutes.</p>
      </div>

    </div>
  )
}
