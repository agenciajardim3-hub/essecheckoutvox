# TECH_DEBT.md

## CheckoutVox - Tech Debt e Melhorias Pendentes

Este documento lista o que precisa ser refatorado, melhorado ou implementado no CheckoutVox.

---

## 1. Validações

### 1.1 Validação de CPF

**Prioridade**: Alta

- **Atual**: Campo `cpf` aceita qualquer texto.
- **Necessário**: Validação real de CPF (algoritmo DV).
- **Impacto**: Dados inconsistentes no banco.

```typescript
// Implementar validação de CPF
const validateCPF = (cpf: string): boolean => {
  // Algoritmo de validação de CPF
};
```

### 1.2 Validação de Email

**Prioridade**: Alta

- **Atual**: Apenas verifica presença de `@`.
- **Necessário**: Validação completa de formato de email.

### 1.3 Validação de Telefone

**Prioridade**: Média

- **Atual**: Aceita qualquer formato.
- **Necessário**: Máscara e validação de formato brasileiro.

---

## 2. Logs

### 2.1 Sistema de Logs Centralizado

**Prioridade**: Alta

- **Atual**: `console.error` disperso no código.
- **Necessário**:
  - Logger estruturado
  - Níveis: debug, info, warn, error
  - Persistência opcional em banco

```typescript
// Proposta de implementação
const logger = {
  debug: (msg: string, context?: object) => { ... },
  info: (msg: string, context?: object) => { ... },
  warn: (msg: string, context?: object) => { ... },
  error: (msg: string, error?: Error, context?: object) => { ... },
};
```

### 2.2 Log de Webhooks

**Prioridade**: Alta

- **Atual**: Webhooks do Mercado Pago sem log detalhado.
- **Necessário**:
  - Log de todas as requisições recebidas
  - Log de processamento
  - Log de resposta enviada

---

## 3. Autenticação

### 3.1 JWT com Expiração

**Prioridade**: Alta

- **Atual**: Session simples.
- **Necessário**:
  - Refresh token
  - Expiração de sessão
  - Revogação de token

### 3.2 Roles Detalhados

**Prioridade**: Média

- **Atual**: Roles simples (`none`, `master`, `manager`).
- **Necessário**: Permissões granulares por feature.

---

## 4. Performance

### 4.1 Lazy Loading

**Prioridade**: Média

- **Atual**: Alguns componentes já usam lazy loading.
- **Necessário**: Analisar e aplicar em todos os dashboards.

### 4.2 Otimização de Queries

**Prioridade**: Alta

- **Atual**: Queries podem retornar muitos dados.
- **Necessário**:
  - Paginação em todas as listas
  - Filtros no banco (não no frontend)
  - Índices otimizados

```typescript
// Proposta
const { data } = await supabase
  .from('leads')
  .select('*')
  .eq('product_id', productId)
  .range(offset, offset + LIMIT - 1);
```

### 4.3 Índices no Banco

**Prioridade**: Alta

```sql
CREATE INDEX IF NOT EXISTS idx_leads_product_id ON leads(product_id);
CREATE INDEX IF NOT EXISTS idx_leads_status ON leads(status);
CREATE INDEX IF NOT EXISTS idx_leads_created_at ON leads(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_coupons_code ON coupons(code);
```

---

## 5. Segurança

### 5.1 Sanitização de Input

**Prioridade**: Alta

- **Atual**: Dados inseridos diretamente.
- **Necessário**: Sanitizar todos os inputs do usuário.

### 5.2 Rate Limiting

**Prioridade**: Alta

- **Atual**: Sem limitação.
- **Necessário**: Implementar em endpoints críticos.

### 5.3 CORS

**Prioridade**: Média

- Configurar origens permitidas.

---

## 6. Integrações

### 6.1 Evolution API / WhatsApp

**Prioridade**: Média

- **Estado**: Planejado, não implementado.
- **Necessário**:
  - Integração com Evolution API
  - Envio de tickets via WhatsApp
  - Confirmação de presença via WhatsApp

### 6.2 Mercado Pago - Webhook Robust

**Prioridade**: Alta

- **Atual**: Webhook básico.
- **Necessário**:
  - Tratamento de todos os status
  - Idempotência
  - Retry em caso de falha

### 6.3 Google Analytics 4

**Prioridade**: Média

- **Atual**: Tag básica inserida.
- **Necessário**:
  - Eventos customizados
  - E-commerce tracking
  - Conversões

### 6.4 Meta Pixel

**Prioridade**: Média

- **Atual**: Tag configurada.
- **Necessário**: Eventos de PageView, Lead, Purchase.

---

## 7. Error Handling

### 7.1 Error Boundary Global

**Prioridade**: Alta

- **Atual**: ErrorBoundary existe mas não cobre todos os casos.
- **Necessário**:
  - Recovery actions
  - Retry automático
  - Fallback UI

### 7.2 Toast/Notification System

**Prioridade**: Alta

- **Atual**: `alert()` nativo.
- **Necessário**: Sistema de notificações toast customizado.

---

## 8. Mobile

### 8.1 PWA Support

**Prioridade**: Média

- Service Worker para offline.
- Manifest para install.

### 8.2 Push Notifications

**Prioridade**: Baixa

- Configurar push notifications.
- Permissão do usuário.

---

## 9. Testes

### 9.1 Testes Unitários

**Prioridade**: Alta

- Setup de testes (Vitest/Jest).
- Coverage inicial em utilities.

### 9.2 Testes de Integração

**Prioridade**: Média

- Fluxo completo de checkout.
- Autenticação.

---

## 10. Priorização

| Prioridade | Items |
|-----------|-------|
| **Alta** | Validação CPF/Email, Logs centralizado, Índices, CORS, Rate Limit, Error Boundary |
| **Média** | Autenticação robusta, Lazy loading, Mercado Pago completo, Evolution API |
| **Baixa** | PWA, Push, Testes |

---

## 11. Dívida Técnica Conhecida

- [ ] Validação de CPF
- [ ] Sistema de logs
- [ ] Rate limiting
- [ ] Índices no banco
- [ ] Paginação em listas
- [ ] Toast notifications
- [ ] Testes unitários

---

*Atualizado em: Abril 2026*