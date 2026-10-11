import { doc, getDoc, setDoc } from 'firebase/firestore'
import { db } from './firebase'
import { getEmployees } from './employeeService'
import { getAttendanceForMonth } from './attendanceService'
import type { 
  EmployeeSalaryCalculation, 
  MonthlyPayrollSnapshot, 
  SalaryAdjustment 
} from '../types/salary'

/**
 * Computes default working days for a given month (Total days minus Sundays).
 */
export const getDefaultWorkingDays = (monthKey: string): number => {
  const [yearStr, monthStr] = monthKey.split('-')
  const year = parseInt(yearStr, 10)
  const monthIndex = parseInt(monthStr, 10) - 1 // 0-indexed

  const date = new Date(year, monthIndex, 1)
  let workingDays = 0

  while (date.getMonth() === monthIndex) {
    const dayOfWeek = date.getDay()
    if (dayOfWeek !== 0) { // Exclude Sundays
      workingDays++
    }
    date.setDate(date.getDate() + 1)
  }

  return workingDays || 26
}

export const getWorkingDaysSetting = async (monthKey: string): Promise<number | null> => {
  try {
    const docRef = doc(db, 'payroll_settings', monthKey)
    const snap = await getDoc(docRef)
    if (snap.exists() && typeof snap.data()?.workingDays === 'number') {
      return snap.data().workingDays
    }
  } catch (err) {
    console.error('Error fetching working days setting:', err)
  }
  return null
}

export const saveWorkingDaysSetting = async (monthKey: string, workingDays: number): Promise<void> => {
  const docRef = doc(db, 'payroll_settings', monthKey)
  await setDoc(docRef, { workingDays, updatedAt: new Date().toISOString() }, { merge: true })
}

export const getPayrollAdjustments = async (
  monthKey: string
): Promise<Record<string, SalaryAdjustment>> => {
  try {
    const docRef = doc(db, 'payroll_adjustments', monthKey)
    const snap = await getDoc(docRef)
    if (snap.exists()) {
      return snap.data()?.adjustments || {}
    }
  } catch (err) {
    console.error('Error fetching payroll adjustments:', err)
  }
  return {}
}

export const savePayrollAdjustments = async (
  monthKey: string,
  adjustments: Record<string, SalaryAdjustment>
): Promise<void> => {
  const docRef = doc(db, 'payroll_adjustments', monthKey)
  await setDoc(docRef, { adjustments, updatedAt: new Date().toISOString() }, { merge: true })
}

export const saveMonthlyPayrollSnapshot = async (
  snapshot: MonthlyPayrollSnapshot
): Promise<void> => {
  const docRef = doc(db, 'payroll_snapshots', snapshot.monthKey)
  await setDoc(docRef, snapshot)
}

export const getMonthlyPayrollSnapshot = async (
  monthKey: string
): Promise<MonthlyPayrollSnapshot | null> => {
  try {
    const docRef = doc(db, 'payroll_snapshots', monthKey)
    const snap = await getDoc(docRef)
    if (snap.exists()) {
      return snap.data() as MonthlyPayrollSnapshot
    }
  } catch (err) {
    console.error('Error fetching payroll snapshot:', err)
  }
  return null
}

/**
 * Computes calendar timeline details for a given month:
 * - Passed working days (strictly up to yesterday)
 * - Is today a working day
 * - Upcoming working days
 */
export const getMonthTimeline = (monthKey: string, effectiveWorkingDays: number) => {
  const now = new Date()
  const currentMonthKey = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}`
  const todayDateStr = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}-${String(now.getDate()).padStart(2, '0')}`

  const [yearStr, monthStr] = monthKey.split('-')
  const year = parseInt(yearStr, 10)
  const monthIndex = parseInt(monthStr, 10) - 1

  // Count passed working days strictly before today
  let passedWorkingDays = 0
  let isTodayWorkingDay = false

  if (monthKey < currentMonthKey) {
    // Past completed month: all working days have passed
    passedWorkingDays = effectiveWorkingDays
    isTodayWorkingDay = false
  } else if (monthKey > currentMonthKey) {
    // Future month: 0 days have passed
    passedWorkingDays = 0
    isTodayWorkingDay = false
  } else {
    // Current month: count non-Sundays up to yesterday
    const todayDayOfMonth = now.getDate()
    for (let day = 1; day < todayDayOfMonth; day++) {
      const d = new Date(year, monthIndex, day)
      if (d.getDay() !== 0) { // Non-Sunday
        passedWorkingDays++
      }
    }

    const todayDate = new Date(year, monthIndex, todayDayOfMonth)
    isTodayWorkingDay = todayDate.getDay() !== 0
  }

  // Cap passed working days at effectiveWorkingDays
  passedWorkingDays = Math.min(passedWorkingDays, effectiveWorkingDays)

  // Remaining upcoming working days (days after today in the month)
  const upcomingDays = monthKey === currentMonthKey
    ? Math.max(0, effectiveWorkingDays - passedWorkingDays - 1)
    : monthKey > currentMonthKey
    ? effectiveWorkingDays
    : 0

  return {
    isCurrentMonth: monthKey === currentMonthKey,
    isPastMonth: monthKey < currentMonthKey,
    isFutureMonth: monthKey > currentMonthKey,
    todayDateStr,
    passedWorkingDays,
    isTodayWorkingDay,
    upcomingDays,
  }
}

/**
 * Computes the salary calculations for all active employees for a given month.
 * ONLY counts days that have passed for absences and deductions!
 */
export const computeMonthlyPayroll = async (
  monthKey: string,
  workingDaysOverride?: number,
  adjustmentsMap?: Record<string, SalaryAdjustment>
): Promise<{
  records: EmployeeSalaryCalculation[]
  workingDays: number
  passedWorkingDays: number
  upcomingDays: number
  totalBudget: number
  totalDeductionsSoFar: number
  totalEarnedTillToday: number
  totalProjectedPayout: number
  totalDeductions: number // alias
  totalPayable: number // alias
  employeeCount: number
  avgAttendanceRate: number
}> => {
  const [employees, attendanceRecords, savedWorkingDays, savedAdjustments] = await Promise.all([
    getEmployees(),
    getAttendanceForMonth(monthKey),
    workingDaysOverride !== undefined 
      ? Promise.resolve(workingDaysOverride) 
      : getWorkingDaysSetting(monthKey),
    adjustmentsMap !== undefined 
      ? Promise.resolve(adjustmentsMap) 
      : getPayrollAdjustments(monthKey)
  ])

  const effectiveWorkingDays = 
    savedWorkingDays ?? getDefaultWorkingDays(monthKey)

  const adjustments = savedAdjustments || {}
  const timeline = getMonthTimeline(monthKey, effectiveWorkingDays)

  // Map attendance per employee:
  // Separate into records up to yesterday vs records for today
  const attendanceByEmp: Record<
    string,
    {
      presentDatesPassed: Set<string>
      halfDayDatesPassed: Set<string>
      presentToday: boolean
      halfDayToday: boolean
    }
  > = {}

  attendanceRecords.forEach((record) => {
    if (!record.empId || !record.date) return
    const empId = record.empId.trim().toUpperCase()

    if (!attendanceByEmp[empId]) {
      attendanceByEmp[empId] = {
        presentDatesPassed: new Set(),
        halfDayDatesPassed: new Set(),
        presentToday: false,
        halfDayToday: false,
      }
    }

    const status = (record.status || 'present').toLowerCase()
    const isHalfDay = status === 'half-day' || status === 'halfday'
    const isPresent = status === 'present'

    if (timeline.isCurrentMonth && record.date === timeline.todayDateStr) {
      if (isHalfDay) attendanceByEmp[empId].halfDayToday = true
      else if (isPresent) attendanceByEmp[empId].presentToday = true
    } else if (!timeline.isCurrentMonth || record.date < timeline.todayDateStr) {
      if (isHalfDay) attendanceByEmp[empId].halfDayDatesPassed.add(record.date)
      else if (isPresent) attendanceByEmp[empId].presentDatesPassed.add(record.date)
    }
  })

  let totalBudget = 0
  let totalDeductionsSoFar = 0
  let totalEarnedTillToday = 0
  let totalProjectedPayout = 0
  let totalAttendedDaysOnPassed = 0

  const records: EmployeeSalaryCalculation[] = employees.map((emp) => {
    const empIdKey = emp.employeeId.trim().toUpperCase()
    const rawAttendance = attendanceByEmp[empIdKey] || {
      presentDatesPassed: new Set(),
      halfDayDatesPassed: new Set(),
      presentToday: false,
      halfDayToday: false,
    }

    const adj = adjustments[emp.employeeId] || adjustments[empIdKey] || {}
    const hasAdjustment = !!(
      adj.presentAdjustment || 
      adj.halfDayAdjustment || 
      adj.paidLeaveAdjustment || 
      adj.bonus || 
      adj.customDeduction ||
      adj.notes
    )

    const presentPassedCount = rawAttendance.presentDatesPassed.size
    const halfDayPassedCount = rawAttendance.halfDayDatesPassed.size

    // Apply manual adjustments to passed counts
    const presentPassed = Math.max(0, presentPassedCount + (adj.presentAdjustment || 0))
    const halfDayPassed = Math.max(0, halfDayPassedCount + (adj.halfDayAdjustment || 0))
    const paidLeavePassed = Math.max(0, adj.paidLeaveAdjustment || 0)

    // Absent is calculated ONLY on the working days that have passed so far!
    // Days after today are upcoming and NEVER counted as absent.
    const attendedOnPassed = presentPassed + halfDayPassed + paidLeavePassed
    const absentDays = Math.max(
      0,
      Number((timeline.passedWorkingDays - attendedOnPassed).toFixed(1))
    )

    totalAttendedDaysOnPassed += (presentPassed + (halfDayPassed * 0.5) + paidLeavePassed)

    // Total counts including today (for earned total)
    const presentDays = presentPassed + (rawAttendance.presentToday ? 1 : 0)
    const halfDays = halfDayPassed + (rawAttendance.halfDayToday ? 1 : 0)
    const paidLeaveDays = paidLeavePassed

    const monthlySalary = emp.salary && emp.salary > 0 ? emp.salary : 0
    totalBudget += monthlySalary

    // Exact per-day rate
    const rawPerDayPay = effectiveWorkingDays > 0 ? monthlySalary / effectiveWorkingDays : 0
    const perDayPay = Number(rawPerDayPay.toFixed(2))

    const bonus = adj.bonus || 0
    const customDeduction = adj.customDeduction || 0

    // 1. Deduction so far = per-day pay x absent days that have passed
    const deductionSoFar = monthlySalary > 0
      ? Number((absentDays * rawPerDayPay).toFixed(2))
      : 0

    // 2. Earned till today = per-day pay x (present + 0.5 x half-day + paid leave)
    const earnedTillToday = monthlySalary > 0
      ? Number(((presentDays + halfDays * 0.5 + paidLeaveDays) * rawPerDayPay).toFixed(2))
      : 0

    // 3. Projected month-end salary = monthly salary - deduction so far (assumes present on remaining)
    // plus bonus minus custom deductions
    const projectedMonthEnd = monthlySalary > 0
      ? Math.max(0, Number((monthlySalary - deductionSoFar + bonus - customDeduction).toFixed(2)))
      : 0

    const payableSalary = timeline.isPastMonth
      ? Math.max(0, Number((earnedTillToday + bonus - customDeduction).toFixed(2)))
      : projectedMonthEnd

    const totalDeduction = Number((deductionSoFar + customDeduction).toFixed(2))

    totalDeductionsSoFar += deductionSoFar
    totalEarnedTillToday += earnedTillToday
    totalProjectedPayout += projectedMonthEnd

    return {
      id: emp.id,
      employeeId: emp.employeeId,
      name: emp.name,
      email: emp.email,
      phone: emp.phone,
      role: emp.role,
      profileImageUrl: emp.profileImageUrl,
      monthlySalary,
      workingDays: effectiveWorkingDays,
      passedWorkingDays: timeline.passedWorkingDays,
      upcomingDays: timeline.upcomingDays,
      presentDays,
      halfDays,
      paidLeaveDays,
      absentDays,
      perDayPay,
      deductionSoFar,
      earnedTillToday,
      projectedMonthEnd,
      attendanceDeduction: deductionSoFar,
      bonus,
      customDeduction,
      totalDeduction,
      payableSalary,
      isManualCorrection: hasAdjustment,
      notes: adj.notes || '',
    }
  })

  // Sort by Employee ID ascending
  records.sort((a, b) => a.employeeId.localeCompare(b.employeeId))

  // Avg attendance rate: calculated ONLY on the days that have passed!
  const totalPossiblePassedDays = employees.length * (timeline.passedWorkingDays || 1)
  const avgAttendanceRate = timeline.passedWorkingDays > 0 && totalPossiblePassedDays > 0
    ? Math.min(100, Math.round((totalAttendedDaysOnPassed / totalPossiblePassedDays) * 100))
    : 100

  return {
    records,
    workingDays: effectiveWorkingDays,
    passedWorkingDays: timeline.passedWorkingDays,
    upcomingDays: timeline.upcomingDays,
    totalBudget: Number(totalBudget.toFixed(2)),
    totalDeductionsSoFar: Number(totalDeductionsSoFar.toFixed(2)),
    totalEarnedTillToday: Number(totalEarnedTillToday.toFixed(2)),
    totalProjectedPayout: Number(totalProjectedPayout.toFixed(2)),
    totalDeductions: Number(totalDeductionsSoFar.toFixed(2)), // alias for backward compatibility
    totalPayable: Number(totalProjectedPayout.toFixed(2)), // alias for backward compatibility
    employeeCount: employees.length,
    avgAttendanceRate,
  }
}
