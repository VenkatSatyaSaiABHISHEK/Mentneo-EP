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
  salary: string;
  emailId: string;
  phoneNumber: string;
  website: string;
  templateId: string;
}

export const initialOfferLetterData: OfferLetterData = {
  candidateName: 'Abhishak CH',
  address: 'Bangalore, India',
  date: new Date().toISOString().split('T')[0],
  position: 'Intern',
  department: 'Marketing & Communications',
  employmentType: 'Internship',
  workLocation: 'Bangalore, India',
  reportingTo: 'Founder',
  startDate: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString().split('T')[0], // Next week
  salary: '10,000',
  emailId: 'abhishak@example.com',
  phoneNumber: '+91 94924 35398',
  website: '',
  templateId: '1'
};
