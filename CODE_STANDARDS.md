# CODE_STANDARDS.md

## CheckoutVox - Padrões de Código e Convenções

Este documento define as regras de escrita, nomenclatura, tratamento de erros e padrões de comentário para o projeto CheckoutVox.

---

## 1. Regras de Escrita

### 1.1 TypeScript Strict

- **NÃO use `any`**. Sempre utilize interfaces precisas.
- Use a interface `Lead` ou `CustomerData` para dados de clientes.
- Use `AppConfig` para configurações de checkout.
- Crie novas interfaces quando necessário (veja `src/types/index.ts`).

```typescript
// ERRADO
const data: any = response;

// CORRETO
const data: Lead = response;
```

### 1.2 Componentes React

- Use Functional Components com TypeScript.
- Props devem ter interface dedicada.
- Componentes de página devem ser exportados como	default.

```typescript
interface CheckoutFormProps {
  config: AppConfig;
  onSuccess: (lead: Lead) => void;
}

export function CheckoutForm({ config, onSuccess }: CheckoutFormProps) {
  // implementação
}
```

---

## 2. Padrões de Nomenclatura

### 2.1 Arquivos

| Tipo | Padrão | Exemplo |
|------|--------|---------|
| Componentes | PascalCase | `CheckoutForm.tsx` |
| Hooks | camelCase com `use` | `useSupabase.ts` |
| Tipos | PascalCase | `index.ts` |
| Utils | camelCase | `utils.ts` |
| Config | camelCase/kebab-case | `.env.example` |

### 2.2 Variáveis e Funções

- Variáveis: `camelCase`
- Constantes: `UPPER_SNAKE_CASE`
- Interfaces: `PascalCase`
- Funções: `camelCase` (verbos)

```typescript
const MAX_RETRY = 3;
const userData: CustomerData = ...;
function calculateTotal(): number { ... }
```

### 2.3 Pastas

```
src/
├── components/      # Componentes React
│   ├── ui/         # Componentes reutilizáveis
│   ├── client/    # Checkout do cliente
│   ├── dashboard/ # Painel administrativo
│   └── auth/       # Autenticação
├── hooks/          # Custom hooks
├── types/          # TypeScript interfaces
└── supabase/      # Schemas e configs
```

---

## 3. Tratamento de Erros

### 3.1 Padrão Try-Catch

```typescript
try {
  const { data, error } = await supabase.from('leads').insert(lead);
  if (error) throw error;
} catch (err: any) {
  console.error('Erro ao salvar lead:', err);
  alert('Erro ao processar inscrição. Tente novamente.');
}
```

### 3.2 Função Helper de Erro

```typescript
const getErrorMessage = (error: any): string => {
  return error?.message || 'Erro desconhecido';
};
```

### 3.3 Error Boundary

- Use o componente `ErrorBoundary.tsx` para capturar erros de renderização em toda a árvore de componentes.

### 3.4 Validação de Dados

```typescript
const validateLead = (data: CustomerData): boolean => {
  if (!data.name?.trim()) {
    alert('Nome é obrigatório');
    return false;
  }
  if (!data.email?.includes('@')) {
    alert('Email inválido');
    return false;
  }
  return true;
};
```

---

## 4. Comentários de Funções

### 4.1 Padrão JSDoc

```typescript
/**
 * Insere um novo lead no banco de dados.
 * @param lead - Dados do cliente form
 * @returns Lead criado com ID gerada
 * @throws Erro se a inserção falhar
 */
async function createLead(lead: CustomerData): Promise<Lead> {
  // implementação
}
```

### 4.2 Comentários Inline

- Use apenas quando a lógica não for óbvia.
- Evite comentários óbvios.

```typescript
// Loop pelos participantes para validar
for (let i = 0; i < participants.length; i++) {
  // validação
}
```

---

## 5. Estrutura de Componentes

### 5.1 Componente Completo

```typescript
import { useState, useEffect } from 'react';
import { supabase } from '@/hooks/useSupabase';
import type { Lead, AppConfig } from '@/types';

interface ParticipantCardProps {
  participant: Lead;
  index: number;
  onRemove: (index: number) => void;
}

export function ParticipantCard({ participant, index, onRemove }: ParticipantCardProps) {
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    // Carrega dados iniciales
  }, []);

  const handleDelete = async () => {
    try {
      setLoading(true);
      // lógica de exclusão
    } catch (err) {
      console.error('Erro ao excluir:', err);
      alert('Erro ao processar solicitação');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="card">
      <span>{participant.name}</span>
      <button onClick={handleDelete} disabled={loading}>
        Remover
      </button>
    </div>
  );
}
```

---

## 6. Mobile e Responsividade

### 6.1 Safe Areas (Capacitor)

```typescript
import { useSafeAreaInsets } from 'react-native-safe-area-context';

// Para Android com Capacitor
const insets = useSafeAreaInsets();
const paddingTop = insets.top || 24;
```

### 6.2 CSS/Tailwind

- Use classes utilitárias do Tailwind.
- Prefira unidades relativas (`rem`, `%`, `vh`/`vw`).

---

## 7. Commits e Branches

### 7.1 Nome de Branch

- Usar kebab-case: `checkout-vox`, `add-copy-emails-button`

### 7.2 Mensagem de Commit

- Formato: `tipo(descrição)`
- Exemplos:
  - `feat(add-new-checkout-form)`
  - `fix(correction-payment-flow)`
  - `refactor(extract-shared-components)`
  - `docs(update-schema-documentation)`

---

## 8. Configuração de Ambiente

### 8.1 Variáveis de Ambiente

- Nunca exponha secrets no código.
- Use `.env.example` como template.
- Variables com prefixo `VITE_` para acesso no navegador.

```
VITE_SUPABASE_URL=https://xxx.supabase.co
VITE_SUPABASE_KEY=xxx
```

---

## 9. Supabase Queries

### 9.1 Padrão de Queries

```typescript
const { data, error } = await supabase
  .from('leads')
  .select('*')
  .eq('status', 'Novo')
  .order('created_at', { ascending: false });

if (error) {
  console.error('Erro ao buscar leads:', error);
  throw error;
}
```

### 9.2 Realtime Subscription

```typescript
const channel = supabase
  .channel('leads-realtime')
  .on('postgres_changes', { event: 'INSERT', schema: 'public', table: 'leads' }, (payload) => {
    setLeads((prev) => [...prev, payload.new]);
  })
  .subscribe();
```

---

*Atualizado em: Abril 2026*