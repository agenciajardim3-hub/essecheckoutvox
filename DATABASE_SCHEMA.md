# 📊 Database Schema - Vox Control

## Overview
PostgreSQL via Supabase. Todas as tabelas com timestamps e RLS policies.

---

## 🔑 Tabelas Principais

### **leads** (Vendas/Ingressos)
Registro central: cada pessoa que compra um ingresso/participa.

```sql
CREATE TABLE leads (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  
  -- Dados Pessoais
  name TEXT NOT NULL,
  email TEXT NOT NULL,
  phone TEXT,
  cpf TEXT UNIQUE,
  city TEXT,
  
  -- Venda
  product_id TEXT NOT NULL REFERENCES checkouts(id),
  product_name TEXT,
  turma TEXT,
  status TEXT DEFAULT 'Novo' 
    CHECK (status IN ('Novo','Pago','Pendente','Sinal','Pagar no dia','Aprovado','Cancelado','Devolvido','Abandonado')),
  paid_amount NUMERIC DEFAULT 0,
  payment_method TEXT CHECK (payment_method IN ('Pix','Cartão','Boleto','Dinheiro','Outro')),
  
  -- IMPORTANTE: Campos para "Quem pagou"
  payer_name TEXT,           -- Quem pagou (pode ser diferente do lead)
  payer_email TEXT,
  payer_phone TEXT,
  payer_document TEXT,
  
  -- Onde foi pago (localidade/método local)
  payment_location TEXT,
  
  -- Presença
  checked_in BOOLEAN DEFAULT FALSE,
  checked_in_at TIMESTAMP,
  
  -- Ingresso
  ticket_generated BOOLEAN DEFAULT FALSE,
  
  -- UTM Tracking
  utmSource TEXT,
  utmMedium TEXT,
  utmCampaign TEXT,
  
  -- Cupom
  coupon_code TEXT REFERENCES coupons(code),
  
  -- Emitente (para NFe/Doc)
  emitted_by TEXT,
  emission_date DATE,
  
  -- Timestamps
  created_at TIMESTAMP DEFAULT NOW(),
  submitted_at TIMESTAMP,
  source TEXT DEFAULT 'checkout'
    CHECK (source IN ('autoregistro','checkout','manual')),
  
  -- Metadados
  group_link TEXT,
  time TEXT
);

-- Índices críticos
CREATE INDEX idx_leads_cpf ON leads(cpf);
CREATE INDEX idx_leads_email ON leads(email);
CREATE INDEX idx_leads_status ON leads(status);
CREATE INDEX idx_leads_product_id ON leads(product_id);
CREATE INDEX idx_leads_turma ON leads(turma);
CREATE INDEX idx_leads_created_at ON leads(created_at DESC);
```

---

### **checkouts** (Produtos/Eventos)
Cada evento/curso que vende ingressos.

```sql
CREATE TABLE checkouts (
  id TEXT PRIMARY KEY,
  
  -- Básico
  productName TEXT NOT NULL,
  productPrice TEXT,
  productDescription TEXT,
  productImage TEXT,
  bannerImage TEXT,
  
  -- URLs
  mercadoPagoLink TEXT,
  webhookUrl TEXT,
  
  -- Configuração
  slug TEXT UNIQUE,
  isActive BOOLEAN DEFAULT TRUE,
  
  -- Turma (Localidade + Período)
  turma TEXT,        -- Ex: "Turma A - Limeira (Jan/2026)"
  folder TEXT,       -- Categorização
  
  -- Evento
  eventDate DATE,
  eventStartTime TIME,
  eventEndTime TIME,
  eventLocation TEXT,  -- Localidade: Limeira, Indaiatuba, São Paulo
  
  -- Capacidade
  maxVagas INT DEFAULT 100,
  
  -- Pagamento
  useMpApi BOOLEAN DEFAULT FALSE,
  
  -- Ingressos
  ticketAmount INT DEFAULT 1,
  
  -- Obrigado (Thank You Page)
  thankYouTitle TEXT,
  thankYouSubtitle TEXT,
  thankYouMessage TEXT,
  thankYouButtonText TEXT,
  thankYouButtonUrl TEXT,
  thankYouImageUrl TEXT,
  
  -- Tracking
  ga4Id TEXT,
  metaPixelId TEXT,
  
  -- Emitente
  emitted_by TEXT,
  emission_date DATE,
  
  -- Variações (múltiplos ingressos)
  variations JSONB DEFAULT NULL,
  benefits TEXT[] DEFAULT ARRAY['Acesso imediato','Suporte VIP','Material'],
  
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW()
);

CREATE INDEX idx_checkouts_slug ON checkouts(slug);
CREATE INDEX idx_checkouts_isActive ON checkouts(isActive);
```

---

### **presenca** (Check-in)
Log de presença por CPF.

```sql
CREATE TABLE presenca (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  lead_id UUID NOT NULL REFERENCES leads(id) ON DELETE CASCADE,
  cpf TEXT NOT NULL,
  checked_in_at TIMESTAMP NOT NULL DEFAULT NOW(),
  device TEXT,  -- Mobile, Desktop
  ip_address INET
);

CREATE INDEX idx_presenca_cpf ON presenca(cpf);
CREATE INDEX idx_presenca_lead_id ON presenca(lead_id);
CREATE INDEX idx_presenca_checked_in_at ON presenca(checked_in_at DESC);
```

---

### **ingressos** (Tickets Gerados)
Cada ingresso emitido/enviado.

```sql
CREATE TABLE ingressos (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  lead_id UUID NOT NULL REFERENCES leads(id) ON DELETE CASCADE,
  cpf TEXT NOT NULL,
  product_id TEXT REFERENCES checkouts(id),
  
  -- Documento
  pdf_url TEXT,
  pdf_hash TEXT UNIQUE,  -- Hash para impedir duplicatas
  
  -- Status
  status TEXT DEFAULT 'gerado'
    CHECK (status IN ('gerado','enviado_email','enviado_whatsapp','impresso','usado','cancelado')),
  
  -- Rastreamento
  sent_at TIMESTAMP,
  sent_via TEXT CHECK (sent_via IN ('email','whatsapp','manual')),
  used_at TIMESTAMP,
  
  -- Validação
  qr_code TEXT UNIQUE,
  qr_scanned_at TIMESTAMP,
  scanned_by TEXT,
  
  created_at TIMESTAMP DEFAULT NOW()
);

CREATE INDEX idx_ingressos_cpf ON ingressos(cpf);
CREATE INDEX idx_ingressos_lead_id ON ingressos(lead_id);
CREATE INDEX idx_ingressos_status ON ingressos(status);
```

---

### **turmas** (Classes)
Configuração de turmas/classes.

```sql
CREATE TABLE turmas (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  nome TEXT NOT NULL,
  
  -- Localidade
  localidade TEXT NOT NULL 
    CHECK (localidade IN ('Limeira','Indaiatuba','São Paulo')),
  
  -- Período
  data_inicio DATE NOT NULL,
  data_fim DATE,
  hora_inicio TIME,
  hora_fim TIME,
  
  -- Capacidade
  vagas_totais INT NOT NULL,
  vagas_disponiveis INT,
  
  -- Links
  grupo_whatsapp TEXT,
  material_url TEXT,
  
  -- Status
  ativa BOOLEAN DEFAULT TRUE,
  
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW()
);

CREATE INDEX idx_turmas_localidade ON turmas(localidade);
CREATE INDEX idx_turmas_data_inicio ON turmas(data_inicio);
```

---

### **cupons** (Coupons/Discounts)
Cupons de desconto para ingressos.

```sql
CREATE TABLE coupons (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  code TEXT UNIQUE NOT NULL,
  
  -- Desconto
  discountType TEXT NOT NULL 
    CHECK (discountType IN ('percentage','fixed')),
  discountValue NUMERIC NOT NULL,
  
  -- Restrição
  productId TEXT REFERENCES checkouts(id),  -- NULL = aplica a todos
  maxUses INT,
  currentUses INT DEFAULT 0,
  
  -- Status
  isActive BOOLEAN DEFAULT TRUE,
  createdAt TIMESTAMP DEFAULT NOW(),
  expiresAt TIMESTAMP,
  
  created_at TIMESTAMP DEFAULT NOW()
);

CREATE INDEX idx_coupons_code ON coupons(code);
CREATE INDEX idx_coupons_productId ON coupons(productId);
```

---

### **despesas** (Expenses)
Controle de despesas por categoria.

```sql
CREATE TABLE despesas (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  description TEXT NOT NULL,
  amount NUMERIC NOT NULL,
  category TEXT NOT NULL 
    CHECK (category IN ('material','equipamento','marketing','infraestrutura','servico','outro')),
  date DATE NOT NULL,
  created_at TIMESTAMP DEFAULT NOW()
);

CREATE INDEX idx_despesas_category ON despesas(category);
CREATE INDEX idx_despesas_date ON despesas(date DESC);
```

---

### **solicitacoes** (Certificate Requests)
Solicitações de certificados pós-evento.

```sql
CREATE TABLE solicitacoes (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  full_name TEXT NOT NULL,
  participation_date DATE NOT NULL,
  whatsapp TEXT,
  email TEXT NOT NULL,
  course_name TEXT,
  certificate_url TEXT,
  
  status TEXT DEFAULT 'pendente'
    CHECK (status IN ('pendente','enviado_whatsapp','enviado_email','concluido','certificado_salvo')),
  
  created_at TIMESTAMP DEFAULT NOW()
);

CREATE INDEX idx_solicitacoes_email ON solicitacoes(email);
```

---

## 🔗 Relacionamentos

```
leads (vendas) ──┬─→ checkouts (produtos)
                 ├─→ ingressos (tickets emitidos)
                 ├─→ presenca (check-in)
                 └─→ cupons (desconto aplicado)

turmas (classes) ── múltiplos leads podem estar em uma turma
despesas ────────── categorizadas por tipo
solicitacoes ────── pós-evento, cada pessoa pede certificado
```

---

## ⚠️ Constraints Críticas

1. **CPF Único em leads**: Cada pessoa só pode ter um registro principal
2. **Pagamentos rastreados**: payer_name + payment_location + paid_amount
3. **Check-in imutável**: checked_in_at é timestamp, não modificável
4. **Ingressos únicos**: Hash PDF previne duplicatas
5. **Cupons com limite**: maxUses + currentUses para tracking de uso
6. **Localidades fixas**: Enum para evitar inconsistências

---

## 📈 Índices de Performance

| Tabela | Índice | Uso |
|--------|--------|-----|
| leads | cpf | Busca por CPF no check-in |
| leads | email | Busca por email |
| leads | status | Filtros "Pago", "Pendente" |
| leads | product_id | Relatório por produto |
| leads | created_at | Ordenação cronológica |
| ingressos | cpf | Validação de ingresso |
| presenca | checked_in_at | Relatório de presença |

---

**Última atualização**: 2026-04-22  
**Nota**: Variations JSONB em checkouts suporta múltiplos preços e pacotes de ingressos. Email enviado via Edge Function (não requer nova tabela).
