# 🏛️ Vox Control - Architecture Context

## Sistema: CRM Educacional

**Vox Control** é uma plataforma de gestão completa para eventos e cursos educacionais, desenvolvida para gerenciar desde a venda de ingressos até a presença física em aulas.

## Arquitetura Geral

```
┌─────────────────────────────────────────────────────────┐
│                   FRONTEND (React + TS)                  │
│  Dashboard Master → Vendas, Turmas, Check-in, Ingressos │
│                    (Tailwind CSS + Lucide Icons)         │
└──────────────────────┬──────────────────────────────────┘
                       │
         ┌─────────────┼─────────────┐
         ▼             ▼             ▼
    ┌─────────┐   ┌──────────┐  ┌──────────┐
    │ Supabase│   │Antigravity│  │Evolution │
    │   DB    │   │  (Infra)  │  │  (WhatsApp)
    └─────────┘   └──────────┘  └──────────┘
```

## Módulos Principais

### 1. **Vendas** (LeadsReportV2)
- Relatório completo de leads/vendas
- Filtros por produto, status, data
- Edição inline de "Pago por" e "Onde foi pago"
- Busca por CPF, Email, Telefone
- Export CSV
- Integração com Mercado Pago (Pagamentos)

### 2. **Gestão de Turmas** (TurmasDashboard)
- Criação e edição de turmas
- Associação de datas, horários, locais
- Localidades: Limeira, Indaiatuba, São Paulo
- Limite de vagas (maxVagas)

### 3. **Check-in de Presença** (CheckInDashboard)
- Verificação de presença por CPF
- Integração com QR Code Scanner
- Status bidimensional: checked_in (boolean) e timestamp

### 4. **Controle de Ingressos** (TicketGenerator, TicketSender)
- Geração de ingressos únicos por CPF
- Emissão via PDF
- Envio por Email (Hostinger SMTP)
- Log de emissões

### 5. **Remarketing** (RemarketingDashboard)
- Segmentação por status (Pago, Pendente, Abandonado)
- Email marketing automático
- WhatsApp via Evolution API

### 6. **Financeiro** (FinancialDashboard)
- Receita total
- Taxa de conversão
- Despesas por categoria
- Relatórios por período

## Fluxo de Dados

```
Checkout Form (Cliente)
    ↓
Supabase leads table (INSERT)
    ↓
Webhook Supabase → Stripe/Mercado Pago (pagamento)
    ↓
Webhook → Atualiza status 'Pago' (OBJETIVO: 100% automático)
    ↓
Relatório Vendas (Master vê status)
    ↓
Envio Automático: Ingressos (Email) + WhatsApp
```

## Integrações Externas

| Serviço | Função | Status |
|---------|--------|--------|
| **Supabase** | Database + Auth + Functions | ✅ Ativo |
| **Antigravity** | Infra/Hosting | ✅ Ativo |
| **Evolution API** | WhatsApp automatizado | ✅ Ativo |
| **Mercado Pago** | Pagamentos | ✅ Ativo |
| **Hostinger Email** | SMTP para envio | ✅ Ativo |
| **Google Analytics** | Tracking | ✅ Ativo |
| **Meta Pixel** | Remarketing | ✅ Ativo |

## Stack Técnico

- **Frontend**: React 18 + TypeScript + Tailwind CSS
- **UI Components**: Lucide React (ícones)
- **Backend**: Supabase (PostgreSQL + Edge Functions)
- **Auth**: Supabase Auth (JWT)
- **Estado**: React Hooks (useState, useMemo)
- **Storage**: localStorage (preferências de usuário)
- **Deployment**: Antigravity (Docker + Node.js)

## Conceitos-Chave

### Papéis de Usuário
- **master**: Acesso total, pode editar leads, enviar emails, ver financeiro
- **manager**: Acesso limitado (ex: apenas check-in)
- **none**: Sem acesso ao dashboard

### Status de Venda
- **Novo**: Lead recém-criado
- **Pago**: Pagamento confirmado
- **Pendente**: Aguardando pagamento
- **Sinal**: Pagamento parcial
- **Pagar no dia**: Deve pagar no evento
- **Aprovado**: Validado
- **Cancelado**: Descartado
- **Devolvido**: Reembolso processado
- **Abandonado**: Nunca finalizou checkout

### Método de Pagamento
- Pix
- Cartão
- Boleto
- Dinheiro
- Outro

### Localidades
- Limeira
- Indaiatuba
- São Paulo

---

**Última atualização**: 2026-04-21  
**Mantido por**: Claude AI
