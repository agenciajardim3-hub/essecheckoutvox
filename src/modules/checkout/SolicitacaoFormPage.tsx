
import React, { useState } from 'react';
import { FileText, Send, Loader2, Check } from 'lucide-react';
import { useSupabase } from '../../services/useSupabase';

export const SolicitacaoFormPage: React.FC = () => {
    const supabase = useSupabase();
    const [formData, setFormData] = useState({
        full_name: '',
        participation_date: '',
        whatsapp: '',
        email: ''
    });
    const [submitting, setSubmitting] = useState(false);
    const [success, setSuccess] = useState(false);

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!supabase) return;
        
        if (!formData.full_name || !formData.participation_date || !formData.whatsapp || !formData.email) {
            alert('Por favor, preencha todos os campos!');
            return;
        }

        setSubmitting(true);
        try {
            const { error } = await supabase.from('form_requests').insert({
                full_name: formData.full_name,
                participation_date: formData.participation_date,
                whatsapp: formData.whatsapp,
                email: formData.email,
                status: 'pendente'
            });

            if (error) throw error;
            setSuccess(true);
        } catch (err) {
            console.error('Error submitting form:', err);
            alert('Erro ao enviar solicitação. Tente novamente.');
        } finally {
            setSubmitting(false);
        }
    };

    if (success) {
        return (
            <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100 flex items-center justify-center p-6">
                <div className="bg-white rounded-[3rem] p-10 shadow-2xl max-w-md w-full text-center">
                    <div className="w-20 h-20 bg-emerald-100 rounded-full flex items-center justify-center mx-auto mb-6">
                        <Check className="text-emerald-600 w-10 h-10" />
                    </div>
                    <h1 className="text-2xl font-black text-gray-900 mb-4">Solicitação Enviada!</h1>
                    <p className="text-gray-600 font-medium mb-4">
                        Recebemos sua solicitação de certificado. Em breve, entraremos em contato pelo WhatsApp informado.
                    </p>
                    <div className="bg-blue-50 rounded-2xl p-4">
                        <p className="text-sm text-blue-800 font-bold">
                            O certificado será enviado em até <span className="text-blue-600">48 horas úteis</span> para o e-mail informado.
                        </p>
                    </div>
                </div>
            </div>
        );
    }

    return (
        <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100 flex items-center justify-center p-6">
            <div className="bg-white rounded-[3rem] p-8 md:p-12 shadow-2xl max-w-lg w-full">
                <div className="flex items-center gap-3 mb-8">
                    <div className="w-12 h-12 bg-blue-600 rounded-2xl flex items-center justify-center">
                        <FileText className="text-white w-6 h-6" />
                    </div>
                    <div>
                        <h1 className="text-xl font-black text-gray-900">Solicitar Certificado</h1>
                        <p className="text-xs text-gray-500 font-bold uppercase tracking-wider">Preencha seus dados</p>
                    </div>
                </div>

                <form onSubmit={handleSubmit} className="space-y-6">
                    <div>
                        <label className="block text-sm font-black text-gray-700 mb-2">Nome Completo</label>
                        <input
                            type="text"
                            className="w-full px-5 py-4 rounded-2xl border-2 border-gray-100 outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent font-bold text-gray-900"
                            placeholder="Seu nome completo"
                            value={formData.full_name}
                            onChange={(e) => setFormData({ ...formData, full_name: e.target.value })}
                        />
                    </div>

                    <div>
                        <label className="block text-sm font-black text-gray-700 mb-2">Data da Participação</label>
                        <input
                            type="date"
                            className="w-full px-5 py-4 rounded-2xl border-2 border-gray-100 outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent font-bold text-gray-900"
                            value={formData.participation_date}
                            onChange={(e) => setFormData({ ...formData, participation_date: e.target.value })}
                        />
                    </div>

                    <div>
                        <label className="block text-sm font-black text-gray-700 mb-2">WhatsApp</label>
                        <input
                            type="tel"
                            className="w-full px-5 py-4 rounded-2xl border-2 border-gray-100 outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent font-bold text-gray-900"
                            placeholder="(00) 00000-0000"
                            value={formData.whatsapp}
                            onChange={(e) => setFormData({ ...formData, whatsapp: e.target.value })}
                        />
                    </div>

                    <div>
                        <label className="block text-sm font-black text-gray-700 mb-2">E-mail</label>
                        <input
                            type="email"
                            className="w-full px-5 py-4 rounded-2xl border-2 border-gray-100 outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent font-bold text-gray-900"
                            placeholder="seu@email.com"
                            value={formData.email}
                            onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                        />
                    </div>

                    <button
                        type="submit"
                        disabled={submitting}
                        className="w-full bg-blue-600 text-white py-5 rounded-2xl font-black text-sm uppercase shadow-xl hover:bg-blue-700 hover:-translate-y-1 transition-all flex items-center justify-center gap-3"
                    >
                        {submitting ? (
                            <Loader2 className="animate-spin" />
                        ) : (
                            <>
                                <Send size={20} /> Enviar Solicitação
                            </>
                        )}
                    </button>
                </form>
            </div>
        </div>
    );
};
