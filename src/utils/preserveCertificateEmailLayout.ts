const CERTIFICATE_EMAIL_ENDPOINT = 'https://emdsgvuqrhpjdgrgaslo.supabase.co/functions/v1/send-ticket-email';

const isOfficialCertificateEmail = (payload: any) => {
  const subject = String(payload?.subject || '').toLowerCase();
  const message = String(payload?.message || '');
  const hasCertificateSubject = subject.includes('certificado');
  const hasOfficialMarkup =
    message.includes('certificate-wrapper') ||
    message.includes('CERTIFICADO DE CONCLUSÃO') ||
    message.includes('CERTIFICADO DE CONCLUS');

  return hasCertificateSubject && hasOfficialMarkup;
};

const extractSignatureFromHtml = (html: string) => {
  const message = String(html || '');
  const signatureImgMatch =
    message.match(/<img[^>]+class=["'][^"']*signature[^"']*["'][^>]+src=["']([^"']+)["']/i) ||
    message.match(/<img[^>]+src=["']([^"']+)["'][^>]+class=["'][^"']*signature[^"']*["']/i);

  return signatureImgMatch?.[1] || '';
};

const addDownloadAndSignatureParams = (rawUrl: string, signatureUrl?: string) => {
  try {
    if (!rawUrl) return rawUrl;
    const url = new URL(rawUrl, window.location.origin);
    url.searchParams.set('download', '1');
    if (signatureUrl && (signatureUrl.startsWith('http') || signatureUrl.startsWith('data:'))) {
      url.searchParams.set('sig', signatureUrl);
    }
    return url.toString();
  } catch {
    return rawUrl;
  }
};

const normalizeHeaders = (headers: HeadersInit | undefined) => {
  const normalized: Record<string, string> = {};
  if (!headers) return normalized;

  if (headers instanceof Headers) {
    headers.forEach((value, key) => {
      normalized[key] = value;
    });
    return normalized;
  }

  if (Array.isArray(headers)) {
    headers.forEach(([key, value]) => {
      normalized[key] = value;
    });
    return normalized;
  }

  Object.entries(headers).forEach(([key, value]) => {
    normalized[key] = String(value);
  });

  return normalized;
};

const postWithXhr = (url: string, payload: any, headers: Record<string, string>) => {
  return new Promise<Response>((resolve) => {
    const xhr = new XMLHttpRequest();
    xhr.open('POST', url, true);

    Object.entries(headers).forEach(([key, value]) => {
      try {
        xhr.setRequestHeader(key, value);
      } catch {
        // Ignore invalid browser-managed headers.
      }
    });

    if (!headers['Content-Type'] && !headers['content-type']) {
      xhr.setRequestHeader('Content-Type', 'application/json');
    }

    xhr.onload = () => {
      resolve(new Response(xhr.responseText || '', {
        status: xhr.status,
        statusText: xhr.statusText || (xhr.status >= 200 && xhr.status < 300 ? 'OK' : 'Error'),
        headers: { 'Content-Type': xhr.getResponseHeader('Content-Type') || 'application/json' },
      }));
    };

    xhr.onerror = () => {
      resolve(new Response(JSON.stringify({ error: 'Falha de rede ao enviar certificado' }), {
        status: 500,
        statusText: 'Network Error',
        headers: { 'Content-Type': 'application/json' },
      }));
    };

    xhr.send(JSON.stringify(payload));
  });
};

(() => {
  if (typeof window === 'undefined' || typeof window.fetch !== 'function') return;
  if ((window as any).__voxCertificateEmailPatchApplied) return;

  (window as any).__voxCertificateEmailPatchApplied = true;
  const previousFetch = window.fetch.bind(window);

  window.fetch = ((input: RequestInfo | URL, init?: RequestInit) => {
    try {
      const url = typeof input === 'string' ? input : input instanceof URL ? input.toString() : input.url;
      const isEmailEndpoint = url.includes(CERTIFICATE_EMAIL_ENDPOINT);
      const hasBody = typeof init?.body === 'string';

      if (isEmailEndpoint && hasBody) {
        const payload = JSON.parse(init.body as string);

        if (isOfficialCertificateEmail(payload)) {
          const signatureUrl = payload.signatureUrl || extractSignatureFromHtml(payload.message);

          const preservedPayload = {
            ...payload,
            signatureUrl,
            certificateUrl: addDownloadAndSignatureParams(payload.certificateUrl || '', signatureUrl),
            preserveCertificateLayout: true,
          };

          const headers = normalizeHeaders(init?.headers);
          return postWithXhr(url, preservedPayload, headers);
        }
      }
    } catch (error) {
      console.warn('Não foi possível preservar o layout oficial do certificado:', error);
    }

    return previousFetch(input, init);
  }) as typeof window.fetch;
})();

export {};
