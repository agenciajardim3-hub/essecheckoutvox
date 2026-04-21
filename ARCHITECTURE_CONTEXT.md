# ARCHITECTURE_CONTEXT.md

## CheckoutVox - Contexto Arquitetural e Fluxo de Dados

Este documento descreve a arquitetura do CheckoutVox, como ele se integra ao Supabase, e o fluxo de dados entre frontend e backend.

---

## 1. Visão Geral da Arquitetura

```
┌─────────────────────────────────────────────────────────────┐
│                      BROWSER / APP                          │
├─────────────────────────────────────────────────────────────┤
│  CheckoutVox (React + TypeScript + Vite)                    │
│  ├── Cliente Checkout (src/components/client/)             │
│  │   └── Fluxo: Landing → Form → Pagamento → Sucesso      │
│  ├── Dashboard Admin (src/components/dashboard/)          │
│  │   └── Gestão de leads, tickets, check-in, financeiro    │
│  └── Autenticação (src/components/auth/)                   │
├─────────────────────────────────────────────────────────────┤
│                      SUPABASE                              │
│  ├── Realtime Database (PostgreSQL)                        │
│  ├── Auth (autenticação admin)                           │
│  └── Edge Functions (Mercado Pago webhook)                │
├─────────────────────────────────────────────────────────────┤
│                    INTEGRAÇÕES                            │
│  ├── Mercado Pago (pagamentos)                            │
│  ├── Evolution API (futuro: WhatsApp)                    │
│  └── Make/Zapier (webhooks externos)                      │
└─────────────────────────────────────────────────────────────┘
```

---

## 2. Estrutura de Pastas

```
src/
├── components/
│   ├── ui/
│   │   └── Input.tsx              # Input reutilizável com máscaras
│   ├── client/                    # Checkout público
│   │   ├── ClientView.tsx         # View principal do checkout
│   │   ├── CheckoutForm.tsx        # Formulário de inscrição
│   │   ├── ThankYouPage.tsx       # Página de sucesso
│   │   ├── RegistrationSuccess.tsx # Confirmação com ticket
│   │   └── SolicitacaoFormPage.tsx # Solicitar certificado
│   ├── dashboard/                # Painel administrativo
│   │   ├── Dashboard.tsx          # Container principal (lazy)
│   │   ├── OverviewDashboard.tsx # Métricas gerais
│   │   ├── LeadsReport.tsx        # Gestão de leads
│   │   ├── FinancialDashboard.tsx # Finanças
│   │   ├── CheckInDashboard.tsx   # Sistema de check-in
│   │   ├── TicketScanner.tsx      # Scanner QR code
│   │   ├── TicketGenerator.tsx    # Gerador de tickets
│   │   ├── TicketSender.tsx        # Envio de tickets
│   │   ├── CouponManager.tsx     # Cupons de desconto
│   │   ├── ProductConfig.tsx       # Configuração de produtos
│   │   ├── GlobalSettings.tsx     # Configurações globais
│   │   ├── IntegrationsStatus.tsx # Status de integrações
│   │   ├── CertificateGenerator.tsx
│   │   ├── CertificateSender.tsx
│   │   ├── RemarketingDashboard.tsx
│   │   ├── EmailMarketingDashboard.tsx
│   │   ├── TurmasDashboard.tsx
│   │   ├── SupportMaterials.tsx
│   │   ├── ExpenseManager.tsx
│   │   ├── SignatureManager.tsx
│   │   ├── SolicitacoesDashboard.tsx
│   │   ├── TicketLogs.tsx
│   │   └── CheckoutViews.tsx
│   ├── auth/
│   │   └── LoginPage.tsx         # Login administrativo
│   └── ErrorBoundary.tsx         # Tratamento de erros
├── hooks/
│   ├── useSupabase.ts           # Cliente Supabase
│   ├── useNotifications.ts     # Notificações locais
│   └── usePullToRefresh.ts     # Pull-to-refresh mobile
├── types/
│   └── index.ts                # Interfaces TypeScript
supabase/
├── leads_schema.sql            # Schema da tabela leads
├── full_schema.sql             # Schema completo
└── functions/                 # Edge functions
    └── mp-create-preference/  # Mercado Pago integration
sql/
├── migrations/                # Migrations incrementais
│   ├── add_payer_fields.sql
│   ├── add_submitted_at.sql
│   └── add_variations_column.sql
├── add_features.sql           # Novos features
├── checkout_views.sql          # Views de checkout
└── fix_schema.sql            # Correções de schema
```

---

## 3. Fluxo de Dados - Checkout Público

### 3.1 Fluxo Completo

```
1. Cliente acessa URL com ?checkout=ID ou ?slug=SLUG
   ↓
2. ClientView carrega AppConfig do Supabase
   ↓
3. Exibe landing page com produto, preço, benefícios
   ↓
4. Cliente preenche CheckoutForm (múltiplos participantes)
   ↓
5. Validação de campos (nome, email, CPF, etc.)
   ↓
6. Inserção do lead no Supabase
   → POST /leads
   ↓
7. Redirecionamento para Mercado Pago
   → Link de pagamento ou API
   ↓
8. Webhook (Mercado Pago) atualiza status do lead
   ↓
9. Página de sucesso (ThankYouPage)
   → Mensagem + botão de ação configurável
```

### 3.2 Query Params (Rotas)

| Parâmetro | Uso |
|-----------|-----|
| `?checkout=ID` | Carrega produto por ID |
| `?slug=SLUG` | Carrega produto por slug |
| `?mode=dashboard` | Abre painel admin |
| `?mode=admin` | Alias para dashboard |
| `?lead=ID` | Exibe lead específico |
| `?qr=CODE` | Scanner de ticket |

---

## 4. Integração com Supabase

### 4.1 Cliente Supabase

```typescript
// src/hooks/useSupabase.ts
import { createClient } from '@supabase/supabase-js';

const supabase = createClient(
  import.meta.env.VITE_SUPABASE_URL,
  import.meta.env.VITE_SUPABASE_KEY
);
```

### 4.2 Queries Principais

```typescript
// Buscar configuração de checkout
const { data: config } = await supabase
  .from('checkouts')
  .select('*')
  .eq('id', checkoutId)
  .single();

// Buscar leads com filtros
const { data: leads } = await supabase
  .from('leads')
  .select('*')
  .eq('product_id', productId)
  .order('created_at', { ascending: false });

// Inserir novo lead
const { data: newLead, error } = await supabase
  .from('leads')
  .insert([leadData])
  .select()
  .single();
```

### 4.3 Realtime Subscription

```typescript
const channel = supabase
  .channel('leads-realtime')
  .on('postgres_changes', {
    event: 'INSERT',
    schema: 'public',
    table: 'leads'
  }, (payload) => {
    setLeads(prev => [...prev, payload.new]);
  })
  .subscribe();
```

---

## 5. Integração com Antigravity (Futuro)

> **Nota**: A integração com Antigravity/Evolution API para WhatsApp está planejada mas não implementada.

### 5.1 Fluxo Planejado

```
CheckoutVox                    Antigravity
    │                               │
    ├── POST webhook (Make/Zapier) ─┤
    │                               │
    │                               ├── Evolution API
    │                               │      │
    │                               │   WhatsApp
    │                               │      │
    │◄── Confirmação ───────────────┤
```

### 5.2 Webhook URL

O `AppConfig` contém `webhookUrl` para integração via Make/Zapier.

---

## 6. Integração com Mercado Pago

### 6.1 Edge Function

```typescript
// supabase/functions/mp-create-preference/index.ts
const MP_ACCESS_TOKEN = Deno.env.get('MP_ACCESS_TOKEN');

const response = await fetch('https://api.mercadopago.com/checkout/preferences', {
  method: 'POST',
  headers: {
    'Authorization': `Bearer ${MP_ACCESS_TOKEN}`,
    'Content-Type': 'application/json'
  },
  body: JSON.stringify({
    items: [{ title: productName, quantity: 1, unit_price: price }],
    back_urls: { success: returnUrl }
  })
});
```

### 6.2 Configurações por Produto

```typescript
interface AppConfig {
  mercadoPagoLink: string;  // Link direto de pagamento
  useMpApi?: boolean;       // Usar API ou link direto
  webhookUrl?: string;      // Callback para atualizações
}
```

---

## 7. Autenticação Admin

### 7.1 Fluxo

```
1. LoginPage (/admin)
   ↓
2. Credenciais verificadas contra Supabase Auth
   ↓
3. Session armazenada
   ↓
4. Dashboard carregado
   ↓
5. Logout limpa sessão
```

### 7.2 Roles

```typescript
type UserRole = 'none' | 'master' | 'manager';
```

---

## 8. Mercado Pago Flow

```
┌─────────┐      ┌──────────────┐      ┌─────────────┐
│Cliente  │      │  CheckoutVox │      │Mercado Pago │
└────┬────┘      └──────┬───────┘      └──────┬──────┘
     │                    │                     │
     │ CheckoutForm      │                     │
     │──────────────────►│                     │
     │                   │ Create Preference   │
     │                   │────────────────────►│
     │                   │                     │
     │  Preference URL   │◄────────────────────│
     │◄──────────────────│                     │
     │                   │                     │
     │ Redirect to MP    │                     │
     │───────────────────►│                     │
     │                   │                     │
     │ Payment Done      │                     │
     │◄──────────────────│                     │
     │                   │                     │
     │ Webhook (status)   │                     │
     │───────────────────────────────────────►│
     │                   │                     │
     │                   │ ThankYouPage        │
     │◄──────────────────│                     │
```

---

## 9. Mobile (Capacitor)

### 9.1 Estrutura

```
android/
├── app/
│   └── src/main/
│       └── assets/
│           └── public/
│               └── index.html  # Build do Vite
└── build.gradle
```

### 9.2 Notificações

```typescript
import { Notifications } from '@capacitor/local-notifications';

await Notifications.addListener('notificationReceived', (notification) => {
  // Trata notificação
});
```

---

## 10. Variáveis de Ambiente

```env
VITE_SUPABASE_URL=https://xxx.supabase.co
VITE_SUPABASE_KEY=xxx
VITE_MERCADO_PAGO_TOKEN=xxx  # Opcional
```

---

*Atualizado em: Abril 2026*