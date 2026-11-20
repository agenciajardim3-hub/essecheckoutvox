/**
 * Utilitário unificado de upload de arquivos
 * Dá preferência ao Backend Fastify da Contabo via VITE_API_URL e mantém fallback ao Supabase
 */
export const uploadFileToStorage = async (
  file: File,
  bucket = 'product-images',
  fallbackSupabaseUpload?: (file: File) => Promise<string | null>
): Promise<string | null> => {
  const apiUrl = import.meta.env.VITE_API_URL || localStorage.getItem('vox_api_url');

  if (apiUrl) {
    try {
      const formData = new FormData();
      formData.append('file', file);
      formData.append('bucket', bucket);

      const res = await fetch(`${apiUrl.replace(/\/+$/, '')}/api/v1/storage/upload`, {
        method: 'POST',
        body: formData,
      });

      if (res.ok) {
        const data = await res.json();
        return data.url || data.publicUrl || null;
      }
    } catch (err) {
      console.error('[Storage] Falha no upload para Fastify backend, tentando fallback:', err);
    }
  }

  if (fallbackSupabaseUpload) {
    return fallbackSupabaseUpload(file);
  }

  return null;
};
