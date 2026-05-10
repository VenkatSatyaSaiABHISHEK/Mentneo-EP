export type EmployeeRecord = {
  id: string
  employeeId: string
  name: string
  email: string
  phone: string
  role: string
  salary: number
  joinDate: string
  qrUrl?: string
  profileImageUrl?: string
  password?: string
}

export type CsvEmployeeRow = {
  name: string
  email: string
  phone: string
  role: string
  salary: string
  joinDate: string
}
