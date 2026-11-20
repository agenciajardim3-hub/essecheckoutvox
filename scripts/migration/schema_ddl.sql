-- ==============================================================================
-- VOX CONTROL: FULL DDL SCHEMA (POSTGRESQL 16/17 CONTABO COMPATIBLE)
-- ==============================================================================

CREATE EXTENSION IF NOT EXISTS "uuid-ossp";
CREATE EXTENSION IF NOT EXISTS "pgcrypto";

-- 1. SIGNATURE TEMPLATES
CREATE TABLE IF NOT EXISTS signature_templates (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    name TEXT NOT NULL,
    image_url TEXT,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- 2. CHECKOUTS (Produtos / Turmas)
CREATE TABLE IF NOT EXISTS checkouts (
    id TEXT PRIMARY KEY,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW(),
    mercado_pago_link TEXT,
    product_name TEXT,
    product_price NUMERIC DEFAULT 0,
    product_image TEXT,
    banner_image TEXT,
    top_banner_image TEXT,
    product_description TEXT,
    benefits JSONB DEFAULT '[]'::jsonb,
    detailed_contents JSONB DEFAULT '[]'::jsonb,
    variations JSONB DEFAULT '[]'::jsonb,
    faq_items JSONB DEFAULT '[]'::jsonb,
    testimonials JSONB DEFAULT '[]'::jsonb,
    trello_api_key TEXT,
    trello_token TEXT,
    trello_list_id TEXT,
    is_active BOOLEAN DEFAULT TRUE,
    ga4_id TEXT,
    meta_pixel_id TEXT,
    gtm_id TEXT,
    slug TEXT UNIQUE,
    turma TEXT,
    event_date TEXT,
    event_location TEXT,
    event_start_time TEXT,
    event_end_time TEXT,
    city TEXT,
    neighborhood TEXT,
    folder TEXT,
    use_mp_api BOOLEAN DEFAULT TRUE,
    max_vagas INTEGER,
    ticket_amount NUMERIC DEFAULT 0,
    webhook_url TEXT,
    viewer_count INTEGER DEFAULT 0,
    is_sold_out BOOLEAN DEFAULT FALSE,
    thank_you_title TEXT,
    thank_you_subtitle TEXT,
    thank_you_message TEXT,
    thank_you_button_text TEXT,
    thank_you_button_url TEXT,
    thank_you_image_url TEXT,
    notion_page_id TEXT UNIQUE,
    external_ids JSONB DEFAULT '{}'::jsonb
);

CREATE INDEX IF NOT EXISTS idx_checkouts_slug ON checkouts(slug);
CREATE INDEX IF NOT EXISTS idx_checkouts_turma ON checkouts(turma);

-- 3. COUPONS
CREATE TABLE IF NOT EXISTS coupons (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    code TEXT NOT NULL UNIQUE,
    discount_type TEXT DEFAULT 'percentage',
    discount_value NUMERIC NOT NULL,
    max_uses INTEGER,
    current_uses INTEGER DEFAULT 0,
    product_id TEXT,
    is_active BOOLEAN DEFAULT TRUE,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    expires_at TIMESTAMPTZ
);

CREATE INDEX IF NOT EXISTS idx_coupons_code ON coupons(code);

-- 4. LEADS (Vendas, Ingressos, Check-in)
CREATE TABLE IF NOT EXISTS leads (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    name TEXT NOT NULL,
    email TEXT,
    phone TEXT,
    city TEXT,
    cpf TEXT,
    product_id TEXT,
    product_name TEXT,
    "productName" TEXT,
    "productname" TEXT,
    turma TEXT,
    status TEXT DEFAULT 'Novo',
    paid_amount NUMERIC DEFAULT 0,
    payment_method TEXT,
    payment_status TEXT,
    payment_location TEXT,
    mp_preference_id TEXT,
    mp_payment_id TEXT,
    mp_fee_amount NUMERIC DEFAULT 0,
    mp_net_amount NUMERIC DEFAULT 0,
    mp_fee_details JSONB DEFAULT '[]'::jsonb,
    coupon_code TEXT,
    coupon_used TEXT,
    discount_applied NUMERIC DEFAULT 0,
    total_quantity INTEGER DEFAULT 1,
    checked_in BOOLEAN DEFAULT FALSE,
    checked_in_at TIMESTAMPTZ,
    ticket_generated BOOLEAN DEFAULT FALSE,
    payer_name TEXT,
    payer_email TEXT,
    payer_phone TEXT,
    payer_document TEXT,
    payer_cpf TEXT,
    source TEXT DEFAULT 'checkout',
    group_link TEXT,
    notes TEXT,
    fb_event_id TEXT,
    fbp TEXT,
    fbc TEXT,
    utm_source TEXT,
    utm_medium TEXT,
    utm_campaign TEXT,
    gclid TEXT,
    ttclid TEXT,
    external_ids JSONB DEFAULT '{}'::jsonb,
    submitted_at TIMESTAMPTZ DEFAULT NOW(),
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_leads_mp_payment_id ON leads(mp_payment_id);
CREATE INDEX IF NOT EXISTS idx_leads_product_id ON leads(product_id);
CREATE INDEX IF NOT EXISTS idx_leads_turma ON leads(turma);
CREATE INDEX IF NOT EXISTS idx_leads_status ON leads(status);
CREATE INDEX IF NOT EXISTS idx_leads_cpf ON leads(cpf);
CREATE INDEX IF NOT EXISTS idx_leads_email ON leads(email);

-- 5. EXPENSES (Despesas Financeiras e Break-Even)
CREATE TABLE IF NOT EXISTS expenses (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    description TEXT NOT NULL,
    amount NUMERIC NOT NULL,
    type TEXT,
    category TEXT DEFAULT 'Taxas / Outros',
    date DATE DEFAULT CURRENT_DATE,
    checkout_id TEXT DEFAULT 'global',
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_expenses_checkout_id ON expenses(checkout_id);
CREATE INDEX IF NOT EXISTS idx_expenses_date ON expenses(date);
CREATE INDEX IF NOT EXISTS idx_expenses_category ON expenses(category);

-- 6. CHECKOUT VIEWS (Analytics e Contagem de Visitas)
CREATE TABLE IF NOT EXISTS checkout_views (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    checkout_id TEXT,
    checkout_slug TEXT,
    viewed_at TIMESTAMPTZ DEFAULT NOW(),
    utm_source TEXT,
    utm_medium TEXT,
    utm_campaign TEXT,
    referrer TEXT,
    device_type TEXT
);

CREATE INDEX IF NOT EXISTS idx_checkout_views_checkout_id ON checkout_views(checkout_id);
CREATE INDEX IF NOT EXISTS idx_checkout_views_viewed_at ON checkout_views(viewed_at);

-- 7. FORM REQUESTS (Solicitações de Certificado)
CREATE TABLE IF NOT EXISTS form_requests (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    full_name TEXT NOT NULL,
    participation_date TEXT,
    whatsapp TEXT,
    email TEXT,
    certificate_url TEXT,
    status TEXT DEFAULT 'pendente',
    course_name TEXT,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- 8. SUPPORT MATERIALS
CREATE TABLE IF NOT EXISTS support_materials (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    checkout_id TEXT,
    date TEXT,
    start_time TEXT,
    end_time TEXT,
    location TEXT,
    location_url TEXT,
    link_oficial TEXT,
    link_pagamento TEXT,
    investment_12x NUMERIC,
    investment_pix NUMERIC,
    observation TEXT,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- 9. WEBHOOK EVENTS & LOGS (n8n / OpenClaw / Notion Dispatcher)
CREATE TABLE IF NOT EXISTS webhook_events (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    event_type TEXT NOT NULL,
    idempotency_key TEXT UNIQUE,
    turma_id TEXT,
    turma_name TEXT,
    notion_page_id TEXT,
    gross_amount NUMERIC DEFAULT 0,
    net_amount NUMERIC DEFAULT 0,
    fee_amount NUMERIC DEFAULT 0,
    currency TEXT DEFAULT 'BRL',
    payload JSONB NOT NULL,
    status TEXT DEFAULT 'pending',
    retry_count INTEGER DEFAULT 0,
    max_retries INTEGER DEFAULT 5,
    last_error TEXT,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_webhook_events_status ON webhook_events(status);
CREATE INDEX IF NOT EXISTS idx_webhook_events_idempotency ON webhook_events(idempotency_key);

CREATE TABLE IF NOT EXISTS webhook_logs (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    webhook_event_id UUID REFERENCES webhook_events(id) ON DELETE CASCADE,
    destination_url TEXT NOT NULL,
    status_code INTEGER,
    response_body TEXT,
    execution_time_ms INTEGER,
    error_message TEXT,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- 10. PERMISSIONS & GRANTS FOR POSTGREST (Anon, Authenticated, Service Role)
GRANT ALL ON ALL TABLES IN SCHEMA public TO postgres, anon, authenticated, service_role;
GRANT ALL ON ALL SEQUENCES IN SCHEMA public TO postgres, anon, authenticated, service_role;
GRANT ALL ON ALL ROUTINES IN SCHEMA public TO postgres, anon, authenticated, service_role;

ALTER DEFAULT PRIVILEGES IN SCHEMA public GRANT ALL ON TABLES TO postgres, anon, authenticated, service_role;
ALTER DEFAULT PRIVILEGES IN SCHEMA public GRANT ALL ON SEQUENCES TO postgres, anon, authenticated, service_role;
ALTER DEFAULT PRIVILEGES IN SCHEMA public GRANT ALL ON ROUTINES TO postgres, anon, authenticated, service_role;

-- Recarregar cache de schemas do PostgREST
NOTIFY pgrst, 'reload schema';
