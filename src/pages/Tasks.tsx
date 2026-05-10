export default function Tasks() {
  return (
    <div className="flex min-h-[70vh] flex-col items-center justify-center space-y-6 animate-rise">
      <div className="rounded-[2.5rem] bg-white p-12 text-center shadow-2xl shadow-slate-200/50 max-w-xl mx-auto border border-slate-100">
        <div className="mx-auto mb-6 flex h-24 w-24 items-center justify-center rounded-full bg-gradient-to-br from-emerald-400 to-sky-400 shadow-lg shadow-emerald-500/20">
          <svg xmlns="http://www.w3.org/2000/svg" className="h-10 w-10 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2">
            <path strokeLinecap="round" strokeLinejoin="round" d="M19 11H5m14 0a2 2 0 012 2v6a2 2 0 01-2 2H5a2 2 0 01-2-2v-6a2 2 0 012-2m14 0V9a2 2 0 00-2-2M5 11V9a2 2 0 002-2m0 0V5a2 2 0 012-2h6a2 2 0 012 2v2M7 7h10" />
          </svg>
        </div>
        <p className="text-[10px] font-bold uppercase tracking-[0.3em] text-emerald-500 mb-2">Module In Development</p>
        <h2 className="text-4xl font-black tracking-tight text-slate-900 mb-4">Coming Soon</h2>
        <p className="text-base text-slate-500 leading-relaxed font-medium">
          We are building a powerful new Task Management engine. Soon you will be able to dynamically assign, track, and manage employee pipelines right here.
        </p>
      </div>
    </div>
  )
}
