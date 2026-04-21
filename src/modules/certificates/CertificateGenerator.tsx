
import React, { useState, useEffect } from 'react';
import { Input } from '../../shared/components/Input';
import { Printer, Loader2, CheckCircle, Upload, MessageCircle, Download } from 'lucide-react';
import { AppConfig, Lead } from '../../shared';

interface CertificateGeneratorProps {
  allCheckouts: AppConfig[];
  uploadService: (file: File) => Promise<string | null>;
  isUploading: string | null;
  leads?: Lead[];
  defaultSignature?: string;
}

export const CertificateGenerator: React.FC<CertificateGeneratorProps> = ({ allCheckouts, uploadService, isUploading, leads = [], defaultSignature = '' }) => {
  const [certGenData, setCertGenData] = useState({
    name: '',
    phone: '',
    courseName: 'Curso de Tráfego Pago - Meta Ads',
    date: new Date().toLocaleDateString('pt-BR'),
    hours: '8',
    logoUrl: '',
    signatureUrl: '',
    mainColor: '#f59e0b',
    instructorName: 'Rodrigo Jardim',
    whatsappMessage: 'PARABÉNS PELA SUA PARTICIPAÇÃO NO CURSO DE TRÁFEGO PAGO, SEGUE SEU CERTIFICADO'
  });

  const [searchLead, setSearchLead] = useState('');
  const [showLeadsDrop, setShowLeadsDrop] = useState(false);
  const [selectedTurma, setSelectedTurma] = useState('');

  const turmas = Array.from(new Set(leads.map(l => l.turma).filter(Boolean))) as string[];

  // Update signature when defaultSignature changes from SignatureManager
  useEffect(() => {
    if (defaultSignature && defaultSignature !== certGenData.signatureUrl) {
      // Validate URL is not empty or invalid
      if (defaultSignature.startsWith('http') || defaultSignature.startsWith('data:')) {
        setCertGenData(prev => ({ ...prev, signatureUrl: defaultSignature }));
      }
    }
  }, [defaultSignature]);

  const filteredLeads = leads.filter(l => {
    const matchTurma = selectedTurma ? l.turma === selectedTurma : true;
    const matchSearch = searchLead
      ? l.name.toLowerCase().includes(searchLead.toLowerCase()) || (l.phone && l.phone.includes(searchLead))
      : true;
    return matchTurma && matchSearch;
  }).slice(0, selectedTurma && !searchLead ? 100 : 5); // Show more if filtering by turma without text search

  const handleUpload = async (e: React.ChangeEvent<HTMLInputElement>, type: 'cert-logo' | 'cert-signature') => {
    const file = e.target.files?.[0];
    if (!file) return;

    const url = await uploadService(file);
    if (url) {
      if (type === 'cert-logo') {
        setCertGenData(prev => ({ ...prev, logoUrl: url }));
      } else {
        setCertGenData(prev => ({ ...prev, signatureUrl: url }));
      }
    }
  };

  const handlePrintCertificate = () => {
    if (!certGenData.name || !certGenData.courseName) {
      alert('Preencha o nome do aluno e do curso para gerar o certificado!');
      return;
    }

    const printWindow = window.open('', '_blank');
    if (!printWindow) return;

    printWindow.document.write(`
      <html>
        <head>
          <title>Certificado - ${certGenData.name}</title>
          <style>
            @import url('https://fonts.googleapis.com/css2?family=Montserrat:wght@400;700;900&family=Great+Vibes&display=swap');
            
            body { 
              margin: 0; 
              padding: 0; 
              display: flex; 
              justify-content: center; 
              align-items: center; 
              min-height: 100vh; 
              background: #f8fafc;
              font-family: 'Montserrat', sans-serif;
              -webkit-print-color-adjust: exact;
              print-color-adjust: exact;
            }
            
            .certificate-wrapper {
              width: 1122px; 
              height: 794px;
              background: white;
              position: relative;
              overflow: hidden;
              box-sizing: border-box;
            }

            .bg-shapes {
              position: absolute;
              bottom: 0;
              left: 0;
              width: 100%;
              height: 100%;
              z-index: 1;
              pointer-events: none;
            }

            .content {
              position: relative;
              z-index: 10;
              padding: 50px 80px;
              text-align: center;
              height: 100%;
              box-sizing: border-box;
              display: flex;
              flex-direction: column;
              align-items: center;
            }
            
            .header {
              margin-top: 20px;
            }
            .vox-title {
              font-size: 72px;
              font-weight: 900;
              color: #4b5563;
              margin: 0;
              line-height: 1;
              letter-spacing: 2px;
            }
            .vox-subtitle {
              font-size: 14px;
              font-weight: 700;
              color: #0ea5e9;
              letter-spacing: 8px;
              margin-top: 5px;
              margin-bottom: 30px;
            }
            
            .cert-title {
              font-size: 28px;
              font-weight: 700;
              color: #6b7280;
              letter-spacing: 2px;
              margin-bottom: 40px;
            }
            
            .student-name {
              font-size: 42px;
              font-weight: 400;
              color: #6b7280;
              margin-bottom: 40px;
              text-transform: uppercase;
            }
            
            .course-desc-bold {
              font-size: 18px;
              font-weight: 700;
              color: #000;
              margin-bottom: 20px;
            }
            
            .course-desc-text {
              font-size: 16px;
              line-height: 1.6;
              color: #111827;
              max-width: 900px;
              margin: 0 auto;
              font-weight: 400;
              text-align: center;
            }
            
            .footer {
              margin-top: auto;
              width: 100%;
              display: flex;
              justify-content: space-between;
              align-items: flex-end;
              padding-bottom: 20px;
            }
            
            .medal-container {
              position: relative;
              width: 180px;
              height: 240px;
              margin-left: 20px;
              margin-bottom: 15px;
            }
            .ribbon {
              position: absolute;
              bottom: 20px;
              width: 50px;
              height: 100px;
              background: linear-gradient(to right, #9ca3af, #d1d5db, #9ca3af);
              z-index: 1;
            }
            .ribbon.left {
              left: 20px;
              transform: rotate(25deg);
            }
            .ribbon.right {
              right: 20px;
              transform: rotate(-25deg);
            }
            .ribbon:after {
              content: '';
              position: absolute;
              bottom: -25px;
              left: 0;
              border-left: 25px solid transparent;
              border-right: 25px solid transparent;
              border-top: 25px solid #9ca3af;
            }
            .medal {
              position: absolute;
              top: 0;
              left: 0;
              width: 180px;
              height: 180px;
              border-radius: 50%;
              background: linear-gradient(135deg, #e5e7eb 0%, #ffffff 50%, #9ca3af 100%);
              border: 4px solid #f3f4f6;
              box-shadow: 0 10px 20px rgba(0,0,0,0.2), inset 0 0 20px rgba(255,255,255,0.8);
              z-index: 2;
              display: flex;
              justify-content: center;
              align-items: center;
              text-align: center;
            }
            .medal-inner {
              width: 160px;
              height: 160px;
              border-radius: 50%;
              border: 1px solid #d1d5db;
              display: flex;
              flex-direction: column;
              justify-content: center;
              align-items: center;
              padding: 10px;
              box-sizing: border-box;
            }
            .medal-star {
              font-size: 80px;
              color: #4b5563;
              line-height: 1;
            }
            
            .signature-box {
              text-align: center;
              margin-right: 60px;
              width: 300px;
              margin-bottom: 30px;
            }
            .signature-img {
              height: 80px;
              margin-bottom: -10px;
            }
            .signature-text {
              font-family: 'Great Vibes', cursive;
              font-size: 56px;
              color: #000;
              margin-bottom: -10px;
              line-height: 1;
            }
            .signature-line {
              width: 100%;
              height: 2px;
              background: #1e3a8a;
              margin-top: 10px;
            }

            @media print {
              body { background: white; -webkit-print-color-adjust: exact; print-color-adjust: exact; }
              @page { size: landscape; margin: 0; }
            }
          </style>
        </head>
        <body>
          <div class="certificate-wrapper">
            <div class="bg-shapes">
            </div>
            
            <div class="content">
              <div class="header">
                ${certGenData.logoUrl ? `<img src="${certGenData.logoUrl}" style="height: 80px; margin-bottom: 20px; object-fit: contain;" />` : `<div class="vox-title">VOX</div><div class="vox-subtitle">MARKETING ACADEMY</div>`}
              </div>
              
              <div class="cert-title">CERTIFICADO DE CONCLUSÃO</div>
              
              <div class="student-name">${certGenData.name || 'NOME'}</div>
              
              <div class="course-desc-bold">
                Completou com êxito o ${certGenData.courseName || 'Curso de Tráfego Pago - Meta Ads'}, com carga horária de ${certGenData.hours} horas.
              </div>
              
              <div class="course-desc-text">
                Na Vox Marketing Academy, ministrado por ${certGenData.instructorName || 'Rodrigo Jardim'}, no dia ${certGenData.date}. Durante o curso, demonstrou dedicação e empenho exemplares, adquirindo habilidades valiosas em estratégias de tráfego pago. Parabéns pela conclusão bem-sucedida deste curso! Desejamos sucesso contínuo em suas futuras iniciativas e carreira profissional.
              </div>
              
              <div class="footer">
                <div class="medal-container">
                  <div class="ribbon left"></div>
                  <div class="ribbon right"></div>
                  <div class="medal">
                    <div class="medal-inner">
                      <div class="medal-star">★</div>
                    </div>
                  </div>
                </div>
                
                <div class="signature-box">
                  ${certGenData.signatureUrl ? `<img src="${certGenData.signatureUrl}" class="signature-img" />` : `<div class="signature-text">${certGenData.instructorName || 'Rodrigo Jardim'}</div>`}
                  <div class="signature-line"></div>
                </div>
              </div>
            </div>
          </div>
          <script>
            window.onload = function() { 
              window.print(); 
              setTimeout(function() { window.close(); }, 500);
            };
          </script>
        </body>
      </html>
    `);
    printWindow.document.close();
  };

  const handleWhatsApp = () => {
    if (!certGenData.phone) {
      alert("Preencha o telefone (WhatsApp) para enviar a mensagem.");
      return;
    }
    const msg = certGenData.whatsappMessage;
    const num = certGenData.phone.replace(/\D/g, '');
    let prefix = '';
    if (num.length > 0 && num.length <= 11) prefix = '55'; // assume BR
    window.open(`https://wa.me/${prefix}${num}?text=${encodeURIComponent(msg)}`, '_blank');
  };

  const handleOpenInNewTab = () => {
    if (!certGenData.name || !certGenData.courseName) {
      alert('Preencha o nome do aluno e do curso para gerar o certificado!');
      return;
    }

    const certificateHtml = `
      <!DOCTYPE html>
      <html>
        <head>
          <meta charset="UTF-8">
          <title>Certificado - ${certGenData.name}</title>
          <style>
            @import url('https://fonts.googleapis.com/css2?family=Montserrat:wght@400;700;900&family=Great+Vibes&display=swap');

            body {
              margin: 0;
              padding: 20px;
              display: flex;
              justify-content: center;
              align-items: center;
              min-height: 100vh;
              background: #f8fafc;
              font-family: 'Montserrat', sans-serif;
              -webkit-print-color-adjust: exact;
              print-color-adjust: exact;
            }

            .certificate-wrapper {
              width: 1122px;
              height: 794px;
              background: white;
              position: relative;
              overflow: hidden;
              box-sizing: border-box;
              box-shadow: 0 20px 60px rgba(0,0,0,0.3);
            }

            .content {
              position: relative;
              z-index: 10;
              padding: 50px 80px;
              text-align: center;
              height: 100%;
              box-sizing: border-box;
              display: flex;
              flex-direction: column;
              align-items: center;
              justify-content: center;
            }

            .header {
              margin-top: 20px;
            }
            .vox-title {
              font-size: 72px;
              font-weight: 900;
              color: #4b5563;
              margin: 0;
              line-height: 1;
              letter-spacing: 2px;
            }
            .vox-subtitle {
              font-size: 14px;
              font-weight: 700;
              color: #0ea5e9;
              letter-spacing: 8px;
              margin-top: 5px;
              margin-bottom: 30px;
            }

            .cert-title {
              font-size: 28px;
              font-weight: 700;
              color: #6b7280;
              margin: 20px 0;
              letter-spacing: 2px;
            }

            .student-name {
              font-size: 42px;
              font-weight: 700;
              color: #4b5563;
              margin: 30px 0;
              text-transform: uppercase;
              letter-spacing: 4px;
            }

            .course-desc-bold {
              font-size: 18px;
              font-weight: 700;
              color: #374151;
              margin: 20px 0;
            }

            .course-desc-text {
              font-size: 14px;
              color: #6b7280;
              margin: 20px 0;
              line-height: 1.6;
              max-width: 900px;
            }

            .footer {
              margin-top: 40px;
              display: flex;
              justify-content: space-around;
              align-items: flex-end;
              width: 100%;
            }

            .signature-box {
              text-align: center;
              margin-right: 60px;
              width: 300px;
            }
            .signature-img {
              height: 80px;
              margin-bottom: -10px;
              object-fit: contain;
            }
            .signature-text {
              font-family: 'Great Vibes', cursive;
              font-size: 56px;
              color: #000;
              margin-bottom: -10px;
              line-height: 1;
            }
            .signature-line {
              width: 100%;
              height: 2px;
              background: #1e3a8a;
              margin-top: 10px;
            }

            .controls {
              position: fixed;
              top: 20px;
              right: 20px;
              display: flex;
              gap: 10px;
              z-index: 1000;
            }

            .btn {
              padding: 10px 20px;
              border: none;
              border-radius: 8px;
              font-weight: 700;
              cursor: pointer;
              font-size: 14px;
              transition: all 0.3s;
            }

            .btn-print {
              background: #2563eb;
              color: white;
            }

            .btn-print:hover {
              background: #1d4ed8;
            }

            .btn-download {
              background: #16a34a;
              color: white;
            }

            .btn-download:hover {
              background: #15803d;
            }

            .btn-close {
              background: #ef4444;
              color: white;
            }

            .btn-close:hover {
              background: #dc2626;
            }

            @media print {
              body { background: white; padding: 0; }
              @page { size: landscape; margin: 0; }
              .controls { display: none; }
            }
          </style>
        </head>
        <body>
          <div class="controls">
            <button class="btn btn-print" onclick="window.print()">🖨️ Imprimir</button>
            <button class="btn btn-download" onclick="downloadPDF()">⬇️ Baixar PDF</button>
            <button class="btn btn-close" onclick="window.close()">✕ Fechar</button>
          </div>

          <div class="certificate-wrapper">
            <div class="content">
              <div class="header">
                ${certGenData.logoUrl ? `<img src="${certGenData.logoUrl}" style="height: 80px; margin-bottom: 20px; object-fit: contain;" />` : `<div class="vox-title">VOX</div><div class="vox-subtitle">MARKETING ACADEMY</div>`}
              </div>

              <div class="cert-title">CERTIFICADO DE CONCLUSÃO</div>

              <div class="student-name">${certGenData.name || 'NOME'}</div>

              <div class="course-desc-bold">
                Completou com êxito o ${certGenData.courseName || 'Curso de Tráfego Pago - Meta Ads'}, com carga horária de ${certGenData.hours} horas.
              </div>

              <div class="course-desc-text">
                Na Vox Marketing Academy, ministrado por ${certGenData.instructorName || 'Rodrigo Jardim'}, no dia ${certGenData.date}. Durante o curso, demonstrou dedicação e empenho exemplares, adquirindo habilidades valiosas em estratégias de tráfego pago. Parabéns pela conclusão bem-sucedida deste curso! Desejamos sucesso contínuo em suas futuras iniciativas e carreira profissional.
              </div>

              <div class="footer">
                <div class="signature-box">
                  ${certGenData.signatureUrl ? `<img src="${certGenData.signatureUrl}" class="signature-img" />` : `<div class="signature-text">${certGenData.instructorName || 'Rodrigo Jardim'}</div>`}
                  <div class="signature-line"></div>
                </div>
              </div>
            </div>
          </div>

          <script>
            function downloadPDF() {
              const element = document.querySelector('.certificate-wrapper');
              const fileName = 'Certificado_${certGenData.name.replace(/\\s+/g, '_')}.pdf';

              // Use html2pdf library via CDN if available
              const script = document.createElement('script');
              script.src = 'https://cdnjs.cloudflare.com/ajax/libs/html2pdf.js/0.10.1/html2pdf.bundle.min.js';
              script.onerror = function() {
                // Fallback if CDN fails
                alert('Erro ao carregar PDF. Usando impressão como alternativa.');
                window.print();
              };
              script.onload = function() {
                const opt = {
                  margin: 10,
                  filename: fileName,
                  image: { type: 'jpeg', quality: 0.98 },
                  html2canvas: { scale: 2 },
                  jsPDF: { orientation: 'landscape', unit: 'mm', format: 'a4' }
                };
                try {
                  const worker = html2pdf().set(opt);
                  worker.from(element).save(fileName);
                } catch (e) {
                  console.error('Erro ao gerar PDF:', e);
                  window.print();
                }
              };
              document.head.appendChild(script);
            }
          </script>
        </body>
      </html>
    `;

    const newWindow = window.open('', '_blank');
    if (newWindow) {
      newWindow.document.write(certificateHtml);
      newWindow.document.close();
    }
  };

  return (
    <div className="animate-in fade-in duration-500 flex flex-col lg:flex-row gap-10 pb-20">
      <div className="flex-1 max-w-md space-y-6">
        <div>
          <h2 className="text-2xl font-black text-gray-900">Emissão de Certificados</h2>
          <p className="text-gray-400 text-xs font-bold uppercase tracking-widest mt-1">Gere reconhecimento oficial para seus alunos</p>
        </div>

        <div className="space-y-4 bg-gray-50 p-8 rounded-[2.5rem] border border-gray-100">


          <div className="space-y-1">
            <label className="text-sm font-black text-gray-700">Filtrar por Turma</label>
            <select
              className="w-full px-4 py-3 rounded-xl border border-gray-200 outline-none focus:ring-2 focus:ring-blue-500 font-bold"
              value={selectedTurma}
              onChange={(e) => {
                setSelectedTurma(e.target.value);
                setSearchLead('');
              }}
            >
              <option value="">Todas as Turmas</option>
              {turmas.map(t => <option key={t} value={t}>{t}</option>)}
            </select>
          </div>

          <div className="space-y-1 relative">
            <label className="text-sm font-black text-gray-700">{selectedTurma ? 'Selecione o Aluno da Turma' : 'Buscar Aluno (Opcional)'}</label>
            <input
              type="text"
              placeholder={selectedTurma ? "Clique para ver os alunos ou digite..." : "Digite o nome ou telefone para buscar na base..."}
              value={searchLead}
              onChange={(e) => {
                setSearchLead(e.target.value);
                setShowLeadsDrop(true);
              }}
              onFocus={() => setShowLeadsDrop(true)}
              onBlur={() => setTimeout(() => setShowLeadsDrop(false), 200)}
              className="w-full px-4 py-3 rounded-xl border border-gray-200 outline-none focus:ring-2 focus:ring-blue-500 font-bold"
            />
            {showLeadsDrop && (searchLead || selectedTurma) && filteredLeads.length > 0 && (
              <div className="absolute z-20 top-[100%] left-0 w-full mt-1 bg-white border border-gray-200 rounded-xl shadow-lg max-h-60 overflow-y-auto">
                {filteredLeads.map(lead => (
                  <div
                    key={lead.id}
                    className="p-3 hover:bg-gray-50 cursor-pointer border-b border-gray-100 last:border-0"
                    onClick={() => {
                      setCertGenData(prev => ({ ...prev, name: lead.name, phone: lead.phone }));
                      setSearchLead(lead.name);
                      setShowLeadsDrop(false);
                    }}
                  >
                    <div className="font-bold text-sm text-gray-900">{lead.name}</div>
                    <div className="text-xs text-gray-500">{lead.phone}</div>
                  </div>
                ))}
              </div>
            )}
          </div>

          <Input label="Nome do Aluno no Certificado" type="text" placeholder="Nome Completo" value={certGenData.name} onChange={v => setCertGenData({ ...certGenData, name: v })} />

          <Input label="WhatsApp para Envio" type="text" placeholder="(DD) 90000-0000" value={certGenData.phone} onChange={v => setCertGenData({ ...certGenData, phone: v })} />

          <div className="space-y-1">
            <label className="text-sm font-black text-gray-700">Selecione o Treinamento / Curso</label>
            <select
              className="w-full px-4 py-3 rounded-xl border border-gray-200 outline-none focus:ring-2 focus:ring-blue-500 font-bold"
              value={certGenData.courseName}
              onChange={(e) => setCertGenData({ ...certGenData, courseName: e.target.value })}
            >
              <option value="Curso de Tráfego Pago - Meta Ads">Curso de Tráfego Pago - Meta Ads</option>
              {allCheckouts.map(c => <option key={c.id} value={c.productName}>{c.productName}</option>)}
              <option value="Personalizado">Outro (Digitar Nome)</option>
            </select>
          </div>
          {certGenData.courseName === 'Personalizado' && (
            <Input label="Nome do Curso Personalizado" type="text" placeholder="Ex: Masterclass de Marketing" value={certGenData.courseName === 'Personalizado' ? '' : certGenData.courseName} onChange={v => setCertGenData({ ...certGenData, courseName: v })} />
          )}
          <div className="grid grid-cols-2 gap-4">
            <Input label="Data de Conclusão" type="text" placeholder="DD/MM/AAAA" value={certGenData.date} onChange={v => setCertGenData({ ...certGenData, date: v })} />
            <Input label="Carga Horária (h)" type="text" placeholder="Ex: 8" value={certGenData.hours} onChange={v => setCertGenData({ ...certGenData, hours: v })} />
          </div>

          <Input label="Nome do Instrutor(a)" type="text" placeholder="Ex: Rodrigo Jardim" value={certGenData.instructorName} onChange={v => setCertGenData({ ...certGenData, instructorName: v })} />

          <div className="space-y-1">
            <label className="text-sm font-black text-gray-700">Mensagem do WhatsApp</label>
            <textarea
              className="w-full px-4 py-3 rounded-xl border border-gray-200 outline-none focus:ring-2 focus:ring-blue-500 font-bold min-h-[100px] resize-y"
              value={certGenData.whatsappMessage}
              onChange={(e) => setCertGenData({ ...certGenData, whatsappMessage: e.target.value })}
            />
          </div>

          <div className="grid grid-cols-2 gap-4 pt-2">
            <div className="space-y-2">
              <label className="block text-[10px] font-black uppercase text-gray-500">Logo Substituta</label>
              <div className="flex gap-2">
                <label className={`cursor-pointer flex-1 h-12 rounded-xl flex items-center justify-center transition-all gap-2 border-2 border-dashed ${certGenData.logoUrl ? 'bg-emerald-50 border-emerald-200 text-emerald-600' : 'bg-white border-gray-200 text-gray-400 hover:border-blue-400 hover:text-blue-500'}`}>
                  {isUploading === 'cert-logo' ? <Loader2 className="animate-spin" size={16} /> : certGenData.logoUrl ? <CheckCircle size={16} /> : <Upload size={16} />}
                  <span className="text-[10px] font-black uppercase">{certGenData.logoUrl ? 'Alterar' : 'Logo'}</span>
                  <input type="file" className="hidden" accept="image/*" onChange={(e) => handleUpload(e, 'cert-logo')} disabled={isUploading !== null} />
                </label>
                {certGenData.logoUrl && (
                  <button
                    type="button"
                    onClick={() => setCertGenData({ ...certGenData, logoUrl: '' })}
                    className="px-3 h-12 rounded-xl bg-red-50 text-red-500 hover:bg-red-100 transition-all text-xs font-bold"
                  >
                    ×
                  </button>
                )}
              </div>
            </div>
            <div className="space-y-2">
              <label className="block text-[10px] font-black uppercase text-gray-500">Assinatura</label>
              <div className="flex gap-2">
                <label className={`cursor-pointer flex-1 h-12 rounded-xl flex items-center justify-center transition-all gap-2 border-2 border-dashed ${certGenData.signatureUrl ? 'bg-emerald-50 border-emerald-200 text-emerald-600' : 'bg-white border-gray-200 text-gray-400 hover:border-blue-400 hover:text-blue-500'}`}>
                  {isUploading === 'cert-signature' ? <Loader2 className="animate-spin" size={16} /> : certGenData.signatureUrl ? <CheckCircle size={16} /> : <Upload size={16} />}
                  <span className="text-[10px] font-black uppercase">{certGenData.signatureUrl ? 'Alterar' : 'Assinatura'}</span>
                  <input type="file" className="hidden" accept="image/*" onChange={(e) => handleUpload(e, 'cert-signature')} disabled={isUploading !== null} />
                </label>
                {certGenData.signatureUrl && (
                  <button
                    type="button"
                    onClick={() => setCertGenData({ ...certGenData, signatureUrl: '' })}
                    className="px-3 h-12 rounded-xl bg-red-50 text-red-500 hover:bg-red-100 transition-all text-xs font-bold"
                  >
                    ×
                  </button>
                )}
              </div>
            </div>
          </div>

          <div className="flex flex-col gap-2 mt-6">
            <button
              onClick={handlePrintCertificate}
              className="w-full bg-blue-600 text-white py-4 rounded-2xl font-black text-xs uppercase shadow-xl hover:bg-blue-700 transition-all flex items-center justify-center gap-2"
            >
              <Printer size={18} /> GERAR E IMPRIMIR
            </button>
            <button
              onClick={handleOpenInNewTab}
              className="w-full bg-purple-600 text-white py-4 rounded-2xl font-black text-xs uppercase shadow-xl hover:bg-purple-700 transition-all flex items-center justify-center gap-2"
            >
              <Download size={18} /> ABRIR PARA SALVAR/BAIXAR
            </button>
            <button
              onClick={handleWhatsApp}
              className="w-full bg-green-500 text-white py-4 rounded-2xl font-black text-xs uppercase shadow-xl hover:bg-green-600 transition-all flex items-center justify-center gap-2"
            >
              <MessageCircle size={18} /> ENVIAR POR WHATSAPP
            </button>
          </div>
        </div>
      </div>

      <div className="flex-[1.5] flex flex-col items-center justify-start pt-10 bg-gray-50 rounded-[3rem] border border-dashed border-gray-200 p-10">
        <p className="text-[10px] font-black text-gray-400 uppercase tracking-widest mb-8">Pré-visualização do Certificado Profissional</p>

        <div className="w-full max-w-2xl aspect-[1.414/1] bg-white rounded-2xl shadow-2xl p-8 flex flex-col border border-gray-100 text-center relative overflow-hidden">
          <div className="space-y-1 relative z-10 pt-4">
            {certGenData.logoUrl ? (
              <img 
                src={certGenData.logoUrl} 
                className="h-10 mx-auto mb-2 object-contain" 
                alt="Logo"
                onError={(e) => {
                  (e.target as HTMLImageElement).style.display = 'none';
                  (e.target as HTMLImageElement).parentElement?.querySelector('.logo-fallback')?.classList.remove('hidden');
                }} 
              />
            ) : null}
            <div className={certGenData.logoUrl ? 'hidden logo-fallback' : ''}>
              <h2 className="text-4xl font-black text-gray-600 m-0 leading-none tracking-widest">VOX</h2>
              <h3 className="text-[8px] font-bold text-sky-500 tracking-[0.3em] uppercase">MARKETING ACADEMY</h3>
            </div>
            <h4 className="text-sm font-bold text-gray-500 pt-6 tracking-widest uppercase">Certificado de Conclusão</h4>
          </div>

          <div className="space-y-3 relative z-10 pt-6">
            <div className="text-2xl font-normal text-gray-500 uppercase tracking-tight">{certGenData.name || 'NOME'}</div>
            <p className="text-xs font-bold text-black max-w-md mx-auto pt-2">
              Completou com êxito o {certGenData.courseName || 'Curso de Tráfego Pago - Meta Ads'}, com carga horária de {certGenData.hours || '8'} horas.
            </p>
            <p className="text-[9px] text-gray-800 max-w-sm mx-auto leading-relaxed pt-2">
              Na Vox Marketing Academy, ministrado por {certGenData.instructorName || 'Rodrigo Jardim'}, no dia {certGenData.date}. Durante o curso, demonstrou dedicação e empenho exemplares, adquirindo habilidades valiosas em estratégias de tráfego pago. Parabéns pela conclusão bem-sucedida deste curso!
            </p>
          </div>

          <div className="w-full flex justify-between items-end pb-4 pt-10 px-8 relative z-10 flex-1">
            <div className="flex flex-col items-center relative">
              <div className="w-16 h-16 rounded-full bg-gradient-to-br from-gray-200 via-white to-gray-400 border border-gray-300 shadow-md flex items-center justify-center flex-col z-10">
                <span className="text-3xl text-gray-800 font-black leading-none pb-1">★</span>
              </div>
              <div className="absolute -bottom-2 w-full flex justify-around px-2 z-0">
                <div className="w-3 h-6 bg-gray-400 -rotate-12 translate-x-1"></div>
                <div className="w-3 h-6 bg-gray-400 rotate-12 -translate-x-1"></div>
              </div>
            </div>

            <div className="flex flex-col items-center pl-10">
              {certGenData.signatureUrl ? (
                <img 
                  src={certGenData.signatureUrl} 
                  className="h-10 object-contain mix-blend-multiply" 
                  alt="Sig"
                  onError={(e) => {
                    (e.target as HTMLImageElement).style.display = 'none';
                    (e.target as HTMLImageElement).nextElementSibling?.classList.remove('hidden');
                  }}
                />
              ) : null}
              <div className={certGenData.signatureUrl ? 'hidden' : ''}>
                <div className="font-[Great_Vibes,cursive] text-2xl text-black">{certGenData.instructorName || 'Rodrigo Jardim'}</div>
              </div>
              <div className="w-32 h-[1px] bg-blue-900 mt-1"></div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

