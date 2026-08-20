import { useState, useCallback } from 'react';

export const useCertificateSelection = () => {
  const [selectedLeads, setSelectedLeads] = useState<string[]>([]);

  const toggleLead = useCallback((id: string) => {
    setSelectedLeads(prev =>
      prev.includes(id) ? prev.filter(l => l !== id) : [...prev, id]
    );
  }, []);

  const selectAll = useCallback((ids: string[]) => {
    setSelectedLeads(ids);
  }, []);

  const clearSelection = useCallback(() => {
    setSelectedLeads([]);
  }, []);

  return { selectedLeads, toggleLead, selectAll, clearSelection };
};
