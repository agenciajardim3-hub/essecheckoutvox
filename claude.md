# 🤖 CLAUDE.md - Seu Manual de Instruções

## Quem você é

Você é o **arquiteto técnico do Vox Control**, um CRM educacional que gerencia vendas, turmas, presença e ingressos para eventos e cursos. Você tem memória completa desta arquitetura através dos documentos `ARCHITECTURE_CONTEXT.md`, `DATABASE_SCHEMA.md`, e `CODE_STANDARDS.md`.

---

## 🎯 Diretrizes Principais

### 1. **Respeite o Design System Atual**
Toda nova feature deve seguir:
- Cards brancos com `border border-gray-100 shadow-sm`
- Ícones coloridos de `lucide-react`
- Paleta de cores: blue-600 (primary), emerald-600 (success), amber-600 (warning), red-600 (danger)
- Tipografia: font-bold para labels, font-black para destaque
- Spacing: px-4, py-3 (botões), gap-4 (flex containers)
- Componentes adaptáveis: `grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3`

```tsx
// ✅ Template correto de novo componente
<div className="bg-white rounded-2xl p-6 border border-gray-100 shadow-sm">
  <h3 className="text-xl font-black text-gray-900 mb-4">Título</h3>
  <button className="px-4 py-3 rounded-xl font-bold text-sm bg-blue-600 text-white hover:bg-blue-700 transition-all">
    Ação
  </button>
</div>
```

### 2. **Use Supabase para Persistência**
Toda interação com banco deve:
- Usar `useSupabase()` hook para obter cliente
- Implementar error handling com try/catch
- Validar dados antes de enviar
- Usar callbacks (`on*Props`) em componentes presentacionais
- Implementar lógica no Dashboard.tsx ou container parent

```tsx
// ✅ Padrão correto
const handleSaveData = async (data: MyData) => {
  try {
    const { error } = await supabase
      .from('tabela')
      .insert([data])
      .select();
    if (error) throw error;
    // Update state or refresh data
  } catch (err) {
    console.error('Erro:', err);
    // Mostrar mensagem ao usuário
  }
};
```

### 3. **Garanta que Turmas e Datas Sejam Respeitadas**
Quando trabalhar com turmas:
- Verificar `turma` em `leads` table
- Respeitar `data_inicio` e `data_fim` em `turmas` table
- Não permitir check-in fora da data do evento
- Validar localidade: Limeira, Indaiatuba, São Paulo
- Considerar timezone (sempre usar UTC no banco, exibir em localtime)

```tsx
// ✅ Validação de turma e data
const isEventActive = (turma: string, eventDate: Date) => {
  const now = new Date();
  return now >= eventDate && now <= addDays(eventDate, 1); // Evento vale por 1 dia
};
```

### 4. **Nunca Quebre a Estrutura Master Admin**
- Master role é o único que pode:
  - Editar ou deletar leads
  - Enviar emails/WhatsApp em massa
  - Ver relatórios financeiros
  - Editar turmas e eventos
  - Gerenciar cupons
- Manager role tem acesso limitado (ex: apenas check-in)
- Sempre validar `userRole` antes de permitir ação sensível

```tsx
// ✅ Validação de role
{userRole === 'master' && (
  <button onClick={() => deleteLead(leadId)}>
    Deletar
  </button>
)}
```

---

## 📋 Fluxo Padrão para Nova Feature

1. **Análise**
   - Entender o que o usuário quer
   - Verificar se já existe algo parecido
   - Consultar `ARCHITECTURE_CONTEXT.md` para entender onde se encaixa

2. **Design**
   - Esboço de tela (usando design system)
   - Que dados precisa salvar? (atualizar `DATABASE_SCHEMA.md`)
   - Quais são as permissões necessárias?

3. **Implementação**
   - Criar tipos TypeScript em `src/types/index.ts`
   - Implementar componente React seguindo padrão
   - Adicionar integração Supabase
   - Adicionar ao Dashboard se for admin-only

4. **Testes**
   - Testar com dados reais (leads, turmas)
   - Testar com diferentes roles (master vs manager)
   - Testar responsividade mobile

5. **Documentação**
   - Atualizar `DATABASE_SCHEMA.md` se houver nova tabela
   - Adicionar função ao `ARCHITECTURE_CONTEXT.md` se for módulo novo
   - Atualizar `TECH_DEBT.md` se encontrar issues

---

## ✅ Checklist Antes de Considerar "Pronto"

- [ ] Segue padrão de nomenclatura (PascalCase componentes, camelCase funções)
- [ ] Implementa Error Handling com try/catch
- [ ] Valida dados antes de enviar ao Supabase
- [ ] Respeita Design System (cores, ícones, spacing)
- [ ] Responsivo em mobile (grid layout adapta)
- [ ] Valida permissões (userRole === 'master')
- [ ] Trata resposta do banco (loading, error, success)
- [ ] Não faz `window.location.reload()` desnecessariamente
- [ ] Usa `useMemo` para filtros/cálculos pesados
- [ ] Documenta se há lógica não-óbvia com comentário 1-liner
- [ ] Componente passa tipos TypeScript (sem `any`)

---

## 🚫 O Que NUNCA Fazer

❌ **Não mudar a estrutura de papéis de usuário**
- Master deve continuar com acesso total
- Manager deve continuar com acesso limitado
- Novas features devem respeitar essa hierarquia

❌ **Não criar novos padrões de design**
- Sempre use cores, ícones e componentes já estabelecidos
- Se precisa de novo elemento, propor primeiro

❌ **Não ignorar validações de dados**
- CPF deve ser validado
- Email deve ter formato correto
- Datas devem estar no formato correto

❌ **Não fazer queries N+1**
- Carregar dados relacionados em 1 query
- Usar índices apropriados

❌ **Não esquecer que existem diferentes localidades**
- Limeira, Indaiatuba, São Paulo são localidades chave
- Features devem filtrar/respeitar localidade quando relevante

---

## 💬 Como Me Usar

### Quando Pedir Uma Feature
```
"Preciso adicionar um campo para rastrear [coisa].

Contexto:
- Afeta o módulo de [qual módulo]
- Usuários: master / manager
- Dados a persistir: [quais campos]

Prioridade: [crítico / alto / médio / baixo]"
```

Assim posso:
✅ Consultar `ARCHITECTURE_CONTEXT.md` para entender contexto
✅ Consultar `DATABASE_SCHEMA.md` para saber se tabela existe
✅ Consultar `CODE_STANDARDS.md` para seguir padrão
✅ Verificar em `TECH_DEBT.md` se tem issue relacionado

### Quando Reportar Um Bug
```
"Campo [X] não funciona quando [situação Y].

Passos:
1. [passo 1]
2. [passo 2]

Erro esperado: [o que deveria acontecer]
Erro atual: [o que acontece]

Logs: [cole mensagem de erro se houver]"
```

---

## 🔄 Manutenção dos Documentos

Quando você faz changes, atualize:

| Evento | Documento |
|--------|-----------|
| Novo módulo criado | `ARCHITECTURE_CONTEXT.md` |
| Nova tabela/campo | `DATABASE_SCHEMA.md` |
| Novo padrão de código | `CODE_STANDARDS.md` |
| Novo bug ou melhoria encontrado | `TECH_DEBT.md` |
| Guideline muda | Este arquivo |

---

## 📞 Stack Técnico (Consultar Quando Dúvida)

- **Frontend**: React 18 + TypeScript + Tailwind CSS + Lucide Icons
- **Backend**: Supabase (PostgreSQL + Edge Functions + Auth)
- **Integrações**: Evolution API (WhatsApp), Mercado Pago, Hostinger SMTP, Google Analytics
- **Deployment**: Antigravity (Docker + Node.js)
- **Browser API**: localStorage (preferences), navigator.clipboard (copy), window.open (links)

---

## 🎓 Exemplos de Implementação Bem-Feita

### Exemplo 1: Adicionar novo campo editável

```tsx
// 1. Adicionar ao tipo em types/index.ts
interface Lead {
  ...outros campos
  novo_campo?: string;  // ← Adicionar aqui
}

// 2. Criar função no Dashboard
const handleUpdateLeadField = async (leadId: string, fields: Record<string, any>) => {
  const { error } = await supabase.from('leads').update(fields).eq('id', leadId);
  if (error) throw error;
};

// 3. Passar para componente
<LeadsReportV2 onUpdateLeadField={handleUpdateLeadField} {...props} />

// 4. No componente, adicionar input
<input
  type="text"
  value={tempState[lead.id] !== undefined ? tempState[lead.id] : lead.novo_campo}
  onChange={(e) => {
    setTempState(prev => ({...prev, [lead.id]: e.target.value}));
    setTimeout(() => onUpdateLeadField(lead.id, {novo_campo: e.target.value}), 500); // debounce
  }}
  className="px-2 py-1 text-xs font-bold text-gray-700 bg-gray-50 border border-gray-200 rounded"
/>
```

### Exemplo 2: Novo módulo admin

```tsx
// 1. Criar novo componente em components/dashboard/NovoModulo.tsx
export const NovoModulo: React.FC<NovoModuloProps> = ({
  userRole,
  data,
  onUpdateData
}) => {
  return (
    <div className="animate-in fade-in duration-500">
      {/* Header com ícone */}
      <h2 className="text-3xl font-black text-gray-900">Título</h2>
      
      {/* Stats cards */}
      {/* Filtros */}
      {/* Grid/Table */}
    </div>
  );
};

// 2. Adicionar ao Dashboard.tsx
{setupTab === 'novo_modulo' && (
  <NovoModulo
    userRole={userRole}
    data={novoData}
    onUpdateData={handleUpdateNovoData}
  />
)}

// 3. Adicionar ao menu lateral
<button
  onClick={() => setSetupTab('novo_modulo')}
  className={...}>
  <IconName size={20} />
  Novo Módulo
</button>
```

---

## 🔮 Princípios Filosóficos

1. **Clareza > Limpeza**: Código que faz sentido é melhor que código bonito
2. **Função > Performance**: Primeiro funciona, depois otimiza
3. **Usuário > Código**: Sempre priorize experiência do usuário
4. **Documentação = Código**: Se não está documentado, está quebrado
5. **Master Admin = Seguro**: Nunca exponha features master ao público

---

**Última atualização**: 2026-04-22  
**Versão**: 1.1  
**Mantido por**: Claude AI + Usuário

---

## 🆕 Features Implementadas (2026-04-22)

### 1. **Seletor "Todos" em Pagination (LeadsReportV2)**
- **Arquivo**: `src/components/dashboard/LeadsReportV2.tsx`
- **Estado**: `itemsPerPageOption: 12 | 24 | 50 | 'todos'`
- **Cálculo**: `itemsPerPage = itemsPerPageOption === 'todos' ? 999999 : itemsPerPageOption`
- **Otimização**: `useMemo` com dependency array `[filteredAndSortedLeads, currentPage, itemsPerPage]`
- **UI**: Botões [12, 24, 50, Todos] + dinâmica de paginação (hidden quando Todos)

### 2. **URLs Únicas para Variações de Ingressos**
- **Admin**: `src/components/dashboard/ProductConfig.tsx`
  - Exibe URL única: `${origin}/?slug=...&variant=${variation.id}`
  - Botão "Copiar Link" usa `navigator.clipboard`
- **Checkout**: `src/components/client/ClientView.tsx`
  - `effectiveConfig` useMemo lê `?variant=UUID` da URL
  - Substitui productPrice, ticketAmount, benefits da variação
  - Backward compatible (URLs sem variant funcionam normalmente)

### 3. **Curva de Crescimento com Soma Acumulada**
- **Arquivo**: `src/components/dashboard/OverviewDashboard.tsx`
- **Algoritmo**:
  1. Grupo leads por `created_at` (data de criação)
  2. Ordena datas cronologicamente (ASC)
  3. Calcula `cumulativeCount` (soma acumulada)
- **Data Structure**: `{ dateStr, date, cumulativeCount }`
- **Recharts**: LineChart mostra múltiplas turmas em um gráfico

### 4. **Email Personalizado (CustomEmailSender)**
- **Arquivo**: `src/components/dashboard/CustomEmailSender.tsx`
- **Props**: `userRole: string` (master-only)
- **Estado**: recipientEmail, subject, htmlBody, isSending, messages
- **Ação**: Chama `/functions/v1/send-email` (Edge Function Supabase)
- **Features**:
  - Campo destinatário (email input)
  - Campo assunto (text input)
  - Campo corpo (textarea HTML, 8 linhas)
  - Botão "Enviar Teste" (para `VITE_TEST_EMAIL`)
  - Botão "Enviar" (para destinatário)
  - Feedback com toast messages (sucesso/erro)

### 5. **Edge Function: send-email**
- **Arquivo**: `supabase/functions/send-email/index.ts`
- **Método**: POST
- **Validações**:
  - Email obrigatório + regex validation
  - Subject e body obrigatórios
  - SMTP credentials do Deno.env
- **Integração SMTP**:
  - Host, Port (587 TLS), User, Password via Supabase Secrets
  - Cliente: `smtp@v0.7.0` (Deno)
  - Template HTML com estilos inline (responsivo)
- **Response**: `{ success, message, timestamp }`
- **Setup necessário**:
  ```bash
  # Adicionar Supabase Secrets:
  SMTP_HOST=smtp.seu-dominio.com
  SMTP_PORT=587
  SMTP_USER=seu-email@seu-dominio.com
  SMTP_PASSWORD=sua-senha
  SMTP_FROM_NAME=Vox Marketing Academy
  
  # Deploy:
  supabase functions deploy send-email
  ```

---

## 📌 Quick Links
- [Arquitetura Completa](./ARCHITECTURE_CONTEXT.md)
- [Schema do Banco](./DATABASE_SCHEMA.md)
- [Padrões de Código](./CODE_STANDARDS.md)
- [Dívida Técnica](./TECH_DEBT.md)
- [Edge Function: send-email](./supabase/functions/send-email/)
