import React, { useState, useEffect } from 'react';
import Papa from 'papaparse';
import Button from '../components/Button';
import Card from '../components/Card';
import { Client, ClientStatus } from '../types/client';
import { getAllClients, createClient, uploadClientFile, updateClient } from '../services/clientService';
import { useAuth } from '../context/AuthContext';

const formatCurrency = new Intl.NumberFormat('en-IN', {
  style: 'currency',
  currency: 'INR',
  maximumFractionDigits: 0,
});

export default function ClientData() {
  const { isSuperAdmin } = useAuth();
  const [clients, setClients] = useState<Client[]>([]);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [isUploading, setIsUploading] = useState(false);
  const [isLoading, setIsLoading] = useState(true);

  // Edit Client State
  const [editingClient, setEditingClient] = useState<Client | null>(null);
  const [editFormData, setEditFormData] = useState<Partial<Client>>({});
  const [editPaymentPhoto, setEditPaymentPhoto] = useState<File | null>(null);
  const [editClientDataFile, setEditClientDataFile] = useState<File | null>(null);
  const [isUpdating, setIsUpdating] = useState(false);

  // Expanded dates list
  const [expandedDates, setExpandedDates] = useState<Set<string>>(new Set());

  const toggleDateExpand = (clientId: string) => {
    setExpandedDates(prev => {
      const next = new Set(prev);
      if (next.has(clientId)) {
        next.delete(clientId);
      } else {
        next.add(clientId);
      }
      return next;
    });
  };

  const formatSimpleDate = (dateStr?: string) => {
    if (!dateStr) return 'N/A';
    const date = new Date(dateStr);
    if (isNaN(date.getTime())) return 'N/A';
    return date.toLocaleDateString('en-US', { month: 'short', day: 'numeric' }); // e.g. "Jun 2"
  };

  const formatFullDate = (dateStr?: string) => {
    if (!dateStr) return 'N/A';
    const date = new Date(dateStr);
    if (isNaN(date.getTime())) return 'N/A';
    return date.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' }); // e.g. "Jun 2, 2026"
  };

  useEffect(() => {
    fetchClients();
  }, []);

  const fetchClients = async () => {
    try {
      setIsLoading(true);
      const data = await getAllClients();
      setClients(data);
    } catch (error) {
      console.error('Error fetching clients:', error);
    } finally {
      setIsLoading(false);
    }
  };

  const handleCsvUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setIsUploading(true);
    Papa.parse(file, {
      header: true,
      skipEmptyLines: true,
      transformHeader: (header) => header.trim().toLowerCase(),
      complete: async (results) => {
        const parsedData = results.data as Record<string, string>[];
        
        const newClientsData: Omit<Client, 'id'>[] = parsedData.map(row => {
          // Normalizing common status values
          let statusStr = row['status']?.trim() || 'Pending';
          if (statusStr.toLowerCase() === 'in progress') statusStr = 'In Progress';
          if (statusStr.toLowerCase() === 'completed') statusStr = 'Completed';
          if (statusStr.toLowerCase() === 'pending') statusStr = 'Pending';
          
          const pendingAmountStr = row['pending amount'] || row['pending'] || row['amount'] || '0';
          const pendingAmount = Number(pendingAmountStr.replace(/[^0-9.-]/g, '')) || 0;

          return {
            clientName: row['client name'] || row['clientname'] || row['name'] || '',
            phoneNumber: row['phone number'] || row['phone'] || '',
            telecallerName: row['telecaller'] || row['telecaller name'] || '',
            editorName: row['editor'] || row['editor name'] || '',
            status: (['Pending', 'In Progress', 'Completed'].includes(statusStr) ? statusStr : 'Pending') as ClientStatus,
            selectedPackage: row['package'] || row['selected package'] || '',
            videos: row['videos'] || '',
            pendingAmount: pendingAmount,
          };
        });

        try {
          await Promise.all(newClientsData.map(clientData => createClient(clientData)));
          await fetchClients();
        } catch (error) {
          console.error('Error uploading clients:', error);
        } finally {
          setIsUploading(false);
          e.target.value = '';
        }
      },
      error: (error) => {
        console.error('Error parsing CSV:', error);
        setIsUploading(false);
      }
    });
  };

  const handleDownloadTemplate = () => {
    const headers = ["Client Name", "Phone", "Telecaller", "Editor", "Package", "Videos", "Pending Amount", "Status"];
    const dummyData = ["John Doe", "1234567890", "Jane Smith", "Mike Johnson", "Premium Pack", "0/10", "5000", "Pending"];
    const csvContent = "data:text/csv;charset=utf-8," + headers.join(",") + "\n" + dummyData.join(",");
    const encodedUri = encodeURI(csvContent);
    const link = document.createElement("a");
    link.setAttribute("href", encodedUri);
    link.setAttribute("download", "client_data_template.csv");
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  // Form state
  const [newClient, setNewClient] = useState<Partial<Client>>({
    clientName: '',
    phoneNumber: '',
    telecallerName: '',
    editorName: '',
    status: 'Pending',
    selectedPackage: '',
    videos: '',
    pendingAmount: 0,
  });
  const [paymentPhoto, setPaymentPhoto] = useState<File | null>(null);
  const [clientDataFile, setClientDataFile] = useState<File | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) => {
    const { name, value } = e.target;
    setNewClient({ ...newClient, [name]: value });
  };

  const handleEditInputChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) => {
    const { name, value } = e.target;
    setEditFormData({ ...editFormData, [name]: value });
  };

  const handleAddClient = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSubmitting(true);
    try {
      let paymentPhotoUrl = '';
      let clientDataUrl = '';

      if (paymentPhoto) {
        paymentPhotoUrl = await uploadClientFile(paymentPhoto, 'payments');
      }
      if (clientDataFile) {
        clientDataUrl = await uploadClientFile(clientDataFile, 'client-data');
      }

      await createClient({
        ...(newClient as Omit<Client, 'id'>),
        pendingAmount: Number(newClient.pendingAmount) || 0,
        paymentPhotoUrl,
        clientDataUrl,
      });

      await fetchClients();
      setIsModalOpen(false);
      setNewClient({
        clientName: '',
        phoneNumber: '',
        telecallerName: '',
        editorName: '',
        status: 'Pending',
        selectedPackage: '',
        videos: '',
        pendingAmount: 0,
      });
      setPaymentPhoto(null);
      setClientDataFile(null);
    } catch (error) {
      console.error('Error adding client:', error);
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleUpdateClient = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingClient) return;
    setIsUpdating(true);
    try {
      let paymentPhotoUrl = editFormData.paymentPhotoUrl || '';
      let clientDataUrl = editFormData.clientDataUrl || '';

      if (editPaymentPhoto) {
        paymentPhotoUrl = await uploadClientFile(editPaymentPhoto, 'payments');
      }
      if (editClientDataFile) {
        clientDataUrl = await uploadClientFile(editClientDataFile, 'client-data');
      }

      await updateClient(editingClient.id, {
        ...editFormData,
        pendingAmount: Number(editFormData.pendingAmount) || 0,
        paymentPhotoUrl,
        clientDataUrl,
      });

      await fetchClients();
      setEditingClient(null);
      setEditPaymentPhoto(null);
      setEditClientDataFile(null);
    } catch (error) {
      console.error('Error updating client:', error);
    } finally {
      setIsUpdating(false);
    }
  };

  const getStatusColor = (status: ClientStatus) => {
    switch (status) {
      case 'Completed': return 'bg-emerald-100 text-emerald-800 border-emerald-200';
      case 'In Progress': return 'bg-blue-100 text-blue-800 border-blue-200';
      case 'Pending': return 'bg-amber-100 text-amber-800 border-amber-200';
      default: return 'bg-slate-100 text-slate-800 border-slate-200';
    }
  };

  return (
    <div className="flex flex-col gap-8 pb-12 fade-in">
      {/* Header */}
      <section className="glass-panel flex flex-col gap-6 rounded-3xl p-8 md:flex-row md:items-end md:justify-between">
        <div className="flex flex-col gap-2">
          <p className="text-xs uppercase tracking-[0.2em] text-slate-500 font-medium">Database</p>
          <h1 className="text-4xl font-light text-slate-900 tracking-tight">
            Client <span className="font-semibold text-slate-800">Data</span>
          </h1>
          <p className="max-w-xl text-slate-600 leading-relaxed mt-2">
            Manage all your clients, track package progress, and assign team members efficiently.
          </p>
        </div>
        <div className="flex flex-wrap gap-4">
          {!isSuperAdmin && (
            <>
              <Button variant="outline" type="button" onClick={handleDownloadTemplate}>
                Download Template
              </Button>
              <label className="relative cursor-pointer">
                <input
                  type="file"
                  accept=".csv"
                  className="absolute inset-0 opacity-0 cursor-pointer"
                  onChange={handleCsvUpload}
                  disabled={isUploading}
                />
                <Button variant="outline" type="button" className={isUploading ? "opacity-50 pointer-events-none" : ""}>
                  {isUploading ? 'Uploading...' : 'Upload CSV'}
                </Button>
              </label>
              <Button variant="primary" onClick={() => setIsModalOpen(true)}>
                Add New Client
              </Button>
            </>
          )}
        </div>
      </section>

      {/* Main Content Area */}
      <Card className="p-0 overflow-hidden border border-slate-200/60 shadow-glass">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-sm text-slate-600">
            <thead className="bg-slate-50/50 text-xs uppercase text-slate-500 border-b border-slate-200/80 backdrop-blur-md">
              <tr>
                <th className="px-6 py-4 font-semibold">Client Name</th>
                <th className="px-6 py-4 font-semibold">Phone</th>
                <th className="px-6 py-4 font-semibold">Created</th>
                <th className="px-6 py-4 font-semibold">Telecaller</th>
                <th className="px-6 py-4 font-semibold">Editor</th>
                <th className="px-6 py-4 font-semibold">Package</th>
                <th className="px-6 py-4 font-semibold">Videos</th>
                <th className="px-6 py-4 font-semibold">Pending Amount</th>
                <th className="px-6 py-4 font-semibold">Attachments</th>
                <th className="px-6 py-4 font-semibold text-center">Status</th>
                {!isSuperAdmin && <th className="px-6 py-4 font-semibold text-center">Actions</th>}
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 bg-white">
              {isLoading ? (
                <tr>
                  <td colSpan={isSuperAdmin ? 10 : 11} className="px-6 py-12 text-center text-slate-500">
                    Loading clients...
                  </td>
                </tr>
              ) : clients.map((client) => (
                <tr key={client.id} className="hover:bg-slate-50/50 transition-colors">
                  <td className="px-6 py-4 font-medium text-slate-900">{client.clientName}</td>
                  <td className="px-6 py-4">{client.phoneNumber}</td>
                  <td 
                    className="px-6 py-4 cursor-pointer hover:text-blue-600 transition-colors select-none font-medium text-slate-700"
                    onClick={() => toggleDateExpand(client.id)}
                    title="Click to toggle full date"
                  >
                    {expandedDates.has(client.id) 
                      ? formatFullDate(client.createdAt) 
                      : formatSimpleDate(client.createdAt)
                    }
                  </td>
                  <td className="px-6 py-4">{client.telecallerName}</td>
                  <td className="px-6 py-4">{client.editorName}</td>
                  <td className="px-6 py-4">
                    <span className="inline-flex items-center rounded-md bg-slate-100 px-2 py-1 text-xs font-medium text-slate-600 ring-1 ring-inset ring-slate-500/10">
                      {client.selectedPackage}
                    </span>
                  </td>
                  <td className="px-6 py-4 text-slate-700 font-medium">{client.videos}</td>
                  <td className="px-6 py-4 font-semibold text-slate-900">
                    <span className={client.pendingAmount && client.pendingAmount > 0 ? "text-rose-600 font-bold" : "text-emerald-600"}>
                      {formatCurrency.format(client.pendingAmount || 0)}
                    </span>
                  </td>
                  <td className="px-6 py-4">
                    <div className="flex flex-col gap-1">
                      {client.paymentPhotoUrl && (
                        <a href={client.paymentPhotoUrl} target="_blank" rel="noopener noreferrer" className="text-xs text-blue-600 hover:text-blue-800 underline">Payment Photo</a>
                      )}
                      {client.clientDataUrl && (
                        <a href={client.clientDataUrl} target="_blank" rel="noopener noreferrer" className="text-xs text-blue-600 hover:text-blue-800 underline">Client Data</a>
                      )}
                      {!client.paymentPhotoUrl && !client.clientDataUrl && (
                        <span className="text-xs text-slate-400">None</span>
                      )}
                    </div>
                  </td>
                  <td className="px-6 py-4">
                    <div className="flex justify-center">
                      <span className={`inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-semibold border ${getStatusColor(client.status)}`}>
                        {client.status}
                      </span>
                    </div>
                  </td>
                  {!isSuperAdmin && (
                    <td className="px-6 py-4 text-center">
                      <button
                        onClick={() => {
                          setEditingClient(client);
                          setEditFormData(client);
                          setEditPaymentPhoto(null);
                          setEditClientDataFile(null);
                        }}
                        className="rounded-full bg-slate-100 hover:bg-slate-200 px-3 py-1 text-xs font-semibold text-slate-700 transition"
                      >
                        Edit
                      </button>
                    </td>
                  )}
                </tr>
              ))}
              {!isLoading && clients.length === 0 && (
                <tr>
                  <td colSpan={isSuperAdmin ? 10 : 11} className="px-6 py-12 text-center text-slate-500">
                    No clients found. Click "Add New Client" or "Upload CSV" to get started.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </Card>

      {/* Add Client Modal */}
      {isModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/40 backdrop-blur-sm px-4 fade-in">
          <div className="bg-white rounded-3xl shadow-2xl w-full max-w-2xl overflow-hidden border border-slate-200">
            <div className="px-8 py-6 border-b border-slate-100 flex justify-between items-center bg-slate-50/50">
              <div>
                <h3 className="text-xl font-semibold text-slate-800">Add New Client</h3>
                <p className="text-sm text-slate-500 mt-1">Enter client details and assign team members.</p>
              </div>
              <button 
                onClick={() => setIsModalOpen(false)}
                className="text-slate-400 hover:text-slate-600 transition-colors p-2 rounded-full hover:bg-slate-200/50"
              >
                <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
            </div>
            
            <form onSubmit={handleAddClient} className="p-8">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div className="space-y-2">
                  <label className="text-sm font-medium text-slate-700">Client Name</label>
                  <input
                    required
                    type="text"
                    name="clientName"
                    value={newClient.clientName}
                    onChange={handleInputChange}
                    className="w-full rounded-xl border-slate-200 border px-4 py-3 text-sm focus:border-blue-500 focus:ring-blue-500/20 transition-all outline-none"
                    placeholder="Enter client name"
                  />
                </div>
                <div className="space-y-2">
                  <label className="text-sm font-medium text-slate-700">Phone Number</label>
                  <input
                    required
                    type="text"
                    name="phoneNumber"
                    value={newClient.phoneNumber}
                    onChange={handleInputChange}
                    className="w-full rounded-xl border-slate-200 border px-4 py-3 text-sm focus:border-blue-500 focus:ring-blue-500/20 transition-all outline-none"
                    placeholder="Enter phone number"
                  />
                </div>
                
                <div className="space-y-2">
                  <label className="text-sm font-medium text-slate-700">Assigned Telecaller</label>
                  <input
                    required
                    type="text"
                    name="telecallerName"
                    value={newClient.telecallerName}
                    onChange={handleInputChange}
                    className="w-full rounded-xl border-slate-200 border px-4 py-3 text-sm focus:border-blue-500 focus:ring-blue-500/20 transition-all outline-none"
                    placeholder="Telecaller name"
                  />
                </div>
                <div className="space-y-2">
                  <label className="text-sm font-medium text-slate-700">Assigned Editor</label>
                  <input
                    required
                    type="text"
                    name="editorName"
                    value={newClient.editorName}
                    onChange={handleInputChange}
                    className="w-full rounded-xl border-slate-200 border px-4 py-3 text-sm focus:border-blue-500 focus:ring-blue-500/20 transition-all outline-none"
                    placeholder="Editor name"
                  />
                </div>

                <div className="space-y-2 md:col-span-2">
                  <label className="text-sm font-medium text-slate-700">Package Details</label>
                  <div className="grid grid-cols-2 gap-4">
                    <input
                      required
                      type="text"
                      name="selectedPackage"
                      value={newClient.selectedPackage}
                      onChange={handleInputChange}
                      className="w-full rounded-xl border-slate-200 border px-4 py-3 text-sm focus:border-blue-500 focus:ring-blue-500/20 transition-all outline-none"
                      placeholder="e.g. Premium Reel Pack"
                    />
                    <input
                      required
                      type="text"
                      name="videos"
                      value={newClient.videos}
                      onChange={handleInputChange}
                      className="w-full rounded-xl border-slate-200 border px-4 py-3 text-sm focus:border-blue-500 focus:ring-blue-500/20 transition-all outline-none"
                      placeholder="Video Count (e.g. 0/10)"
                    />
                  </div>
                </div>

                <div className="space-y-2">
                  <label className="text-sm font-medium text-slate-700">Payment Photo</label>
                  <input
                    type="file"
                    accept="image/*"
                    onChange={(e) => setPaymentPhoto(e.target.files?.[0] || null)}
                    className="w-full rounded-xl border-slate-200 border px-4 py-2 text-sm file:mr-4 file:py-1.5 file:px-4 file:rounded-full file:border-0 file:text-xs file:font-semibold file:bg-blue-50 file:text-blue-700 hover:file:bg-blue-100 transition-all outline-none"
                  />
                </div>
                <div className="space-y-2">
                  <label className="text-sm font-medium text-slate-700">Client Data (Files)</label>
                  <input
                    type="file"
                    onChange={(e) => setClientDataFile(e.target.files?.[0] || null)}
                    className="w-full rounded-xl border-slate-200 border px-4 py-2 text-sm file:mr-4 file:py-1.5 file:px-4 file:rounded-full file:border-0 file:text-xs file:font-semibold file:bg-blue-50 file:text-blue-700 hover:file:bg-blue-100 transition-all outline-none"
                  />
                </div>

                <div className="space-y-2">
                  <label className="text-sm font-medium text-slate-700">Pending Amount (INR)</label>
                  <input
                    type="number"
                    name="pendingAmount"
                    value={newClient.pendingAmount || ''}
                    onChange={handleInputChange}
                    className="w-full rounded-xl border-slate-200 border px-4 py-3 text-sm focus:border-blue-500 focus:ring-blue-500/20 transition-all outline-none"
                    placeholder="e.g. 5000"
                    min="0"
                  />
                </div>

                <div className="space-y-2">
                  <label className="text-sm font-medium text-slate-700">Creation Date (Optional)</label>
                  <input
                    type="date"
                    name="createdAt"
                    value={newClient.createdAt ? newClient.createdAt.split('T')[0] : ''}
                    onChange={(e) => {
                      const dateVal = e.target.value;
                      setNewClient({ 
                        ...newClient, 
                        createdAt: dateVal ? new Date(dateVal).toISOString() : undefined 
                      });
                    }}
                    className="w-full rounded-xl border-slate-200 border px-4 py-3 text-sm focus:border-blue-500 focus:ring-blue-500/20 transition-all outline-none bg-white"
                  />
                </div>

                <div className="space-y-2">
                  <label className="text-sm font-medium text-slate-700">Status</label>
                  <select
                    name="status"
                    value={newClient.status}
                    onChange={handleInputChange}
                    className="w-full rounded-xl border-slate-200 border px-4 py-3 text-sm focus:border-blue-500 focus:ring-blue-500/20 transition-all outline-none bg-white"
                  >
                    <option value="Pending">Pending</option>
                    <option value="In Progress">In Progress</option>
                    <option value="Completed">Completed</option>
                  </select>
                </div>
              </div>

              <div className="mt-8 flex justify-end gap-3 pt-6 border-t border-slate-100">
                <Button variant="outline" type="button" onClick={() => setIsModalOpen(false)}>
                  Cancel
                </Button>
                <Button variant="primary" type="submit" disabled={isSubmitting}>
                  {isSubmitting ? 'Saving...' : 'Save Client'}
                </Button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Edit Client Modal */}
      {editingClient && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/40 backdrop-blur-sm px-4 fade-in">
          <div className="bg-white rounded-3xl shadow-2xl w-full max-w-2xl overflow-hidden border border-slate-200 animate-rise">
            <div className="px-8 py-6 border-b border-slate-100 flex justify-between items-center bg-slate-50/50">
              <div>
                <h3 className="text-xl font-semibold text-slate-800">Edit Client: {editingClient.clientName}</h3>
                <p className="text-sm text-slate-500 mt-1">Modify client details, files, and progress status.</p>
              </div>
              <button 
                onClick={() => setEditingClient(null)}
                className="text-slate-400 hover:text-slate-600 transition-colors p-2 rounded-full hover:bg-slate-200/50"
              >
                <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
            </div>
            
            <form onSubmit={handleUpdateClient} className="p-8 max-h-[75vh] overflow-y-auto">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div className="space-y-2">
                  <label className="text-sm font-medium text-slate-700">Client Name</label>
                  <input
                    required
                    type="text"
                    name="clientName"
                    value={editFormData.clientName || ''}
                    onChange={handleEditInputChange}
                    className="w-full rounded-xl border-slate-200 border px-4 py-3 text-sm focus:border-blue-500 focus:ring-blue-500/20 transition-all outline-none"
                    placeholder="Enter client name"
                  />
                </div>
                <div className="space-y-2">
                  <label className="text-sm font-medium text-slate-700">Phone Number</label>
                  <input
                    required
                    type="text"
                    name="phoneNumber"
                    value={editFormData.phoneNumber || ''}
                    onChange={handleEditInputChange}
                    className="w-full rounded-xl border-slate-200 border px-4 py-3 text-sm focus:border-blue-500 focus:ring-blue-500/20 transition-all outline-none"
                    placeholder="Enter phone number"
                  />
                </div>
                
                <div className="space-y-2">
                  <label className="text-sm font-medium text-slate-700">Assigned Telecaller</label>
                  <input
                    required
                    type="text"
                    name="telecallerName"
                    value={editFormData.telecallerName || ''}
                    onChange={handleEditInputChange}
                    className="w-full rounded-xl border-slate-200 border px-4 py-3 text-sm focus:border-blue-500 focus:ring-blue-500/20 transition-all outline-none"
                    placeholder="Telecaller name"
                  />
                </div>
                <div className="space-y-2">
                  <label className="text-sm font-medium text-slate-700">Assigned Editor</label>
                  <input
                    required
                    type="text"
                    name="editorName"
                    value={editFormData.editorName || ''}
                    onChange={handleEditInputChange}
                    className="w-full rounded-xl border-slate-200 border px-4 py-3 text-sm focus:border-blue-500 focus:ring-blue-500/20 transition-all outline-none"
                    placeholder="Editor name"
                  />
                </div>

                <div className="space-y-2 md:col-span-2">
                  <label className="text-sm font-medium text-slate-700">Package Details</label>
                  <div className="grid grid-cols-2 gap-4">
                    <input
                      required
                      type="text"
                      name="selectedPackage"
                      value={editFormData.selectedPackage || ''}
                      onChange={handleEditInputChange}
                      className="w-full rounded-xl border-slate-200 border px-4 py-3 text-sm focus:border-blue-500 focus:ring-blue-500/20 transition-all outline-none"
                      placeholder="e.g. Premium Reel Pack"
                    />
                    <input
                      required
                      type="text"
                      name="videos"
                      value={editFormData.videos || ''}
                      onChange={handleEditInputChange}
                      className="w-full rounded-xl border-slate-200 border px-4 py-3 text-sm focus:border-blue-500 focus:ring-blue-500/20 transition-all outline-none"
                      placeholder="Video Count (e.g. 0/10)"
                    />
                  </div>
                </div>

                <div className="space-y-2">
                  <label className="text-sm font-medium text-slate-700">Payment Photo</label>
                  <input
                    type="file"
                    accept="image/*"
                    onChange={(e) => setEditPaymentPhoto(e.target.files?.[0] || null)}
                    className="w-full rounded-xl border-slate-200 border px-4 py-2 text-sm file:mr-4 file:py-1.5 file:px-4 file:rounded-full file:border-0 file:text-xs file:font-semibold file:bg-blue-50 file:text-blue-700 hover:file:bg-blue-100 transition-all outline-none"
                  />
                  {editFormData.paymentPhotoUrl && (
                    <div className="text-xs text-slate-500 mt-1">
                      Current payment photo exists:{' '}
                      <a href={editFormData.paymentPhotoUrl} target="_blank" rel="noopener noreferrer" className="text-blue-600 hover:underline">
                        View file
                      </a>
                    </div>
                  )}
                </div>
                <div className="space-y-2">
                  <label className="text-sm font-medium text-slate-700">Client Data (Files)</label>
                  <input
                    type="file"
                    onChange={(e) => setEditClientDataFile(e.target.files?.[0] || null)}
                    className="w-full rounded-xl border-slate-200 border px-4 py-2 text-sm file:mr-4 file:py-1.5 file:px-4 file:rounded-full file:border-0 file:text-xs file:font-semibold file:bg-blue-50 file:text-blue-700 hover:file:bg-blue-100 transition-all outline-none"
                  />
                  {editFormData.clientDataUrl && (
                    <div className="text-xs text-slate-500 mt-1">
                      Current client data exists:{' '}
                      <a href={editFormData.clientDataUrl} target="_blank" rel="noopener noreferrer" className="text-blue-600 hover:underline">
                        View file
                      </a>
                    </div>
                  )}
                </div>

                <div className="space-y-2">
                  <label className="text-sm font-medium text-slate-700">Pending Amount (INR)</label>
                  <input
                    type="number"
                    name="pendingAmount"
                    value={editFormData.pendingAmount === undefined ? '' : editFormData.pendingAmount}
                    onChange={handleEditInputChange}
                    className="w-full rounded-xl border-slate-200 border px-4 py-3 text-sm focus:border-blue-500 focus:ring-blue-500/20 transition-all outline-none"
                    placeholder="e.g. 5000"
                    min="0"
                  />
                </div>

                <div className="space-y-2">
                  <label className="text-sm font-medium text-slate-700">Creation Date</label>
                  <input
                    type="date"
                    name="createdAt"
                    value={editFormData.createdAt ? editFormData.createdAt.split('T')[0] : ''}
                    onChange={(e) => {
                      const dateVal = e.target.value;
                      setEditFormData({ 
                        ...editFormData, 
                        createdAt: dateVal ? new Date(dateVal).toISOString() : undefined 
                      });
                    }}
                    className="w-full rounded-xl border-slate-200 border px-4 py-3 text-sm focus:border-blue-500 focus:ring-blue-500/20 transition-all outline-none bg-white"
                  />
                </div>

                <div className="space-y-2">
                  <label className="text-sm font-medium text-slate-700">Status</label>
                  <select
                    name="status"
                    value={editFormData.status || 'Pending'}
                    onChange={handleEditInputChange}
                    className="w-full rounded-xl border-slate-200 border px-4 py-3 text-sm focus:border-blue-500 focus:ring-blue-500/20 transition-all outline-none bg-white"
                  >
                    <option value="Pending">Pending</option>
                    <option value="In Progress">In Progress</option>
                    <option value="Completed">Completed</option>
                  </select>
                </div>
              </div>

              <div className="mt-8 flex justify-end gap-3 pt-6 border-t border-slate-100">
                <Button variant="outline" type="button" onClick={() => setEditingClient(null)}>
                  Cancel
                </Button>
                <Button variant="primary" type="submit" disabled={isUpdating}>
                  {isUpdating ? 'Saving...' : 'Save Changes'}
                </Button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
