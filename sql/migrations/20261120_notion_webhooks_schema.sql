-- ==============================================================================
-- VOX CONTROL MIGRATION: Notion Hub, External IDs e Webhook Outbound Architecture
-- Data: 2026-11-20
-- ==============================================================================

-- 1. Suporte à Central de Comando Notion nas Turmas / Checkouts
ALTER TABLE checkouts ADD COLUMN IF NOT EXISTS notion_page_id TEXT UNIQUE;
ALTER TABLE checkouts ADD COLUMN IF NOT EXISTS external_ids JSONB DEFAULT '{}'::jsonb;

-- 2. Suporte a IDs externos e rastreamento expandido nos Leads
ALTER TABLE leads ADD COLUMN IF NOT EXISTS external_ids JSONB DEFAULT '{}'::jsonb;
ALTER TABLE leads ADD COLUMN IF NOT EXISTS gclid TEXT;
ALTER TABLE leads ADD COLUMN IF NOT EXISTS ttclid TEXT;

-- 3. Tabela de Eventos de Webhook Outbound (n8n / Agentes / OpenClaw / Hermes)
CREATE TABLE IF NOT EXISTS webhook_events (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    event_type TEXT NOT NULL, -- checkout.started, pix.generated, payment.approved, payment.refunded, lead.created, checkin.completed, ticket.generated, cohort.created, cohort.updated
    idempotency_key TEXT UNIQUE,
    turma_id TEXT,
    turma_name TEXT,
    notion_page_id TEXT,
    gross_amount NUMERIC DEFAULT 0,
    net_amount NUMERIC DEFAULT 0,
    fee_amount NUMERIC DEFAULT 0,
    currency TEXT DEFAULT 'BRL',
    payload JSONB NOT NULL,
    status TEXT DEFAULT 'pending', -- pending, sent, failed, dead_letter
    retry_count INTEGER DEFAULT 0,
    max_retries INTEGER DEFAULT 5,
    last_error TEXT,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Índices de performance para polling e retry de webhooks
CREATE INDEX IF NOT EXISTS idx_webhook_events_status ON webhook_events(status);
CREATE INDEX IF NOT EXISTS idx_webhook_events_event_type ON webhook_events(event_type);
CREATE INDEX IF NOT EXISTS idx_webhook_events_turma_id ON webhook_events(turma_id);
CREATE INDEX IF NOT EXISTS idx_webhook_events_idempotency ON webhook_events(idempotency_key);

-- 4. Tabela de Logs de Entrega de Webhook
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

CREATE INDEX IF NOT EXISTS idx_webhook_logs_event_id ON webhook_logs(webhook_event_id);
