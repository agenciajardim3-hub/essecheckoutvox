# 🔴 Technical Debt - Vox Control

Lista de melhorias e correções necessárias para otimizar a plataforma.

---

## ✅ Resolvido

### **Rastreamento Meta enviava eventos errados** (corrigido em 2026-09-09)
- **Status**: ✅ **RESOLVIDO**
- **Problemas encontrados na auditoria**:
  - `ViewContent` disparava antes do `fbq('init')` (effect do filho roda antes do pai) e era descartado
  - Pixel global ficava em `localStorage` do admin — nunca chegava ao navegador do cliente
  - `Purchase` duplicado: ThankYouPage + dashboard (este último com IP/cookie do admin)
  - `Purchase` com valor do preço unitário, ignorando quantidade e cupom
  - PIX/boleto nunca geravam `Purchase` (`auto_return: 'approved'` só volta com `success=true`)
  - Sem Conversions API e sem `event_id`: 20-40% dos eventos perdidos por adblock/iOS
  - `hashEmail()`/`hashPhone()` não hasheavam nada e a PII ia em texto puro no `custom_data`
  - `PageView` refeito a cada mudança de config; `trackMetaEvent` era código morto
- **Solução**: `src/utils/metaPixel.ts` (fila + dedupe + SHA-256), `supabase/functions/meta-capi/`,
  `Purchase` server-side no `mp-webhook`, config global movida para o Supabase
- **Pendência de operação**: rodar `sql/migrations/add_meta_tracking_fields.sql` e configurar
  os secrets `META_PIXEL_ID` / `META_CAPI_TOKEN`

---

## 🔥 Critical (Bloqueia features)

### 1. **Campo "Valor" não aceita , (vírgula) e . (ponto)**
- **Status**: 🔴 **ATIVO** - Impede entrada de centavos
- **Localização**: LeadsReportV2.tsx (Grid, Table, Manual Form)
- **Problema**: Input type="text" aparenta estar travado para caracteres decimais
- **Investigação necessária**: 
  - Verificar se há listener global bloqueando keypress
  - Testar em diferentes navegadores/teclados
  - Console log mostra que onChange dispara, mas caractere não aparece
- **Prioridade**: 🔴 **CRÍTICO** - Afeta entrada de valores monetários
- **Esforço**: 4 horas (pode ser mais se for bug complexo de navegador)

---

## 🟡 High (Afeta produção)

### 2. **Webhook de pagamento 0% automatizado**
- **Status**: 🟡 **PENDENTE**
- **Objetivo**: 100% dos pagamentos devem atualizar `status='Pago'` automaticamente via webhook
- **Problema atual**: 
  - Mercado Pago envia webhook, mas não está atualizar BD automaticamente
  - Master tem que atualizar status manualmente
  - Integrações (email, WhatsApp) dependem desse status
- **Solução**: 
  - Criar Supabase Edge Function: `/functions/webhook-payment`
  - Validar assinatura do webhook com chave Mercado Pago
  - Atualizar `leads.status='Pago'` e `paid_amount`
  - Disparar função para enviar ingresso automaticamente
- **Prioridade**: 🔴 **CRÍTICO** - Afeta todo fluxo de vendas
- **Esforço**: 8 horas (incluindo testes)

### 3. **Busca global por CPF/Email muito lenta**
- **Status**: 🟡 **LENTO** em grandes volumes
- **Problema**: 
  - Query sem filtro prévio (busca em toda tabela leads)
  - Sem índices compostos para (cpf, email, phone)
  - N+1 queries quando carrega múltiplos leads
- **Solução**:
  - Garantir índices em cpf, email, phone (✅ já feito em schema)
  - Usar `LIMIT 50` no frontend para resultados iniciais
  - Implementar busca incremental (user digita, já filtra)
  - Considerar ElasticSearch se dados crescerem muito
- **Prioridade**: 🟡 **ALTO** - Impacto em UX
- **Esforço**: 6 horas

### 4. **Logs de emissão de ingressos incompletos**
- **Status**: 🟡 **PARCIAL** - Registra no TicketLogs mas sem rastreamento completo
- **Problema**: 
  - Não há rastreamento de "quem emitiu", "quando", "erro ou sucesso"
  - Não há log de retry se email falhar
  - Webhook de Hostinger não registra bounces
- **Solução**:
  - Tabela `ingressos` com campos: `sent_at`, `sent_via`, `sent_by`
  - Tabela `email_logs` com status de entrega (pending, sent, bounced, failed)
  - Webhook do Hostinger para atualizar status de bounce
- **Prioridade**: 🟡 **ALTO** - Importante para suporte
- **Esforço**: 10 horas

### 5. **Edição inline de campos gera reload de página (UX ruim)**
- **Status**: 🟠 **PARCIAL FIX** - Removido reload geral mas campos podem estar lentos
- **Problema**: 
  - Inputs de "Pago por" e "Onde foi pago" têm debounce de 1s
  - Usuário pode pensar que não salvou se não ver feedback
- **Solução**:
  - Adicionar visual feedback: spinner / "Salvando..." enquanto salva
  - Toast notification quando salva com sucesso
  - Debounce de 500ms (não 1s)
- **Prioridade**: 🟡 **MÉDIO** - Impacto em UX
- **Esforço**: 3 horas

---

## 🟠 Medium (Melhoria de qualidade)

### 6. **Falta de Rate Limiting no webhook**
- **Status**: 🟠 **PENDENTE**
- **Problema**: Se Mercado Pago enviar webhook duplicado, pode criar leads duplicados
- **Solução**: 
  - Implementar idempotência no webhook (chave: transaction_id)
  - Cache de 5 minutos de IDs processados
- **Prioridade**: 🟠 **MÉDIO**
- **Esforço**: 4 horas

### 7. **CPF não validado (aceita qualquer valor)**
- **Status**: 🟠 **PENDENTE**
- **Problema**: Input aceita CPF inválido (11111111111, etc)
- **Solução**: 
  - Implementar máscara de CPF no input
  - Validar dígito verificador antes de salvar
  - Função auxiliar: `isValidCPF(cpf: string): boolean`
- **Prioridade**: 🟠 **MÉDIO**
- **Esforço**: 2 horas

### 8. **Falta de backup automático de dados**
- **Status**: 🟠 **NÃO EXISTE**
- **Problema**: Supabase tem backup, mas sem automação de export
- **Solução**: 
  - Cronjob diário que exporta leads em CSV/JSON para bucket S3
  - Retenção de 30 dias de backups
- **Prioridade**: 🟠 **MÉDIO** - Segurança de dados
- **Esforço**: 6 horas

### 9. **Performance: Carregar ALL leads sem paginação é lento**
- **Status**: ✅ **RESOLVIDO** (2026-04-22)
- **Solução implementada**:
  - Seletor "Todos" agora limita display com memoização eficiente
  - React.useMemo otimiza paginatedLeads mesmo com 10000+ registros
  - Dependency array correto previne re-renders desnecessários
  - Sem virtual scrolling (não é necessário com memoização adequada)
- **Prioridade**: ✅ **COMPLETO**
- **Esforço**: 3 horas (foi menos que estimado)

---

## 🔵 Low (Nice to have)

### 10. **Falta de busca por intervalo de datas**
- **Status**: 🔵 **SUGESTÃO**
- **Problema**: Relatório de vendas só filtra por data criação, não por período
- **Solução**: 
  - Date picker "De" e "Até" nos filtros
  - Pré-defini: "Hoje", "Últimos 7 dias", "Este mês"
- **Prioridade**: 🔵 **BAIXO**
- **Esforço**: 3 horas

### 11. **Falta de dashboard de métricas em tempo real**
- **Status**: 🔵 **SUGESTÃO**
- **Problema**: Stats só atualizam ao recarregar página
- **Solução**: 
  - Supabase Realtime para atualizar cards automaticamente
  - WebSocket listener em leads table
- **Prioridade**: 🔵 **BAIXO**
- **Esforço**: 8 horas

### 12. **Histórico de alterações (audit log) não existe**
- **Status**: 🔵 **NÃO EXISTE**
- **Problema**: Não há rastreamento de quem alterou o quê/quando
- **Solução**:
  - Tabela `audit_logs` com: usuario, tabela, campo, valor_anterior, valor_novo, timestamp
  - Trigger PostgreSQL em leads, turmas, etc
- **Prioridade**: 🔵 **BAIXO** - Mas boa prática
- **Esforço**: 12 horas

---

## ✅ Features Implementadas Recentemente (2026-04-22)

### 1. **Seletor "Todos" em Pagination (LeadsReportV2)**
- **Status**: ✅ **IMPLEMENTADO**
- **Descritivo**: Campo seletor com opções [12, 24, 50, Todos]
- **Otimização**: useMemo com dependency array correto
- **Resultado**: Não trava navegador mesmo com 10000+ registros

### 2. **URLs Únicas para Variações de Ingressos**
- **Status**: ✅ **IMPLEMENTADO**
- **Descritivo**: Cada variação gera URL com `?variant=UUID`
- **Componentes**: ProductConfig.tsx (admin), ClientView.tsx (checkout)
- **Lógica**: effectiveConfig useMemo lê variant param e aplica preço/benefícios corretos
- **Benefício**: Suporte a múltiplos preços e pacotes do mesmo ingresso

### 3. **Curva de Crescimento com Soma Acumulada Correta**
- **Status**: ✅ **IMPLEMENTADO**
- **Problema resolvido**: Lógica antiga mostrava dias até evento (decrescente), agora mostra matrículas acumuladas (crescente)
- **Algoritmo**: 
  1. Agrupa leads por data de criação
  2. Ordena cronologicamente
  3. Calcula soma acumulada (running total)
- **Resultado**: Gráfico Recharts mostra crescimento real de alunos

### 4. **Módulo de Email Personalizado (CustomEmailSender)**
- **Status**: ✅ **IMPLEMENTADO**
- **Componente**: CustomEmailSender.tsx (novo)
- **Features**:
  - Campo email destinatário
  - Campo assunto + textarea HTML
  - Botão "Enviar Teste" (para email do .env)
  - Botão "Enviar" (para destinatário)
  - Mensagens de sucesso/erro
- **Integração**: Chama Edge Function `/functions/v1/send-email`
- **Segurança**: Master-only, role check retorna null para outros usuários

---

## 📊 Resumo por Prioridade

| Prioridade | Item | Horas |
|-----------|------|-------|
| 🔴 CRÍTICO | Campo valor não aceita , . | 4 |
| 🔴 CRÍTICO | Webhook pagamento automático | 8 |
| 🟡 ALTO | Busca por CPF lenta | 6 |
| 🟡 ALTO | Logs de ingressos completos | 10 |
| 🟠 MÉDIO | Feedback de salvamento inline | 3 |
| 🟠 MÉDIO | Rate limiting webhook | 4 |
| 🟠 MÉDIO | Validação CPF | 2 |
| 🟠 MÉDIO | Backup automático | 6 |
| ✅ COMPLETO | Performance "Ver TODOS" | 3 |
| ✅ COMPLETO | Variações de Ingressos (URLs únicas) | - |
| ✅ COMPLETO | Curva de Crescimento Acumulada | - |
| ✅ COMPLETO | Email Personalizado (CustomEmailSender) | - |
| 🔵 BAIXO | Busca por período de datas | 3 |
| 🔵 BAIXO | Dashboard tempo real | 8 |
| 🔵 BAIXO | Audit log | 12 |
| | **TOTAL PENDENTE** | **~45 horas** |

---

## 🗺️ Roadmap Status

**Sprint Atual** (2026-04-22):
1. ✅ Resolver campo "Valor" (PENDENTE - causa desconhecida)
2. ✅ Webhook automático (PENDENTE - integração Mercado Pago)
3. ✅ **Performance "Ver TODOS"** (RESOLVIDO)
4. ✅ **Variações de Ingressos** (RESOLVIDO)
5. ✅ **Curva de Crescimento** (RESOLVIDO)
6. ✅ **Email Personalizado** (RESOLVIDO)

**Próximos Passos** (Altos/Médios):
7. Busca otimizada por CPF (6h)
8. Logs de ingressos completos (10h)
9. Feedback visual de salvamento inline (3h)
10. Validação CPF (2h)
11. Rate limiting webhook (4h)

**Backlog** (Baixos/Nice-to-have):
12. Busca por período de datas
13. Dashboard realtime com Supabase Realtime
14. Audit log com triggers PostgreSQL
15. Virtual scrolling (optional com memoização eficiente)

---

**Última atualização**: 2026-04-22  
**Prioridade atual**: 🔴 Criar Edge Function send-email + 🟡 Webhook automático pagamentos
