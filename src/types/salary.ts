export interface SalaryAdjustment {
  employeeId: string
  presentAdjustment?: number
  halfDayAdjustment?: number
  paidLeaveAdjustment?: number
  bonus?: number
  customDeduction?: number
  notes?: string
}

export interface EmployeeSalaryCalculation {
  id: string
  employeeId: string
  name: string
  email: string
  phone?: string
  role: string
  profileImageUrl?: string
  monthlySalary: number
  workingDays: number
  passedWorkingDays: number
  upcomingDays: number
  presentDays: number
  halfDays: number
  paidLeaveDays: number
  absentDays: number // Calculated ONLY on days that have passed!
  perDayPay: number
  deductionSoFar: number // absentDays * perDayPay
  earnedTillToday: number // perDayPay * (present + 0.5 * halfDay + paidLeave)
  projectedMonthEnd: number // monthlySalary - deductionSoFar (assumes present on remaining)
  attendanceDeduction: number
  bonus: number
  customDeduction: number
  totalDeduction: number
  payableSalary: number
  isManualCorrection: boolean
  notes?: string
}

export interface MonthlyPayrollSnapshot {
  monthKey: string
  monthName: string
  workingDays: number
  passedWorkingDays: number
  upcomingDays: number
  totalBudget: number
  totalDeductionsSoFar: number
  totalEarnedTillToday: number
  totalProjectedPayout: number
  totalDeductions: number // backward compatibility
  totalPayable: number // backward compatibility
  employeeCount: number
  avgAttendanceRate: number
  finalizedAt: string
  finalizedBy: string
  records: EmployeeSalaryCalculation[]
}
