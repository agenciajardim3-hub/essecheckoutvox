
import React, { useState } from 'react';
import { Input } from '../../shared/components/Input';
import { Printer, Ticket, Image as ImageIcon, MapPin, Clock } from 'lucide-react';
import { AppConfig } from '../../shared';

interface TicketGeneratorProps {
    allCheckouts: AppConfig[];
}

export const TicketGenerator: React.FC<TicketGeneratorProps> = ({ allCheckouts }) => {
    const [ticketGenData, setTicketGenData] = useState({
        name: '',
        cpf: '',
        productId: '',
        date: '',
        startTime: '',
        endTime: '',
        address: ''
    });

    const formatDateForDisplay = (dateStr?: string) => {
        if (!dateStr) return '';
        // If already in DD/MM/YYYY format, return as is
        if (dateStr.includes('/')) return dateStr;
        // Convert YYYY-MM-DD to DD/MM/YYYY
        const parts = dateStr.split('-');
        if (parts.length === 3) {
            return `${parts[2]}/${parts[1]}/${parts[0]}`;
        }
        return dateStr;
    };

    const formatDateForJS = (dateStr?: string) => {
        if (!dateStr) return '';
        // If already in DD/MM/YYYY, convert to YYYY-MM-DD for JS Date
        if (dateStr.includes('/')) {
            const parts = dateStr.split('/');
            if (parts.length === 3) {
                return `${parts[2]}-${parts[1]}-${parts[0]}`;
            }
        }
        return dateStr;
    };

    const getDisplayDate = () => {
        const selectedProd = allCheckouts.find(c => c.id === ticketGenData.productId);
        const dateValue = ticketGenData.date || selectedProd?.eventDate || '';
        if (!dateValue || dateValue === 'Invalid Date') return '';
        return formatDateForDisplay(dateValue);
    };

    const handlePrintIndividualTicket = () => {
        const selectedProd = allCheckouts.find(c => c.id === ticketGenData.productId);
        if (!selectedProd || !ticketGenData.name) {
            alert('Preencha os dados do ingresso antes de imprimir!');
            return;
        }

        const printWindow = window.open('', '_blank');
        if (!printWindow) return;

        const rawDate = ticketGenData.date || selectedProd.eventDate || '';
        const hasValidDate = rawDate && rawDate !== 'Invalid Date';
        const displayDate = hasValidDate ? formatDateForDisplay(rawDate) : '';
        const displayStartTime = ticketGenData.startTime || selectedProd.eventStartTime || '??:??';
        const displayEndTime = ticketGenData.endTime || selectedProd.eventEndTime || '??:??';
        const displayLocation = ticketGenData.address || selectedProd.eventLocation || 'Local não definido';

        printWindow.document.write(`
      <html>
        <head>
          <title>Ingresso VIP - ${ticketGenData.name}</title>
          <style>
            @import url('https://fonts.googleapis.com/css2?family=Inter:wght@400;700;900&display=swap');
            body { font-family: 'Inter', sans-serif; display: flex; justify-content: center; align-items: center; min-height: 100vh; margin: 0; background: #f8fafc; }
            .ticket { 
              width: 380px; 
              background: white; 
              border-radius: 30px; 
              overflow: hidden; 
              box-shadow: 0 20px 50px rgba(0,0,0,0.1); 
              border-top: 12px solid #f59e0b;
              position: relative;
            }
            .header { background: #111827; padding: 30px; text-align: center; color: white; }
            .ticket-img { width: 100%; height: 180px; object-fit: cover; }
            .content { padding: 30px; }
            .field { margin-bottom: 15px; }
            .label { font-size: 8px; font-weight: 900; text-transform: uppercase; color: #94a3b8; letter-spacing: 1.5px; margin-bottom: 2px; }
            .value { font-size: 16px; font-weight: 900; text-transform: uppercase; color: #1e293b; }
            .event-info-box { 
              background: #fffbeb; 
              border: 1.5px solid #fef3c7; 
              border-radius: 20px; 
              padding: 20px; 
              margin-bottom: 20px;
            }
            .qr-section { display: flex; flex-direction: column; align-items: center; padding-top: 20px; border-top: 1px dashed #e2e8f0; }
            .qr-code { width: 120px; height: 120px; background: #f1f5f9; padding: 10px; border-radius: 15px; margin-bottom: 10px; }
            .id { font-size: 8px; font-weight: 900; color: #cbd5e1; text-transform: uppercase; letter-spacing: 2px; }
            @media print {
              body { background: white; padding: 0; }
              .ticket { box-shadow: none; border: 1px solid #eee; border-top: 12px solid #f59e0b; }
            }
          </style>
        </head>
        <body>
          <div class="ticket">
            <div class="header">
               <div style="font-size: 10px; font-weight: 900; letter-spacing: 3px; color: #f59e0b; margin-bottom: 5px;">VIP ACCESS</div>
               <div style="font-size: 18px; font-weight: 900; text-transform: uppercase;">Acesso Autorizado</div>
            </div>
            <img class="ticket-img" src="${selectedProd.productImage || 'https://images.unsplash.com/photo-1516321318423-f06f85e504b3?w=800&auto=format&fit=crop&q=60'}" onerror="this.src='https://images.unsplash.com/photo-1516321318423-f06f85e504b3?w=800&auto=format&fit=crop&q=60'" />
            <div class="content">
               <div class="field">
                  <div class="label">Titular do Ingresso</div>
                  <div class="value">${ticketGenData.name}</div>
               </div>

               <div class="event-info-box">
                   <div class="field" style="margin-bottom: 12px;">
                     <div class="label" style="color: #b45309;">Data e Horário</div>
                     <div style="font-size: 20px; font-weight: 900; color: #92400e;">${hasValidDate ? new Date(formatDateForJS(displayDate) + 'T12:00:00').toLocaleDateString('pt-BR') : 'Data não definida'}</div>
                    <div style="font-size: 14px; font-weight: 800; color: #b45309; margin-top: 5px;">Das ${displayStartTime} às ${displayEndTime}</div>
                  </div>
                  <div class="field" style="margin-bottom: 0;">
                    <div class="label" style="color: #b45309;">Local do Evento</div>
                    <div style="font-size: 12px; font-weight: 800; color: #92400e; line-height: 1.3;">${displayLocation}</div>
                  </div>
               </div>

               <div class="field">
                  <div class="label">Treinamento</div>
                  <div style="font-size: 14px; font-weight: 900; color: #2563eb;">${selectedProd.productName}</div>
                  <div style="font-size: 10px; font-weight: 700; color: #64748b; margin-top: 2px;">Turma: ${selectedProd.turma || 'Geral'}</div>
               </div>

               <div style="display: flex; justify-content: space-between; margin-bottom: 20px;">
                  <div>
                    <div class="label">CPF</div>
                    <div style="font-size: 13px; font-weight: 900;">${ticketGenData.cpf.replace(/(\d{3}).*/, '$1.***.***-**')}</div>
                  </div>
               </div>

               <div class="qr-section">
                  <div class="qr-code">
                    <img src="https://api.qrserver.com/v1/create-qr-code/?size=150x150&data=TICKET_VALID_${ticketGenData.cpf}_${ticketGenData.productId}" style="width: 100%;" />
                  </div>
                  <div class="id">ID: ${crypto.randomUUID().slice(0, 8).toUpperCase()}</div>
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

    return (
        <div className="animate-in fade-in duration-500 flex flex-col lg:flex-row gap-10 pb-20">
            <div className="flex-1 max-w-md space-y-6">
                <div>
                    <h2 className="text-2xl font-black text-gray-900">Gerador VIP</h2>
                    <p className="text-gray-400 text-xs font-bold uppercase tracking-widest mt-1">Emissão manual de ingressos para convidados</p>
                </div>

                <div className="space-y-4 bg-gray-50 p-8 rounded-[2.5rem] border border-gray-100">
                    <Input label="Nome do Convidado" type="text" placeholder="Nome Completo" value={ticketGenData.name} onChange={v => setTicketGenData({ ...ticketGenData, name: v })} />
                    <Input label="CPF do Titular" type="text" placeholder="000.000.000-00" mask="cpf" value={ticketGenData.cpf} onChange={v => setTicketGenData({ ...ticketGenData, cpf: v })} />
                    <div className="space-y-1">
                        <label className="text-sm font-black text-gray-700">Selecione o Evento / Produto</label>
                        <select
                            className="w-full px-4 py-3 rounded-xl border border-gray-200 outline-none focus:ring-2 focus:ring-blue-500 font-bold"
                            value={ticketGenData.productId}
                            onChange={(e) => {
                                const prodId = e.target.value;
                                const prod = allCheckouts.find(c => c.id === prodId);
                                setTicketGenData({
                                    ...ticketGenData,
                                    productId: prodId,
                                    date: prod?.eventDate ? formatDateForDisplay(prod.eventDate) : '',
                                    startTime: prod?.eventStartTime || '',
                                    endTime: prod?.eventEndTime || '',
                                    address: prod?.eventLocation || ''
                                });
                            }}
                        >
                            <option value="">Escolha um Checkout</option>
                            {allCheckouts.map(c => <option key={c.id} value={c.id}>{c.productName} ({c.turma || 'Geral'})</option>)}
                        </select>
                    </div>
                    <Input label="Data do Evento (Personalizar)" type="text" placeholder="Ex: 25/12/2024" value={ticketGenData.date} onChange={v => setTicketGenData({ ...ticketGenData, date: v })} />
                    <div className="grid grid-cols-2 gap-4">
                        <Input label="Início" type="text" placeholder="09:00" value={ticketGenData.startTime} onChange={v => setTicketGenData({ ...ticketGenData, startTime: v })} />
                        <Input label="Término" type="text" placeholder="18:00" value={ticketGenData.endTime} onChange={v => setTicketGenData({ ...ticketGenData, endTime: v })} />
                    </div>
                    <Input label="Local/Endereço do Evento" type="text" placeholder="Ex: Auditório Vox" value={ticketGenData.address} onChange={v => setTicketGenData({ ...ticketGenData, address: v })} />

                    <button
                        onClick={handlePrintIndividualTicket}
                        className="w-full bg-blue-600 text-white py-5 rounded-2xl font-black text-xs uppercase shadow-xl hover:bg-blue-700 transition-all flex items-center justify-center gap-2 mt-6"
                    >
                        <Printer size={18} /> GERAR E IMPRIMIR INGRESSO
                    </button>
                </div>
            </div>

            <div className="flex-[1.5] flex items-start justify-center pt-10 bg-gray-50 rounded-[3rem] border border-dashed border-gray-200">
                {/* PREVIEW DO INGRESSO ATUALIZADO */}
                <div className="max-w-xs w-full bg-white rounded-[3rem] shadow-2xl overflow-hidden border-t-[12px] border-amber-500 relative transition-all hover:scale-[1.02]">
                    <div className="bg-gray-900 p-8 text-white text-center">
                        <div className="w-12 h-12 bg-amber-500 rounded-2xl flex items-center justify-center mx-auto mb-4">
                            <Ticket size={24} className="text-gray-900" strokeWidth={2.5} />
                        </div>
                        <h2 className="text-sm font-black tracking-widest uppercase">VIP PASS • INGRESSO</h2>
                    </div>

                    <div className="h-40 overflow-hidden relative bg-gray-100 flex items-center justify-center">
                        {ticketGenData.productId ? (
                            <img src={allCheckouts.find(c => c.id === ticketGenData.productId)?.productImage || 'https://images.unsplash.com/photo-1516321318423-f06f85e504b3?w=800'} onError={(e) => { (e.target as HTMLImageElement).src = 'https://images.unsplash.com/photo-1516321318423-f06f85e504b3?w=800'; }} className="w-full h-full object-cover" alt="" />
                        ) : (
                            <ImageIcon size={40} className="text-gray-300" />
                        )}
                        <div className="absolute inset-0 bg-gradient-to-t from-white via-transparent"></div>
                    </div>

                    <div className="p-8 space-y-5 text-left">
                        <div>
                            <span className="text-[9px] font-black uppercase text-gray-400">Titular</span>
                            <p className="text-lg font-black text-gray-900 uppercase truncate">{ticketGenData.name || 'NOME DO CONVIDADO'}</p>
                        </div>

                        <div className="bg-amber-50 p-4 rounded-xl border border-amber-100">
                            <div className="mb-2">
                                <span className="text-[8px] font-black uppercase text-amber-600 flex items-center gap-1"><Clock size={10} /> Data e Hora</span>
                                <p className="text-sm font-black text-amber-900">{getDisplayDate() || 'Data não definida'}</p>
                                <p className="text-[10px] font-bold text-amber-700">Das {ticketGenData.startTime || allCheckouts.find(c => c.id === ticketGenData.productId)?.eventStartTime || '??:??'} às {ticketGenData.endTime || allCheckouts.find(c => c.id === ticketGenData.productId)?.eventEndTime || '??:??'}</p>
                            </div>
                            <div>
                                <span className="text-[8px] font-black uppercase text-amber-600 flex items-center gap-1"><MapPin size={10} /> Local</span>
                                <p className="text-[10px] font-bold text-amber-900 leading-tight">{ticketGenData.address || allCheckouts.find(c => c.id === ticketGenData.productId)?.eventLocation || 'Selecione um evento...'}</p>
                            </div>
                        </div>

                        <div className="pt-2">
                            <span className="text-[9px] font-black uppercase text-gray-400">Evento</span>
                            <p className="text-sm font-black text-blue-600 uppercase leading-tight">
                                {allCheckouts.find(c => c.id === ticketGenData.productId)?.productName || 'SELECIONE O PRODUTO'}
                            </p>
                        </div>

                        <div className="pt-4 flex flex-col items-center opacity-40">
                            <div className="w-20 h-20 bg-gray-50 rounded-2xl border p-2 flex items-center justify-center">
                                <img src={`https://api.qrserver.com/v1/create-qr-code/?size=150x150&data=TICKET_VALID_PREVIEW`} className="w-full h-full" alt="QR" />
                            </div>
                            <p className="text-[8px] font-black text-gray-300 uppercase mt-2 tracking-widest">VALIDAÇÃO VOX SYSTEM</p>
                        </div>
                    </div>
                    <div className="absolute left-0 bottom-40 -translate-x-1/2 w-6 h-6 bg-gray-50 rounded-full border border-gray-100"></div>
                    <div className="absolute right-0 bottom-40 translate-x-1/2 w-6 h-6 bg-gray-50 rounded-full border border-gray-100"></div>
                </div>
            </div>
        </div>
    );
};
