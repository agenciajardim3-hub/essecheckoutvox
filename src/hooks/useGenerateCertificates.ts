import { useState } from 'react';

type GenerateResult = {
  loading: boolean;
  progress: number;
  error: string | null;
  generateCertificates: (leadIds: string[]) => Promise<void>;
};

export const useGenerateCertificates = (): GenerateResult => {
  const [loading, setLoading] = useState(false);
  const [progress, setProgress] = useState(0);
  const [error, setError] = useState<string | null>(null);

  const generateCertificates = async (leadIds: string[]) => {
    if (leadIds.length === 0) return;
    setLoading(true);
    setProgress(0);
    setError(null);
    try {
      const response = await fetch('/api/generate-bulk-certificate', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ leadIds }),
      });
      if (!response.ok) {
        const err = await response.text();
        throw new Error(err || 'Failed to generate certificates');
      }
      // Assuming the backend returns a JSON with a "status" field
      const data = await response.json();
      // Simple progress handling – set to 100 on success
      setProgress(100);
    } catch (e) {
      const msg = e instanceof Error ? e.message : String(e);
      setError(msg);
    } finally {
      setLoading(false);
    }
  };

  return { loading, progress, error, generateCertificates };
};
