import React, { useState, useMemo } from 'react';
import {
    UserCheck, Users, Search, CheckCircle, XCircle, Clock,
    ChevronDown, RotateCcw, Loader2, MapPin, Calendar
} from 'lucide-react';
import { Lead, AppConfig } from '../../shared';

interface CheckInDashboardProps {
    leads: Lead[];
    checkouts: AppConfig[];
    onCheckIn: (leadId: string, checkedIn: boolean) => Promise<void>;
}

export const CheckInDashboard: React.FC<CheckInDashboardProps> = ({ leads, checkouts, onCheckIn }) => {
    const [selectedTurma, setSelectedTurma] = useState<string>('');
    const [searchQuery, setSearchQuery] = useState('');
    const [loadingId, setLoadingId] = useState<string | null>(null);
    const [filterStatus, setFilterStatus] = useState<'all' | 'checked' | 'unchecked'>('all');

    // Auto-select first turma
    React.useEffect(() => {
        if (!selectedTurma && checkouts.length > 0) {
            setSelectedTurma(checkouts[0].id);
        }
    }, [checkouts, selectedTurma]);

    // Get only paid leads for the selected turma
    const turmaLeads = useMemo(() => {
        if (!selectedTurma) return [];
        return leads
            .filter(l => l.product_id === selectedTurma && l.status === 'Pago')
            .sort((a, b) => a.name.localeCompare(b.name));
    }, [leads, selectedTurma]);

    // Apply search + filter
    const filteredLeads = useMemo(() => {
        let result = turmaLeads;

        if (searchQuery.trim()) {
            const q = searchQuery.toLowerCase();
            result = result.filter(l =>
                l.name.toLowerCase().includes(q) ||
                l.email.toLowerCase().includes(q) ||
                l.phone.includes(q) ||
                (l.city && l.city.toLowerCase().includes(q))
            );
        }

        if (filterStatus === 'checked') {
            result = result.filter(l => l.checked_in);
        } else if (filterStatus === 'unchecked') {
            result = result.filter(l => !l.checked_in);
        }

        return result;
    }, [turmaLeads, searchQuery, filterStatus]);

    // Stats
    const stats = useMemo(() => {
        const total = turmaLeads.length;
        const present = turmaLeads.filter(l => l.checked_in).length;
        const absent = total - present;
        const percentage = total > 0 ? (present / total) * 100 : 0;
        return { total, present, absent, percentage };
    }, [turmaLeads]);

    // Selected turma info
    const selectedCheckout = checkouts.find(c => c.id === selectedTurma);

    const handleCheckIn = async (leadId: string, value: boolean) => {
        setLoadingId(leadId);
        try {
            await onCheckIn(leadId, value);
        } catch (err) {
            console.error(err);
        }
        setLoadingId(null);
    };

    const formatTime = (dateStr?: string) => {
        if (!dateStr) return '';
        try {
            return new Date(dateStr).toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' });
        } catch { return ''; }
    };

    return (
        <div className="space-y-6 animate-in fade-in slide-in-from-bottom-4 duration-500">
            {/* Header */}
            <div>
                <h2 className="text-2xl font-black text-gray-900 tracking-tight flex items-center gap-3">
                    <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-emerald-500 to-emerald-600 flex items-center justify-center shadow-lg shadow-emerald-200">
                        <UserCheck size={20} className="text-white" />
                    </div>
                    Check-in / Presença
                </h2>
                <p className="text-sm text-gray-400 font-medium mt-1 ml-[52px]">Controle de entrada de alunos em tempo real.</p>
            </div>

            {/* Turma Selector */}
            <div className="bg-white rounded-2xl p-5 border border-gray-100 shadow-sm">
                <label className="text-[9px] font-black uppercase text-gray-400 tracking-widest mb-2 block">
                    Selecione a Turma
                </label>
                <div className="relative">
                    <select
                        value={selectedTurma}
                        onChange={e => { setSelectedTurma(e.target.value); setSearchQuery(''); }}
                        className="w-full appearance-none bg-gray-50 border border-gray-200 rounded-xl px-4 py-3 pr-10 text-sm font-bold text-gray-800 focus:outline-none focus:ring-2 focus:ring-emerald-300 focus:border-emerald-400 cursor-pointer"
                    >
                        <option value="">Escolha uma turma...</option>
                        {checkouts.map(c => (
                            <option key={c.id} value={c.id}>
                                {c.productName} {c.turma ? `(${c.turma})` : ''} — {leads.filter(l => l.product_id === c.id && l.status === 'Pago').length} alunos
                            </option>
                        ))}
                    </select>
                    <ChevronDown size={16} className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 pointer-events-none" />
                </div>

                {selectedCheckout && (
                    <div className="flex flex-wrap gap-4 mt-3 text-[11px] text-gray-400 font-medium">
                        {selectedCheckout.eventDate && (
                            <span className="flex items-center gap-1">
                                <Calendar size={12} className="text-gray-300" />
                                {selectedCheckout.eventDate.includes('/') 
                                    ? selectedCheckout.eventDate 
                                    : (() => {
                                        const parts = selectedCheckout.eventDate.split('-');
                                        return parts.length === 3 ? `${parts[2]}/${parts[1]}/${parts[0]}` : selectedCheckout.eventDate;
                                      })()}
                            </span>
                        )}
                        {selectedCheckout.eventLocation && (
                            <span className="flex items-center gap-1">
                                <MapPin size={12} className="text-gray-300" />
                                {selectedCheckout.eventLocation}
                            </span>
                        )}
                        {selectedCheckout.eventStartTime && (
                            <span className="flex items-center gap-1">
                                <Clock size={12} className="text-gray-300" />
                                {selectedCheckout.eventStartTime}{selectedCheckout.eventEndTime ? ` - ${selectedCheckout.eventEndTime}` : ''}
                            </span>
                        )}
                    </div>
                )}
            </div>

            {selectedTurma && (
                <>
                    {/* Stats */}
                    <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
                        <div className="bg-white rounded-2xl p-4 border border-gray-100 shadow-sm">
                            <div className="flex items-center gap-2 mb-1">
                                <Users size={14} className="text-gray-400" />
                                <span className="text-[9px] font-black uppercase text-gray-400 tracking-widest">Total</span>
                            </div>
                            <p className="text-3xl font-black text-gray-900">{stats.total}</p>
                        </div>
                        <div className="bg-emerald-50 rounded-2xl p-4 border border-emerald-100">
                            <div className="flex items-center gap-2 mb-1">
                                <CheckCircle size={14} className="text-emerald-500" />
                                <span className="text-[9px] font-black uppercase text-emerald-600 tracking-widest">Presentes</span>
                            </div>
                            <p className="text-3xl font-black text-emerald-700">{stats.present}</p>
                        </div>
                        <div className="bg-red-50 rounded-2xl p-4 border border-red-100">
                            <div className="flex items-center gap-2 mb-1">
                                <XCircle size={14} className="text-red-400" />
                                <span className="text-[9px] font-black uppercase text-red-500 tracking-widest">Ausentes</span>
                            </div>
                            <p className="text-3xl font-black text-red-600">{stats.absent}</p>
                        </div>
                        <div className="bg-white rounded-2xl p-4 border border-gray-100 shadow-sm">
                            <div className="flex items-center gap-2 mb-1">
                                <UserCheck size={14} className="text-indigo-400" />
                                <span className="text-[9px] font-black uppercase text-indigo-500 tracking-widest">Frequência</span>
                            </div>
                            <p className="text-3xl font-black text-indigo-700">{stats.percentage.toFixed(0)}%</p>
                        </div>
                    </div>

                    {/* Progress Bar */}
                    <div className="bg-white rounded-2xl p-5 border border-gray-100 shadow-sm">
                        <div className="flex items-center justify-between mb-2">
                            <span className="text-[10px] font-black uppercase text-gray-400 tracking-widest">Progresso do Check-in</span>
                            <span className="text-xs font-black text-emerald-600">{stats.present}/{stats.total}</span>
                        </div>
                        <div className="w-full h-4 bg-gray-100 rounded-full overflow-hidden">
                            <div
                                className="h-full rounded-full transition-all duration-700 ease-out"
                                style={{
                                    width: `${stats.percentage}%`,
                                    background: stats.percentage >= 75
                                        ? 'linear-gradient(to right, #10b981, #059669)'
                                        : stats.percentage >= 50
                                            ? 'linear-gradient(to right, #f59e0b, #d97706)'
                                            : 'linear-gradient(to right, #ef4444, #dc2626)'
                                }}
                            />
                        </div>
                    </div>

                    {/* Search & Filter */}
                    <div className="flex flex-col md:flex-row gap-3">
                        <div className="flex-1 relative">
                            <Search size={16} className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-300" />
                            <input
                                type="text"
                                value={searchQuery}
                                onChange={e => setSearchQuery(e.target.value)}
                                placeholder="Buscar por nome, email, telefone ou cidade..."
                                className="w-full pl-11 pr-4 py-3 bg-white border border-gray-200 rounded-xl text-sm font-medium text-gray-800 focus:outline-none focus:ring-2 focus:ring-emerald-300 focus:border-emerald-400 placeholder:text-gray-300"
                            />
                        </div>
                        <div className="flex rounded-xl overflow-hidden border border-gray-200">
                            {([
                                { value: 'all', label: 'Todos' },
                                { value: 'unchecked', label: 'Ausentes' },
                                { value: 'checked', label: 'Presentes' }
                            ] as const).map(opt => (
                                <button
                                    key={opt.value}
                                    onClick={() => setFilterStatus(opt.value)}
                                    className={`px-4 py-3 text-[10px] font-black uppercase tracking-wider transition-all ${filterStatus === opt.value
                                            ? 'bg-emerald-600 text-white'
                                            : 'bg-white text-gray-500 hover:bg-gray-50'
                                        }`}
                                >
                                    {opt.label}
                                </button>
                            ))}
                        </div>
                    </div>

                    {/* Check-in Table */}
                    <div className="bg-white rounded-2xl border border-gray-100 shadow-sm overflow-hidden">
                        <div className="overflow-x-auto">
                            <table className="w-full">
                                <thead>
                                    <tr className="bg-gray-50/80">
                                        <th className="text-left text-[9px] font-black uppercase text-gray-400 tracking-widest py-3.5 px-4">#</th>
                                        <th className="text-left text-[9px] font-black uppercase text-gray-400 tracking-widest py-3.5 px-4">Aluno</th>
                                        <th className="text-left text-[9px] font-black uppercase text-gray-400 tracking-widest py-3.5 px-4 hidden md:table-cell">Telefone</th>
                                        <th className="text-left text-[9px] font-black uppercase text-gray-400 tracking-widest py-3.5 px-4 hidden lg:table-cell">Cidade</th>
                                        <th className="text-center text-[9px] font-black uppercase text-gray-400 tracking-widest py-3.5 px-4">Status</th>
                                        <th className="text-center text-[9px] font-black uppercase text-gray-400 tracking-widest py-3.5 px-4 hidden md:table-cell">Horário</th>
                                        <th className="text-center text-[9px] font-black uppercase text-gray-400 tracking-widest py-3.5 px-4">Ação</th>
                                    </tr>
                                </thead>
                                <tbody>
                                    {filteredLeads.length === 0 && (
                                        <tr>
                                            <td colSpan={7} className="text-center py-12 text-gray-300">
                                                <Users size={40} className="mx-auto mb-3 opacity-50" />
                                                <p className="text-sm font-bold">
                                                    {searchQuery || filterStatus !== 'all'
                                                        ? 'Nenhum aluno encontrado com esses filtros'
                                                        : 'Nenhum aluno pago nesta turma'}
                                                </p>
                                            </td>
                                        </tr>
                                    )}
                                    {filteredLeads.map((lead, idx) => (
                                        <tr
                                            key={lead.id}
                                            className={`border-b border-gray-50 transition-all duration-300 ${lead.checked_in
                                                    ? 'bg-emerald-50/40'
                                                    : 'hover:bg-gray-50/50'
                                                }`}
                                        >
                                            <td className="py-3 px-4">
                                                <span className="text-xs font-bold text-gray-300">{idx + 1}</span>
                                            </td>
                                            <td className="py-3 px-4">
                                                <div>
                                                    <p className="text-sm font-bold text-gray-900">{lead.name}</p>
                                                    <p className="text-[11px] text-gray-400">{lead.email}</p>
                                                </div>
                                            </td>
                                            <td className="py-3 px-4 hidden md:table-cell">
                                                <span className="text-xs font-medium text-gray-500">{lead.phone}</span>
                                            </td>
                                            <td className="py-3 px-4 hidden lg:table-cell">
                                                <span className="text-xs font-medium text-gray-500">{lead.city || '—'}</span>
                                            </td>
                                            <td className="py-3 px-4 text-center">
                                                {lead.checked_in ? (
                                                    <span className="inline-flex items-center gap-1 bg-emerald-100 text-emerald-700 px-2.5 py-1 rounded-lg text-[9px] font-black uppercase tracking-wider">
                                                        <CheckCircle size={10} />
                                                        Presente
                                                    </span>
                                                ) : (
                                                    <span className="inline-flex items-center gap-1 bg-gray-100 text-gray-400 px-2.5 py-1 rounded-lg text-[9px] font-black uppercase tracking-wider">
                                                        <XCircle size={10} />
                                                        Ausente
                                                    </span>
                                                )}
                                            </td>
                                            <td className="py-3 px-4 text-center hidden md:table-cell">
                                                <span className="text-[11px] font-medium text-gray-400">
                                                    {lead.checked_in_at ? formatTime(lead.checked_in_at) : '—'}
                                                </span>
                                            </td>
                                            <td className="py-3 px-4 text-center">
                                                {loadingId === lead.id ? (
                                                    <Loader2 size={18} className="animate-spin text-gray-400 mx-auto" />
                                                ) : lead.checked_in ? (
                                                    <button
                                                        onClick={() => handleCheckIn(lead.id, false)}
                                                        className="inline-flex items-center gap-1.5 bg-gray-100 text-gray-500 px-3 py-2 rounded-xl text-[9px] font-black uppercase tracking-wider hover:bg-red-50 hover:text-red-500 transition-all"
                                                        title="Desfazer check-in"
                                                    >
                                                        <RotateCcw size={11} />
                                                        Desfazer
                                                    </button>
                                                ) : (
                                                    <button
                                                        onClick={() => handleCheckIn(lead.id, true)}
                                                        className="inline-flex items-center gap-1.5 bg-emerald-500 text-white px-4 py-2 rounded-xl text-[9px] font-black uppercase tracking-wider hover:bg-emerald-600 shadow-sm shadow-emerald-200 transition-all active:scale-95"
                                                    >
                                                        <UserCheck size={11} />
                                                        Check-in
                                                    </button>
                                                )}
                                            </td>
                                        </tr>
                                    ))}
                                </tbody>
                            </table>
                        </div>
                    </div>

                    {/* Footer info */}
                    <div className="text-center text-[10px] text-gray-300 font-medium">
                        Mostrando {filteredLeads.length} de {turmaLeads.length} alunos • Check-in salvo automaticamente no banco de dados
                    </div>
                </>
            )}

            {!selectedTurma && (
                <div className="text-center py-20 text-gray-300">
                    <UserCheck size={60} className="mx-auto mb-4 opacity-40" />
                    <p className="text-sm font-bold mb-1">Selecione uma turma para começar</p>
                    <p className="text-xs text-gray-300">O check-in será salvo em tempo real no banco de dados</p>
                </div>
            )}
        </div>
    );
};
