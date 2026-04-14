export interface CustomerData {
  name: string;
  email: string;
  phone: string;
  city: string;
  cpf: string;
}

export interface Lead extends CustomerData {
  date: string;
  id: string;
  product_id?: string;
  product_name?: string;
  turma?: string;
  submitted_at?: string;
  utmSource?: string;
  utmMedium?: string;
  utmCampaign?: string;
  status?: 'Novo' | 'Pago' | 'Pendente' | 'Sinal' | 'Pagar no dia' | 'Aprovado' | 'Cancelado' | 'Devolvido' | 'Abandonado';
  paid_amount?: number;
  payment_method?: 'Pix' | 'Cartão' | 'Boleto' | 'Dinheiro' | 'Outro';
  payment_location?: string;
  created_at?: string;
  checked_in?: boolean;
  checked_in_at?: string;
  payer_name?: string;
  payer_email?: string;
  payer_phone?: string;
  payer_document?: string;
  source?: 'autoregistro' | 'checkout' | 'manual';
  ticket_generated?: boolean;
  group_link?: string;
  coupon_code?: string;
  time?: string;
  emitted_by?: string;
  emission_date?: string;
}

export interface Expense {
  id?: string;
  description: string;
  amount: number;
  category: 'material' | 'equipamento' | 'marketing' | 'infraestrutura' | 'servico' | 'outro';
  date: string;
  created_at?: string;
}

export interface FormRequest {
  id?: string;
  full_name: string;
  participation_date: string;
  whatsapp: string;
  email: string;
  certificate_url?: string;
  status?: 'pendente' | 'enviado_whatsapp' | 'enviado_email' | 'concluido' | 'certificado_salvo';
  course_name?: string;
  created_at?: string;
}

export type UserRole = 'none' | 'master' | 'manager';

export interface ProductVariation {
  id: string;
  name: string;
  price: string;
  slug: string;
  mercadoPagoLink?: string; // Optional override
  useMpApi?: boolean; // Optional override
  ticketAmount?: number; // How many tickets this variation represents (e.g. 5 for a table)
}

export interface AppConfig {
  id: string;
  mercadoPagoLink: string;
  productName: string;
  productPrice: string;
  productImage: string;
  bannerImage: string;
  productDescription: string;
  benefits: string[];
  turma?: string;
  eventDate?: string;
  eventStartTime?: string;
  eventEndTime?: string;
  eventLocation?: string;
  ga4Id?: string;
  metaPixelId?: string;
  isActive?: boolean;
  slug?: string;
  webhookUrl?: string; // URL para disparo no Make/Zapier
  maxVagas?: number;
  useMpApi?: boolean;
  ticketAmount?: number; // For main product if needed, though usually 1
  // Thank You Page
  thankYouTitle?: string;
  thankYouSubtitle?: string;
  thankYouMessage?: string;
  thankYouButtonText?: string;
  thankYouButtonUrl?: string;
  thankYouImageUrl?: string;
  // Variations
  variations?: ProductVariation[];
  // Emitente info
  emitted_by?: string;
  emission_date?: string;
  // Folder/Category
  folder?: string;
}

export interface MultiTicketPurchase {
  participants: CustomerData[];
  totalAmount: number;
  quantity: number;
  responsibleIndex: number; // Index of the main buyer (usually 0)
  abandonedLeadId?: string; // ID if resuming from abandoned cart
}

export interface Coupon {
  id?: string;
  code: string;
  discountType: 'percentage' | 'fixed';
  discountValue: number;
  maxUses?: number;
  currentUses: number;
  productId?: string; // null/undefined = works on all products
  isActive: boolean;
  createdAt?: string;
  expiresAt?: string;
}
