
import React, { useState } from 'react';
import { Check, X } from 'lucide-react';

interface InputProps {
  label: string;
  type: string;
  placeholder: string;
  value: string;
  onChange: (value: string) => void;
  required?: boolean;
  mask?: 'cpf' | 'phone' | 'none';
  autoComplete?: string;
  validate?: (value: string) => boolean;
}

export const Input: React.FC<InputProps> = ({
  label,
  type,
  placeholder,
  value,
  onChange,
  required = true,
  mask = 'none',
  autoComplete,
  validate
}) => {
  const [touched, setTouched] = useState(false);
  const isCheckoutFolderField = label === 'Pasta / Categoria';
  const displayLabel = isCheckoutFolderField ? 'Cidade / Bairro / Grupo / Pasta' : label;
  const displayPlaceholder = isCheckoutFolderField ? 'Ex: São Paulo / Tucuruvi / Julho 2026' : placeholder;
  const helpText = isCheckoutFolderField
    ? 'Use este campo para organizar a tela Checkouts por Cidade. Ex: Cidade / Bairro / Grupo.'
    : '';

  const formatValue = (val: string) => {
    if (mask === 'cpf') {
      return val
        .replace(/\D/g, '')
        .replace(/(\d{3})(\d)/, '$1.$2')
        .replace(/(\d{3})(\d)/, '$1.$2')
        .replace(/(\d{3})(\d{1,2})/, '$1-$2')
        .replace(/(-\d{2})\d+?$/, '$1');
    }
    if (mask === 'phone') {
      return val
        .replace(/\D/g, '')
        .replace(/(\d{2})(\d)/, '($1) $2')
        .replace(/(\d{5})(\d)/, '$1-$2')
        .replace(/(-\d{4})\d+?$/, '$1');
    }
    return val;
  };

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    onChange(formatValue(e.target.value));
  };

  const handleBlur = () => setTouched(true);

  // Default validators per mask/type
  const isValid = (): boolean => {
    if (!value) return false;
    if (validate) return validate(value);
    if (mask === 'cpf') return value.replace(/\D/g, '').length === 11;
    if (mask === 'phone') return value.replace(/\D/g, '').length >= 10;
    if (type === 'email') return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(value);
    return value.trim().length >= 2;
  };

  const valid = touched && value ? isValid() : null;

  return (
    <div className="space-y-1.5">
      <label className="block text-[11px] sm:text-[10px] font-black uppercase text-gray-500 tracking-[0.12em] sm:tracking-widest ml-1">
        {displayLabel}
      </label>
      <div className="relative">
        <input
          type={type}
          required={required}
          placeholder={displayPlaceholder}
          value={value}
          onChange={handleChange}
          onBlur={handleBlur}
          autoComplete={autoComplete}
          className={`w-full px-4 sm:px-5 py-3.5 sm:py-4 pr-12 rounded-2xl border-2 outline-none focus:ring-2 focus:border-transparent transition-all font-bold text-[16px] sm:text-base text-gray-700 bg-gray-50/50 hover:bg-white leading-normal ${
            valid === true
              ? 'border-emerald-400 focus:ring-emerald-400 bg-emerald-50/30'
              : valid === false
              ? 'border-red-300 focus:ring-red-400 bg-red-50/20'
              : 'border-gray-100 focus:ring-blue-500 hover:border-gray-200'
          }`}
        />
        {touched && value && (
          <div className={`absolute right-4 top-1/2 -translate-y-1/2 w-6 h-6 rounded-full flex items-center justify-center transition-all ${
            valid ? 'bg-emerald-500' : 'bg-red-400'
          }`}>
            {valid
              ? <Check size={13} className="text-white" strokeWidth={3} />
              : <X size={13} className="text-white" strokeWidth={3} />
            }
          </div>
        )}
      </div>
      {helpText && (
        <p className="text-[10px] font-bold text-blue-500 ml-1 leading-relaxed">
          {helpText}
        </p>
      )}
      {valid === false && touched && (
        <p className="text-[10px] font-bold text-red-500 ml-1 animate-in fade-in slide-in-from-top-1 duration-200">
          {mask === 'cpf' ? 'CPF incompleto (11 dígitos)'
            : mask === 'phone' ? 'Telefone incompleto'
            : type === 'email' ? 'E-mail inválido'
            : `${displayLabel} é obrigatório`}
        </p>
      )}
    </div>
  );
};