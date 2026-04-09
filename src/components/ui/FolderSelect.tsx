import React, { useState, useMemo, useEffect } from 'react';
import { ChevronDown, Folder, Plus, X } from 'lucide-react';
import { useSupabase } from '../../hooks/useSupabase';

interface FolderSelectProps {
    value: string | undefined;
    onChange: (value: string) => void;
    existingFolders: string[];
    label?: string;
    placeholder?: string;
}

export const FolderSelect: React.FC<FolderSelectProps> = ({
    value,
    onChange,
    existingFolders,
    label = 'Pasta / Categoria',
    placeholder = 'Selecionar ou criar uma pasta'
}) => {
    const supabase = useSupabase();
    const [isOpen, setIsOpen] = useState(false);
    const [isCreating, setIsCreating] = useState(false);
    const [newFolderName, setNewFolderName] = useState('');
    const [dbFolders, setDbFolders] = useState<string[]>([]);

    // Load folders from Supabase
    useEffect(() => {
        const loadFolders = async () => {
            if (!supabase) return;
            try {
                const { data, error } = await supabase
                    .from('folders')
                    .select('name')
                    .order('name');

                if (error) throw error;
                setDbFolders((data || []).map(row => row.name));
            } catch (err) {
                console.error('Erro ao carregar pastas:', err);
            }
        };

        loadFolders();
    }, [supabase]);

    const folders = useMemo(() => {
        const unique = new Set<string>();

        // Add folders from database
        dbFolders.forEach(f => unique.add(f));

        // Add folders from existing products
        existingFolders.forEach(f => {
            if (f && f !== 'Sem Pasta') unique.add(f);
        });

        return Array.from(unique).sort();
    }, [dbFolders, existingFolders]);

    const handleCreateFolder = async () => {
        if (!newFolderName.trim()) return;
        if (folders.some(f => f === newFolderName.trim())) {
            alert('Pasta com esse nome já existe!');
            return;
        }

        if (supabase) {
            try {
                const { error } = await supabase
                    .from('folders')
                    .insert({ name: newFolderName.trim() });

                if (error) throw error;
                setDbFolders([...dbFolders, newFolderName.trim()].sort());
            } catch (err) {
                console.error('Erro ao criar pasta:', err);
                alert('Erro ao criar pasta. Tente novamente.');
                return;
            }
        }

        onChange(newFolderName.trim());
        setNewFolderName('');
        setIsCreating(false);
        setIsOpen(false);
    };

    const handleSelectFolder = (folderName: string) => {
        onChange(folderName);
        setIsOpen(false);
    };

    const handleClear = () => {
        onChange('');
    };

    return (
        <div className="space-y-2">
            {label && (
                <label className="block text-[10px] font-black uppercase text-gray-500 tracking-widest ml-1">
                    {label}
                </label>
            )}

            <div className="relative">
                <button
                    type="button"
                    onClick={() => setIsOpen(!isOpen)}
                    className="w-full px-5 py-4 rounded-2xl border-2 border-gray-100 outline-none focus:ring-2 focus:ring-blue-500 font-bold text-gray-700 bg-gray-50/50 flex items-center justify-between hover:border-gray-200 transition-all text-left"
                >
                    <div className="flex items-center gap-2 flex-1 min-w-0">
                        <Folder size={16} className="text-gray-400 flex-shrink-0" />
                        <span className={value ? 'text-gray-900' : 'text-gray-400'}>
                            {value || placeholder}
                        </span>
                    </div>
                    <div className="flex items-center gap-2 flex-shrink-0">
                        {value && (
                            <button
                                type="button"
                                onClick={e => {
                                    e.stopPropagation();
                                    handleClear();
                                }}
                                className="p-1 hover:bg-gray-200 rounded-lg transition-all"
                                title="Limpar"
                            >
                                <X size={16} className="text-gray-400" />
                            </button>
                        )}
                        <ChevronDown
                            size={18}
                            className={`text-gray-400 transition-transform ${isOpen ? 'rotate-180' : ''}`}
                        />
                    </div>
                </button>

                {isOpen && (
                    <div className="absolute top-full left-0 right-0 mt-2 bg-white border-2 border-gray-100 rounded-2xl shadow-xl z-50 overflow-hidden">
                        <div className="max-h-80 overflow-y-auto">
                            {/* Option to leave blank */}
                            <button
                                type="button"
                                onClick={() => handleSelectFolder('')}
                                className={`w-full px-5 py-3 text-left font-bold text-sm flex items-center gap-3 transition-all ${
                                    value === '' ? 'bg-blue-50 text-blue-600' : 'text-gray-700 hover:bg-gray-50'
                                }`}
                            >
                                <Folder size={16} className="flex-shrink-0 opacity-50" />
                                Sem Pasta
                            </button>

                            {/* Existing folders */}
                            {folders.length > 0 && (
                                <>
                                    <div className="px-5 py-2 bg-gray-50 sticky top-0 border-t border-gray-100">
                                        <span className="text-[10px] font-black uppercase text-gray-400 tracking-widest">
                                            Pastas Existentes
                                        </span>
                                    </div>
                                    {folders.map(folder => (
                                        <button
                                            key={folder}
                                            type="button"
                                            onClick={() => handleSelectFolder(folder)}
                                            className={`w-full px-5 py-3 text-left font-bold text-sm flex items-center gap-3 transition-all ${
                                                value === folder ? 'bg-blue-50 text-blue-600' : 'text-gray-700 hover:bg-gray-50'
                                            }`}
                                        >
                                            <Folder size={16} className="flex-shrink-0" />
                                            {folder}
                                        </button>
                                    ))}
                                </>
                            )}

                            {/* Create new folder section */}
                            <div className="px-5 py-3 border-t border-gray-100 bg-gray-50">
                                {!isCreating ? (
                                    <button
                                        type="button"
                                        onClick={() => setIsCreating(true)}
                                        className="w-full text-blue-600 font-bold text-sm flex items-center justify-center gap-2 hover:bg-white py-2 px-3 rounded-lg transition-all"
                                    >
                                        <Plus size={16} /> Nova Pasta
                                    </button>
                                ) : (
                                    <div className="flex gap-2">
                                        <input
                                            type="text"
                                            value={newFolderName}
                                            onChange={e => setNewFolderName(e.target.value)}
                                            placeholder="Nome da pasta..."
                                            onKeyDown={e => {
                                                if (e.key === 'Enter') handleCreateFolder();
                                                if (e.key === 'Escape') setIsCreating(false);
                                            }}
                                            autoFocus
                                            className="flex-1 px-3 py-2 rounded-lg border border-blue-300 outline-none focus:ring-2 focus:ring-blue-500 text-sm font-bold"
                                        />
                                        <button
                                            type="button"
                                            onClick={handleCreateFolder}
                                            disabled={!newFolderName.trim()}
                                            className="px-3 py-2 bg-blue-600 text-white rounded-lg font-bold text-sm hover:bg-blue-700 disabled:opacity-50 transition-all"
                                        >
                                            OK
                                        </button>
                                    </div>
                                )}
                            </div>
                        </div>
                    </div>
                )}
            </div>
        </div>
    );
};
