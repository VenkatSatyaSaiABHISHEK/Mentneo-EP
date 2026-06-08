export interface InternOfferLetterData {
  id?: string;
  candidateName: string;
  date: string;
  position: string;
  department: string;
  employmentType: string;
  reportingTo: string;
  startDate: string;
  internEmail: string;
  templateId: string;
}

export const initialInternOfferLetterData: InternOfferLetterData = {
  candidateName: 'Abhishak CH',
  date: new Date().toISOString().split('T')[0],
  position: 'Intern',
  department: 'Marketing & Communications',
  employmentType: 'Internship',
  reportingTo: 'Founder',
  startDate: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString().split('T')[0], // Next week
  internEmail: 'intern@example.com',
  templateId: '1'
};
