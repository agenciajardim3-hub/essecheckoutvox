# Prompt para IA Explicar o CheckoutVox

Copie e cole este prompt na IA de sua escolha:

---

## 📋 Prompt

```
Você é um desenvolvedor sênior especialista em React, TypeScript, Supabase e sistemas de checkout. Vou te dar o contexto completo do meu projeto CheckoutVox e preciso que você entenda como ele funciona para me ajudar com futuras implementações.

## Stack Tecnológica

- **Frontend**: React 19 + TypeScript + Vite
- **UI**: Tailwind CSS + Lucide React Icons
- **Database**: Supabase (PostgreSQL)
- **Mobile**: Capacitor (Android APK)
- **Charts**: Recharts

## Estrutura de Pastas

src/
├── components/
│   ├── ui/           # Componentes reutilizáveis (Input.tsx)
│   ├── client/       # Checkout público (ClientView, CheckoutForm, ThankYouPage)
│   ├── dashboard/    # Painel administrativo (Dashboard, LeadsReport, Financial, etc.)
│   └── auth/         # Login administrativo
├── hooks/           # Custom hooks (useSupabase, useNotifications)
├── types/            # Interfaces TypeScript (Lead, AppConfig, Coupon, etc.)
└── supabase/        # Schemas do banco

## Fluxo Principal do Checkout

1. Cliente acessa URL com ?checkout=ID ou ?slug=SLUG
2. ClientView carrega AppConfig do Supabase (produto, preço, benefícios)
3. Cliente preenche CheckoutForm (nome, email, telefone, CPF, cidade)
4. Sistema insere lead na tabela 'leads'
5. Redirect para Mercado Pago (link direto ou API)
6. Webhook atualiza status do lead quando pago
7. ThankYouPage exibe mensagem de sucesso

## Banco de Dados (Supabase)

### Tabela: LEADS
- id, name, email, phone, city, cpf
- product_id, product_name, turma
- status (Novo, Pago, Pendente, Cancelado...)
- paid_amount, payment_method
- checked_in, checked_in_at
- utm_source, utm_medium, utm_campaign
- payer_name, payer_email, payer_phone, payer_document
- ticket_generated, group_link, coupon_code

### Tabela: CHECKOUTS (AppConfig)
- id, produto, preco, imagem, banner
- benefits[], turma, eventDate, eventLocation
- mercadoPagoLink, webhookUrl
- variations[] (pacotes com preços diferentes)
- thankYouTitle, thankYouMessage, thankYouButtonUrl

### Tabela: COUPONS
- code, discount_type (percentage/fixed), discount_value
- max_uses, current_uses, is_active

### Tabela: EXPENSES
- description, amount, category, date

### Tabela: FORM_REQUESTS
- full_name, participation_date, whatsapp, email
- certificate_url, status

## Integrações

1. **Mercado Pago**: Link de pagamento ou API Preference
2. **Supabase Realtime**: Escuta INSERT na tabela leads
3. **Make/Zapier**: Webhook configurável via AppConfig.webhookUrl

## Tipos TypeScript Principais

interface Lead {
  name: string;
  email: string;
  phone: string;
  city: string;
  cpf: string;
  product_id?: string;
  status?: 'Novo' | 'Pago' | 'Pendente' | 'Cancelado'...;
  paid_amount?: number;
  payment_method?: 'Pix' | 'Cartão' | 'Boleto' | 'Dinheiro';
}

interface AppConfig {
  id: string;
  productName: string;
  productPrice: string;
  benefits: string[];
  mercadoPagoLink: string;
  useMpApi?: boolean;
  variations?: ProductVariation[];
}

## Query Params do Checkout

- ?checkout=ID        → Carrega produto por ID
- ?slug=SLUG          → Carrega produto por slug
- ?mode=dashboard      → Painel admin
- ?lead=ID           → Exibe lead específico
- ?qr=CODE           → Scanner de ticket

## Regras de Código

- TypeScript strict, SEMPRE use interfaces (nunca any)
- try-catch em todas operações async
- Validação no frontend ANTES de enviar ao banco
- console.error para logs de erro

## Pergunta

[INSIRA SUA PERGUNTA AQUI]
```

---

Este prompt contém todo o contexto necessário para outra IA entender o sistema. É só copiar e colar.