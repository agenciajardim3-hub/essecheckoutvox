
import React, { useState } from 'react';
import { Ticket, Plus, Edit2, Trash2, ToggleLeft, ToggleRight, Percent, DollarSign, Calendar, Users, Tag } from 'lucide-react';
import { Coupon, AppConfig } from '../../shared';
import { Input } from '../../shared/components/Input';

interface CouponManagerProps {
    coupons: Coupon[];
    allCheckouts: AppConfig[];
    onSave: (coupon: Coupon) => Promise<void>;
    onDelete: (id: string) => Promise<void>;
    onToggleActive: (id: string, isActive: boolean) => Promise<void>;
}

export const CouponManager: React.FC<CouponManagerProps> = ({
    coupons,
    allCheckouts,
    onSave,
    onDelete,
    onToggleActive
}) => {
    const [isEditing, setIsEditing] = useState(false);
    const [editingCoupon, setEditingCoupon] = useState<Coupon>({
        code: '',
        discountType: 'percentage',
        discountValue: 0,
        currentUses: 0,
        isActive: true
    });

    const handleSave = async () => {
        if (!editingCoupon.code || editingCoupon.discountValue <= 0) {
            alert('Preencha o código e o valor do desconto!');
            return;
        }
        await onSave(editingCoupon);
        setIsEditing(false);
        setEditingCoupon({
            code: '',
            discountType: 'percentage',
            discountValue: 0,
            currentUses: 0,
            isActive: true
        });
    };

    const handleEdit = (coupon: Coupon) => {
        setEditingCoupon(coupon);
        setIsEditing(true);
    };

    const handleCancel = () => {
        setIsEditing(false);
        setEditingCoupon({
            code: '',
            discountType: 'percentage',
            discountValue: 0,
            currentUses: 0,
            isActive: true
        });
    };

    return (
        <div className="max-w-6xl mx-auto animate-in fade-in slide-in-from-bottom-4 duration-500 pb-20">
            {/* Header */}
            <div className="flex justify-between items-center mb-8">
                <div>
                    <h2 className="text-3xl font-black text-gray-900">Cupons de Desconto</h2>
                    <p className="text-sm text-gray-400 font-bold mt-1">Gerencie cupons promocionais para seus produtos</p>
                </div>
                {!isEditing && (
                    <button
                        onClick={() => setIsEditing(true)}
                        className="bg-blue-600 text-white px-6 py-4 rounded-2xl font-black text-xs uppercase shadow-xl shadow-blue-100 hover:bg-blue-700 transition-all flex items-center gap-2"
                    >
                        <Plus size={18} /> Novo Cupom
                    </button>
                )}
            </div>

            {/* Edit Form */}
            {isEditing && (
                <div className="bg-white rounded-[2.5rem] border border-gray-100 shadow-2xl p-8 md:p-12 mb-8 animate-in fade-in slide-in-from-top-4">
                    <h3 className="text-2xl font-black text-gray-900 mb-8">
                        {editingCoupon.id ? 'Editar Cupom' : 'Novo Cupom'}
                    </h3>

                    <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-6">
                        <Input
                            label="Código do Cupom *"
                            type="text"
                            placeholder="Ex: PROMO20"
                            value={editingCoupon.code}
                            onChange={v => setEditingCoupon({ ...editingCoupon, code: v.toUpperCase() })}
                        />

                        <div className="space-y-2">
                            <label className="block text-[10px] font-black uppercase text-gray-500 tracking-widest ml-1">Tipo de Desconto *</label>
                            <div className="flex gap-2">
                                <button
                                    type="button"
                                    onClick={() => setEditingCoupon({ ...editingCoupon, discountType: 'percentage' })}
                                    className={`flex-1 py-4 rounded-2xl font-black text-xs uppercase transition-all flex items-center justify-center gap-2 ${editingCoupon.discountType === 'percentage'
                                            ? 'bg-blue-600 text-white shadow-lg'
                                            : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
                                        }`}
                                >
                                    <Percent size={16} /> Porcentagem
                                </button>
                                <button
                                    type="button"
                                    onClick={() => setEditingCoupon({ ...editingCoupon, discountType: 'fixed' })}
                                    className={`flex-1 py-4 rounded-2xl font-black text-xs uppercase transition-all flex items-center justify-center gap-2 ${editingCoupon.discountType === 'fixed'
                                            ? 'bg-blue-600 text-white shadow-lg'
                                            : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
                                        }`}
                                >
                                    <DollarSign size={16} /> Valor Fixo
                                </button>
                            </div>
                        </div>
                    </div>

                    <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-6">
                        <Input
                            label={`Valor do Desconto * ${editingCoupon.discountType === 'percentage' ? '(%)' : '(R$)'}`}
                            type="number"
                            placeholder={editingCoupon.discountType === 'percentage' ? '20' : '50.00'}
                            value={editingCoupon.discountValue.toString()}
                            onChange={v => setEditingCoupon({ ...editingCoupon, discountValue: parseFloat(v) || 0 })}
                        />

                        <Input
                            label="Limite de Usos (0 = Ilimitado)"
                            type="number"
                            placeholder="100"
                            value={editingCoupon.maxUses?.toString() || ''}
                            onChange={v => setEditingCoupon({ ...editingCoupon, maxUses: v === '' ? undefined : parseInt(v) })}
                        />

                        <div className="space-y-2">
                            <label className="block text-[10px] font-black uppercase text-gray-500 tracking-widest ml-1">Produto Específico</label>
                            <select
                                value={editingCoupon.productId || ''}
                                onChange={e => setEditingCoupon({ ...editingCoupon, productId: e.target.value || undefined })}
                                className="w-full px-5 py-4 rounded-2xl border-2 border-gray-100 outline-none focus:ring-2 focus:ring-blue-500 font-bold text-sm bg-gray-50/50"
                            >
                                <option value="">Todos os Produtos</option>
                                {allCheckouts.map(checkout => (
                                    <option key={checkout.id} value={checkout.id}>
                                        {checkout.productName}
                                    </option>
                                ))}
                            </select>
                        </div>
                    </div>

                    <div className="flex gap-4">
                        <button
                            onClick={handleSave}
                            className="flex-1 bg-blue-600 text-white py-5 rounded-2xl font-black text-xs uppercase shadow-xl shadow-blue-100 hover:bg-blue-700 transition-all"
                        >
                            Salvar Cupom
                        </button>
                        <button
                            onClick={handleCancel}
                            className="px-8 py-5 text-gray-400 font-black text-xs uppercase hover:text-gray-600 transition-all"
                        >
                            Cancelar
                        </button>
                    </div>
                </div>
            )}

            {/* Coupons List */}
            <div className="grid grid-cols-1 gap-4">
                {coupons.length === 0 ? (
                    <div className="bg-white rounded-[2.5rem] border border-gray-100 p-12 text-center">
                        <Ticket size={48} className="text-gray-300 mx-auto mb-4" />
                        <p className="text-gray-400 font-bold">Nenhum cupom cadastrado ainda.</p>
                    </div>
                ) : (
                    coupons.map(coupon => {
                        const product = coupon.productId ? allCheckouts.find(c => c.id === coupon.productId) : null;
                        const usagePercent = coupon.maxUses ? (coupon.currentUses / coupon.maxUses) * 100 : 0;
                        const isExpired = coupon.expiresAt && new Date(coupon.expiresAt) < new Date();

                        return (
                            <div
                                key={coupon.id}
                                className={`bg-white rounded-[2.5rem] border shadow-lg p-6 md:p-8 transition-all ${!coupon.isActive || isExpired ? 'opacity-50' : ''
                                    }`}
                            >
                                <div className="flex flex-col md:flex-row md:items-center gap-6">
                                    {/* Coupon Info */}
                                    <div className="flex-1">
                                        <div className="flex items-center gap-3 mb-3">
                                            <div className={`px-4 py-2 rounded-xl font-black text-lg ${coupon.isActive && !isExpired ? 'bg-blue-100 text-blue-700' : 'bg-gray-100 text-gray-400'
                                                }`}>
                                                {coupon.code}
                                            </div>
                                            {!coupon.isActive && (
                                                <span className="px-3 py-1 bg-red-100 text-red-600 rounded-lg text-[9px] font-black uppercase">Inativo</span>
                                            )}
                                            {isExpired && (
                                                <span className="px-3 py-1 bg-orange-100 text-orange-600 rounded-lg text-[9px] font-black uppercase">Expirado</span>
                                            )}
                                        </div>

                                        <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-sm">
                                            <div>
                                                <p className="text-[9px] font-black uppercase text-gray-400 tracking-widest mb-1">Desconto</p>
                                                <p className="font-black text-gray-900">
                                                    {coupon.discountType === 'percentage' ? `${coupon.discountValue}%` : `R$ ${coupon.discountValue.toFixed(2)}`}
                                                </p>
                                            </div>
                                            <div>
                                                <p className="text-[9px] font-black uppercase text-gray-400 tracking-widest mb-1">Usos</p>
                                                <p className="font-black text-gray-900">
                                                    {coupon.currentUses} {coupon.maxUses ? `/ ${coupon.maxUses}` : ''}
                                                </p>
                                            </div>
                                            <div>
                                                <p className="text-[9px] font-black uppercase text-gray-400 tracking-widest mb-1">Produto</p>
                                                <p className="font-black text-gray-900 text-xs truncate">
                                                    {product ? product.productName : 'Todos'}
                                                </p>
                                            </div>
                                            <div>
                                                <p className="text-[9px] font-black uppercase text-gray-400 tracking-widest mb-1">Status</p>
                                                <p className={`font-black text-xs ${coupon.maxUses && coupon.currentUses >= coupon.maxUses
                                                        ? 'text-red-600'
                                                        : 'text-emerald-600'
                                                    }`}>
                                                    {coupon.maxUses && coupon.currentUses >= coupon.maxUses ? 'Esgotado' : 'Disponível'}
                                                </p>
                                            </div>
                                        </div>

                                        {coupon.maxUses && (
                                            <div className="mt-4">
                                                <div className="w-full h-2 bg-gray-100 rounded-full overflow-hidden">
                                                    <div
                                                        className={`h-full transition-all ${usagePercent >= 100 ? 'bg-red-500' : usagePercent >= 80 ? 'bg-orange-500' : 'bg-blue-500'
                                                            }`}
                                                        style={{ width: `${Math.min(usagePercent, 100)}%` }}
                                                    />
                                                </div>
                                            </div>
                                        )}
                                    </div>

                                    {/* Actions */}
                                    <div className="flex md:flex-col gap-2">
                                        <button
                                            onClick={() => coupon.id && onToggleActive(coupon.id, !coupon.isActive)}
                                            className={`p-3 rounded-xl transition-all ${coupon.isActive
                                                    ? 'bg-emerald-100 text-emerald-600 hover:bg-emerald-200'
                                                    : 'bg-gray-100 text-gray-400 hover:bg-gray-200'
                                                }`}
                                            title={coupon.isActive ? 'Desativar' : 'Ativar'}
                                        >
                                            {coupon.isActive ? <ToggleRight size={20} /> : <ToggleLeft size={20} />}
                                        </button>
                                        <button
                                            onClick={() => handleEdit(coupon)}
                                            className="p-3 bg-blue-100 text-blue-600 rounded-xl hover:bg-blue-200 transition-all"
                                            title="Editar"
                                        >
                                            <Edit2 size={20} />
                                        </button>
                                        <button
                                            onClick={() => coupon.id && confirm('Deseja realmente excluir este cupom?') && onDelete(coupon.id)}
                                            className="p-3 bg-red-100 text-red-600 rounded-xl hover:bg-red-200 transition-all"
                                            title="Excluir"
                                        >
                                            <Trash2 size={20} />
                                        </button>
                                    </div>
                                </div>
                            </div>
                        );
                    })
                )}
            </div>
        </div>
    );
};
