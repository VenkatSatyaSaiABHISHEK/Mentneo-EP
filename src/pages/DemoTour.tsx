import { useState } from 'react'
import Card from '../components/Card'
import {
  Smartphone,
  Calculator,
  Calendar,
  Download,
  ShieldCheck,
  MapPin,
  Camera,
  Check,
  AlertTriangle,
  Sparkles,
  Share2,
  Copy
} from 'lucide-react'

export default function DemoTour() {
  const [activeTab, setActiveTab] = useState<'mobile-app' | 'salary-engine' | 'attendance-sheet' | 'pwa-install'>('mobile-app')

  // Module 1: Mobile App Simulator State
  const [simLocation, setSimLocation] = useState<'inside' | 'outside'>('inside')
  const [simCheckedIn, setSimCheckedIn] = useState(false)
  const [simSelfieCaptured, setSimSelfieCaptured] = useState(false)

  // Module 2: Salary Calculator Simulator State
  const [simSalary, setSimSalary] = useState(15000)
  const [simTotalWorkingDays, setSimTotalWorkingDays] = useState(27)
  const [simPassedDays, setSimPassedDays] = useState(9)
  const [simAbsences, setSimAbsences] = useState(2)
  const [simHalfDays, setSimHalfDays] = useState(1)

  // Computed Salary Math
  const perDayPay = simTotalWorkingDays > 0 ? simSalary / simTotalWorkingDays : 0
  const upcomingDays = Math.max(0, simTotalWorkingDays - simPassedDays)
  const deductionSoFar = (simAbsences * perDayPay) + (simHalfDays * 0.5 * perDayPay)
  const presentDays = Math.max(0, simPassedDays - simAbsences - (simHalfDays > 0 ? 0.5 : 0))
  const earnedTillToday = (presentDays * perDayPay)
  const projectedSalary = Math.max(0, simSalary - deductionSoFar)

  // Module 3: Matrix Simulator State
  const [selectedDayDemo, setSelectedDayDemo] = useState<number | null>(null)

  const copyDemoLink = (text: string) => {
    navigator.clipboard.writeText(text)
    alert('Demo link copied to clipboard!')
  }

  return (
    <div className="space-y-6 max-w-7xl mx-auto pb-20 font-sans animate-rise">
      {/* Top Banner Header */}
      <div className="rounded-3xl bg-gradient-to-r from-slate-900 via-slate-800 to-indigo-950 p-6 md:p-8 text-white shadow-2xl relative overflow-hidden">
        <div className="relative z-10 space-y-2">
          <div className="flex flex-wrap items-center gap-2">
            <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-[10px] font-black uppercase tracking-wider bg-emerald-500/20 text-emerald-300 border border-emerald-500/30">
              <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse"></span>
              Interactive Sandbox Demo
            </span>
            <span className="inline-flex items-center gap-1 px-3 py-1 rounded-full text-[10px] font-bold uppercase tracking-wider bg-white/10 text-slate-300">
              Safe Mode • Isolated from Live Data
            </span>
          </div>

          <h1 className="text-2xl md:text-4xl font-black tracking-tight">
            Mentneo EP System Walkthrough & Feature Tour
          </h1>
          <p className="text-xs md:text-sm text-slate-300 max-w-3xl leading-relaxed">
            Test and explore all features of the Mentneo Employee Portal — including the Day Mode Biometric Mobile Check-in,
            the accurate Passed-Days Salary Calculation Engine, the Excel-style Attendance Matrix, and PWA App Distribution.
          </p>
        </div>

        {/* Decorative background circle */}
        <div className="absolute -bottom-16 -right-16 w-64 h-64 rounded-full bg-indigo-500/10 blur-3xl pointer-events-none"></div>
      </div>

      {/* Module Selector Navigation Tabs */}
      <div className="flex flex-wrap items-center gap-2 border-b border-slate-200 pb-2">
        <button
          onClick={() => setActiveTab('mobile-app')}
          className={`flex items-center gap-2 px-4 py-2.5 rounded-2xl text-xs font-bold transition shadow-sm ${
            activeTab === 'mobile-app'
              ? 'bg-slate-900 text-white'
              : 'bg-white text-slate-700 hover:bg-slate-100 border border-slate-200'
          }`}
        >
          <Smartphone className="w-4 h-4 text-emerald-400" />
          <span>1. Mobile Biometric App (Day Mode)</span>
        </button>

        <button
          onClick={() => setActiveTab('salary-engine')}
          className={`flex items-center gap-2 px-4 py-2.5 rounded-2xl text-xs font-bold transition shadow-sm ${
            activeTab === 'salary-engine'
              ? 'bg-slate-900 text-white'
              : 'bg-white text-slate-700 hover:bg-slate-100 border border-slate-200'
          }`}
        >
          <Calculator className="w-4 h-4 text-emerald-400" />
          <span>2. Salary & Payroll Engine</span>
        </button>

        <button
          onClick={() => setActiveTab('attendance-sheet')}
          className={`flex items-center gap-2 px-4 py-2.5 rounded-2xl text-xs font-bold transition shadow-sm ${
            activeTab === 'attendance-sheet'
              ? 'bg-slate-900 text-white'
              : 'bg-white text-slate-700 hover:bg-slate-100 border border-slate-200'
          }`}
        >
          <Calendar className="w-4 h-4 text-emerald-400" />
          <span>3. Excel Attendance Matrix</span>
        </button>

        <button
          onClick={() => setActiveTab('pwa-install')}
          className={`flex items-center gap-2 px-4 py-2.5 rounded-2xl text-xs font-bold transition shadow-sm ${
            activeTab === 'pwa-install'
              ? 'bg-slate-900 text-white'
              : 'bg-white text-slate-700 hover:bg-slate-100 border border-slate-200'
          }`}
        >
          <Download className="w-4 h-4 text-emerald-400" />
          <span>4. App URL & PWA Installation Guide</span>
        </button>
      </div>

      {/* ============================================================= */}
      {/* MODULE 1: INTERACTIVE MOBILE APP SIMULATOR                    */}
      {/* ============================================================= */}
      {activeTab === 'mobile-app' && (
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-start animate-rise">
          {/* Left Column: Phone Simulator Frame */}
          <div className="lg:col-span-5 flex justify-center">
            <div className="w-[340px] sm:w-[360px] h-[700px] rounded-[3rem] border-8 border-slate-800 bg-slate-100 shadow-2xl relative overflow-hidden flex flex-col justify-between select-none">
              {/* Phone Speaker Notch */}
              <div className="absolute top-2 left-1/2 -translate-x-1/2 w-24 h-4 bg-slate-800 rounded-full z-30"></div>

              {/* In-App Screen Content (PURE DAY MODE) */}
              <div className="flex-1 flex flex-col p-3 pt-8 pb-16 justify-between overflow-hidden">
                {/* App Top Header */}
                <div className="flex items-center justify-between px-3 py-2 bg-white rounded-2xl border border-slate-200 shadow-sm shrink-0">
                  <div className="flex items-center gap-2">
                    <ShieldCheck className={`w-4 h-4 ${simLocation === 'inside' ? 'text-emerald-600' : 'text-slate-400'}`} />
                    <span className="text-[11px] font-black uppercase text-slate-900">Face Check-In</span>
                  </div>
                  {simLocation === 'inside' ? (
                    <span className="px-2 py-0.5 rounded-full text-[9px] font-black uppercase bg-emerald-100 text-emerald-800 border border-emerald-300 animate-pulse">
                      ● In Office (4m)
                    </span>
                  ) : (
                    <span className="px-2 py-0.5 rounded-full text-[9px] font-black uppercase bg-rose-100 text-rose-800 border border-rose-200">
                      ● Outside (320m)
                    </span>
                  )}
                </div>

                {/* Central Camera / Attendance Card */}
                <div className="my-2 flex-1 flex flex-col justify-between items-center rounded-2xl bg-white border border-slate-200 p-4 shadow-md overflow-hidden">
                  {simCheckedIn ? (
                    <div className="flex-1 flex flex-col items-center justify-center text-center space-y-3">
                      <div className="w-16 h-16 rounded-full bg-emerald-100 text-emerald-600 flex items-center justify-center shadow-lg">
                        <Check className="w-9 h-9 stroke-[3]" />
                      </div>
                      <h3 className="text-base font-black text-slate-900">Attendance Confirmed</h3>
                      <p className="text-[11px] text-slate-500">
                        Present marked at 09:42 AM • Mentneo HQ
                      </p>
                      <button
                        onClick={() => {
                          setSimCheckedIn(false)
                          setSimSelfieCaptured(false)
                        }}
                        className="px-4 py-2 rounded-xl bg-slate-100 text-slate-700 text-xs font-bold hover:bg-slate-200"
                      >
                        Reset Demo Punch
                      </button>
                    </div>
                  ) : simLocation === 'inside' ? (
                    <div className="flex-1 flex flex-col justify-between items-center w-full">
                      {/* Top Pill */}
                      <div className="text-center shrink-0 mb-1">
                        <span className="text-[10px] font-bold text-emerald-700 bg-emerald-50 px-2.5 py-0.5 rounded-full border border-emerald-200">
                          Align Face in Frame
                        </span>
                      </div>

                      {/* Expanded Camera Viewport (Clean, No scanline animation) */}
                      <div className="relative w-full aspect-[4/3] rounded-2xl overflow-hidden border-2 border-emerald-500 bg-slate-900 shadow-md flex items-center justify-center">
                        {!simSelfieCaptured ? (
                          <div className="relative w-full h-full bg-gradient-to-b from-slate-700 to-slate-900 flex flex-col items-center justify-center text-slate-400">
                            <Camera className="w-10 h-10 text-emerald-400 mb-1" />
                            <span className="text-[10px] font-bold text-slate-300">Live Camera Stream</span>
                            <span className="text-[8px] text-emerald-400">Day Mode • Clean View</span>
                          </div>
                        ) : (
                          <div className="relative w-full h-full bg-slate-800 flex items-center justify-center">
                            <div className="w-20 h-20 rounded-full border-2 border-emerald-400 bg-emerald-950/40 flex items-center justify-center text-emerald-300 text-xs font-bold">
                              Selfie Ready
                            </div>
                            <span className="absolute top-2 left-2 px-2 py-0.5 rounded-full bg-emerald-500 text-white text-[9px] font-black">
                              ✓ Captured
                            </span>
                          </div>
                        )}
                      </div>

                      {/* Action Button */}
                      <div className="w-full mt-2">
                        {!simSelfieCaptured ? (
                          <button
                            onClick={() => setSimSelfieCaptured(true)}
                            className="w-full py-2.5 rounded-xl bg-emerald-600 text-white font-black text-xs uppercase tracking-wider hover:bg-emerald-500 shadow-md"
                          >
                            Take Selfie Photo
                          </button>
                        ) : (
                          <div className="flex gap-2">
                            <button
                              onClick={() => setSimSelfieCaptured(false)}
                              className="flex-1 py-2 rounded-xl bg-slate-100 text-slate-700 text-xs font-bold"
                            >
                              Retake
                            </button>
                            <button
                              onClick={() => setSimCheckedIn(true)}
                              className="flex-1 py-2 rounded-xl bg-emerald-600 text-white text-xs font-black"
                            >
                              Confirm
                            </button>
                          </div>
                        )}
                      </div>
                    </div>
                  ) : (
                    /* Outside Perimeter State */
                    <div className="flex-1 flex flex-col items-center justify-center text-center p-3 space-y-3">
                      <div className="w-14 h-14 rounded-2xl bg-rose-100 text-rose-600 flex items-center justify-center">
                        <AlertTriangle className="w-8 h-8" />
                      </div>
                      <div>
                        <h4 className="text-sm font-black text-rose-900">Outside Office Perimeter</h4>
                        <p className="text-[10px] text-slate-500 mt-1">
                          You are 320m away. Must be within 150m of Mentneo HQ.
                        </p>
                      </div>
                      <span className="px-3 py-1 rounded-full bg-rose-50 text-rose-700 text-[9px] font-bold border border-rose-200">
                        Camera Locked
                      </span>
                    </div>
                  )}
                </div>

                {/* Bottom Navigation Bar with Live Proximity Color Badge */}
                <div className="bg-white rounded-2xl border border-slate-200 p-2 flex justify-around items-center shadow-lg">
                  <div className="flex flex-col items-center text-slate-400 text-[9px] font-bold">
                    <span className="text-base">🏠</span>
                    <span>Home</span>
                  </div>

                  {/* Attendance Icon with Proximity Color Badge */}
                  <div className="flex flex-col items-center text-emerald-700 text-[9px] font-black bg-emerald-50 px-3 py-1 rounded-xl border border-emerald-300">
                    <div className="relative">
                      <ShieldCheck className={`w-4 h-4 ${simLocation === 'inside' ? 'text-emerald-600' : 'text-amber-500'}`} />
                      <span className={`absolute -top-1 -right-1 w-2 h-2 rounded-full ${
                        simLocation === 'inside' ? 'bg-emerald-500 animate-pulse' : 'bg-amber-400'
                      }`}></span>
                    </div>
                    <span>Attendance</span>
                    <span className={`text-[7px] uppercase font-bold ${simLocation === 'inside' ? 'text-emerald-600' : 'text-amber-600'}`}>
                      {simLocation === 'inside' ? '● In Range (4m)' : '● Away (320m)'}
                    </span>
                  </div>

                  <div className="flex flex-col items-center text-slate-400 text-[9px] font-bold">
                    <span className="text-base">📋</span>
                    <span>Tasks</span>
                  </div>
                </div>
              </div>
            </div>
          </div>

          {/* Right Column: Interactive Sandbox Controls & Explanations */}
          <div className="lg:col-span-7 space-y-5">
            <Card className="p-6 border-slate-200 shadow-md">
              <h3 className="text-lg font-black text-slate-900 flex items-center gap-2">
                <Sparkles className="w-5 h-5 text-emerald-600" />
                <span>Interactive Simulator Controls</span>
              </h3>
              <p className="text-xs text-slate-500 mt-1">
                Toggle simulated parameters below and watch the mobile screen respond in real time:
              </p>

              <div className="mt-5 space-y-4">
                {/* Geofence Proximity Toggle */}
                <div className="rounded-2xl bg-slate-50 border border-slate-200 p-4">
                  <p className="text-xs font-black uppercase text-slate-700 tracking-wider">
                    Simulate Office Location Status
                  </p>
                  <p className="text-xs text-slate-500 mt-0.5">
                    Controls whether the user is inside or outside the office radius (150m):
                  </p>
                  <div className="flex gap-2.5 mt-3">
                    <button
                      onClick={() => setSimLocation('inside')}
                      className={`flex-1 py-2.5 px-3 rounded-xl text-xs font-black transition flex items-center justify-center gap-1.5 ${
                        simLocation === 'inside'
                          ? 'bg-emerald-600 text-white shadow-md'
                          : 'bg-white border border-slate-200 text-slate-700 hover:bg-slate-100'
                      }`}
                    >
                      <MapPin className="w-3.5 h-3.5" />
                      <span>Inside Office (4m away)</span>
                    </button>

                    <button
                      onClick={() => setSimLocation('outside')}
                      className={`flex-1 py-2.5 px-3 rounded-xl text-xs font-black transition flex items-center justify-center gap-1.5 ${
                        simLocation === 'outside'
                          ? 'bg-rose-600 text-white shadow-md'
                          : 'bg-white border border-slate-200 text-slate-700 hover:bg-slate-100'
                      }`}
                    >
                      <AlertTriangle className="w-3.5 h-3.5" />
                      <span>Outside Perimeter (320m)</span>
                    </button>
                  </div>
                </div>

                {/* Core Features Highlight List */}
                <div className="space-y-3 pt-2">
                  <div className="flex items-start gap-3 p-3 rounded-xl bg-emerald-50/60 border border-emerald-200 text-xs">
                    <span className="p-1.5 bg-emerald-600 text-white rounded-lg shrink-0">✓</span>
                    <div>
                      <span className="font-black text-emerald-950">Pure Day Mode (Light Theme):</span>
                      <p className="text-emerald-800 mt-0.5">
                        Clean white and slate-50 backgrounds, replacing all dark themes with crisp high-visibility design.
                      </p>
                    </div>
                  </div>

                  <div className="flex items-start gap-3 p-3 rounded-xl bg-sky-50/60 border border-sky-200 text-xs">
                    <span className="p-1.5 bg-sky-600 text-white rounded-lg shrink-0">✓</span>
                    <div>
                      <span className="font-black text-sky-950">Spacious Camera Viewport:</span>
                      <p className="text-sky-800 mt-0.5">
                        Expanded to fill available screen height (`max-w-[400px]`, `52vh`) with zero vertical scrolling.
                      </p>
                    </div>
                  </div>

                  <div className="flex items-start gap-3 p-3 rounded-xl bg-indigo-50/60 border border-indigo-200 text-xs">
                    <span className="p-1.5 bg-indigo-600 text-white rounded-lg shrink-0">✓</span>
                    <div>
                      <span className="font-black text-indigo-950">Live Color-Coded Proximity Icon:</span>
                      <p className="text-indigo-800 mt-0.5">
                        Bottom nav badge dynamically pulses green when "In Range (4m)" and amber when "Away".
                      </p>
                    </div>
                  </div>
                </div>
              </div>
            </Card>
          </div>
        </div>
      )}

      {/* ============================================================= */}
      {/* MODULE 2: SALARY & PAYROLL ENGINE EXPLANATION                 */}
      {/* ============================================================= */}
      {activeTab === 'salary-engine' && (
        <div className="space-y-6 animate-rise">
          <Card className="p-6 border-slate-200 shadow-md">
            <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 pb-4 border-b border-slate-100">
              <div>
                <span className="px-3 py-1 rounded-full text-[10px] font-black uppercase tracking-wider bg-emerald-100 text-emerald-800">
                  Fixed Calculation Model
                </span>
                <h3 className="text-xl font-black text-slate-900 mt-1">
                  How Salary Calculations Work (Passed-Days Rule)
                </h3>
                <p className="text-xs text-slate-500 mt-0.5">
                  Absences and deductions are calculated strictly on working days that have already passed (up to yesterday).
                </p>
              </div>

              <div className="text-right">
                <span className="text-xs font-mono font-bold text-slate-400">Formula Rule:</span>
                <p className="text-sm font-mono font-black text-emerald-600">Per-Day Pay = Base Salary / 27 Days</p>
              </div>
            </div>

            {/* Interactive Live Calculation Sandbox */}
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 my-6">
              {/* Slider 1: Base Salary */}
              <div className="p-4 rounded-2xl bg-slate-50 border border-slate-200">
                <label className="text-[10px] font-bold uppercase tracking-wider text-slate-500 block">
                  1. Base Monthly Salary
                </label>
                <p className="text-xl font-black font-mono text-slate-900 mt-1">
                  ₹{simSalary.toLocaleString('en-IN')}
                </p>
                <input
                  type="range"
                  min="5000"
                  max="100000"
                  step="1000"
                  value={simSalary}
                  onChange={(e) => setSimSalary(Number(e.target.value))}
                  className="w-full mt-3 accent-emerald-600"
                />
              </div>

              {/* Slider 2: Month Working Days */}
              <div className="p-4 rounded-2xl bg-slate-50 border border-slate-200">
                <label className="text-[10px] font-bold uppercase tracking-wider text-slate-500 block">
                  2. Working Days of Month
                </label>
                <p className="text-xl font-black font-mono text-slate-900 mt-1">
                  {simTotalWorkingDays} Days (Oct 2026)
                </p>
                <input
                  type="range"
                  min="20"
                  max="31"
                  step="1"
                  value={simTotalWorkingDays}
                  onChange={(e) => setSimTotalWorkingDays(Number(e.target.value))}
                  className="w-full mt-3 accent-emerald-600"
                />
              </div>

              {/* Slider 3: Passed Working Days */}
              <div className="p-4 rounded-2xl bg-slate-50 border border-slate-200">
                <label className="text-[10px] font-bold uppercase tracking-wider text-slate-500 block">
                  3. Passed Working Days So Far
                </label>
                <p className="text-xl font-black font-mono text-sky-700 mt-1">
                  {simPassedDays} Days (Passed)
                </p>
                <p className="text-[10px] text-slate-400">{upcomingDays} upcoming days</p>
                <input
                  type="range"
                  min="1"
                  max={simTotalWorkingDays}
                  step="1"
                  value={simPassedDays}
                  onChange={(e) => setSimPassedDays(Number(e.target.value))}
                  className="w-full mt-2 accent-sky-600"
                />
              </div>

              {/* Slider 4: Absences on Passed Days */}
              <div className="p-4 rounded-2xl bg-slate-50 border border-slate-200">
                <div className="flex items-center justify-between">
                  <label className="text-[10px] font-bold uppercase tracking-wider text-slate-500 block">
                    4. Absences ({simHalfDays} Half)
                  </label>
                  <button
                    type="button"
                    onClick={() => setSimHalfDays((prev) => (prev > 0 ? 0 : 1))}
                    className="text-[9px] font-bold px-1.5 py-0.5 rounded bg-amber-100 text-amber-800"
                  >
                    Toggle Half-Day
                  </button>
                </div>
                <p className="text-xl font-black font-mono text-rose-600 mt-1">
                  {simAbsences} Days Absent
                </p>
                <input
                  type="range"
                  min="0"
                  max={simPassedDays}
                  step="1"
                  value={simAbsences}
                  onChange={(e) => setSimAbsences(Number(e.target.value))}
                  className="w-full mt-3 accent-rose-600"
                />
              </div>
            </div>

            {/* Calculated Results Table Preview */}
            <div className="rounded-2xl border border-slate-200 overflow-hidden shadow-sm">
              <div className="p-3 bg-slate-100 font-bold text-xs uppercase tracking-wider text-slate-700">
                Live Formula Calculation Results
              </div>
              <div className="grid grid-cols-2 sm:grid-cols-4 divide-x divide-y sm:divide-y-0 divide-slate-200 bg-white text-center p-4">
                <div className="p-2">
                  <span className="text-[10px] font-bold uppercase text-slate-400">Per-Day Pay</span>
                  <p className="text-lg font-black font-mono text-slate-900 mt-1">
                    ₹{perDayPay.toFixed(2)}
                  </p>
                  <span className="text-[9px] text-slate-400">₹{simSalary} / {simTotalWorkingDays}d</span>
                </div>

                <div className="p-2">
                  <span className="text-[10px] font-bold uppercase text-rose-500">Deduction So Far</span>
                  <p className="text-lg font-black font-mono text-rose-600 mt-1">
                    -₹{deductionSoFar.toFixed(2)}
                  </p>
                  <span className="text-[9px] text-rose-400">{simAbsences} absences only</span>
                </div>

                <div className="p-2">
                  <span className="text-[10px] font-bold uppercase text-sky-600">Earned Till Today</span>
                  <p className="text-lg font-black font-mono text-sky-700 mt-1">
                    ₹{earnedTillToday.toFixed(2)}
                  </p>
                  <span className="text-[9px] text-sky-400">Accrued up to date</span>
                </div>

                <div className="p-2">
                  <span className="text-[10px] font-bold uppercase text-emerald-600">Projected Month-End</span>
                  <p className="text-lg font-black font-mono text-emerald-700 mt-1">
                    ₹{projectedSalary.toFixed(2)}
                  </p>
                  <span className="text-[9px] text-emerald-500">Salary minus deductions</span>
                </div>
              </div>
            </div>

            {/* Critical Explanations Box */}
            <div className="mt-6 space-y-3">
              <h4 className="text-xs font-black uppercase text-slate-700 tracking-wider">
                Why This Fix Is Important:
              </h4>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-3 text-xs">
                <div className="p-3.5 rounded-xl bg-slate-50 border border-slate-200">
                  <p className="font-bold text-slate-900">1. Upcoming days are never deducted</p>
                  <p className="text-slate-500 mt-1">
                    Previously, the system counted all 27 days as already absent. Now, future days show as
                    "Upcoming" (17 days) in grey, never deducted and never red.
                  </p>
                </div>

                <div className="p-3.5 rounded-xl bg-slate-50 border border-slate-200">
                  <p className="font-bold text-slate-900">2. Today shows as Pending</p>
                  <p className="text-slate-500 mt-1">
                    During work hours, today is never marked as absent. It stays "Pending" until the day ends
                    or employee marks punch-in.
                  </p>
                </div>
              </div>
            </div>
          </Card>
        </div>
      )}

      {/* ============================================================= */}
      {/* MODULE 3: EXCEL ATTENDANCE MATRIX DEMO                        */}
      {/* ============================================================= */}
      {activeTab === 'attendance-sheet' && (
        <Card className="p-6 border-slate-200 shadow-md animate-rise space-y-5">
          <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 pb-4 border-b border-slate-100">
            <div>
              <span className="px-3 py-1 rounded-full text-[10px] font-black uppercase tracking-wider bg-indigo-100 text-indigo-800">
                Audit & Correction Grid
              </span>
              <h3 className="text-xl font-black text-slate-900 mt-1">
                Excel-Style 1–31 Attendance Calendar Matrix
              </h3>
              <p className="text-xs text-slate-500 mt-0.5">
                Inspect every employee's daily status across all 31 days. Click any cell to inspect photo verification and submit HR audit adjustments.
              </p>
            </div>
          </div>

          {/* Interactive Calendar Grid Sample */}
          <div className="overflow-x-auto rounded-2xl border border-slate-200 bg-white">
            <table className="w-full text-xs">
              <thead className="bg-slate-100/80 text-[10px] font-bold text-slate-500 uppercase tracking-wider border-b border-slate-200">
                <tr>
                  <th className="p-3 text-left">Employee</th>
                  {Array.from({ length: 14 }).map((_, i) => (
                    <th key={i} className="p-2 text-center min-w-[34px]">
                      {i + 1}
                    </th>
                  ))}
                  <th className="p-3 text-center">Summary</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                <tr className="hover:bg-slate-50">
                  <td className="p-3 font-bold text-slate-900">
                    Nagendra (Sales)
                  </td>
                  {/* Sample Days */}
                  {[
                    { day: 1, status: 'P', color: 'bg-emerald-100 text-emerald-800' },
                    { day: 2, status: 'P', color: 'bg-emerald-100 text-emerald-800' },
                    { day: 3, status: 'P', color: 'bg-emerald-100 text-emerald-800' },
                    { day: 4, status: 'W', color: 'bg-slate-100 text-slate-400' },
                    { day: 5, status: 'A', color: 'bg-rose-100 text-rose-800' },
                    { day: 6, status: 'A', color: 'bg-rose-100 text-rose-800' },
                    { day: 7, status: 'H', color: 'bg-amber-100 text-amber-800' },
                    { day: 8, status: 'A', color: 'bg-rose-100 text-rose-800' },
                    { day: 9, status: 'A', color: 'bg-rose-100 text-rose-800' },
                    { day: 10, status: 'A', color: 'bg-rose-100 text-rose-800' },
                    { day: 11, status: 'TODAY', color: 'bg-sky-100 text-sky-800 ring-2 ring-sky-400' },
                    { day: 12, status: '—', color: 'bg-slate-50 text-slate-300' },
                    { day: 13, status: '—', color: 'bg-slate-50 text-slate-300' },
                    { day: 14, status: '—', color: 'bg-slate-50 text-slate-300' },
                  ].map((d) => (
                    <td key={d.day} className="p-1 text-center">
                      <button
                        onClick={() => setSelectedDayDemo(d.day)}
                        className={`w-7 h-7 rounded-lg font-bold text-[10px] transition hover:scale-110 ${d.color}`}
                        title={`Click to inspect Day ${d.day}`}
                      >
                        {d.status === 'TODAY' ? 'T' : d.status}
                      </button>
                    </td>
                  ))}
                  <td className="p-3 text-center font-mono font-bold text-slate-700">
                    3P • 6A • 1H
                  </td>
                </tr>
              </tbody>
            </table>
          </div>

          {/* Cell Inspection Popup Modal (Simulation) */}
          {selectedDayDemo !== null && (
            <div className="p-4 rounded-2xl bg-emerald-50 border border-emerald-200 text-xs flex items-center justify-between gap-4">
              <div className="space-y-1">
                <span className="font-bold text-emerald-900">
                  Inspecting Day {selectedDayDemo} Record (Demo Popup)
                </span>
                <p className="text-emerald-700">
                  {selectedDayDemo <= 3
                    ? 'Verified Check-in: 09:30 AM • Photo Verified • Distance: 4m'
                    : selectedDayDemo === 11
                    ? 'Today (Pending check-in) • Never penalized during active hours'
                    : selectedDayDemo <= 10
                    ? 'Marked Absent • HR can click "Override" with audit reason log'
                    : 'Upcoming Day (Future date) • Not counted in deductions'}
                </p>
              </div>
              <button
                onClick={() => setSelectedDayDemo(null)}
                className="px-3 py-1.5 rounded-xl bg-white text-slate-700 font-bold border border-slate-200 hover:bg-slate-100"
              >
                Close Demo
              </button>
            </div>
          )}
        </Card>
      )}

      {/* ============================================================= */}
      {/* MODULE 4: PWA APP INSTALLATION & ONBOARDING GUIDE             */}
      {/* ============================================================= */}
      {activeTab === 'pwa-install' && (
        <div className="space-y-6 animate-rise">
          <Card className="p-6 border-slate-200 shadow-md space-y-6">
            <div>
              <span className="px-3 py-1 rounded-full text-[10px] font-black uppercase tracking-wider bg-sky-100 text-sky-800">
                PWA Distribution Hub
              </span>
              <h3 className="text-xl font-black text-slate-900 mt-1">
                How Employees Download & Install the Mobile App
              </h3>
              <p className="text-xs text-slate-500 mt-0.5">
                The Mentneo Employee App is a Progressive Web App (PWA). No App Store or Play Store download required.
              </p>
            </div>

            {/* Shareable App Links Card */}
            <div className="rounded-2xl bg-slate-50 border border-slate-200 p-5 space-y-4">
              <p className="text-xs font-black uppercase tracking-wider text-slate-700">
                Direct Portal Web Links:
              </p>

              <div className="flex flex-col sm:flex-row items-center gap-3">
                <div className="flex-1 w-full bg-white border border-slate-200 rounded-xl px-4 py-2.5 font-mono text-xs text-slate-800 truncate">
                  {window.location.origin}/app
                </div>
                <button
                  onClick={() => copyDemoLink(`${window.location.origin}/app`)}
                  className="w-full sm:w-auto flex items-center justify-center gap-1.5 px-4 py-2.5 rounded-xl bg-slate-900 hover:bg-slate-800 text-white text-xs font-bold transition"
                >
                  <Copy className="w-3.5 h-3.5" />
                  <span>Copy App Link</span>
                </button>
                <a
                  href={`https://wa.me/?text=${encodeURIComponent(`Install the Mentneo Employee Portal on your phone here: ${window.location.origin}/app`)}`}
                  target="_blank"
                  rel="noreferrer"
                  className="w-full sm:w-auto flex items-center justify-center gap-1.5 px-4 py-2.5 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-bold transition"
                >
                  <Share2 className="w-3.5 h-3.5" />
                  <span>Share via WhatsApp</span>
                </a>
              </div>
            </div>

            {/* Dual OS Installation Visual Guide */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {/* Android Guide */}
              <div className="p-5 rounded-2xl bg-white border border-slate-200 space-y-3">
                <div className="flex items-center gap-2">
                  <span className="p-2 rounded-xl bg-emerald-100 text-emerald-800 font-bold text-xs">
                    Android
                  </span>
                  <h4 className="font-bold text-sm text-slate-900">Chrome Browser</h4>
                </div>
                <ol className="text-xs text-slate-600 space-y-2 list-decimal list-inside leading-relaxed">
                  <li>Open the link in <b>Google Chrome</b> on Android phone.</li>
                  <li>Tap the <b>"Install"</b> popup banner at the bottom or the top <b>⋮ (3 dots) menu</b>.</li>
                  <li>Tap <b>"Add to Home Screen"</b> or <b>"Install App"</b>.</li>
                  <li>The app icon appears on phone home screen like a native app!</li>
                </ol>
              </div>

              {/* iOS Guide */}
              <div className="p-5 rounded-2xl bg-white border border-slate-200 space-y-3">
                <div className="flex items-center gap-2">
                  <span className="p-2 rounded-xl bg-sky-100 text-sky-800 font-bold text-xs">
                    Apple iPhone
                  </span>
                  <h4 className="font-bold text-sm text-slate-900">Safari Browser</h4>
                </div>
                <ol className="text-xs text-slate-600 space-y-2 list-decimal list-inside leading-relaxed">
                  <li>Open the link in <b>Safari</b> on your iPhone.</li>
                  <li>Tap the <b>Share button</b> (square with arrow pointing up) at the bottom.</li>
                  <li>Scroll down and tap <b>"Add to Home Screen"</b>.</li>
                  <li>Tap <b>"Add"</b> in top right corner. The icon appears on home screen.</li>
                </ol>
              </div>
            </div>
          </Card>
        </div>
      )}
    </div>
  )
}
