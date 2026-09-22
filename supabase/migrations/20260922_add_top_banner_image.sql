-- Banner adicional opcional exibido acima do banner principal do checkout.
ALTER TABLE public.checkouts
  ADD COLUMN IF NOT EXISTS top_banner_image TEXT;
