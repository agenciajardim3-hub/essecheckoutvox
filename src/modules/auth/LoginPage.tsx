import React, { useState, useEffect } from 'react';
import { Lock, ArrowRight, Loader2, Fingerprint, Mail, Check } from 'lucide-react';

interface LoginPageProps {
    onLogin: (role: 'master' | 'manager') => void;
}

const USERS = [
    { email: 'rodrigo_mesquita@outlook.com', password: '@Rodrigo94', role: 'master' as const },
    { email: 'manager', password: 'manager123', role: 'manager' as const },
    { email: 'paulo@paulo.com', password: 'paulo01', role: 'manager' as const },
];

export const LoginPage: React.FC<LoginPageProps> = ({ onLogin }) => {
    const [email, setEmail] = useState('');
    const [password, setPassword] = useState('');
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState('');
    const [rememberMe, setRememberMe] = useState(false);

    useEffect(() => {
        const savedEmail = localStorage.getItem('vox_remember_email');
        const savedRemember = localStorage.getItem('vox_remember_me');
        if (savedEmail && savedRemember === 'true') {
            setEmail(savedEmail);
            setRememberMe(true);
        }
    }, []);

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        setLoading(true);
        setError('');

        await new Promise(resolve => setTimeout(resolve, 800));

        const user = USERS.find(u => u.email.toLowerCase() === email.toLowerCase() && u.password === password);

        if (user) {
            if (rememberMe) {
                localStorage.setItem('vox_remember_me', 'true');
                localStorage.setItem('vox_remember_email', email);
                localStorage.setItem('vox_saved_role', user.role);
            } else {
                localStorage.removeItem('vox_remember_me');
                localStorage.removeItem('vox_remember_email');
                localStorage.removeItem('vox_saved_role');
            }
            onLogin(user.role);
        } else {
            setError('Credenciais inválidas. Tente novamente.');
            setLoading(false);
        }
    };

    return (
        <div className="min-h-screen flex items-center justify-center bg-gray-50 relative overflow-hidden">
            <div className="absolute top-0 left-0 w-full h-full overflow-hidden pointer-events-none">
                <div className="absolute top-[-10%] right-[-5%] w-96 h-96 bg-purple-200 rounded-full mix-blend-multiply filter blur-3xl opacity-30 animate-blob"></div>
                <div className="absolute top-[-10%] left-[-5%] w-96 h-96 bg-indigo-200 rounded-full mix-blend-multiply filter blur-3xl opacity-30 animate-blob animation-delay-2000"></div>
                <div className="absolute bottom-[-10%] left-[20%] w-96 h-96 bg-pink-200 rounded-full mix-blend-multiply filter blur-3xl opacity-30 animate-blob animation-delay-4000"></div>
            </div>

            <div className="w-full max-w-md p-8 relative z-10">
                <div className="text-center mb-10">
                    <div className="w-16 h-16 bg-white rounded-2xl shadow-xl flex items-center justify-center mx-auto mb-6 transform -rotate-3">
                        <Lock className="text-indigo-600" size={32} />
                    </div>
                    <h1 className="text-3xl font-black text-gray-900 tracking-tight mb-2">Acesso Restrito</h1>
                    <p className="text-gray-500 font-medium text-sm">Entre com suas credenciais para continuar.</p>
                </div>

                <form onSubmit={handleSubmit} className="bg-white/80 backdrop-blur-xl rounded-3xl shadow-2xl border border-white/50 p-8 space-y-5">
                    <div>
                        <label className="block text-xs font-black uppercase text-gray-400 tracking-widest mb-2 ml-1">
                            Email
                        </label>
                        <div className="relative group">
                            <Mail className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-400 group-focus-within:text-indigo-500 transition-colors" size={18} />
                            <input
                                type="email"
                                value={email}
                                onChange={(e) => setEmail(e.target.value)}
                                className="w-full bg-gray-50/50 border border-gray-200 rounded-xl py-3.5 pl-12 pr-4 text-gray-900 placeholder-gray-400 font-medium focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 transition-all"
                                placeholder="seu@email.com"
                                required
                            />
                        </div>
                    </div>

                    <div>
                        <label className="block text-xs font-black uppercase text-gray-400 tracking-widest mb-2 ml-1">
                            Senha
                        </label>
                        <div className="relative group">
                            <Fingerprint className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-400 group-focus-within:text-indigo-500 transition-colors" size={18} />
                            <input
                                type="password"
                                value={password}
                                onChange={(e) => setPassword(e.target.value)}
                                className="w-full bg-gray-50/50 border border-gray-200 rounded-xl py-3.5 pl-12 pr-4 text-gray-900 placeholder-gray-400 font-medium focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 transition-all"
                                placeholder="••••••••"
                                required
                            />
                        </div>
                    </div>

                    <div className="flex items-center gap-3">
                        <button
                            type="button"
                            onClick={() => setRememberMe(!rememberMe)}
                            className={`w-5 h-5 rounded-md border-2 flex items-center justify-center transition-all ${rememberMe ? 'bg-indigo-600 border-indigo-600' : 'border-gray-300 bg-white'}`}
                        >
                            {rememberMe && <Check size={12} className="text-white" />}
                        </button>
                        <label
                            onClick={() => setRememberMe(!rememberMe)}
                            className="text-xs font-bold text-gray-600 cursor-pointer select-none"
                        >
                            Permanecer logado
                        </label>
                    </div>

                    {error && (
                        <div className="p-4 rounded-xl bg-red-50 border border-red-100 flex items-center gap-3 animate-in slide-in-from-top-2">
                            <div className="w-1.5 h-1.5 rounded-full bg-red-500 shrink-0" />
                            <p className="text-xs font-bold text-red-600">{error}</p>
                        </div>
                    )}

                    <button
                        type="submit"
                        disabled={loading}
                        className="w-full bg-gray-900 text-white rounded-xl py-4 font-black uppercase tracking-widest text-xs hover:bg-black hover:scale-[1.02] active:scale-[0.98] transition-all disabled:opacity-70 disabled:pointer-events-none flex items-center justify-center gap-2 group shadow-lg shadow-gray-900/20"
                    >
                        {loading ? (
                            <Loader2 className="animate-spin" size={16} />
                        ) : (
                            <>
                                Entrar no Painel
                                <ArrowRight size={16} className="group-hover:translate-x-1 transition-transform" />
                            </>
                        )}
                    </button>
                </form>

                <p className="text-center mt-8 text-[10px] uppercase tracking-widest text-gray-400 font-bold">
                    CheckoutVox • {new Date().getFullYear()}
                </p>
            </div>
        </div>
    );
};
