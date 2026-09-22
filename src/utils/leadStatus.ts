import { Lead } from '../types';

const CONFIRMED_PAYMENT_STATUSES = new Set(['pago', 'aprovado', 'approved', 'paid']);

export const isConfirmedPayment = (lead: Pick<Lead, 'status'> | null | undefined): boolean => {
  const status = String(lead?.status || '').trim().toLowerCase();
  return CONFIRMED_PAYMENT_STATUSES.has(status);
};
