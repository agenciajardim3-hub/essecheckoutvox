-- Campos usados pelo editor e pelo checkout da branch 3.2.
-- Seguro para executar mais de uma vez.
ALTER TABLE checkouts
  ADD COLUMN IF NOT EXISTS is_sold_out BOOLEAN DEFAULT FALSE,
  ADD COLUMN IF NOT EXISTS event_date TEXT,
  ADD COLUMN IF NOT EXISTS event_start_time TEXT,
  ADD COLUMN IF NOT EXISTS event_end_time TEXT,
  ADD COLUMN IF NOT EXISTS event_location TEXT,
  ADD COLUMN IF NOT EXISTS city TEXT,
  ADD COLUMN IF NOT EXISTS neighborhood TEXT,
  ADD COLUMN IF NOT EXISTS folder TEXT,
  ADD COLUMN IF NOT EXISTS webhook_url TEXT,
  ADD COLUMN IF NOT EXISTS max_vagas INTEGER,
  ADD COLUMN IF NOT EXISTS use_mp_api BOOLEAN DEFAULT FALSE,
  ADD COLUMN IF NOT EXISTS ticket_amount INTEGER DEFAULT 1,
  ADD COLUMN IF NOT EXISTS thank_you_title TEXT,
  ADD COLUMN IF NOT EXISTS thank_you_subtitle TEXT,
  ADD COLUMN IF NOT EXISTS thank_you_message TEXT,
  ADD COLUMN IF NOT EXISTS thank_you_button_text TEXT,
  ADD COLUMN IF NOT EXISTS thank_you_button_url TEXT,
  ADD COLUMN IF NOT EXISTS thank_you_image_url TEXT,
  ADD COLUMN IF NOT EXISTS variations JSONB DEFAULT '[]'::jsonb,
  ADD COLUMN IF NOT EXISTS viewer_count INTEGER DEFAULT 0,
  ADD COLUMN IF NOT EXISTS faq_items JSONB DEFAULT '[]'::jsonb;
