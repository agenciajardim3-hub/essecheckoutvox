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

### Componente de Email Personalizado (CustomEmailSender)

```tsx
interface CustomEmailSenderProps {
  userRole: string;
}

export const CustomEmailSender: React.FC<CustomEmailSenderProps> = ({ userRole }) => {
  const [recipientEmail, setRecipientEmail] = useState('');
  const [subject, setSubject] = useState('');
  const [htmlBody, setHtmlBody] = useState('');
  const [isSending, setIsSending] = useState(false);
  const [successMessage, setSuccessMessage] = useState('');
  const [errorMessage, setErrorMessage] = useState('');

  const testEmail = import.meta.env.VITE_TEST_EMAIL || 'noreply@seu-dominio.com';

  const sendEmail = async (email: string, isTest: boolean = false) => {
    if (!subject.trim() || !htmlBody.trim()) {
      setErrorMessage('Assunto e corpo são obrigatórios');
      return;
    }

    if (!isTest && !email.trim()) {
      setErrorMessage('Email do destinatário é obrigatório');
      return;
    }

    setIsSending(true);
    setErrorMessage('');
    setSuccessMessage('');

    try {
      const targetEmail = isTest ? testEmail : email;

      const response = await fetch(
        `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/send-email`,
        {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${import.meta.env.VITE_SUPABASE_ANON_KEY}`
          },
          body: JSON.stringify({
            email: targetEmail,
            name: isTest ? 'Teste' : 'Destinatário',
            subject: subject,
            body: htmlBody,
            type: 'custom'
          })
        }
      );

      const result = await response.json();

      if (!response.ok) {
        throw new Error(result.message || 'Erro ao enviar email');
      }

      setSuccessMessage(
        isTest
          ? `Email de teste enviado para ${targetEmail}`
          : `Email enviado para ${targetEmail}`
      );

      if (!isTest) {
        setRecipientEmail('');
        setSubject('');
        setHtmlBody('');
      }
    } catch (err) {
      setErrorMessage(`Erro ao enviar: ${err instanceof Error ? err.message : 'Erro desconhecido'}`);
    } finally {
      setIsSending(false);
    }
  };

  if (userRole !== 'master') {
    return null;
  }

  return (
    <div className="bg-white rounded-2xl p-6 border border-gray-100 shadow-sm">
      {/* Header */}
      <div className="flex items-center gap-3 mb-6">
        <div className="w-10 h-10 bg-violet-100 rounded-lg flex items-center justify-center">
          <Mail size={20} className="text-violet-600" />
        </div>
        <h3 className="text-lg font-black text-gray-900">Envio de Email Personalizado</h3>
      </div>

      {/* Form Fields */}
      <div className="space-y-4 mb-6">
        <input
          type="email"
          placeholder="exemplo@email.com"
          value={recipientEmail}
          onChange={(e) => setRecipientEmail(e.target.value)}
          className="w-full px-4 py-2.5 border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-violet-500 font-bold text-sm"
        />

        <input
          type="text"
          placeholder="Assunto do email"
          value={subject}
          onChange={(e) => setSubject(e.target.value)}
          className="w-full px-4 py-2.5 border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-violet-500 font-bold text-sm"
        />

        <textarea
          placeholder="Digite o conteúdo do email em HTML"
          value={htmlBody}
          onChange={(e) => setHtmlBody(e.target.value)}
          rows={8}
          className="w-full px-4 py-2.5 border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-violet-500 font-mono text-xs text-gray-700 bg-white"
        />
      </div>

      {/* Action Buttons */}
      <div className="flex gap-3">
        <button
          onClick={() => sendEmail('', true)}
          disabled={isSending || !subject.trim() || !htmlBody.trim()}
          className="flex-1 px-4 py-3 rounded-xl font-bold text-sm uppercase transition-all disabled:opacity-50 flex items-center justify-center gap-2 bg-amber-100 text-amber-700 hover:bg-amber-200"
        >
          Enviar Teste
        </button>

        <button
          onClick={() => sendEmail(recipientEmail)}
          disabled={isSending || !recipientEmail.trim() || !subject.trim() || !htmlBody.trim()}
          className="flex-1 px-4 py-3 bg-violet-600 text-white rounded-xl font-bold text-sm uppercase hover:bg-violet-700 transition-all disabled:opacity-50 flex items-center justify-center gap-2"
        >
          Enviar
        </button>
      </div>
    </div>
  );
};
```

**Padrão chave**:
- Master-only feature (role check retorna null)
- Estado separado para test vs envio real
- Chamada a Edge Function `/functions/v1/send-email`
- Feedback visual com messages de sucesso/erro
- Botão "Enviar Teste" com email do .env (VITE_TEST_EMAIL)

---

## 🔌 Integração com Supabase Edge Functions

### Email via SMTP (send-email)

A Edge Function `/functions/v1/send-email` integra com provedor SMTP (Hostinger, etc):

```typescript
// supabase/functions/send-email/index.ts
serve(async (req) => {
  if (req.method !== "POST") {
    return new Response("Method not allowed", { status: 405 });
  }

  const { email, name, subject, body, certificateUrl, ticketUrl } = await req.json();

  // Pegar credenciais do Supabase Secrets
  const smtpHost = Deno.env.get("SMTP_HOST");
  const smtpPort = parseInt(Deno.env.get("SMTP_PORT") || "587");
  const smtpUser = Deno.env.get("SMTP_USER");
  const smtpPassword = Deno.env.get("SMTP_PASSWORD");
  const fromName = Deno.env.get("SMTP_FROM_NAME") || "Vox Marketing";

  // Construir HTML e enviar via SMTP
  const client = new SmtpClient();
  await client.connect({
    hostname: smtpHost,
    port: smtpPort,
    username: smtpUser,
    password: smtpPassword,
    tls: true,
  });

  await client.send({
    from: `${fromName} <${smtpUser}>`,
    to: email,
    subject: subject,
    html: htmlBody,
  });

  await client.close();

  return new Response(
    JSON.stringify({ success: true, message: "Email enviado!" }),
    { status: 200, headers: { "Content-Type": "application/json" } }
  );
});
```

**Configuração necessária**:
- Variáveis `.env`: `SMTP_HOST`, `SMTP_PORT`, `SMTP_USER`, `SMTP_PASSWORD`, `SMTP_FROM_NAME`
- Supabase Secrets: mesmas variáveis acima
- Cliente SMTP: @deno/x/smtp (versão v0.7.0+)

---

**Última atualização**: 2026-04-22  
**Versão**: 1.1  
**Conteúdo**: Adicionado padrão de CustomEmailSender e integração com Edge Functions SMTP
