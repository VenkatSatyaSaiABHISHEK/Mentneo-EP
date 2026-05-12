export interface OfferLetterData {
  id?: string;
  candidateName: string;
  address: string;
  date: string;
  position: string;
  department: string;
  employmentType: string;
  workLocation: string;
  reportingTo: string;
  startDate: string;
  probationPeriod: string;
  salary: string;
  bonusAmount: string;
  emailId: string;
  phoneNumber: string;
  website: string;
  acceptanceDeadlineDate: string;
  templateId: string;
}

export const initialOfferLetterData: OfferLetterData = {
  candidateName: 'Abhishak CH',
  address: 'Bangalore, India',
  date: new Date().toISOString().split('T')[0],
  position: 'Media Manager',
  department: 'Marketing & Communications',
  employmentType: 'Full-Time',
  workLocation: 'Bangalore, India',
  reportingTo: 'Founder',
  startDate: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString().split('T')[0], // Next week
  probationPeriod: '3 Months',
  salary: '₹ 8,00,000',
  bonusAmount: 'Up to ₹ 80,000 (based on performance)',
  emailId: 'abhishak@example.com',
  phoneNumber: '+91 98765 43210',
  website: '',
  acceptanceDeadlineDate: new Date(Date.now() + 3 * 24 * 60 * 60 * 1000).toISOString().split('T')[0], // 3 days later
  templateId: '1'
};
