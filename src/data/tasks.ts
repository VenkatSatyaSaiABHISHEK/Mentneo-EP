export type TaskItem = {
  id: string
  title: string
  owner: string
  due: string
  priority: 'Low' | 'Medium' | 'High'
}

export const tasks: TaskItem[] = [
  {
    id: 'TSK-221',
    title: 'Finalize Q2 onboarding schedule',
    owner: 'Lena Carter',
    due: 'Apr 30',
    priority: 'High',
  },
  {
    id: 'TSK-227',
    title: 'Audit PTO carryover balances',
    owner: 'Orion Perez',
    due: 'May 03',
    priority: 'Medium',
  },
  {
    id: 'TSK-233',
    title: 'Refresh engagement survey copy',
    owner: 'Maya Singh',
    due: 'May 06',
    priority: 'Low',
  },
]
