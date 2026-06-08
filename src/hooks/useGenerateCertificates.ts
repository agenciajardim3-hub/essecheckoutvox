import { useState } from 'react';

type GenerateResult = {
  loading: boolean;
  progress: number;
  error: string | null;
  generateCertificates: (leadIds: string[]) => Promise<void>;
};

const openBulkCertificateWindow = (leadIds: string[]) => {
  const certificates = leadIds.map((_, index) => `
    <section class="certificate">
      <div class="vox">VOX</div>
      <div class="sub">MARKETING ACADEMY</div>
      <h1>CERTIFICADO DE CONCLUSÃO</h1>
      <h2>ALUNO ${index + 1}</h2>
      <p><strong>Completou com êxito o Curso de Tráfego Pago - Meta Ads, com carga horária de 8 horas.</strong></p>
      <p>Na Vox Marketing Academy, ministrado por Rodrigo Jardim, no dia ${new Date().toLocaleDateString('pt-BR')}.</p>
      <div class="footer">
        <div class="medal">★</div>
        <div class="signature"><span>Rodrigo Jardim</span><b></b></div>
      </div>
    </section>
  `).join('');

  const html = `<!DOCTYPE html>
<html lang="pt-br">
<head>
  <meta charset="UTF-8" />
  <title>Certificados em Massa</title>
  <style>
    * { box-sizing: border-box; }
    body { margin:0; padding:28px; background:#f3f4f6; font-family:Arial,Helvetica,sans-serif; -webkit-print-color-adjust:exact; print-color-adjust:exact; }
    .controls { position:fixed; top:16px; right:16px; z-index:9999; }
    .controls button { border:0; border-radius:12px; padding:12px 16px; color:#fff; font-weight:800; cursor:pointer; background:#2563eb; }
    .notice { max-width:900px; margin:0 auto 24px; background:#fff; border:1px solid #e5e7eb; border-radius:18px; padding:18px; color:#334155; font-weight:700; line-height:1.5; box-shadow:0 14px 34px rgba(15,23,42,.08); }
    .certificate { width:1122px; height:794px; background:#fff; margin:0 auto 28px; padding:50px 80px; text-align:center; page-break-after:always; box-shadow:0 22px 70px rgba(15,23,42,.16); display:flex; flex-direction:column; align-items:center; }
    .vox { font-size:72px; font-weight:900; color:#4b5563; letter-spacing:10px; line-height:1; }
    .sub { font-size:14px; font-weight:700; color:#0ea5e9; letter-spacing:8px; margin:5px 0 30px; }
    h1 { font-size:28px; font-weight:700; color:#6b7280; letter-spacing:4px; margin:0 0 40px; }
    h2 { font-size:42px; font-weight:400; color:#6b7280; margin:0 0 40px; text-transform:uppercase; }
    p { font-size:16px; line-height:1.6; color:#111827; max-width:900px; margin:0 0 20px; }
    .footer { margin-top:auto; width:100%; display:flex; justify-content:space-between; align-items:flex-end; padding-bottom:20px; }
    .medal { width:160px; height:160px; border-radius:50%; background:linear-gradient(135deg,#e5e7eb,#fff,#9ca3af); display:flex; align-items:center; justify-content:center; font-size:80px; color:#4b5563; box-shadow:0 10px 20px rgba(0,0,0,.2); }
    .signature { text-align:center; margin-right:60px; width:300px; }
    .signature span { display:block; font-size:32px; color:#000; margin-bottom:8px; }
    .signature b { display:block; width:100%; height:2px; background:#1e3a8a; }
    @media print { body{background:white;padding:0;} .notice,.controls{display:none!important;} .certificate{box-shadow:none!important;margin:0;page-break-after:always;} @page{size:landscape;margin:0;} }
  </style>
</head>
<body>
  <div class="controls"><button onclick="window.print()">📥 Baixar todos em PDF</button></div>
  <div class="notice">Certificados gerados em massa. Este fluxo antigo não recebe os dados completos dos alunos, então abre um PDF em lote numerado. Para gerar com nome real, use Operações > Enviar Certificados.</div>
  ${certificates}
</body>
</html>`;

  const printWindow = window.open('', '_blank');
  if (!printWindow) throw new Error('O navegador bloqueou a nova aba. Libere pop-ups para abrir os certificados.');
  printWindow.document.write(html);
  printWindow.document.close();
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
      openBulkCertificateWindow(leadIds);
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
