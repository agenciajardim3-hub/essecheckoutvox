
import React from 'react';

interface InputProps {
  label: string;
  type: string;
  placeholder: string;
  value: string;
  onChange: (value: string) => void;
  required?: boolean;
  mask?: 'cpf' | 'phone' | 'none';
}

export const Input: React.FC<InputProps> = ({
  label,
  type,
  placeholder,
  value,
  onChange,
  required = true,
  mask = 'none'
}) => {
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

  return (
    <div className="space-y-1.5">
      <label className="block text-[10px] font-black uppercase text-gray-500 tracking-widest ml-1">
        {label}
      </label>
      <input
        type={type}
        required={required}
        placeholder={placeholder}
        value={value}
        onChange={handleChange}
        className="w-full px-5 py-4 rounded-2xl border-2 border-gray-100 outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all font-bold text-gray-700 bg-gray-50/50 hover:bg-white hover:border-gray-200"
      />
    </div>
  );
};
