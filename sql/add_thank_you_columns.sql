-- Adicionar colunas da página de sucesso (Thank You) na tabela checkouts
ALTER TABLE checkouts ADD COLUMN IF NOT EXISTS thank_you_title TEXT DEFAULT '';
ALTER TABLE checkouts ADD COLUMN IF NOT EXISTS thank_you_subtitle TEXT DEFAULT '';
ALTER TABLE checkouts ADD COLUMN IF NOT EXISTS thank_you_message TEXT DEFAULT '';
ALTER TABLE checkouts ADD COLUMN IF NOT EXISTS thank_you_button_text TEXT DEFAULT '';
ALTER TABLE checkouts ADD COLUMN IF NOT EXISTS thank_you_button_url TEXT DEFAULT '';
ALTER TABLE checkouts ADD COLUMN IF NOT EXISTS thank_you_image_url TEXT DEFAULT '';
