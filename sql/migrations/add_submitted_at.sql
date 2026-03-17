ALTER TABLE public.leads ADD COLUMN IF NOT EXISTS submitted_at timestamptz DEFAULT now();
