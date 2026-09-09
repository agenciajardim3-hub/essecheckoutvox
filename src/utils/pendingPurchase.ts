// Guarda os dados reais da compra entre o checkout e a página de obrigado.
// Antes disso a ThankYouPage usava o preço unitário do config, ignorando quantidade
// e cupom — e refazia o Purchase a cada reload da URL ?success=true.

export interface PendingPurchase {
  eventId: string;
  checkoutId: string;
  productName: string;
  value: number;
  quantity: number;
  currency: string;
  couponCode?: string;
  createdAt: number;
}

const STORAGE_KEY = 'vox_pending_purchase';
const TTL_MS = 6 * 60 * 60 * 1000; // 6h cobre boleto/PIX pago na mesma sessão

export const savePendingPurchase = (purchase: Omit<PendingPurchase, 'createdAt'>): void => {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify({ ...purchase, createdAt: Date.now() }));
  } catch {
    // localStorage indisponível (aba anônima com storage bloqueado) — o Purchase ainda sai pela CAPI.
  }
};

export const readPendingPurchase = (): PendingPurchase | null => {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return null;
    const parsed = JSON.parse(raw) as PendingPurchase;
    if (!parsed?.eventId || Date.now() - parsed.createdAt > TTL_MS) {
      localStorage.removeItem(STORAGE_KEY);
      return null;
    }
    return parsed;
  } catch {
    return null;
  }
};

/** Lê e apaga: garante que um reload da página de obrigado não conte a venda de novo. */
export const consumePendingPurchase = (): PendingPurchase | null => {
  const purchase = readPendingPurchase();
  try {
    localStorage.removeItem(STORAGE_KEY);
  } catch {
    // ignora
  }
  return purchase;
};
