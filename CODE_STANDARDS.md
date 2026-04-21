# 📋 Code Standards - Vox Control

## Padrão de Desenvolvimento: Open Code

Baseado em **boas práticas de código aberto**, priorizamos:
- ✅ Clareza sobre limpeza prematura
- ✅ Funcionalidade sobre performance prematura
- ✅ Manutenção sobre abstração prematura
- ✅ Documentação inline para lógica não-óbvia

---

## 📁 Estrutura de Pastas

```
src/
├── components/
│   ├── dashboard/          # Painéis master admin
│   │   ├── Dashboard.tsx
│   │   ├── LeadsReportV2.tsx
│   │   ├── TurmasDashboard.tsx
│   │   ├── CheckInDashboard.tsx
│   │   ├── TicketGenerator.tsx
│   │   ├── FinancialDashboard.tsx
│   │   └── [OutrosModulos].tsx
│   ├── client/            # Componentes do cliente (checkout)
│   │   ├── CheckoutForm.tsx
│   │   ├── ClientView.tsx
│   │   └── ThankYouPage.tsx
│   └── ui/               # Componentes reutilizáveis
│       └── Input.tsx
├── hooks/
│   └── useSupabase.ts    # Cliente Supabase
├── types/
│   └── index.ts          # TypeScript interfaces
├── services/
│   └── (futuro: apicalls, webhooks)
└── App.tsx
```

---

## 🎨 Design System

### Componentes de UI

**Padrão estabelecido no Dashboard:**

```tsx
// Cards brancos com borda sutil
<div className="bg-white rounded-2xl p-6 border border-gray-100 shadow-sm">
  
  // Ícones coloridos (Lucide React)
  <DollarSign size={24} className="text-green-600" />
  
  // Tipografia
  <h2 className="text-3xl font-black text-gray-900">Título</h2>
  <p className="text-xs font-bold text-gray-500 uppercase tracking-widest">Label</p>
  
  // Botões
  <button className="px-4 py-3 rounded-xl font-bold text-sm bg-blue-600 text-white hover:bg-blue-700 transition-all">
    Ação
  </button>
</div>
```

### Paleta de Cores

| Contexto | Cor | Uso |
|----------|-----|-----|
| Primary | `bg-blue-600` | Botões, CTAs |
| Success | `bg-emerald-600` | Status "Pago", Check-in |
| Warning | `bg-amber-600` | Status "Pendente", Sinal |
| Danger | `bg-red-600` | Deletar, Cancelar |
| Info | `bg-violet-600` | Emails, Info |
| Neutral | `bg-gray-900` | Sidebar, Header |

### Ícones

**Sempre use Lucide React:**

```tsx
import { 
  Users,          // Leads/Pessoas
  DollarSign,     // Dinheiro/Valor
  Check,          // Confirmado/Check-in
  Mail,           // Email
  MessageCircle,  // WhatsApp
  Ticket,         // Ingressos
  Award,          // Certificados
  QrCode,         // QR para check-in
  BarChart3,      // Gráficos/Relatórios
  Calendar,       // Datas/Turmas
  MapPin,         // Localidades
  Printer,        // Impressão
  Download       // Download/Export
} from 'lucide-react';
```

---

## 🔤 Nomenclatura

### Componentes React

```tsx
// PascalCase para componentes
export const LeadsReportV2 = () => {}
export const CheckInDashboard = () => {}

// camelCase para funções auxiliares
const handleUpdateLeadStatus = () => {}
const calculateConversionRate = () => {}

// _Suffixes para componentes privados
const _DebugPanel = () => {}
```

### Rotas e URLs

```
/dashboard                  // Main admin
  /leads                    // Relatório de vendas
  /turmas                   // Gestão de turmas
  /checkin                  // Presença
  /tickets                  // Ingressos
  /financeiro               // Financeiro
  /remarketing              // Email + WhatsApp
  /cupons                   // Gerenciar cupons

/checkout/:slug             // Página de venda (cliente)
/?mode=ticket&checkout=ID&cpf=... // Visualizar ingresso
/?mode=certificate&checkout=ID&cpf=...  // Visualizar certificado
```

### Integração com Evolution API (WhatsApp)

```tsx
// Handler de envio WhatsApp
const sendWhatsappMessage = async (phone: string, message: string) => {
  // phone: "5535999999999" (com DDD e país)
  // message: texto da mensagem
  const response = await fetch('https://api.evolution.bot/send', {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${EVOLUTION_API_KEY}`,
      'Content-Type': 'application/json'
    },
    body: JSON.stringify({
      phone,
      message,
      instanceId: EVOLUTION_INSTANCE_ID
    })
  });
  return response.json();
};

// Template de mensagem
const generateWhatsappMessage = (lead: Lead): string => {
  return `Oi ${lead.name}! 👋\n\nSeu ingresso para ${lead.product_name} foi emitido!\n\nClique aqui: ${getTicketUrl(lead)}`;
};
```

### Integração com Webhooks

```tsx
// Função para handle webhook (Supabase Function ou endpoint)
const handlePaymentWebhook = async (req: Request) => {
  const { event, data } = await req.json();
  
  if (event === 'payment.approved') {
    // Atualizar status 'Pago'
    await supabase
      .from('leads')
      .update({ 
        status: 'Pago',
        paid_amount: data.amount 
      })
      .eq('id', data.lead_id);
    
    // Enviar ingresso
    await sendTicket(data.lead_id);
  }
};
```

---

## 🏗️ Padrões de Componentes

### Componente de Relatório (ex: LeadsReportV2)

```tsx
interface ComponentProps {
  userRole: UserRole;
  data: Lead[];
  allCheckouts: AppConfig[];
  
  // Callbacks para ações
  onUpdateStatus: (id: string, status: Lead['status']) => void;
  onUpdateLeadField?: (id: string, fields: Record<string, any>) => Promise<void>;
  onDeleteLead: (id: string) => void;
  onCheckIn?: (leadId: string, checkedIn: boolean) => Promise<void>;
}

// State
const [viewMode, setViewMode] = useState<'grid' | 'table'>('grid');
const [searchTerm, setSearchTerm] = useState('');
const [selectedStatus, setSelectedStatus] = useState('all');

// Cálculos memoizados
const filteredData = useMemo(() => {
  return data.filter(item => 
    item.name.includes(searchTerm) &&
    (selectedStatus === 'all' || item.status === selectedStatus)
  );
}, [data, searchTerm, selectedStatus]);

// Render
return (
  <div className="animate-in fade-in duration-500">
    {/* Header com stats */}
    {/* Filtros */}
    {/* Grid ou Table view */}
    {/* Paginação */}
  </div>
);
```

### Função de Atualização no Banco

```tsx
// NO DASHBOARD/CONTAINER
const handleUpdateLeadField = async (leadId: string, fields: Record<string, any>) => {
  if (!supabase) return;
  try {
    const { error } = await supabase
      .from('leads')
      .update(fields)
      .eq('id', leadId);
    
    if (error) throw error;
    // Reload ou update state (NÃO fazer window.location.reload sem necessidade)
  } catch (err) {
    console.error('Erro ao atualizar:', err);
  }
};

// PASSAR PARA O COMPONENTE
<LeadsReportV2
  onUpdateLeadField={handleUpdateLeadField}
  {...otherProps}
/>
```

---

## ✅ Checklist para Nova Feature

- [ ] Tipo TypeScript criado em `src/types/index.ts`
- [ ] Componente segue Design System (cores, ícones, spacing)
- [ ] Integração com Supabase usando hooks
- [ ] Callbacks `on*` passados do container parent
- [ ] Trata erros com try/catch e mensagens ao usuário
- [ ] Funções complexas têm comentário explicativo
- [ ] Estado otimizado com `useMemo` onde apropriado
- [ ] Mobile-responsivo (grid layout adapta)
- [ ] Segue rotas e nomenclatura padrão

---

## 🚫 Anti-patterns

```tsx
// ❌ NÃO faça isso:
window.location.reload();  // Sempre que possível, update state instead

// ❌ Não misture lógica com apresentação
const MyComponent = () => {
  const [data] = useState();
  const response = await fetch('...'); // ❌ Async no componente
};

// ❌ Não repita código em 3+ lugares
if (status === 'Pago') renderPayment();
if (status === 'Pago') updateColor();  // ❌ Use funções auxiliares

// ✅ FAÇ ASSIM:
const isPaid = status === 'Pago';
if (isPaid) {
  renderPayment();
  updateColor();
}
```

---

## 📝 Comentários

```tsx
// ✅ Bom: Explica o POR QUÊ
// Hacky: O Supabase retorna erro se email não existe, então tratamos como "não encontrado"
const handleEmailLookup = async (email: string) => { ... }

// ❌ Ruim: Explica o QUÊS óbvio
// Set email
setEmail(email);

// ✅ Bom: Uma linha para lógica não-óbvia
setVerifiedLeads(prev => new Set([...prev, leadId])); // Set imutável para localStorage
```

---

## 🔐 Segurança

- Nunca colocar API keys no código
- Usar `import.meta.env.VITE_*` para variáveis de ambiente
- Validar entrada do usuário antes de enviar para Supabase
- RLS policies ativas em todas as tabelas
- Logs sensíveis apenas em console, não em UI

---

**Última atualização**: 2026-04-21
