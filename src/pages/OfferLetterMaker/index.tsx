import React, { useState, useRef, useEffect } from 'react';
import html2pdf from 'html2pdf.js';
import Papa from 'papaparse';
import { collection, addDoc, serverTimestamp, getDocs, doc, updateDoc } from 'firebase/firestore';
import { db } from '../../services/firebase';
import { OfferLetterData, initialOfferLetterData } from './types';
import OfferLetterTemplate from './OfferLetterTemplate';

export default function OfferLetterMaker() {
  const [data, setData] = useState<OfferLetterData>(initialOfferLetterData);
  const [isSaving, setIsSaving] = useState(false);
  const [isExporting, setIsExporting] = useState(false);
  const [saveMessage, setSaveMessage] = useState('');
  const [drafts, setDrafts] = useState<{ id: string, name: string, date: string }[]>([]);
  const [previewMode, setPreviewMode] = useState(false);
  const [bulkData, setBulkData] = useState<OfferLetterData[]>([]);

  const templateRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    loadDrafts();
  }, []);

  const loadDrafts = async () => {
    try {
      const querySnapshot = await getDocs(collection(db, 'offerLetters'));
      const fetchedDrafts = querySnapshot.docs.map(doc => ({
        id: doc.id,
        name: doc.data().candidateName,
        date: doc.data().date
      }));
      setDrafts(fetchedDrafts);
    } catch (error) {
      console.error("Error loading drafts:", error);
    }
  };

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) => {
    const { name, value } = e.target;
    setData(prev => ({ ...prev, [name]: value }));
  };

  const handleSaveDraft = async () => {
    setIsSaving(true);
    setSaveMessage('');
    try {
      const offerLetterData = {
        ...data,
        updatedAt: serverTimestamp()
      };

      if (data.id) {
        // Update existing
        const docRef = doc(db, 'offerLetters', data.id);
        await updateDoc(docRef, offerLetterData);
        setSaveMessage('Draft updated successfully!');
      } else {
        // Create new
        const docRef = await addDoc(collection(db, 'offerLetters'), {
          ...offerLetterData,
          createdAt: serverTimestamp()
        });
        setData(prev => ({ ...prev, id: docRef.id }));
        setSaveMessage('Draft saved successfully!');
      }
      loadDrafts();
    } catch (error) {
      console.error("Error saving draft:", error);
      setSaveMessage('Error saving draft. Please try again.');
    } finally {
      setIsSaving(false);
      setTimeout(() => setSaveMessage(''), 3000);
    }
  };

  const handleDownloadPDF = () => {
    if (!templateRef.current) return;

    setIsExporting(true);

    const element = templateRef.current;
    const opt = {
      margin: 0,
      filename: `Offer_Letter_${data.candidateName.replace(/\s+/g, '_')}.pdf`,
      image: { type: 'jpeg' as const, quality: 0.98 },
      html2canvas: { scale: 2, useCORS: true, windowWidth: 794 },
      jsPDF: { unit: 'px' as const, format: [794, 1123] as [number, number], orientation: 'portrait' as const }
    };

    html2pdf().set(opt).from(element).save().then(() => {
      setIsExporting(false);
    });
  };

  const handleDownloadTemplate = () => {
    const headers = [
      'candidateName', 'address', 'date', 'position', 'department',
      'employmentType', 'workLocation', 'reportingTo', 'startDate',
      'salary', 'emailId', 'phoneNumber',
      'website', 'templateId'
    ];
    const sampleData = [
      'John Doe', 'New York, USA', '2023-10-01', 'Software Engineer', 'Engineering',
      'Full-Time', 'Remote', 'Jane Smith', '2023-11-01',
      '50000', 'john@example.com', '+1 234 567 8900',
      'www.johndoe.com', '1'
    ];

    const csvContent = headers.join(',') + '\n' + sampleData.join(',');
    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.setAttribute('href', url);
    link.setAttribute('download', 'offer_letter_template.csv');
    link.style.visibility = 'hidden';
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    Papa.parse(file, {
      header: true,
      skipEmptyLines: true,
      complete: (results) => {
        const parsedData = results.data as any[];
        const mappedData: OfferLetterData[] = parsedData.map(row => ({
          candidateName: row.candidateName || '',
          address: row.address || '',
          date: row.date || '',
          position: row.position || '',
          department: row.department || '',
          employmentType: row.employmentType || '',
          workLocation: row.workLocation || '',
          reportingTo: row.reportingTo || '',
          startDate: row.startDate || '',
          salary: row.salary || '',
          emailId: row.emailId || '',
          phoneNumber: row.phoneNumber || '',
          website: row.website || '',
          templateId: row.templateId || '1'
        }));
        setBulkData(mappedData);

        if (mappedData.length > 0) {
          setData(prev => ({ ...prev, ...mappedData[0] }));
        }

        e.target.value = '';
      }
    });
  };

  const generateBulkPDFs = async () => {
    if (bulkData.length === 0) return;
    setIsExporting(true);

    const originalData = { ...data };

    for (let i = 0; i < bulkData.length; i++) {
      const item = bulkData[i];
      setData(prev => ({ ...prev, ...item }));

      await new Promise(resolve => setTimeout(resolve, 800));

      if (templateRef.current) {
        const element = templateRef.current;
        const opt = {
          margin: 0,
          filename: `Offer_Letter_${item.candidateName?.replace(/\s+/g, '_') || `Candidate_${i + 1}`}.pdf`,
          image: { type: 'jpeg' as const, quality: 0.98 },
          html2canvas: { scale: 2, useCORS: true, windowWidth: 794 },
          jsPDF: { unit: 'px' as const, format: [794, 1123] as [number, number], orientation: 'portrait' as const }
        };

        try {
          await html2pdf().set(opt).from(element).save();
        } catch (err) {
          console.error("Error generating PDF for", item.candidateName, err);
        }
      }
    }

    setData(originalData);
    setIsExporting(false);
    setSaveMessage(`Successfully generated ${bulkData.length} PDFs!`);
    setTimeout(() => setSaveMessage(''), 3000);
  };

  const loadDraft = async (id: string) => {
    try {
      const querySnapshot = await getDocs(collection(db, 'offerLetters'));
      const selectedDoc = querySnapshot.docs.find(doc => doc.id === id);
      if (selectedDoc) {
        setData({ id: selectedDoc.id, ...selectedDoc.data() } as OfferLetterData);
      }
    } catch (error) {
      console.error("Error loading draft:", error);
    }
  };

  return (
    <div className="flex flex-col h-[calc(100vh-8rem)]">
      <div className="mb-6 flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-slate-900">Offer Letter Maker <span className="ml-2 inline-flex items-center rounded-full bg-purple-100 px-2.5 py-0.5 text-xs font-semibold text-purple-800">Beta</span></h1>
          <p className="text-slate-500">Create, edit, and generate PDF offer letters.</p>
        </div>
        <div className="flex gap-3">
          <button
            onClick={() => setPreviewMode(!previewMode)}
            className="rounded-lg border border-slate-300 bg-white px-4 py-2 text-sm font-medium text-slate-700 hover:bg-slate-50 transition"
          >
            {previewMode ? 'Edit Mode' : 'Preview Mode'}
          </button>
          <button
            onClick={handleSaveDraft}
            disabled={isSaving}
            className="rounded-lg bg-slate-800 px-4 py-2 text-sm font-medium text-white hover:bg-slate-700 transition disabled:opacity-50"
          >
            {isSaving ? 'Saving...' : 'Save Draft'}
          </button>
          <button
            onClick={handleDownloadPDF}
            disabled={isExporting}
            className="rounded-lg bg-blue-600 px-4 py-2 text-sm font-medium text-white hover:bg-blue-700 transition disabled:opacity-50"
          >
            {isExporting ? 'Generating PDF...' : 'Download PDF'}
          </button>
        </div>
      </div>

      {/* BETA WARNING MESSAGE */}
      <div className="mb-6 rounded-lg border border-purple-200 bg-purple-50 p-4 shadow-sm">
        <div className="flex items-center">
          <svg className="h-5 w-5 text-purple-600 mr-3" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
          </svg>
          <p className="text-sm font-medium text-purple-800">
            <strong>Beta Mode:</strong> Our team is currently working on this feature. It is in beta mode right now!
          </p>
        </div>
      </div>

      {saveMessage && (
        <div className="mb-4 rounded-lg bg-green-50 p-3 text-sm text-green-700 border border-green-200">
          {saveMessage}
        </div>
      )}

      <div className="flex flex-1 gap-6 overflow-hidden">
        {/* Left Panel: Form */}
        {!previewMode && (
          <div className="w-1/3 flex flex-col gap-6 overflow-y-auto pr-2 pb-10 custom-scrollbar">

            {/* Drafts Section */}
            {drafts.length > 0 && (
              <div className="rounded-xl border border-slate-200 bg-white p-5 shadow-sm">
                <h3 className="mb-4 text-lg font-semibold text-slate-800">Recent Drafts</h3>
                <div className="flex flex-col gap-2">
                  {drafts.slice(0, 3).map(draft => (
                    <button
                      key={draft.id}
                      onClick={() => loadDraft(draft.id)}
                      className="text-left text-sm p-2 hover:bg-slate-50 rounded border border-slate-100 transition flex justify-between items-center"
                    >
                      <span className="font-medium text-slate-700">{draft.name}</span>
                      <span className="text-xs text-slate-400">{draft.date}</span>
                    </button>
                  ))}
                </div>
              </div>
            )}

            {/* Bulk CSV Import */}
            <div className="rounded-xl border border-slate-200 bg-white p-5 shadow-sm flex flex-col gap-4">
              <h3 className="text-lg font-semibold text-slate-800">Bulk Generation (CSV)</h3>
              <p className="text-sm text-slate-500">Upload a CSV file to generate multiple offer letters at once.</p>

              <div className="flex gap-3">
                <button
                  onClick={handleDownloadTemplate}
                  className="flex-1 rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm font-medium text-slate-700 hover:bg-slate-50 transition"
                >
                  Download Template
                </button>
                <div className="flex-1 relative">
                  <input
                    type="file"
                    accept=".csv"
                    onChange={handleFileUpload}
                    className="absolute inset-0 w-full h-full opacity-0 cursor-pointer"
                  />
                  <button className="w-full rounded-lg bg-slate-800 px-3 py-2 text-sm font-medium text-white hover:bg-slate-700 transition">
                    Upload CSV Data
                  </button>
                </div>
              </div>

              {bulkData.length > 0 && (
                <div className="mt-2 p-3 bg-blue-50 rounded-lg text-sm text-blue-800 border border-blue-100 flex justify-between items-center">
                  <span><strong>{bulkData.length}</strong> candidates loaded.</span>
                  <button
                    onClick={generateBulkPDFs}
                    disabled={isExporting}
                    className="rounded bg-blue-600 px-3 py-1.5 text-xs font-medium text-white hover:bg-blue-700 transition disabled:opacity-50 whitespace-nowrap"
                  >
                    {isExporting ? 'Generating...' : 'Generate All PDFs'}
                  </button>
                </div>
              )}
            </div>

            {/* Template Selection */}
            <div className="rounded-xl border border-slate-200 bg-white p-5 shadow-sm">
              <h3 className="mb-4 text-lg font-semibold text-slate-800">Template Settings</h3>
              <div className="flex flex-col gap-1.5">
                <label className="text-sm font-medium text-slate-700">Select Template</label>
                <select
                  name="templateId"
                  value={data.templateId}
                  onChange={handleInputChange}
                  className="w-full rounded-lg border border-slate-300 bg-slate-50 p-2.5 text-sm outline-none transition focus:border-blue-500 focus:bg-white focus:ring-2 focus:ring-blue-100"
                >
                  <option value="1">Template 1 (Classic Blue)</option>
                  <option value="2">Template 2 (Modern Dark)</option>
                  <option value="3">Template 3 (Elegant Green)</option>
                </select>
              </div>
            </div>

            {/* Page 1 Details */}
            <div className="rounded-xl border border-slate-200 bg-white p-5 shadow-sm flex flex-col gap-4">
              <h3 className="text-lg font-semibold text-slate-800">Page 1: General Info</h3>

              <div className="grid grid-cols-1 gap-4">
                <InputField label="Candidate Name" name="candidateName" value={data.candidateName} onChange={handleInputChange} />
                <InputField label="Address (City, Country)" name="address" value={data.address} onChange={handleInputChange} />
                <InputField label="Date" name="date" type="date" value={data.date} onChange={handleInputChange} />
                <InputField label="Position" name="position" value={data.position} onChange={handleInputChange} />
                <InputField label="Department" name="department" value={data.department} onChange={handleInputChange} />
                <InputField label="Employment Type" name="employmentType" value={data.employmentType} onChange={handleInputChange} />
                <InputField label="Work Location" name="workLocation" value={data.workLocation} onChange={handleInputChange} />
                <InputField label="Reporting To" name="reportingTo" value={data.reportingTo} onChange={handleInputChange} />
                <InputField label="Start Date" name="startDate" type="date" value={data.startDate} onChange={handleInputChange} />
                <InputField label="Yearly CTC" name="salary" value={data.salary} onChange={handleInputChange} />
              </div>
            </div>

            {/* Page 2 Details */}
            <div className="rounded-xl border border-slate-200 bg-white p-5 shadow-sm flex flex-col gap-4">
              <h3 className="text-lg font-semibold text-slate-800">Page 2: Contact Info</h3>
              <div className="grid grid-cols-1 gap-4">
                <InputField label="Email ID" name="emailId" type="email" value={data.emailId} onChange={handleInputChange} />
                <InputField label="Phone Number" name="phoneNumber" value={data.phoneNumber} onChange={handleInputChange} />
                <InputField label="Website (Optional)" name="website" value={data.website} onChange={handleInputChange} />
              </div>
            </div>

            {/* Page 3 Details */}
            <div className="rounded-xl border border-slate-200 bg-white p-5 shadow-sm flex flex-col gap-4">
              <h3 className="text-lg font-semibold text-slate-800">Page 3: Acceptance</h3>
              <div className="grid grid-cols-1 gap-4">
                <div className="p-3 bg-blue-50 rounded-lg text-sm text-blue-800 border border-blue-100">
                  <strong>Note:</strong> Signature Section is permanently set to HR Team .
                </div>
              </div>
            </div>

          </div>
        )}

        {/* Right Panel: Preview */}
        <div className={`overflow-y-auto bg-slate-100 rounded-xl border border-slate-200 p-8 custom-scrollbar ${previewMode ? 'w-full flex justify-center' : 'w-2/3'}`}>
          <div className="shadow-2xl bg-white mx-auto overflow-hidden">
            <OfferLetterTemplate data={data} templateRef={templateRef} />
          </div>
        </div>
      </div>
    </div>
  );
}

// Reusable Input Field Component
const InputField = ({ label, name, value, onChange, type = 'text' }: { label: string, name: string, value: string, onChange: (e: React.ChangeEvent<HTMLInputElement>) => void, type?: string }) => (
  <div className="flex flex-col gap-1.5">
    <label className="text-sm font-medium text-slate-700">{label}</label>
    <input
      type={type}
      name={name}
      value={value}
      onChange={onChange}
      className="w-full rounded-lg border border-slate-300 bg-slate-50 p-2.5 text-sm outline-none transition focus:border-blue-500 focus:bg-white focus:ring-2 focus:ring-blue-100"
    />
  </div>
);
