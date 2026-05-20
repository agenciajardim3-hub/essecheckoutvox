import React, { createContext, useContext, useState, ReactNode } from 'react';

// Define a minimal Lead type – adjust as needed to match your project’s Lead shape
export type Lead = {
  id: string;
  name: string;
  email?: string;
  [key: string]: any;
};

interface CertificateSelectionContextProps {
  selectedLeads: Lead[];
  addLead: (lead: Lead) => void;
  removeLead: (id: string) => void;
  clearSelection: () => void;
}

const CertificateSelectionContext = createContext<CertificateSelectionContextProps | undefined>(undefined);

export const CertificateSelectionProvider = ({ children }: { children: ReactNode }) => {
  const [selectedLeads, setSelectedLeads] = useState<Lead[]>([]);

  const addLead = (lead: Lead) => {
    setSelectedLeads(prev => (prev.find(l => l.id === lead.id) ? prev : [...prev, lead]));
  };

  const removeLead = (id: string) => {
    setSelectedLeads(prev => prev.filter(l => l.id !== id));
  };

  const clearSelection = () => setSelectedLeads([]);

  return (
    <CertificateSelectionContext.Provider value={{ selectedLeads, addLead, removeLead, clearSelection }}>
      {children}
    </CertificateSelectionContext.Provider>
  );
};

export const useCertificateSelection = () => {
  const ctx = useContext(CertificateSelectionContext);
  if (!ctx) {
    throw new Error('useCertificateSelection must be used within a CertificateSelectionProvider');
  }
  return ctx;
};
