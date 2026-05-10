export type Employee = {
  id: string
  name: string
  role: string
  department: string
  status: string
  location: string
}

export const employees: Employee[] = [
  {
    id: 'EMP-0912',
    name: 'Jasmine Patel',
    role: 'People Partner',
    department: 'HR',
    status: 'Onsite',
    location: 'New York',
  },
  {
    id: 'EMP-1044',
    name: 'Marco Ruiz',
    role: 'Workplace Analyst',
    department: 'Facilities',
    status: 'Remote',
    location: 'Austin',
  },
  {
    id: 'EMP-1189',
    name: 'Sienna Brooks',
    role: 'Compensation Lead',
    department: 'Total Rewards',
    status: 'Hybrid',
    location: 'Chicago',
  },
  {
    id: 'EMP-1277',
    name: 'Noah Kim',
    role: 'Talent Ops',
    department: 'Recruiting',
    status: 'Onsite',
    location: 'Seattle',
  },
]
