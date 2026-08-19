import React from 'react';
import { ShieldCheck } from 'lucide-react';
import { PRIVACY_POLICY_URL, TERMS_OF_USE_URL } from '../../constants/legal';

interface LegalFooterProps {
    /** 'card' desenha um bloco cinza; 'plain' mantém apenas o texto */
    variant?: 'card' | 'plain';
    /** Texto de abertura antes dos links legais */
    label?: string;
    className?: string;
}

export const LegalFooter: React.FC<LegalFooterProps> = ({
    variant = 'plain',
    label = 'Seus dados são tratados conforme a LGPD.',
    className = ''
}) => (
    <div
        className={`flex items-start justify-center gap-2 ${
            variant === 'card' ? 'bg-gray-50 border border-gray-100 rounded-xl p-3' : 'pt-1'
        } ${className}`}
    >
        <ShieldCheck size={13} className="text-gray-400 shrink-0 mt-px" />
        <p className="text-[10px] text-gray-400 font-bold leading-relaxed">
            {label}{' '}
            Consulte os{' '}
            <a
                href={TERMS_OF_USE_URL}
                target="_blank"
                rel="noopener noreferrer"
                className="text-blue-600 hover:underline"
            >
                Termos de Uso
            </a>{' '}
            e a{' '}
            <a
                href={PRIVACY_POLICY_URL}
                target="_blank"
                rel="noopener noreferrer"
                className="text-blue-600 hover:underline"
            >
                Política de Privacidade
            </a>
            .
        </p>
    </div>
);
