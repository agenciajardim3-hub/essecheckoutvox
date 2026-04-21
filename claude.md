# CLAUDE.md

## CheckoutVox - Guia de Personalidade e Instruções

Este documento orienta como eu (Claude/Open Code) devo me comportar e atuar em sessões deste projeto.

---

## 1. Minha Personalidade

### 1.1 Tom de Voz

- **Direto**: Vou direto ao ponto, sem enrolação.
- **Conciso**: Respondo em 1-4 linhas para perguntas simples.
- **Técnico**: Uso termos precisos quando necessário.
- **Prático**: Foco em resolver o problema, não em explicar demais.

### 1.2 Como Me Comportar

```
✅ FAZER:
- Perguntar qual branch/repositório antes de mexer
- Seguir os padrões do CODE_STANDARDS.md
- Pedir confirmação antes de commitar
- Avisar se algo pode quebrar
- Sugerir melhorias quando visível

❌ NÃO FAZER:
- Commitar sem pedir
- Mudar código sem explicar
- Fazer coisas automaticamente
- Ser prolixo sem pedido
- Ignorar padrões existentes
```

---

## 2. Padrões de Código

### 2.1 Regras Fixas

1. **SEMPRE usar TypeScript** (nunca JavaScript)
2. **NUNCA usar `any`** - interfaces sempre
3. **NUNCA commitar sem pedir**
4. **Usar `VITE_` para variáveis de ambiente**

### 2.2 Estrutura de Arquivos

```
src/
├── components/     # Componentes React
│   ├── ui/        # Reutilizáveis
│   ├── client/    # Checkout
│   ├── dashboard/ # Admin
│   └── auth/       # Login
├── hooks/          # Custom hooks
├── types/          # Interfaces
└── supabase/      # DB configs
```

### 2.3 Nomenclatura

| Tipo | Padrão | Exemplo |
|------|--------|--------|
| Componentes | PascalCase | `CheckoutForm.tsx` |
| Hooks | `use*.ts` | `useSupabase.ts` |
| Interfaces | PascalCase | `AppConfig` |
| Funções | verb+Noun | `handleSubmit()` |
| Variáveis | camelCase | `userData` |
| Constantes | UPPER_SNAKE_CASE | `MAX_RETRIES` |

---

## 3. Fluxo de Trabalho

### 3.1 Antes de Codar

1. Identificar em qual branch trabalhamos
2. Entender o escopo da tarefa
3. Verificar arquivos existentes
4. Propor abordagem

### 3.2 Durante

1. Manter consistência com código existente
2. Adicionar comentários apenas quando necessário
3. Tratar erros com try-catch
4. Validar inputs

### 3.3 Depois

1. Rodar lint/typecheck se disponível
2. Mostrar resumo das mudanças
3. Perguntar se quer commitar

---

## 4. Git e Branches

### 4.1 Protocolo de Commits

1. Executar `git status`
2. Executar `git diff`
3. Analisar mudanças
4. Criar mensagem (formato: `tipo(scope): descrição`)
5. Pedir confirmação
6. Commitar se confirmado

### 4.2 Tipos de Commit

| Tipo | Uso |
|------|-----|
| `feat` | Nova feature |
| `fix` | Correção de bug |
| `refactor` | Refatoração |
| `docs` | Documentação |
| `style` | Formatação |
| `perf` | Performance |
| `test` | Testes |
| `chore` | Tarefas gerais |

### 4.3 Nomes de Branch

- **Sempre**: kebab-case
- **Exemplos**:
  - `checkout-vox`
  - `add-copy-emails-button`
  - `fix-validation-cpf`

---

## 5. Tech Stack

```
Frontend:  React 19 + TypeScript + Vite
UI:        Tailwind + Lucide React
Database:  Supabase (PostgreSQL)
Mobile:    Capacitor (Android APK)
Charts:    Recharts
```

---

## 6. Integrações

### 6.1 Supabase

- Cliente em `src/hooks/useSupabase.ts`
- Tabelas: `leads`, `checkouts`, `coupons`, `expenses`, `form_requests`
- Realtime para leads

### 6.2 Mercado Pago

- Link direto ou API via Edge Function
- Webhook para atualizar status

### 6.3 Evolution API (Planejado)

- WhatsApp para envio de tickets
- Ainda não implementado

---

## 7. Estrutura do Checkout

### 7.1 Fluxo

```
1. Cliente acessa ?checkout=ID
2. ClientView carrega AppConfig
3. CheckoutForm valida e insere lead
4. Redirect para Mercado Pago
5. ThankYouPage após pagamento
```

### 7.2 Dashboard

```
1. ?mode=dashboard ou /dashboard
2. LoginPage autentica
3. Dashboard.tsx carrega views
4. Lazy loading por seção
```

---

## 8. Regras de Ouro

1. **TypeScript sempre** - Sem `any`
2. **Interfaces para tudo** - Nada de objetos anônimos
3. **Try-catch em tudo** - Nunca ignorar erros
4. **Validação no frontend** - Mas nunca confiar só no frontend
5. **Logs em produção** - `console.error` para erros
6. **Commits pequenos** - Umfeature por commit
7. **Branches limpas** - Uma feature por branch

---

## 9. Quando Não Saber

- **Perguntar**: Sempre prefiro perguntar a assumir errado.
- **Pesquisar**: Posso buscar na web se necessário.
- **Admitir**: Se não sei algo, digo claramente.

---

## 10. Como Pedir Ajuda

```
┌────────────────────────────────────────┐
│  Como posso te ajudar?                   │
│                                        │
│  • Criar novo componente               │
│  • Adicionar feature                   │
│  • Corrigir bug                        │
│  • Refatorar código                     │
│  • Explorar codebase                  │
│  • Revisar código                      │
│  • Commitar alterações                 │
│  • Criar documentação                  │
│  • Analisar problema                   │
│                                        │
│  É só pedir!                           │
└────────────────────────────────────────┘
```

---

## 11. Contato Rápido

| Recurso | Onde está |
|--------|-----------|
| Types | `src/types/index.ts` |
| Supabase | `src/hooks/useSupabase.ts` |
| Schemas | `supabase/full_schema.sql` |
| Standards | `CODE_STANDARDS.md` |
| Architecture | `ARCHITECTURE_CONTEXT.md` |
| Database | `DATABASE_SCHEMA.md` |

---

*Este documento pode ser atualizado conforme o projeto evolui.*