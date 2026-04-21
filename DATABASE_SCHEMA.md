# DATABASE_SCHEMA.md

## CheckoutVox - Schema do Supabase

Este documento mapeia todas as tabelas do Supabase utilizadas pelo CheckoutVox, seus relacionamentos e tipos de dados.

---

## 1. Visão Geral das Tabelas

```
┌─────────────────────────────────────────────────────────────┐
│                      SUPABASE                               │
├─────────────────────────────────────────────────────────────┤
│  leads ─────────────┬──► checkouts (product_id)            │
│                     │                                     │
│  coupons ───────────┬│                                     │
│                    ││                                     │
│  expenses ────────┘│                                     │
│                    │                                     │
│  form_requests ────┤                                     │
│                    │                                     │
│  checkout_views ───┘                                     │
│                                                             │
│  daily_checkins ──── (check-in diário)                      │
│  signature_templates ── (templates de assinatura)       │
│  support_materials ── (materiais de apoio)                │
│  saved_arts ────────── (assets de marketing)                │
└─────────────────────────────────────────────────────────────┘
```

---

## 2. Tabela: LEADS

**Propósito**: Armazena dados dos clientes que se inscrevem no checkout.

### Estrutura

```sql
CREATE TABLE leads (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL,
  email TEXT,
  phone TEXT,
  city TEXT,
  cpf TEXT,
  date TEXT,
  product_id TEXT,
  product_name TEXT,
  turma TEXT,
  submitted_at TIMESTAMPTZ DEFAULT NOW(),
  created_at TIMESTAMPTZ DEFAULT NOW(),
  status TEXT DEFAULT 'Novo',
  paid_amount NUMERIC DEFAULT 0,
  payment_method TEXT,
  checked_in BOOLEAN DEFAULT FALSE,
  checked_in_at TIMESTAMPTZ,
  utm_source TEXT,
  utm_medium TEXT,
  utm_campaign TEXT,
  payer_name TEXT,
  payer_email TEXT,
  payer_phone TEXT,
  payer_document TEXT,
  source TEXT DEFAULT 'checkout',
  ticket_generated BOOLEAN DEFAULT FALSE,
  group_link TEXT,
  coupon_code TEXT,
  emitted_by TEXT,
  emission_date TIMESTAMPTZ DEFAULT NOW()
);
```

### Campos Detalhados

| Campo | Tipo | Obrigatório | Descrição |
|-------|------|-------------|-----------|
| `id` | UUID | Sim | Chave primária |
| `name` | TEXT | Sim | Nome do cliente |
| `email` | TEXT | Não | Email |
| `phone` | TEXT | Não | Telefone |
| `city` | TEXT | Não | Cidade |
| `cpf` | TEXT | Não | CPF |
| `date` | TEXT | Não | Data de nascimento/cadastro |
| `product_id` | TEXT | Não | ID do produto/evento |
| `product_name` | TEXT | Não | Nome do produto |
| `turma` | TEXT | Não | Turma/turno |
| `submitted_at` | TIMESTAMPTZ | Auto | Timestamp de submissão |
| `created_at` | TIMESTAMPTZ | Auto | Timestamp de criação |
| `status` | TEXT | Sim | Status do lead |
| `paid_amount` | NUMERIC | Não | Valor pago |
| `payment_method` | TEXT | Não | Forma de pagamento |
| `checked_in` | BOOLEAN | Não | Se fez check-in |
| `checked_in_at` | TIMESTAMPTZ | Não | Timestamp do check-in |
| `utm_source` | TEXT | Não | Fonte UTM |
| `utm_medium` | TEXT | Não | Medium UTM |
| `utm_campaign` | TEXT | Não | Campaign UTM |
| `payer_name` | TEXT | Não | Nome do pagador |
| `payer_email` | TEXT | Não | Email do pagador |
| `payer_phone` | TEXT | Não | Telefone do pagador |
| `payer_document` | TEXT | Não | Documento do pagador |
| `source` | TEXT | Não | Origem (checkout/autoregistro/manual) |
| `ticket_generated` | BOOLEAN | Não | Se ticket foi gerado |
| `group_link` | TEXT | Não | Link do grupo |
| `coupon_code` | TEXT | Não | Cupom utilizado |
| `emitted_by` | TEXT | Não | Quem emitiu (admin) |
| `emission_date` | TIMESTAMPTZ | Não | Data de emissão |

### Status Possíveis

```typescript
type LeadStatus = 'Novo' | 'Pago' | 'Pendente' | 'Sinal' | 'Pagar no dia' | 'Aprovado' | 'Cancelado' | 'Devolvido' | 'Abandonado';
```

### Source Possíveis

```typescript
type LeadSource = 'autoregistro' | 'checkout' | 'manual';
```

### Payment Method Possíveis

```typescript
type PaymentMethod = 'Pix' | 'Cartão' | 'Boleto' | 'Dinheiro' | 'Outro';
```

---

## 3. Tabela: CHECKOUTS (AppConfig)

**Propósito**: Configurações de cada checkout/produto.

> **Nota**: Esta tabela é gerida via interface `AppConfig` no frontend.

### Estrutura (via interface)

```typescript
interface AppConfig {
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
  webhookUrl?: string;
  maxVagas?: number;
  useMpApi?: boolean;
  ticketAmount?: number;
  thankYouTitle?: string;
  thankYouSubtitle?: string;
  thankYouMessage?: string;
  thankYouButtonText?: string;
  thankYouButtonUrl?: string;
  thankYouImageUrl?: string;
  variations?: ProductVariation[];
  emitted_by?: string;
  emission_date?: string;
  folder?: string;
}
```

### Campos Adicionais via SQL

```sql
ALTER TABLE checkouts ADD COLUMN IF NOT EXISTS event_date TEXT;
ALTER TABLE checkouts ADD COLUMN IF NOT EXISTS event_start_time TEXT;
ALTER TABLE checkouts ADD COLUMN IF NOT EXISTS event_end_time TEXT;
ALTER TABLE checkouts ADD COLUMN IF NOT EXISTS event_location TEXT;
ALTER TABLE checkouts ADD COLUMN IF NOT EXISTS folder TEXT;
ALTER TABLE checkouts ADD COLUMN IF NOT EXISTS emitted_by TEXT;
ALTER TABLE checkouts ADD COLUMN IF NOT EXISTS emission_date TIMESTAMPTZ;
ALTER TABLE checkouts ADD COLUMN IF NOT EXISTS variations JSONB;
```

---

## 4. Tabela: COUPONS

**Propósito**: Cupons de desconto para checkout.

### Estrutura

```sql
CREATE TABLE coupons (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  code TEXT NOT NULL UNIQUE,
  discount_type TEXT DEFAULT 'percentage',
  discount_value NUMERIC NOT NULL,
  max_uses INTEGER,
  current_uses INTEGER DEFAULT 0,
  product_id TEXT,
  is_active BOOLEAN DEFAULT TRUE,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  expires_at TIMESTAMPTZ
);
```

### Campos Detalhados

| Campo | Tipo | Obrigatório | Descrição |
|-------|------|-------------|-----------|
| `id` | UUID | Sim | Chave primária |
| `code` | TEXT | Sim | Código do cupom (único) |
| `discount_type` | TEXT | Sim | Tipo: 'percentage' ou 'fixed' |
| `discount_value` | NUMERIC | Sim | Valor do desconto |
| `max_uses` | INTEGER | Não | Limite de usos |
| `current_uses` | INTEGER | Não | Usos atuais |
| `product_id` | TEXT | Não | Produto específico (null = todos) |
| `is_active` | BOOLEAN | Sim | Se está ativo |
| `created_at` | TIMESTAMPTZ | Auto | Data de criação |
| `expires_at` | TIMESTAMPTZ | Não | Data de expiração |

---

## 5. Tabela: EXPENSES

**Propósito**: Controle de despesas do projeto.

### Estrutura

```sql
CREATE TABLE expenses (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  description TEXT NOT NULL,
  amount NUMERIC NOT NULL,
  category TEXT DEFAULT 'material',
  date DATE DEFAULT CURRENT_DATE,
  created_at TIMESTAMPTZ DEFAULT NOW()
);
```

### Campos Detalhados

| Campo | Tipo | Obrigatório | Descrição |
|-------|------|-------------|-----------|
| `id` | UUID | Sim | Chave primária |
| `description` | TEXT | Sim | Descrição da despesa |
| `amount` | NUMERIC | Sim | Valor |
| `category` | TEXT | Sim | Categoria |
| `date` | DATE | Sim | Data |
| `created_at` | TIMESTAMPTZ | Auto | Data de criação |

### Categorias Possíveis

```typescript
type ExpenseCategory = 'material' | 'equipamento' | 'marketing' | 'infraestrutura' | 'servico' | 'outro';
```

---

## 6. Tabela: FORM_REQUESTS

**Propósito**: Solicitações de certificado.

### Estrutura

```sql
CREATE TABLE form_requests (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  full_name TEXT NOT NULL,
  participation_date DATE NOT NULL,
  whatsapp TEXT NOT NULL,
  email TEXT NOT NULL,
  certificate_url TEXT,
  status TEXT DEFAULT 'pendente',
  course_name TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW()
);
```

### Campos Detalhados

| Campo | Tipo | Obrigatório | Descrição |
|-------|------|-------------|-----------|
| `id` | UUID | Sim | Chave primária |
| `full_name` | TEXT | Sim | Nome completo |
| `participation_date` | DATE | Sim | Data de participação |
| `whatsapp` | TEXT | Sim | WhatsApp |
| `email` | TEXT | Sim | Email |
| `certificate_url` | TEXT | Não | URL do certificado |
| `status` | TEXT | Sim | Status |
| `course_name` | TEXT | Não | Nome do curso |
| `created_at` | TIMESTAMPTZ | Auto | Data de criação |

### Status Possíveis

```typescript
type FormRequestStatus = 'pendente' | 'enviado_whatsapp' | 'enviado_email' | 'concluido' | 'certificado_salvo';
```

---

## 7. Tabela: CHECKOUT_VIEWS

**Propósito**: Rastrear visualizações de checkout.

### Estrutura

```sql
CREATE TABLE checkout_views (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  checkout_id TEXT NOT NULL,
  checkout_slug TEXT,
  viewed_at TIMESTAMPTZ DEFAULT NOW(),
  utm_source TEXT,
  utm_medium TEXT,
  utm_campaign TEXT,
  referrer TEXT,
  device_type TEXT
);
```

---

## 8. Tabela: DAILY_CHECKINS

**Propósito**: Check-ins do dia.

> Estrutura similar a `leads` com foco em check-in diário.

---

## 9. Relacionamentos

```
leads.product_id ──────► checkouts.id
leads.coupon_code ────► coupons.code
leads.product_id ──────► coupons.product_id (nullable)
```

---

## 10. Consultas Comuns

### Buscar Leads por Produto

```typescript
const { data } = await supabase
  .from('leads')
  .select('*')
  .eq('product_id', productId)
  .order('created_at', { ascending: false });
```

### Buscar Leads por Status

```typescript
const { data } = await supabase
  .from('leads')
  .select('*')
  .eq('status', 'Pago')
  .eq('checked_in', false);
```

### Validar Cupom

```typescript
const { data: coupon } = await supabase
  .from('coupons')
  .select('*')
  .eq('code', code)
  .eq('is_active', true)
  .single();
```

### Calcular Receita

```typescript
const { data } = await supabase
  .from('leads')
  .select('paid_amount')
  .eq('status', 'Pago');
const total = data.reduce((sum, lead) => sum + (lead.paid_amount || 0), 0);
```

---

*Atualizado em: Abril 2026*