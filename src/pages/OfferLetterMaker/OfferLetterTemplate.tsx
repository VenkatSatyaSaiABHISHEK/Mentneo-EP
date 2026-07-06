import React from 'react';
import './OfferLetterTemplate.css';
import { OfferLetterData } from './types';

interface OfferLetterTemplateProps {
  data: OfferLetterData;
  templateRef: React.RefObject<HTMLDivElement>;
}

export default function OfferLetterTemplate({ data, templateRef }: OfferLetterTemplateProps) {
  // SVG Icons
  const Icons = {
    CalendarCheck: () => (
      <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><rect x="3" y="4" width="18" height="18" rx="2" ry="2"></rect><line x1="16" y1="2" x2="16" y2="6"></line><line x1="8" y1="2" x2="8" y2="6"></line><line x1="3" y1="10" x2="21" y2="10"></line><path d="m9 16 2 2 4-4"></path></svg>
    ),
    GraduationCap: () => (
      <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M22 10v6M2 10l10-5 10 5-10 5z"></path><path d="M6 12v5c3 3 9 3 12 0v-5"></path></svg>
    ),
    Briefcase: () => (
      <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><rect width="20" height="14" x="2" y="7" rx="2" ry="2"></rect><path d="M16 21V5a2 2 0 0 0-2-2h-4a2 2 0 0 0-2 2v16"></path></svg>
    ),
    ClipboardUser: () => (
      <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M16 4h2a2 2 0 0 1 2 2v14a2 2 0 0 1-2 2H6a2 2 0 0 1-2-2V6a2 2 0 0 1 2-2h2"></path><path d="M15 2H9a1 1 0 0 0-1 1v2a1 1 0 0 0 1 1h6a1 1 0 0 0 1-1V3a1 1 0 0 0-1-1Z"></path><circle cx="12" cy="11" r="3"></circle><path d="M16 19c0-1.7-1.3-3-3-3h-2c-1.7 0-3 1.3-3 3"></path></svg>
    ),
    Users: () => (
      <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M16 21v-2a4 4 0 0 0-4-4H6a4 4 0 0 0-4 4v2"></path><circle cx="9" cy="7" r="4"></circle><path d="M22 21v-2a4 4 0 0 0-3-3.87"></path><path d="M16 3.13a4 4 0 0 1 0 7.75"></path></svg>
    ),
    Lock: () => (
      <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><rect width="18" height="11" x="3" y="11" rx="2" ry="2"></rect><path d="M7 11V7a5 5 0 0 1 10 0v4"></path></svg>
    ),
    Shield: () => (
      <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z"></path></svg>
    ),
    Plane: () => (
      <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M17.8 19.2 16 11l3.5-3.5C21 6 21.5 4 21 3c-1-.5-3 0-4.5 1.5L13 8 4.8 6.2c-.5-.1-.9.2-1.1.7l-1 2.5L9 13l-4 4-2.8-.9c-.5-.2-1 .2-1.1.7l-.3 1.3c-.1.5.3.9.8.9h4.5c.3 0 .5-.1.7-.3l6.4-6.4L20 18.2c.4.4.9.4 1.3 0l1.1-1.1c.4-.4.4-1 0-1.4z"></path></svg>
    ),
    FileX: () => (
      <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M14.5 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V7.5L14.5 2z"></path><polyline points="14 2 14 8 20 8"></polyline><line x1="9.5" y1="12.5" x2="14.5" y2="17.5"></line><line x1="14.5" y1="12.5" x2="9.5" y2="17.5"></line></svg>
    ),
    Ban: () => (
      <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><circle cx="12" cy="12" r="10"></circle><line x1="4.93" y1="4.93" x2="19.07" y2="19.07"></line></svg>
    ),
    Info: () => (
      <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><circle cx="12" cy="12" r="10"></circle><line x1="12" y1="16" x2="12" y2="12"></line><line x1="12" y1="8" x2="12.01" y2="8"></line></svg>
    ),
    Mail: () => (
      <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><rect width="20" height="16" x="2" y="4" rx="2"></rect><path d="m22 7-8.97 5.7a1.94 1.94 0 0 1-2.06 0L2 7"></path></svg>
    ),
    Globe: () => (
      <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><circle cx="12" cy="12" r="10"></circle><line x1="2" y1="12" x2="22" y2="12"></line><path d="M12 2a15.3 15.3 0 0 1 4 10 15.3 15.3 0 0 1-4 10 15.3 15.3 0 0 1-4-10 15.3 15.3 0 0 1 4-10z"></path></svg>
    ),
    Phone: () => (
      <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M22 16.92v3a2 2 0 0 1-2.18 2 19.79 19.79 0 0 1-8.63-3.07 19.5 19.5 0 0 1-6-6 19.79 19.79 0 0 1-3.07-8.67A2 2 0 0 1 4.11 2h3a2 2 0 0 1 2 1.72 12.84 12.84 0 0 0 .7 2.81 2 2 0 0 1-.45 2.11L8.09 9.91a16 16 0 0 0 6 6l1.27-1.27a2 2 0 0 1 2.11-.45 12.84 12.84 0 0 0 2.81.7A2 2 0 0 1 22 16.92z"></path></svg>
    ),
    FileCheck: () => (
      <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M14.5 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V7.5L14.5 2z"></path><polyline points="14 2 14 8 20 8"></polyline><path d="m9 15 2 2 4-4"></path></svg>
    ),
    MapPin: () => (
      <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M20 10c0 6-8 12-8 12s-8-6-8-12a8 8 0 0 1 16 0Z"></path><circle cx="12" cy="10" r="3"></circle></svg>
    )
  };

  const formatDate = (dateString: string) => {
    if (!dateString) return '__________________';
    try {
      const options: Intl.DateTimeFormatOptions = { year: 'numeric', month: 'long', day: '2-digit' };
      return new Date(dateString).toLocaleDateString('en-US', options);
    } catch {
      return dateString;
    }
  };

  const formatCurrency = (amount: string) => {
    if (!amount) return '';
    const numericString = amount.replace(/[^0-9.]/g, '');
    if (!numericString) return amount.replace(/^₹\s*/, '');
    const number = parseFloat(numericString);
    if (isNaN(number)) return amount.replace(/^₹\s*/, '');
    return new Intl.NumberFormat('en-IN').format(number);
  };

  return (
    <div ref={templateRef} className="offer-letter-container">

      {/* PAGE 1 */}
      <div className="offer-letter-page">
        <div className="page-header">
          <div className="brand-logo">
            <img src="https://i.ibb.co/LbQGyJJ/Screenshot-2025-08-05-170614-removebg-preview-20260208-085437-0000-1.png" alt="Mentneo" className="brand-logo-img" />
            MENTNEO
          </div>
          <div className="header-right">
            Date: {formatDate(data.date)}
          </div>
        </div>

        <h1 className="main-title">OFFER OF APPOINTMENT</h1>

        <div className="text-body">
          <p>
            To,<br />
            <span className="text-bold">{data.candidateName || 'Candidate Name'}</span><br />
            {data.address || 'Location'}
          </p>
        </div>

        <div className="text-body">
          <p className="text-bold" style={{ fontSize: '14px' }}>Dear {data.candidateName?.split(' ')[0] || 'Candidate'},</p>
          <p>
            We are pleased to extend this offer of appointment for the position of <strong>{data.position || 'Position'}</strong> at MENTNEO. We were impressed with your qualifications, experience, and enthusiasm during the selection process and are excited about the potential you bring to our team.
          </p>
          <p>
            This offer is a formal confirmation of your selection, and the terms and details of your association with us are outlined below:
          </p>
        </div>

        <h2 className="section-title">1. POSITION DETAILS</h2>
        <table className="info-table">
          <tbody>
            <tr>
              <td className="label">Position</td>
              <td className="colon">:</td>
              <td>{data.position}</td>
            </tr>
            <tr>
              <td className="label">Department</td>
              <td className="colon">:</td>
              <td>{data.department}</td>
            </tr>
            <tr>
              <td className="label">Employment Type</td>
              <td className="colon">:</td>
              <td>{data.employmentType}</td>
            </tr>
            <tr>
              <td className="label">Work Location</td>
              <td className="colon">:</td>
              <td>{data.workLocation}</td>
            </tr>
            <tr>
              <td className="label">Reporting To</td>
              <td className="colon">:</td>
              <td>{data.reportingTo}</td>
            </tr>
            <tr>
              <td className="label">Start Date</td>
              <td className="colon">:</td>
              <td>{formatDate(data.startDate)}</td>
            </tr>

          </tbody>
        </table>

        <h2 className="section-title">2. COMPENSATION DETAILS</h2>
        <table className="comp-table">
          <thead>
            <tr>
              <th>COMPONENT</th>
              <th>AMOUNT (INR)</th>
            </tr>
          </thead>
          <tbody>
            <tr>
              <td>Yearly CTC</td>
              <td>₹ {formatCurrency(data.salary)}</td>
            </tr>
            <tr>
              <td>Payment Frequency</td>
              <td>Monthly</td>
            </tr>
            <tr>
              <td>Pre-Placement Offer (PPO)</td>
              <td>Based on performance during internship</td>
            </tr>
          </tbody>
        </table>

        <div className="highlight-box">
          <div className="icon"><Icons.CalendarCheck /></div>
          <div className="content">
            <h4>ACCEPTANCE</h4>
            <p>Please review this offer letter carefully. To confirm your acceptance, kindly sign and return a copy of this letter.</p>
          </div>
        </div>
      </div>

      {/* PAGE 2 */}
      <div className="offer-letter-page">
        <div className="page-header">
          <div className="brand-logo">
            <img src="https://i.ibb.co/LbQGyJJ/Screenshot-2025-08-05-170614-removebg-preview-20260208-085437-0000-1.png" alt="Mentneo" className="brand-logo-img" />
            MENTNEO
          </div>
          <div className="header-right">
            Offer of Appointment<br />
            Page <strong>2</strong> of <strong>3</strong>
          </div>
        </div>

        <h2 className="section-title">3. TERMS AND CONDITIONS OF EMPLOYMENT</h2>
        <p className="text-body" style={{ marginTop: '15px' }}>Your employment with MENTNEO  is subject to the following terms and conditions:</p>

        <div className="terms-list">
          <div className="term-item">
            <div className="term-icon"><Icons.Briefcase /></div>
            <div className="term-content">
              <h4>3.1 TRAINING AND ONBOARDING</h4>
              <p>You will undergo an initial training and onboarding program to familiarize yourself with our processes, tools, and policies. The training period is an integral part of your onboarding and will help you prepare for your role and responsibilities.</p>
            </div>
          </div>

          <div className="term-item">
            <div className="term-icon"><Icons.ClipboardUser /></div>
            <div className="term-content">
              <h4>3.2 PERFORMANCE AND EVALUATION</h4>
              <p>Your performance will be evaluated periodically based on key objectives, responsibilities, and company values. Continuous feedback will be provided to help you grow and excel in your role.</p>
            </div>
          </div>

          <div className="term-item">
            <div className="term-icon"><Icons.Users /></div>
            <div className="term-content">
              <h4>3.3 CODE OF CONDUCT</h4>
              <p>You are expected to uphold the highest standards of professionalism, integrity, and ethical conduct. You must comply with all company policies, procedures, and applicable laws and regulations.</p>
            </div>
          </div>

          <div className="term-item">
            <div className="term-icon"><Icons.Lock /></div>
            <div className="term-content">
              <h4>3.4 CONFIDENTIALITY</h4>
              <p>You will maintain strict confidentiality of all company information, including but not limited to, business strategies, client data, financial information, and internal processes. This obligation continues even after the termination of your employment.</p>
            </div>
          </div>

          <div className="term-item">
            <div className="term-icon"><Icons.Shield /></div>
            <div className="term-content">
              <h4>3.5 INTELLECTUAL PROPERTY</h4>
              <p>All intellectual property, including ideas, documents, strategies, and materials developed during your employment, shall remain the sole property of MENTNEO.</p>
            </div>
          </div>

          <div className="term-item">
            <div className="term-icon"><Icons.Plane /></div>
            <div className="term-content">
              <h4>3.6 LEAVE POLICY</h4>
              <p>As the company is currently in its startup phase, there will be no fixed monthly leave policy. Employees may take leave only in case of genuine emergencies, subject to management approval.</p>
            </div>
          </div>

          <div className="term-item">
            <div className="term-icon"><Icons.FileX /></div>
            <div className="term-content">
              <h4>3.7 TERMINATION</h4>
              <p>Either party may terminate this employment by providing 15 (fifteen) days' written notice or payment in lieu thereof. The company reserves the right to terminate employment without notice in cases of misconduct, breach of policy, or unsatisfactory performance.</p>
            </div>
          </div>

          <div className="term-item">
            <div className="term-icon"><Icons.Ban /></div>
            <div className="term-content">
              <h4>3.8 NON-COMPETE CLAUSE</h4>
              <p>During your employment and for 6 (six) months after termination, you shall not engage in any business or activity that competes with MENTNEO or solicit any of its clients, employees, or partners.</p>
            </div>
          </div>
        </div>

        <h2 className="section-title">4. GENERAL</h2>
        <p className="text-body" style={{ marginTop: '15px' }}>This offer is subject to verification of your background, qualifications, and references. Any misrepresentation of facts may result in withdrawal of this offer or termination of employment.</p>

        <div className="bottom-split-box">
          <div className="bottom-split-left">
            <div style={{ color: '#6D28D9' }}><Icons.Info /></div>
            <div>
              <h4 style={{ margin: '0 0 5px 0', fontSize: '13px', fontWeight: 800, color: '#111827', textTransform: 'uppercase' }}>IMPORTANT</h4>
              <p style={{ margin: '0', fontSize: '12px', color: '#4B5563', lineHeight: '1.5' }}>
                Please review this offer carefully.<br />
                Please sign and return a copy of this letter to confirm your acceptance.
              </p>
            </div>
          </div>
          <div className="bottom-split-right">
            <div className="contact-row"><Icons.Mail /> {data.emailId || 'official@mentneo.com'}</div>
            <div className="contact-row"><Icons.Globe /> {data.website || 'www.mentneo.com'}</div>
            <div className="contact-row"><Icons.Phone /> {data.phoneNumber || '+91 94924 35398'}</div>
          </div>
        </div>
      </div>

      {/* PAGE 3 */}
      <div className="offer-letter-page">
        <div className="page-header">
          <div className="brand-logo">
            <img src="https://i.ibb.co/LbQGyJJ/Screenshot-2025-08-05-170614-removebg-preview-20260208-085437-0000-1.png" alt="Mentneo" className="brand-logo-img" />
            MENTNEO
          </div>
          <div className="header-right">
            Offer of Appointment<br />
            Page <strong>3</strong> of <strong>3</strong>
          </div>
        </div>

        <h2 className="section-title">5. ACKNOWLEDGEMENT & ACCEPTANCE</h2>
        <p className="text-body" style={{ marginTop: '20px' }}>
          Please read this offer letter carefully along with all the terms and conditions stated herein. If you accept this offer and the terms of employment, please sign and return a copy of this letter to indicate your acceptance.
        </p>

        <div className="notice-box">
          <div className="icon"><Icons.FileCheck /></div>
          <div className="content">
            <h4>PLEASE NOTE</h4>
            <p>Your employment with MENTNEO is contingent upon successful completion of background verification and submission of required documents as requested by the HR team.</p>
          </div>
        </div>

        <p className="text-body">We look forward to welcoming you to MENTNEO and to a successful association.</p>
        <p className="text-body" style={{ marginBottom: '5px' }}>Warm regards,</p>
        <p className="text-bold" style={{ color: '#5A4AF4', fontSize: '14px', marginBottom: '40px' }}>For MENTNEO</p>

        <div style={{ display: 'flex', justifyContent: 'space-between', gap: '40px' }}>
          <div className="new-signature-block">
            <div className="sig-details">
              <strong>Abhiram Yeduru</strong><br />
              Founder, MENTNEO
            </div>
          </div>
        </div>

        <div style={{ borderTop: '1px dotted #A78BFA', marginTop: '60px', marginBottom: '30px' }}></div>

        <div className="declaration-title">ACCEPTANCE DECLARATION</div>
        <p className="text-body" style={{ textAlign: 'center', margin: '0 auto', maxWidth: '90%' }}>
          I have read and understood the terms and conditions of this offer letter. I accept the position and agree to abide by the policies and procedures of MENTNEO.
        </p>

        <div style={{ display: 'flex', justifyContent: 'center' }}>
          <table className="form-table">
            <tbody>
              <tr>
                <td>Name</td>
                <td>: <span className="form-line"></span></td>
              </tr>
              <tr>
                <td>Signature</td>
                <td>: <span className="form-line"></span></td>
              </tr>
              <tr>
                <td>Date</td>
                <td>: <span className="form-line"></span></td>
              </tr>
              <tr>
                <td>Place</td>
                <td>: <span className="form-line"></span></td>
              </tr>
            </tbody>
          </table>
        </div>



      </div>

    </div>
  );
}
