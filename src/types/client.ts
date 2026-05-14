export type ClientStatus = 'Pending' | 'In Progress' | 'Completed';

export interface Client {
  id: string;
  clientName: string;
  phoneNumber: string;
  telecallerName: string;
  editorName: string;
  status: ClientStatus;
  selectedPackage: string;
  videos: string | number;
}
