# 📘 Vox Control & Vox Turmas OS — Manual Mestre de Arquitetura e Implantação

> **Status:** Em Implantação (Branch `homologacao`)  
> **Repositório:** `agenciajardim3-hub/essecheckoutvox`  
> **Commit Base de Produção:** `c1a486a`  
> **Página Notion Central:** [ANTIGRAVITY-41e4b007bec5805c8816e97f1cb1d8e7](https://app.notion.com/p/ANTIGRAVITY-41e4b007bec5805c8816e97f1cb1d8e7)  
> **Ambiente Alvo:** Contabo VPS (Docker + PostgreSQL 16 + Fastify Backend) via Easypanel  

---

## 1. Visão Geral e Propósito

O **Vox Control** é uma plataforma completa de checkout de alta conversão, gestão de turmas e eventos presenciais (*Vox Turmas OS*), emissão de ingressos, controle de presença (check-in via QR Code), certificação e mensageria inteligente.

### Diretriz Fundamental de Integração
- **Desacoplamento Total:** O checkout **NÃO** possui adaptadores específicos acoplados para CRMs ou Notion no seu código principal.
- **n8n como Hub Central de Automação:** Todas as integrações com **Notion** (Central de Comando), **Deskcomm CRM**, **UAZAPI / WhatsApp** e agentes de IA (**OpenClaw / Hermes**) são orquestradas via **Webhooks Outbound Padronizados** e **API REST Inbound Protegida**.

---

## 2. Regras de Versionamento e Governança (Git)

1. **Branch `homologacao`:** Ambiente exclusivo para desenvolvimento, novas funcionalidades e testes.
2. **Branch `3.3.1.1` / `main`:** Produção oficial intocável.
3. **Comandos de Gatilho:**
   - `"sobe para o clone"` ➔ Commit e Push exclusivamente na branch `homologacao`.
   - `"aprovado, sobe para o oficial"` ➔ Merge validado para a branch oficial de produção.

---

## 3. Redesign UX/UI: Operações em 3 Hubs Especializados

A antiga barra lateral possuía 10 menus dispersos em "Operações". Foi refatorada para **3 Hubs Unificados**, reduzindo ruído visual e centralizando tarefas:

```
┌────────────────────────────────────────────────────────────────────────┐
│                        ARQUITETURA DE OPERAÇÕES                        │
├──────────────────────────┬─────────────────────────┬───────────────────┤
│  🎟️ Ingressos & Portaria  │   🎓 Hub Certificados   │  💬 Comunicação & IA │
│  (TicketsPresenceHub)    │   (CertificatesHub)     │  (MessagingHub)   │
├──────────────────────────┼─────────────────────────┼───────────────────┤
│ • Disparo em Lote        │ • Envio em Lote         │ • WhatsApp / Hermes│
│ • Emissão Individual     │ • Gerador Individual    │ • Campanhas Email │
│ • Histórico & Logs       │ • Pedidos dos Alunos    │ • Disparo Direto  │
│ • Leitor QR Code         │   (Solicitações)        │ • Modelos / Templates│
└──────────────────────────┴─────────────────────────┴───────────────────┘
```

- **Perfis de Acesso:** Usuários com perfil `manager` (professores/portaria) acessam apenas as ferramentas de recepção (Scanner e Histórico).
- **Remoção de Materiais:** O menu redundante `Materiais de Apoio` foi removido com segurança.

---

## 4. Financeiro & Vox Turmas OS: Ponto de Equilíbrio (Break-Even)

### Fórmulas Matemáticas Implementadas em Tempo Real:
1. **Preço Médio Líquido por Aluno:**
   $$\text{Ticket Médio Líquido} = \frac{\text{Receita Líquida Total}}{\text{Alunos Pagos Confirmados}}$$
2. **Alunos Necessários para Empatar (Break-Even):**
   $$\text{Alunos para Empatar} = \left\lceil \frac{\text{Custos Totais da Turma}}{\text{Ticket Médio Líquido}} \right\rceil$$
3. **Vagas Faltantes para Empatar:**
   $$\text{Vagas Faltantes} = \max(0, \text{Alunos para Empatar} - \text{Alunos Pagos})$$
4. **Progresso Visual em Direção ao Ponto de Equilíbrio:**
   $$\text{Progresso \%} = \min\left(100, \left( \frac{\text{Alunos Pagos}}{\text{Alunos para Empatar}} \right) \times 100 \right)$$

### Eliminação Definitiva do `localStorage`:
- As despesas do painel geral (`vox_overview_expenses`) foram migradas para a tabela `expenses` do banco de dados, garantindo que qualquer alteração seja sincronizada em tempo real entre todos os dispositivos e usuários.

---

## 5. Central de Comando Notion (via n8n — Bi-direcional)

### Alterações de Schema Aplicadas:
```sql
-- 1. Identificador da Página no Notion e IDs Externos
ALTER TABLE checkouts ADD COLUMN IF NOT EXISTS notion_page_id TEXT UNIQUE;
ALTER TABLE checkouts ADD COLUMN IF NOT EXISTS external_ids JSONB DEFAULT '{}'::jsonb;

-- 2. IDs Externos e Rastreamento nos Leads
ALTER TABLE leads ADD COLUMN IF NOT EXISTS external_ids JSONB DEFAULT '{}'::jsonb;
ALTER TABLE leads ADD COLUMN IF NOT EXISTS gclid TEXT;
ALTER TABLE leads ADD COLUMN IF NOT EXISTS ttclid TEXT;
```

### Mecanismo Anti-Loop (Notion ⇄ n8n ⇄ Checkout):
Toda requisição originada pelo n8n ao atualizar dados provenientes do Notion deve enviar o header ou atributo no payload:
```json
{
  "skip_webhook": true
}
```
Isso impede que o webhook outbound do checkout volte a disparar para o n8n, prevenindo loops infinitos de sincronização.

---

## 6. Especificação de Webhooks Outbound (Event Bus)

Tabela `webhook_events` com garantia de entrega (`idempotency_key` e até 5 retries com exponential backoff):

### Eventos Cobertos:
| Evento | Gatilho | Consumidores Típicos |
|---|---|---|
| `checkout.started` | Lead iniciou o checkout | Remarketing, n8n, Meta CAPI |
| `pix.generated` | PIX gerado aguardando pagamento | WhatsApp cobrança D-0 |
| `payment.approved` | Venda confirmada pelo gateway | Ingressos, Deskcomm, Notion |
| `payment.refunded` | Reembolso ou chargeback | Cancelamento no Notion/CRM |
| `lead.created` | Cadastro manual ou pré-inscrição | Funil de Vendas |
| `checkin.completed` | Aluno validado na recepção | Lista de Presença no Notion |
| `ticket.generated` | Ingresso emitido com PDF | Disparo de e-mail / WhatsApp |
| `cohort.created` | Nova turma criada no checkout | Criação da página no Notion |
| `cohort.updated` | Alteração de data, local ou vagas | Atualização no Notion/CRM |

### Formato Padronizado do Payload:
```json
{
  "event": "payment.approved",
  "timestamp": "2026-11-20T15:30:00Z",
  "idempotency_key": "pay_mp_123456789",
  "turma_id": "turma-sp-2026",
  "turma_name": "Formação Oratória SP",
  "notion_page_id": "41e4b007-bec5-805c-8816-e97f1cb1d8e7",
  "gross_amount": 997.00,
  "net_amount": 947.15,
  "fee_amount": 49.85,
  "currency": "BRL",
  "lead": {
    "name": "Nome do Aluno",
    "email": "aluno@email.com",
    "phone": "5511999999999",
    "cpf": "123.456.789-00"
  },
  "tracking": {
    "utm_source": "meta",
    "utm_medium": "cpc",
    "utm_campaign": "turma-sp",
    "fbp": "fb.1.123456",
    "fbc": "fb.1.789101",
    "gclid": "Cj0KCQ...",
    "ttclid": "E.0.1...",
    "event_id": "vox_evt_987654321"
  },
  "external_ids": {
    "deskcomm_deal_id": "deal_5541",
    "meta_campaign_id": "1203848123"
  }
}
```

---

## 7. Mapeamento das Edge Functions para o Backend Fastify (Contabo)

Substituição das 5 Edge Functions do Supabase por rotas de alto desempenho em **Node.js/Fastify** (`backend/`):

| Função Atual | Papel | Nova Rota Fastify |
|---|---|---|
| `mp-create-preference` | Cria preferência de pagamento no Mercado Pago | `POST /api/v1/payments/preference` |
| `mp-webhook` | Processa IPN do Mercado Pago, aprova venda e dispara CAPI | `POST /api/v1/payments/webhook` |
| `meta-capi` | Envia eventos para a Graph API com PII hasheada SHA-256 | `POST /api/v1/tracking/meta-capi` |
| `send-email` | Envio de e-mails via SMTP da Hostinger | `POST /api/v1/messaging/send-email` |
| `send-ticket-email` | Gera ingresso e despacha com anexo | `POST /api/v1/tickets/send` |
| *API Inbound Agentes* | CRUD Turmas/Leads e Break-Even (`x-vox-agent-key`) | `GET/POST/PATCH /api/v1/agent/*` |

### Provedor de E-mail Identificado & Configuração SMTP:
- **Provedor Atual:** **Hostinger SMTP**
  - Servidor: `smtp.hostinger.com`
  - Porta: `465` (SSL/TLS direto) ou `587` (STARTTLS)
  - Autenticação: Usuário e Senha da caixa de e-mail corporativa
  - Nome de Envio: `Vox Marketing Academy`

### Trava de Blindagem para Homologação (`EMAIL_TEST_REDIRECT`):
- O backend implementa a variável de ambiente `EMAIL_TEST_REDIRECT`.
- **Comportamento em Testes:** Quando definida com um e-mail (ex: `teste@agenciajardim.com.br`), 100% dos e-mails disparados (marketing, certificados, ingressos) são redirecionados exclusivamente para esse endereço, adicionando o prefixo `[TESTE] [Destinatário Original: ...]` no assunto e um banner amarelo de aviso no topo do HTML. Nenhum aluno real é notificado em ambiente de teste!

### Arquitetura de Armazenamento (Storage na Contabo):
- Substituição do Supabase Storage por **MinIO (S3-compatible)** ou volume persistente local Docker no Contabo servido por CDN/Nginx seguro para:
  - `certificates/`: PDFs gerados dos alunos
  - `signatures/`: Assinaturas digitais dos diretores
  - `product-images/`: Banners e fotos dos checkouts
  - `tickets/`: Ingressos gerados com QR Code

---

## 8. Stack Contabo via Docker Compose

Configuração pronta no arquivo `docker-compose.yml`:
- **`postgres`:** PostgreSQL 16 Alpine com inicialização automática dos schemas.
- **`backend`:** Fastify API com worker de webhooks em background, pool PostgreSQL e interceptor seguro de e-mails.

---

## 9. Procedimento de Migração Zero Data Loss (Supabase ➔ Contabo)

Scripts automatizados em `scripts/migration/`:
- `01_export_supabase.sh` / `.ps1`: Exporta dump binário comprimido e dump SQL do Supabase.
- `02_restore_contabo.sh` / `.ps1`: Restaura no PostgreSQL 16 da Contabo e aplica a migração `20261120_notion_webhooks_schema.sql`.
- `03_audit_checksum.sql`: Executa a auditoria de contagem de linhas, somas financeiras de leads/taxas e checksums MD5 comparando origem x destino.

### Checklist de Transição Zero Data Loss:
1. Rodar `03_audit_checksum.sql` no Supabase e guardar o resultado.
2. Rodar `01_export_supabase.sh` para gerar o dump.
3. Rodar `02_restore_contabo.sh` na VPS da Contabo.
4. Rodar `03_audit_checksum.sql` na Contabo e checar paridade 100%.
5. Atualizar as variáveis de conexão no frontend e iniciar o backend Fastify.

---

## 10. Checklist de Execução & Testes

- [x] Clonar repositório e isolar na branch `homologacao`
- [x] Remover menu redundante "Materiais de Apoio"
- [x] Redesenhar Operações nos 3 Hubs (Ingressos, Certificados, Comunicação)
- [x] Implementar Ponto de Equilíbrio das Turmas (Vox Turmas OS)
- [x] Eliminar dependência do `localStorage` no Financeiro e Visão Geral
- [x] Criar migration com `notion_page_id`, `external_ids` e tabelas de Webhooks
- [x] Mapear provedor SMTP Hostinger e implementar `EMAIL_TEST_REDIRECT`
- [x] Construir Backend Fastify (5 rotas + API Agente `x-vox-agent-key` + Worker de Webhooks)
- [x] Testar e validar compilação limpa do Backend (`npm run build` em `backend/`)
- [x] Criar `docker-compose.yml` e `Dockerfile` para a Contabo
- [x] Criar scripts de migração Zero Data Loss e SQL de auditoria
- [x] Validar compilação limpa do Frontend Vite (`npm run build`)
- [ ] Subir para o clone na branch `homologacao` com aprovação do usuário
